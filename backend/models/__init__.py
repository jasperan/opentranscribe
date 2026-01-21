"""Model registry and factory for STT models."""
from typing import Optional
import logging

from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)

# Registry of all available model classes
_MODEL_CLASSES: dict[str, type[BaseTranscriber]] = {}

# Cached model instances
_MODEL_INSTANCES: dict[str, BaseTranscriber] = {}


def register_model(model_class: type[BaseTranscriber]) -> type[BaseTranscriber]:
    """Decorator to register a model class."""
    _MODEL_CLASSES[model_class.model_id] = model_class
    return model_class


def get_model(model_id: str) -> BaseTranscriber:
    """
    Get a model instance by ID. Caches instances for reuse.

    Args:
        model_id: The model identifier (e.g., 'faster-whisper', 'vosk')

    Returns:
        Transcriber instance

    Raises:
        ValueError: If model_id is not found
    """
    if model_id not in _MODEL_CLASSES:
        available = list(_MODEL_CLASSES.keys())
        raise ValueError(f"Unknown model: {model_id}. Available: {available}")

    if model_id not in _MODEL_INSTANCES:
        _MODEL_INSTANCES[model_id] = _MODEL_CLASSES[model_id]()

    return _MODEL_INSTANCES[model_id]


def list_models() -> list[dict]:
    """List all registered models with their info."""
    models = []
    for model_id, model_class in _MODEL_CLASSES.items():
        try:
            instance = get_model(model_id)
            models.append(instance.get_info())
        except Exception as e:
            logger.warning(f"Error getting info for {model_id}: {e}")
            models.append({
                "id": model_id,
                "name": model_class.name,
                "available": False,
                "error": str(e)
            })
    return models


def get_available_models() -> list[str]:
    """Get list of model IDs that are currently available."""
    available = []
    for model_id in _MODEL_CLASSES:
        try:
            if get_model(model_id).is_available():
                available.append(model_id)
        except Exception:
            pass
    return available


def get_default_model() -> str:
    """Get the default model ID (faster-whisper if available, else first available)."""
    available = get_available_models()
    if "faster-whisper" in available:
        return "faster-whisper"
    if available:
        return available[0]
    return "openai-whisper"  # Fallback


# Import all model implementations to register them
from . import faster_whisper_model
from . import openai_whisper_model
from . import vosk_model
from . import whisper_cpp_model
from . import wav2vec2_model

__all__ = [
    "BaseTranscriber",
    "TranscriptionResult",
    "Segment",
    "register_model",
    "get_model",
    "list_models",
    "get_available_models",
    "get_default_model",
]
