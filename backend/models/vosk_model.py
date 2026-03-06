"""Vosk STT model implementation."""
from typing import Optional
import logging
import os
import json
import hashlib
import wave

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)

# Default model paths
VOSK_MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", os.path.expanduser("~/.cache/vosk"))
VOSK_MODEL_NAME = "vosk-model-small-en-us-0.15"
VOSK_MODEL_URL = f"https://alphacephei.com/vosk/models/{VOSK_MODEL_NAME}.zip"
# m2: SHA-256 checksum for download integrity validation
VOSK_MODEL_SHA256 = os.environ.get("VOSK_MODEL_SHA256", "")


@register_model
class VoskTranscriber(BaseTranscriber):
    """Vosk - lightweight, fast, streaming-capable STT."""

    name = "Vosk"
    model_id = "vosk"
    description = "Lightweight (~50MB), fast, supports streaming"
    supports_streaming = True
    requires_gpu = False

    def __init__(self, model_size: str = "small"):
        self.model_size = model_size
        self.model_path: Optional[str] = None
        self._model = None

    def _verify_checksum(self, file_path: str) -> bool:
        """Verify SHA-256 checksum of downloaded file."""
        if not VOSK_MODEL_SHA256:
            logger.warning("No checksum configured for Vosk model (set VOSK_MODEL_SHA256 to enable)")
            return True

        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        actual = sha256.hexdigest()
        if actual != VOSK_MODEL_SHA256:
            logger.error(f"Checksum mismatch: expected {VOSK_MODEL_SHA256}, got {actual}")
            return False
        logger.info("Vosk model checksum verified")
        return True

    def _get_model_path(self) -> str:
        """Get or download the Vosk model."""
        if self.model_path and os.path.exists(self.model_path):
            return self.model_path

        # Check default location
        default_path = os.path.join(VOSK_MODEL_PATH, VOSK_MODEL_NAME)
        if os.path.exists(default_path):
            return default_path

        # Download model
        logger.info("Downloading Vosk model...")
        os.makedirs(VOSK_MODEL_PATH, exist_ok=True)

        import urllib.request
        import zipfile

        zip_path = os.path.join(VOSK_MODEL_PATH, f"{VOSK_MODEL_NAME}.zip")

        urllib.request.urlretrieve(VOSK_MODEL_URL, zip_path)

        # m2: Verify checksum before extracting
        if not self._verify_checksum(zip_path):
            os.remove(zip_path)
            raise RuntimeError("Vosk model download failed checksum verification")

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
        logger.info(f"Loading Vosk model from {model_path}...")
        self._model = Model(model_path)
        logger.info("Vosk model loaded successfully")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using Vosk."""
        from vosk import KaldiRecognizer

        # Vosk requires WAV format at specific sample rate
        try:
            from ..utils.audio import convert_to_wav
        except ImportError:
            from utils.audio import convert_to_wav
        wav_path = convert_to_wav(audio_path, sample_rate=16000)

        wf = None
        try:
            wf = wave.open(wav_path, "rb")

            # Verify format
            if wf.getnchannels() != 1 or wf.getsampwidth() != 2 or wf.getframerate() != 16000:
                raise ValueError("Audio must be mono WAV at 16kHz")

            rec = KaldiRecognizer(self._model, wf.getframerate())
            rec.SetWords(True)

            results = []
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    if result.get("text"):
                        results.append(result)

            # Get final result
            final_result = json.loads(rec.FinalResult())
            if final_result.get("text"):
                results.append(final_result)

            # Build segments and full text
            segments = []
            full_text_parts = []

            for res in results:
                text = res.get("text", "").strip()
                if text:
                    full_text_parts.append(text)

                    # Extract word-level timing if available
                    if "result" in res:
                        for word_info in res["result"]:
                            segments.append(Segment(
                                start=word_info.get("start", 0),
                                end=word_info.get("end", 0),
                                text=word_info.get("word", "")
                            ))

            full_text = " ".join(full_text_parts)
            if not full_text:
                full_text = "No speech detected."

            return TranscriptionResult(
                text=full_text,
                segments=segments,
                language=language or "en"  # Vosk models are language-specific
            )

        finally:
            # Close the wave file handle
            if wf is not None:
                try:
                    wf.close()
                except Exception:
                    pass
            # Clean up temp file if we created one
            if wav_path != audio_path and os.path.exists(wav_path):
                os.unlink(wav_path)

    def is_available(self) -> bool:
        """Check if vosk is installed."""
        try:
            import vosk
            return True
        except ImportError:
            return False
