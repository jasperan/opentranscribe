"""Faster Whisper STT model implementation."""
from typing import Optional
import logging
import os

# Set up CUDA library paths for ctranslate2
def _setup_cuda_paths():
    try:
        import nvidia.cublas.lib
        import nvidia.cudnn.lib

        # Get library paths - handle both regular modules and namespace packages
        if hasattr(nvidia.cublas.lib, '__file__') and nvidia.cublas.lib.__file__:
            cuda_lib_path = os.path.dirname(nvidia.cublas.lib.__file__)
        elif hasattr(nvidia.cublas.lib, '__path__'):
            cuda_lib_path = list(nvidia.cublas.lib.__path__)[0]
        else:
            cuda_lib_path = None

        if hasattr(nvidia.cudnn.lib, '__file__') and nvidia.cudnn.lib.__file__:
            cudnn_lib_path = os.path.dirname(nvidia.cudnn.lib.__file__)
        elif hasattr(nvidia.cudnn.lib, '__path__'):
            cudnn_lib_path = list(nvidia.cudnn.lib.__path__)[0]
        else:
            cudnn_lib_path = None

        paths = [p for p in [cuda_lib_path, cudnn_lib_path] if p]
        if paths:
            existing_path = os.environ.get("LD_LIBRARY_PATH", "")
            new_path = ":".join(paths)
            if new_path not in existing_path:
                os.environ["LD_LIBRARY_PATH"] = f"{new_path}:{existing_path}" if existing_path else new_path
    except ImportError:
        pass  # CUDA libraries not installed

_setup_cuda_paths()

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)


@register_model
class FasterWhisperTranscriber(BaseTranscriber):
    """Faster Whisper - 4x faster than OpenAI Whisper with same accuracy."""

    name = "Faster Whisper"
    model_id = "faster-whisper"
    description = "4x faster than OpenAI Whisper, same accuracy, lower memory"
    supports_streaming = False
    requires_gpu = False  # Works on both CPU and GPU

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._model = None

    def load_model(self) -> None:
        """Load the Faster Whisper model."""
        from faster_whisper import WhisperModel
        import torch

        logger.info(f"Loading Faster Whisper model ({self.model_size})...")

        # Try GPU first, fall back to CPU
        if torch.cuda.is_available():
            try:
                self._model = WhisperModel(
                    self.model_size,
                    device="cuda",
                    compute_type="float16"
                )
                logger.info("Faster Whisper model loaded on GPU (CUDA)")
                return
            except Exception as e:
                logger.warning(f"GPU loading failed: {e}, falling back to CPU")

        # CPU fallback
        self._model = WhisperModel(
            self.model_size,
            device="cpu",
            compute_type="int8"
        )
        logger.info("Faster Whisper model loaded on CPU")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using Faster Whisper."""
        # Convert 'auto' to None
        lang = None if language in ('auto', None) else language

        segments_gen, info = self._model.transcribe(
            audio_path,
            language=lang,
            beam_size=5,
            vad_filter=True
        )

        segments = []
        full_text_parts = []

        for seg in segments_gen:
            segments.append(Segment(
                start=seg.start,
                end=seg.end,
                text=seg.text.strip(),
                confidence=seg.avg_logprob if hasattr(seg, 'avg_logprob') else 0.0,
            ))
            full_text_parts.append(seg.text.strip())

        full_text = " ".join(full_text_parts)
        if not full_text:
            full_text = "No speech detected."

        return TranscriptionResult(
            text=full_text,
            segments=segments,
            language=info.language or "unknown",
            language_confidence=info.language_probability if hasattr(info, 'language_probability') else 0.0,
        )

    def is_available(self) -> bool:
        """Check if faster-whisper is installed."""
        try:
            import faster_whisper
            return True
        except ImportError:
            return False
