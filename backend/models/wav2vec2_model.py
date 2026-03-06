"""Wav2Vec2 STT model implementation via HuggingFace Transformers."""
from typing import Optional
import logging

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)

# M2: Language-aware model selection
WAV2VEC2_MODELS: dict[str, str] = {
    "en": "facebook/wav2vec2-base-960h",
    "fr": "facebook/wav2vec2-large-xlsr-53-french",
    "de": "facebook/wav2vec2-large-xlsr-53-german",
    "es": "facebook/wav2vec2-large-xlsr-53-spanish",
    "it": "facebook/wav2vec2-large-xlsr-53-italian",
    "pt": "facebook/wav2vec2-large-xlsr-53-portuguese",
    "nl": "facebook/wav2vec2-large-xlsr-53-dutch",
    "multilingual": "facebook/wav2vec2-large-xlsr-53",
}
DEFAULT_WAV2VEC2_MODEL = "facebook/wav2vec2-base-960h"


@register_model
class Wav2Vec2Transcriber(BaseTranscriber):
    """Wav2Vec2 - HuggingFace Transformers-based ASR."""

    name = "Wav2Vec2"
    model_id = "wav2vec2"
    description = "HuggingFace Transformers model, supports multilingual via XLSR"
    supports_streaming = False
    requires_gpu = False

    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model_name = DEFAULT_WAV2VEC2_MODEL
        self._model = None
        self._processor = None
        self._loaded_model_name: Optional[str] = None

    def _resolve_model_name(self, language: Optional[str]) -> str:
        """Resolve the model name based on language code."""
        if language and language in WAV2VEC2_MODELS:
            return WAV2VEC2_MODELS[language]
        return DEFAULT_WAV2VEC2_MODEL

    def load_model(self) -> None:
        """Load the Wav2Vec2 model and processor."""
        self._load_model_for_language(None)

    def _load_model_for_language(self, language: Optional[str]) -> None:
        """Load (or reload) the model for a specific language."""
        from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
        import torch

        target_model = self._resolve_model_name(language)

        # Skip reload if same model already loaded
        if self._loaded_model_name == target_model and self._model is not None:
            return

        logger.info(f"Loading Wav2Vec2 model ({target_model})...")
        self._processor = Wav2Vec2Processor.from_pretrained(target_model)
        self._model = Wav2Vec2ForCTC.from_pretrained(target_model)

        if torch.cuda.is_available():
            self._model = self._model.cuda()

        self._model.eval()
        self._loaded_model_name = target_model
        logger.info("Wav2Vec2 model loaded successfully")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using Wav2Vec2."""
        import torch
        import numpy as np

        # M2: Reload model if language requires a different checkpoint
        self._load_model_for_language(language)

        # Load audio using soundfile (more reliable than torchaudio)
        try:
            import soundfile as sf
            waveform, sample_rate = sf.read(audio_path)
        except Exception:
            # Fallback to pydub for format conversion
            from pydub import AudioSegment
            audio = AudioSegment.from_file(audio_path)
            audio = audio.set_frame_rate(16000).set_channels(1)
            waveform = np.array(audio.get_array_of_samples(), dtype=np.float32) / 32768.0
            sample_rate = 16000

        # Convert to numpy if needed
        if not isinstance(waveform, np.ndarray):
            waveform = np.array(waveform)

        # Ensure float32
        waveform = waveform.astype(np.float32)

        # Resample to 16kHz if needed
        if sample_rate != 16000:
            import torchaudio
            waveform_tensor = torch.from_numpy(waveform)
            if waveform_tensor.dim() == 1:
                waveform_tensor = waveform_tensor.unsqueeze(0)
            resampler = torchaudio.transforms.Resample(sample_rate, 16000)
            waveform_tensor = resampler(waveform_tensor)
            waveform = waveform_tensor.squeeze().numpy()

        # Convert to mono if stereo
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)

        # Process through model
        inputs = self._processor(
            waveform,
            sampling_rate=16000,
            return_tensors="pt",
            padding=True
        )

        if torch.cuda.is_available():
            inputs = {k: v.cuda() for k, v in inputs.items()}

        with torch.no_grad():
            logits = self._model(**inputs).logits

        # Decode
        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = self._processor.batch_decode(predicted_ids)[0]

        full_text = transcription.strip()
        if not full_text:
            full_text = "No speech detected."

        # Wav2Vec2 doesn't provide timestamps by default
        return TranscriptionResult(
            text=full_text,
            segments=[],  # No segment-level timestamps
            language=language or "en"
        )

    def is_available(self) -> bool:
        """Check if transformers and torchaudio are installed."""
        try:
            from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
            import torchaudio
            return True
        except ImportError:
            return False
