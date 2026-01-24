"""Vosk streaming transcriber for real-time audio processing."""

import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum

logger = logging.getLogger(__name__)

# Default model paths (same as vosk_model.py)
VOSK_MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", os.path.expanduser("~/.cache/vosk"))
VOSK_MODEL_NAME = "vosk-model-small-en-us-0.15"


class RecordingMode(Enum):
    """Recording control modes."""
    PUSH_TO_TALK = "push_to_talk"
    TOGGLE = "toggle"
    VAD = "vad"
    TOGGLE_VAD = "toggle_vad"


class OutputMode(Enum):
    """Output handling modes."""
    DISPLAY = "display"
    AUTO_SAVE = "auto_save"
    CLIPBOARD = "clipboard"


@dataclass
class StreamingConfig:
    """Configuration for streaming transcription."""
    language: str = "en"
    recording_mode: RecordingMode = RecordingMode.TOGGLE
    output_mode: OutputMode = OutputMode.DISPLAY
    vad_enabled: bool = False
    silence_timeout: float = 1.5  # seconds of silence before auto-stop
    sample_rate: int = 16000
    chunk_size: int = 4000  # bytes per chunk


@dataclass
class StreamingResult:
    """Result from streaming transcription."""
    type: str  # "partial", "final", "vad", "ready", "error", "saved"
    text: str = ""
    confidence: float = 0.0
    timestamp: float = 0.0
    speaking: bool = False
    message: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"type": self.type}
        if self.type in ("partial", "final"):
            result["text"] = self.text
            if self.type == "final":
                result["confidence"] = self.confidence
                result["timestamp"] = self.timestamp
        elif self.type == "vad":
            result["speaking"] = self.speaking
        elif self.type == "error":
            result["message"] = self.message
        elif self.type == "saved":
            result["message"] = self.message
        return result


class VoskStreamingTranscriber:
    """Real-time streaming transcriber using Vosk."""

    def __init__(self, config: Optional[StreamingConfig] = None):
        self.config = config or StreamingConfig()
        self._model = None
        self._recognizer = None
        self._is_recording = False
        self._start_time = 0.0
        self._last_speech_time = 0.0
        self._accumulated_text: list[str] = []
        self._current_partial = ""

        # VAD state
        self._is_speaking = False
        self._silence_start: Optional[float] = None

    def _get_model_path(self) -> str:
        """Get the Vosk model path."""
        # Check environment variable first
        env_path = os.environ.get("VOSK_MODEL_PATH")
        if env_path and os.path.exists(env_path):
            # Check if it's a direct model path or a cache directory
            if os.path.exists(os.path.join(env_path, "conf")):
                return env_path

        # Check default location
        default_path = os.path.join(VOSK_MODEL_PATH, VOSK_MODEL_NAME)
        if os.path.exists(default_path):
            return default_path

        # Download model if not found
        logger.info("Downloading Vosk model for streaming...")
        os.makedirs(VOSK_MODEL_PATH, exist_ok=True)

        import urllib.request
        import zipfile

        url = f"https://alphacephei.com/vosk/models/{VOSK_MODEL_NAME}.zip"
        zip_path = os.path.join(VOSK_MODEL_PATH, f"{VOSK_MODEL_NAME}.zip")

        urllib.request.urlretrieve(url, zip_path)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(VOSK_MODEL_PATH)

        os.remove(zip_path)
        logger.info(f"Vosk model downloaded to {default_path}")

        return default_path

    def load_model(self) -> None:
        """Load the Vosk model."""
        from vosk import Model, SetLogLevel

        SetLogLevel(-1)  # Suppress Vosk logs

        model_path = self._get_model_path()
        logger.info(f"Loading Vosk streaming model from {model_path}...")
        self._model = Model(model_path)
        logger.info("Vosk streaming model loaded")

    def is_available(self) -> bool:
        """Check if Vosk is installed."""
        try:
            import vosk
            return True
        except ImportError:
            return False

    def start_session(self) -> StreamingResult:
        """Start a new streaming session."""
        from vosk import KaldiRecognizer

        if self._model is None:
            self.load_model()

        self._recognizer = KaldiRecognizer(self._model, self.config.sample_rate)
        self._recognizer.SetWords(True)

        self._is_recording = True
        self._start_time = time.time()
        self._last_speech_time = self._start_time
        self._accumulated_text = []
        self._current_partial = ""
        self._is_speaking = False
        self._silence_start = None

        logger.info(f"Streaming session started (mode: {self.config.recording_mode.value})")
        return StreamingResult(type="ready")

    def process_chunk(self, audio_bytes: bytes) -> list[StreamingResult]:
        """
        Process an audio chunk and return transcription results.

        Args:
            audio_bytes: Raw PCM audio data (16kHz, 16-bit, mono)

        Returns:
            List of StreamingResult objects (may include partial, final, vad events)
        """
        if not self._is_recording or self._recognizer is None:
            return [StreamingResult(type="error", message="Session not started")]

        results = []
        current_time = time.time() - self._start_time

        # Process audio through Vosk
        if self._recognizer.AcceptWaveform(audio_bytes):
            # Final result for this utterance
            result = json.loads(self._recognizer.Result())
            text = result.get("text", "").strip()

            if text:
                self._accumulated_text.append(text)
                self._last_speech_time = time.time()
                self._current_partial = ""

                # Calculate confidence from word-level results
                confidence = 1.0
                if "result" in result:
                    confs = [w.get("conf", 1.0) for w in result["result"]]
                    if confs:
                        confidence = sum(confs) / len(confs)

                results.append(StreamingResult(
                    type="final",
                    text=text,
                    confidence=confidence,
                    timestamp=current_time
                ))

                # VAD: speech detected
                if self.config.vad_enabled and not self._is_speaking:
                    self._is_speaking = True
                    self._silence_start = None
                    results.append(StreamingResult(type="vad", speaking=True))
        else:
            # Partial result
            partial = json.loads(self._recognizer.PartialResult())
            text = partial.get("partial", "").strip()

            if text and text != self._current_partial:
                self._current_partial = text
                self._last_speech_time = time.time()
                results.append(StreamingResult(type="partial", text=text))

                # VAD: speech detected
                if self.config.vad_enabled and not self._is_speaking:
                    self._is_speaking = True
                    self._silence_start = None
                    results.append(StreamingResult(type="vad", speaking=True))

        # VAD: check for silence timeout
        if self.config.vad_enabled and self._is_speaking:
            silence_duration = time.time() - self._last_speech_time

            if silence_duration > self.config.silence_timeout:
                self._is_speaking = False
                self._silence_start = time.time()
                results.append(StreamingResult(type="vad", speaking=False))

        return results

    def stop_session(self) -> StreamingResult:
        """Stop the streaming session and return final accumulated text."""
        if not self._is_recording:
            return StreamingResult(type="error", message="No active session")

        # Get any remaining text
        if self._recognizer:
            final = json.loads(self._recognizer.FinalResult())
            text = final.get("text", "").strip()
            if text:
                self._accumulated_text.append(text)

        self._is_recording = False
        full_text = " ".join(self._accumulated_text)
        duration = time.time() - self._start_time

        logger.info(f"Streaming session ended (duration: {duration:.1f}s, words: {len(full_text.split())})")

        return StreamingResult(
            type="final",
            text=full_text,
            timestamp=duration
        )

    def reset(self) -> None:
        """Reset the recognizer for a new utterance within the same session."""
        from vosk import KaldiRecognizer

        if self._model is not None:
            self._recognizer = KaldiRecognizer(self._model, self.config.sample_rate)
            self._recognizer.SetWords(True)
            self._current_partial = ""

    def get_accumulated_text(self) -> str:
        """Get all accumulated text from the session."""
        parts = self._accumulated_text.copy()
        if self._current_partial:
            parts.append(self._current_partial)
        return " ".join(parts)

    @property
    def is_recording(self) -> bool:
        """Whether a recording session is active."""
        return self._is_recording

    @property
    def is_speaking(self) -> bool:
        """Whether speech is currently detected (VAD)."""
        return self._is_speaking
