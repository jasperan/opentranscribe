"""whisper.cpp STT model implementation via pywhispercpp."""
from typing import Optional
import logging
import os

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)


@register_model
class WhisperCppTranscriber(BaseTranscriber):
    """whisper.cpp - C++ implementation, optimized for CPU."""

    name = "whisper.cpp"
    model_id = "whisper-cpp"
    description = "C++ implementation, optimized for CPU performance"
    supports_streaming = False
    requires_gpu = False

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def load_model(self) -> None:
        """Load the whisper.cpp model."""
        from pywhispercpp.model import Model

        logger.info(f"Loading whisper.cpp model ({self.model_size})...")
        self._model = Model(self.model_size)
        logger.info("whisper.cpp model loaded successfully")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using whisper.cpp."""
        # Convert 'auto' to None
        lang = None if language in ('auto', None) else language

        # pywhispercpp returns a list of segments
        result_segments = self._model.transcribe(audio_path, language=lang)

        segments = []
        full_text_parts = []

        for seg in result_segments:
            # pywhispercpp segment has t0, t1 (in centiseconds), and text
            start_sec = seg.t0 / 100.0 if hasattr(seg, 't0') else 0
            end_sec = seg.t1 / 100.0 if hasattr(seg, 't1') else 0
            text = seg.text.strip() if hasattr(seg, 'text') else str(seg).strip()

            if text:
                segments.append(Segment(
                    start=start_sec,
                    end=end_sec,
                    text=text
                ))
                full_text_parts.append(text)

        full_text = " ".join(full_text_parts)
        if not full_text:
            full_text = "No speech detected."

        return TranscriptionResult(
            text=full_text,
            segments=segments,
            language=lang or "auto"
        )

    def is_available(self) -> bool:
        """Check if pywhispercpp is installed."""
        try:
            from pywhispercpp.model import Model
            return True
        except ImportError:
            return False
