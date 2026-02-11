"""Base transcriber interface for all STT models."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional
import os
import time


@dataclass
class Segment:
    """A timestamped segment of transcription."""
    start: float  # Start time in seconds
    end: float    # End time in seconds
    text: str     # Transcribed text


@dataclass
class TranscriptionResult:
    """Result from a transcription operation."""
    text: str                           # Full transcription text
    segments: list[Segment] = field(default_factory=list)  # Timestamped segments
    language: str = "unknown"           # Detected/used language
    model_name: str = "unknown"         # Which model produced this
    duration: float = 0.0               # Processing time in seconds


class BaseTranscriber(ABC):
    """Abstract base class for all STT model implementations."""

    name: str = "Base Transcriber"
    model_id: str = "base"
    description: str = "Base transcriber interface"
    supports_streaming: bool = False
    requires_gpu: bool = False

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

    @abstractmethod
    def load_model(self) -> None:
        """Load the model into memory. Called lazily on first transcribe."""
        pass

    @abstractmethod
    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Internal transcription method. Implement in subclasses."""
        pass

    def transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """
        Transcribe an audio file.

        Args:
            audio_path: Path to audio file
            language: Optional language code (e.g., 'en', 'es'). None for auto-detect.

        Returns:
            TranscriptionResult with text, segments, and metadata

        Raises:
            RuntimeError: If the model fails to load
            FileNotFoundError: If the audio file does not exist
        """
        if not os.path.isfile(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        # Ensure model is loaded
        if self._model is None:
            try:
                self.load_model()
            except Exception as e:
                raise RuntimeError(f"Failed to load model '{self.name}': {e}") from e
            if self._model is None:
                raise RuntimeError(f"Model '{self.name}' failed to initialize (model is None after load)")

        # Time the transcription
        start_time = time.time()
        result = self._transcribe(audio_path, language)
        result.duration = time.time() - start_time
        result.model_name = self.name

        return result

    @abstractmethod
    def is_available(self) -> bool:
        """Check if this model's dependencies are installed and available."""
        pass

    def get_info(self) -> dict:
        """Get model information as a dictionary."""
        return {
            "id": self.model_id,
            "name": self.name,
            "description": self.description,
            "available": self.is_available(),
            "requires_gpu": self.requires_gpu,
            "supports_streaming": self.supports_streaming,
        }
