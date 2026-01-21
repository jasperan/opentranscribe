"""Wav2Vec2 STT model implementation via HuggingFace Transformers."""
from typing import Optional
import logging

from . import register_model
from .base import BaseTranscriber, TranscriptionResult, Segment

logger = logging.getLogger(__name__)


@register_model
class Wav2Vec2Transcriber(BaseTranscriber):
    """Wav2Vec2 - HuggingFace Transformers-based ASR."""

    name = "Wav2Vec2"
    model_id = "wav2vec2"
    description = "HuggingFace Transformers model, good for fine-tuning"
    supports_streaming = False
    requires_gpu = False

    def __init__(self, model_name: str = "facebook/wav2vec2-base-960h"):
        self.model_name = model_name
        self._model = None
        self._processor = None

    def load_model(self) -> None:
        """Load the Wav2Vec2 model and processor."""
        from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC
        import torch

        logger.info(f"Loading Wav2Vec2 model ({self.model_name})...")

        self._processor = Wav2Vec2Processor.from_pretrained(self.model_name)
        self._model = Wav2Vec2ForCTC.from_pretrained(self.model_name)

        # Move to GPU if available
        if torch.cuda.is_available():
            self._model = self._model.cuda()

        self._model.eval()
        logger.info("Wav2Vec2 model loaded successfully")

    def _transcribe(self, audio_path: str, language: Optional[str] = None) -> TranscriptionResult:
        """Transcribe audio using Wav2Vec2."""
        import torch
        import numpy as np

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
