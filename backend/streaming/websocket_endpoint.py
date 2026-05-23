"""Reusable WebSocket session lifecycle for streaming transcribers."""

from __future__ import annotations

import base64
import logging
import time
import uuid
from collections.abc import Callable
from typing import TYPE_CHECKING, Any

try:
    from fastapi import WebSocketDisconnect
except ModuleNotFoundError:
    class WebSocketDisconnect(Exception):
        """Test fallback when FastAPI is not installed in the local interpreter."""


if TYPE_CHECKING:
    from fastapi import WebSocket
else:
    WebSocket = Any


class SessionRegistry:
    """Timestamped registry for active streaming transcriber sessions."""

    def __init__(self, timeout_seconds: int, logger: logging.Logger | None = None):
        self.timeout_seconds = timeout_seconds
        self._logger = logger or logging.getLogger(__name__)
        self._sessions: dict[str, tuple[Any, float]] = {}

    def register(self, session_id: str, transcriber: Any) -> None:
        self._sessions[session_id] = (transcriber, time.time())

    def touch(self, session_id: str) -> None:
        if session_id in self._sessions:
            transcriber, _ = self._sessions[session_id]
            self._sessions[session_id] = (transcriber, time.time())

    def pop(self, session_id: str) -> Any | None:
        transcriber, _ = self._sessions.pop(session_id, (None, None))
        return transcriber

    def cleanup_stale(self) -> None:
        now = time.time()
        stale = [
            session_id
            for session_id, (_transcriber, last_active) in self._sessions.items()
            if now - last_active > self.timeout_seconds
        ]
        for session_id in stale:
            transcriber = self.pop(session_id)
            stop_transcriber(transcriber)
            self._logger.info("Cleaned up stale session: %s", session_id)

    def __len__(self) -> int:
        return len(self._sessions)


def stop_transcriber(transcriber: Any | None) -> None:
    if transcriber is None:
        return
    if not getattr(transcriber, "is_recording", False):
        return
    try:
        transcriber.stop_session()
    except Exception:
        pass


class WebSocketStreamingEndpoint:
    """Shared JSON-message loop for streaming transcription WebSockets."""

    def __init__(
        self,
        *,
        sessions: SessionRegistry,
        transcriber_factory: Callable[[dict[str, Any]], Any],
        config_updater: Callable[[Any, dict[str, Any]], None],
        unavailable_message: str,
        logger: logging.Logger | None = None,
        reject_empty_audio: bool = False,
        finalizer: Callable[[Any], Any | None] | None = None,
        log_label: str = "WebSocket",
    ):
        self.sessions = sessions
        self.transcriber_factory = transcriber_factory
        self.config_updater = config_updater
        self.unavailable_message = unavailable_message
        self.logger = logger or logging.getLogger(__name__)
        self.reject_empty_audio = reject_empty_audio
        self.finalizer = finalizer
        self.log_label = log_label

    async def handle(self, websocket: WebSocket) -> None:
        await websocket.accept()
        session_id = str(uuid.uuid4())
        transcriber = None

        self.logger.info("%s connection opened: %s", self.log_label, session_id)

        try:
            while True:
                data = await websocket.receive_json()
                msg_type = data.get("type")

                if msg_type == "start":
                    transcriber = self.transcriber_factory(data)
                    if not transcriber.is_available():
                        await websocket.send_json({
                            "type": "error",
                            "message": self.unavailable_message,
                        })
                        continue

                    result = transcriber.start_session()
                    self.sessions.register(session_id, transcriber)
                    await websocket.send_json(result.to_dict())

                elif msg_type == "audio":
                    if transcriber is None or not transcriber.is_recording:
                        await websocket.send_json({
                            "type": "error",
                            "message": "No active session. Send 'start' first.",
                        })
                        continue

                    self.sessions.touch(session_id)

                    try:
                        audio_data = base64.b64decode(data.get("data", ""))
                        if self.reject_empty_audio and len(audio_data) == 0:
                            continue
                    except Exception as exc:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Invalid audio data: {str(exc)}",
                        })
                        continue

                    for result in transcriber.process_chunk(audio_data):
                        await websocket.send_json(result.to_dict())

                elif msg_type == "config":
                    if transcriber is not None:
                        self.config_updater(transcriber, data)
                        await websocket.send_json({"type": "config_updated"})

                elif msg_type == "finalize":
                    if (
                        self.finalizer is not None
                        and transcriber is not None
                        and transcriber.is_recording
                    ):
                        result = self.finalizer(transcriber)
                        if result:
                            await websocket.send_json(result.to_dict())

                elif msg_type == "stop":
                    if transcriber is not None and transcriber.is_recording:
                        result = transcriber.stop_session()
                        await websocket.send_json(result.to_dict())

                    self.sessions.pop(session_id)
                    transcriber = None

                elif msg_type == "ping":
                    self.sessions.touch(session_id)
                    await websocket.send_json({"type": "pong"})

        except WebSocketDisconnect:
            self.logger.info("%s disconnected: %s", self.log_label, session_id)
        except Exception as exc:
            self.logger.exception("%s error: %s", self.log_label, exc)
            try:
                await websocket.send_json({"type": "error", "message": str(exc)})
            except Exception:
                pass
        finally:
            stop_transcriber(transcriber)
            self.sessions.pop(session_id)
            self.logger.info("%s session cleaned up: %s", self.log_label, session_id)
