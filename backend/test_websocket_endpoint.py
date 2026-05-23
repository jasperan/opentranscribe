import asyncio
import base64
import importlib.util
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

MODULE_PATH = Path(__file__).parent / "streaming" / "websocket_endpoint.py"
spec = importlib.util.spec_from_file_location("websocket_endpoint", MODULE_PATH)
websocket_endpoint = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(websocket_endpoint)

SessionRegistry = websocket_endpoint.SessionRegistry
WebSocketDisconnect = websocket_endpoint.WebSocketDisconnect
WebSocketStreamingEndpoint = websocket_endpoint.WebSocketStreamingEndpoint


class FakeResult:
    def __init__(self, result_type, **fields):
        self.result_type = result_type
        self.fields = fields

    def to_dict(self):
        return {"type": self.result_type, **self.fields}


class FakeTranscriber:
    def __init__(self, available=True):
        self.available = available
        self.is_recording = False
        self.received_audio = []
        self.stop_count = 0
        self.config = SimpleNamespace(vad_enabled=False)

    def is_available(self):
        return self.available

    def start_session(self):
        self.is_recording = True
        return FakeResult("ready")

    def process_chunk(self, audio):
        self.received_audio.append(audio)
        return [FakeResult("partial", text=audio.decode())]

    def stop_session(self):
        self.stop_count += 1
        self.is_recording = False
        return FakeResult("stopped")

    def force_finalize(self):
        return FakeResult("final", text="finalized")


class FakeWebSocket:
    def __init__(self, messages):
        self.messages = list(messages)
        self.accepted = False
        self.sent = []

    async def accept(self):
        self.accepted = True

    async def receive_json(self):
        if not self.messages:
            raise WebSocketDisconnect()
        return self.messages.pop(0)

    async def send_json(self, payload):
        self.sent.append(payload)


class WebSocketStreamingEndpointTests(unittest.TestCase):
    def test_handle_runs_common_start_audio_finalize_stop_lifecycle(self):
        registry = SessionRegistry(timeout_seconds=60)
        transcriber = FakeTranscriber()
        websocket = FakeWebSocket([
            {"type": "start"},
            {"type": "audio", "data": base64.b64encode(b"hello").decode()},
            {"type": "config", "vad_enabled": True},
            {"type": "finalize"},
            {"type": "stop"},
        ])
        endpoint = WebSocketStreamingEndpoint(
            sessions=registry,
            transcriber_factory=lambda _data: transcriber,
            config_updater=lambda item, data: setattr(item.config, "vad_enabled", data["vad_enabled"]),
            unavailable_message="missing dependency",
            finalizer=lambda item: item.force_finalize(),
        )

        asyncio.run(endpoint.handle(websocket))

        self.assertTrue(websocket.accepted)
        self.assertEqual(
            websocket.sent,
            [
                {"type": "ready"},
                {"type": "partial", "text": "hello"},
                {"type": "config_updated"},
                {"type": "final", "text": "finalized"},
                {"type": "stopped"},
            ],
        )
        self.assertEqual(transcriber.received_audio, [b"hello"])
        self.assertTrue(transcriber.config.vad_enabled)
        self.assertEqual(len(registry), 0)

    def test_unavailable_transcriber_sends_error_without_registering_session(self):
        registry = SessionRegistry(timeout_seconds=60)
        websocket = FakeWebSocket([{"type": "start"}])
        endpoint = WebSocketStreamingEndpoint(
            sessions=registry,
            transcriber_factory=lambda _data: FakeTranscriber(available=False),
            config_updater=lambda _item, _data: None,
            unavailable_message="missing dependency",
        )

        asyncio.run(endpoint.handle(websocket))

        self.assertEqual(websocket.sent, [{"type": "error", "message": "missing dependency"}])
        self.assertEqual(len(registry), 0)

    def test_cleanup_stale_stops_recording_transcriber(self):
        registry = SessionRegistry(timeout_seconds=10)
        transcriber = FakeTranscriber()
        transcriber.start_session()

        with patch.object(websocket_endpoint.time, "time", return_value=0):
            registry.register("session-1", transcriber)
        with patch.object(websocket_endpoint.time, "time", return_value=11):
            registry.cleanup_stale()

        self.assertEqual(len(registry), 0)
        self.assertEqual(transcriber.stop_count, 1)


if __name__ == "__main__":
    unittest.main()
