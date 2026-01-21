"""Vosk STT model implementation."""
from typing import Optional
import logging
import os
import json
import wave

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)

# Default model paths
VOSK_MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", os.path.expanduser("~/.cache/vosk"))
VOSK_MODEL_NAME = "vosk-model-small-en-us-0.15"


@register_model
class VoskTranscriber(BaseTranscriber):
    """Vosk - lightweight, fast, streaming-capable STT."""

    name = "Vosk"
    model_id = "vosk"
    description = "Lightweight (~50MB), fast, supports streaming"
    supports_streaming = True
    requires_gpu = False

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self._model = None

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

            wf.close()

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
