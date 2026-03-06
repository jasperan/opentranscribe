"""Model registry and factory for STT models."""
from typing import Optional
import logging
import os
import time

from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)

# Registry of all available model classes
_MODEL_CLASSES: dict[str, type[BaseTranscriber]] = {}

# Cached model instances with LRU tracking (C3)
_MODEL_INSTANCES: dict[str, BaseTranscriber] = {}
_MODEL_LAST_USED: dict[str, float] = {}  # model_id -> last access timestamp
MAX_CACHED_MODELS = int(os.environ.get("MAX_CACHED_MODELS", "3"))
MODEL_IDLE_TIMEOUT = int(os.environ.get("MODEL_IDLE_TIMEOUT", "1800"))  # 30 min

# M12: Cache failed model loads to avoid hammering on every request
_MODEL_FAILURES: dict[str, tuple[float, str]] = {}
_FAILURE_COOLDOWN = 300  # 5 minutes before retrying a failed model


def register_model(model_class: type[BaseTranscriber]) -> type[BaseTranscriber]:
    """Decorator to register a model class."""
    _MODEL_CLASSES[model_class.model_id] = model_class
    return model_class


def _evict_lru_models() -> None:
    """Evict least-recently-used models when cache exceeds MAX_CACHED_MODELS."""
    now = time.time()

    # First, evict any models that have been idle too long
    idle_models = [
        mid for mid, ts in _MODEL_LAST_USED.items()
        if now - ts > MODEL_IDLE_TIMEOUT
    ]
    for mid in idle_models:
        logger.info(f"Evicting idle model '{mid}' (idle {int(now - _MODEL_LAST_USED[mid])}s)")
        _MODEL_INSTANCES.pop(mid, None)
        _MODEL_LAST_USED.pop(mid, None)

    # Then, if still over limit, evict LRU
    while len(_MODEL_INSTANCES) > MAX_CACHED_MODELS:
        lru_id = min(_MODEL_LAST_USED, key=_MODEL_LAST_USED.get)
        logger.info(f"Evicting LRU model '{lru_id}' (cache full, max={MAX_CACHED_MODELS})")
        _MODEL_INSTANCES.pop(lru_id, None)
        _MODEL_LAST_USED.pop(lru_id, None)


def get_model(model_id: str) -> BaseTranscriber:
    """Get a model instance by ID. Caches instances with LRU eviction."""
    if model_id not in _MODEL_CLASSES:
        available = list(_MODEL_CLASSES.keys())
        raise ValueError(f"Unknown model: {model_id}. Available: {available}")

    # Check if this model recently failed
    if model_id in _MODEL_FAILURES:
        fail_time, error_msg = _MODEL_FAILURES[model_id]
        if time.time() - fail_time < _FAILURE_COOLDOWN:
            remaining = int(_FAILURE_COOLDOWN - (time.time() - fail_time))
            raise RuntimeError(f"Model '{model_id}' recently failed: {error_msg}. Retry in {remaining}s.")
        del _MODEL_FAILURES[model_id]

    if model_id not in _MODEL_INSTANCES:
        # Evict before loading new model
        _evict_lru_models()
        try:
            _MODEL_INSTANCES[model_id] = _MODEL_CLASSES[model_id]()
        except Exception as e:
            _MODEL_FAILURES[model_id] = (time.time(), str(e))
            raise

    # Track access time for LRU
    _MODEL_LAST_USED[model_id] = time.time()
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
