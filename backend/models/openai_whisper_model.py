"""OpenAI Whisper STT model implementation."""
from typing import Optional
import logging

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)


@register_model
class OpenAIWhisperTranscriber(BaseTranscriber):
    """Original OpenAI Whisper model."""

    name = "OpenAI Whisper"
    model_id = "openai-whisper"
    description = "Original OpenAI Whisper model, high accuracy"
    supports_streaming = False
    requires_gpu = False

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def load_model(self) -> None:
        """Load the OpenAI Whisper model."""
        import whisper

        logger.info(f"Loading OpenAI Whisper model ({self.model_size})...")
        self._model = whisper.load_model(self.model_size)
        logger.info("OpenAI Whisper model loaded successfully")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using OpenAI Whisper."""
        # Convert 'auto' to None
        lang = None if language in ('auto', None) else language

        result = self._model.transcribe(audio_path, language=lang)

        segments = []
        if "segments" in result:
            for seg in result["segments"]:
                segments.append(Segment(
                    start=seg["start"],
                    end=seg["end"],
                    text=seg["text"].strip()
                ))

        full_text = result["text"].strip()
        if not full_text:
            full_text = "No speech detected."

        return TranscriptionResult(
            text=full_text,
            segments=segments,
            language=result.get("language", "unknown")
        )

    def is_available(self) -> bool:
        """Check if openai-whisper is installed."""
        try:
            import whisper
            return True
        except ImportError:
            return False
