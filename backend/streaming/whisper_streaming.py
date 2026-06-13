"""Faster-Whisper streaming transcriber with Silero VAD for real-time audio processing."""

import json
import logging
import os
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List
import threading

import numpy as np

logger = logging.getLogger(__name__)

# Configuration defaults
DEFAULT_WHISPER_MODEL = os.environ.get("WHISPER_STREAMING_MODEL", "base")
DEFAULT_DEVICE = os.environ.get("WHISPER_DEVICE", "cuda")
DEFAULT_COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "float16")


class StreamingMode(Enum):
    """Recording control modes."""
    CONTINUOUS = "continuous"  # Always transcribe
    VAD = "vad"  # Voice-activated only
    PUSH_TO_TALK = "push_to_talk"  # Manual control


@dataclass
class StreamingConfig:
    """Configuration for streaming transcription."""
    language: Optional[str] = None  # None = auto-detect
    model_size: str = DEFAULT_WHISPER_MODEL
    device: str = DEFAULT_DEVICE
    compute_type: str = DEFAULT_COMPUTE_TYPE
    mode: StreamingMode = StreamingMode.VAD

    # Audio settings
    sample_rate: int = 16000

    # VAD settings
    vad_threshold: float = 0.5
    silence_duration: float = 1.0  # seconds of silence before finalizing

    # Transcription settings
    min_audio_length: float = 0.5  # minimum seconds before transcribing
    max_buffer_length: float = 30.0  # maximum seconds to keep in buffer
    transcribe_interval: float = 0.5  # seconds between transcription attempts


@dataclass
class StreamingResult:
    """Result from streaming transcription."""
    type: str  # "ready", "vad", "partial", "final", "error", "stopped"
    text: str = ""
    confidence: float = 0.0
    duration: float = 0.0
    speaking: bool = False
    probability: float = 0.0
    message: str = ""
    model: str = ""

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"type": self.type}

        if self.type == "ready":
            result["model"] = self.model
        elif self.type == "vad":
            result["speaking"] = self.speaking
            result["probability"] = round(self.probability, 3)
        elif self.type == "partial":
            result["text"] = self.text
            result["confidence"] = round(self.confidence, 3)
        elif self.type == "final":
            result["text"] = self.text
            result["confidence"] = round(self.confidence, 3)
            result["duration"] = round(self.duration, 2)
        elif self.type == "error":
            result["message"] = self.message
        elif self.type == "stopped":
            result["total_duration"] = round(self.duration, 2)

        return result


class SileroVAD:
    """Voice Activity Detection using Silero VAD model."""

    def __init__(self, threshold: float = 0.5, sample_rate: int = 16000):
        self.threshold = threshold
        self.sample_rate = sample_rate
        self._model = None
        self._is_speaking = False

    def load(self) -> None:
        """Load the Silero VAD model."""
        if self._model is not None:
            return

        try:
            import torch
            logger.info("Loading Silero VAD model...")
            self._model, _ = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                force_reload=False,
                onnx=False,
                trust_repo=True,
            )
            self._model.eval()
            logger.info("Silero VAD model loaded")
        except Exception as e:
            logger.warning(f"Failed to load Silero VAD: {e}. VAD will be disabled.")
            self._model = None

    def is_available(self) -> bool:
        """Check if VAD is available."""
        try:
            import torch
            return True
        except ImportError:
            return False

    def reset(self) -> None:
        """Reset VAD state."""
        if self._model is not None:
            self._model.reset_states()
        self._is_speaking = False

    def process_chunk(self, audio: np.ndarray) -> tuple[bool, float]:
        """
        Process an audio chunk and return speech probability.

        Args:
            audio: Audio data (float32, mono, 16kHz)

        Returns:
            Tuple of (is_speaking, probability)
        """
        if self._model is None:
            return True, 1.0  # If no VAD, assume always speaking

        try:
            import torch

            # Ensure correct format
            if audio.dtype != np.float32:
                audio = audio.astype(np.float32)

            # VAD expects specific chunk sizes (512 samples for 16kHz)
            # Process in chunks and average
            chunk_size = 512
            probs = []

            for i in range(0, len(audio), chunk_size):
                chunk = audio[i:i + chunk_size]
                if len(chunk) < chunk_size:
                    # Pad last chunk
                    chunk = np.pad(chunk, (0, chunk_size - len(chunk)))

                tensor = torch.from_numpy(chunk)
                prob = self._model(tensor, self.sample_rate).item()
                probs.append(prob)

            avg_prob = sum(probs) / len(probs) if probs else 0.0
            is_speaking = avg_prob >= self.threshold

            return is_speaking, avg_prob

        except Exception as e:
            logger.warning(f"VAD processing error: {e}")
            return True, 1.0


class WhisperStreamingTranscriber:
    """
    Real-time streaming transcriber using faster-whisper.

    Uses a sliding window approach:
    - Accumulates audio in a buffer
    - Periodically transcribes the recent audio
    - Compares with previous transcription to detect changes
    - Sends partial results that auto-correct
    - Finalizes on silence detection
    """

    def __init__(self, config: Optional[StreamingConfig] = None):
        self.config = config or StreamingConfig()

        # Models
        self._whisper_model = None
        self._vad = SileroVAD(
            threshold=self.config.vad_threshold,
            sample_rate=self.config.sample_rate
        )

        # Session state
        self._is_recording = False
        self._start_time = 0.0
        self._last_transcribe_time = 0.0

        # Audio buffer (stores float32 samples)
        self._audio_buffer: List[np.ndarray] = []
        self._buffer_duration = 0.0

        # Transcription state
        self._last_partial = ""
        self._accumulated_text: List[str] = []
        self._current_segment_text = ""

        # VAD state
        self._is_speaking = False
        self._silence_start: Optional[float] = None
        self._speech_start: Optional[float] = None

        # Thread safety
        self._lock = threading.Lock()

    def _load_whisper(self) -> None:
        """Load the faster-whisper model with CUDA fallback to CPU."""
        if self._whisper_model is not None:
            return

        from faster_whisper import WhisperModel

        # Try configured device first, fall back to CPU
        if self.config.device == "cuda":
            try:
                import torch
                if torch.cuda.is_available():
                    logger.info(f"Loading faster-whisper model: {self.config.model_size} on cuda")
                    self._whisper_model = WhisperModel(
                        self.config.model_size,
                        device="cuda",
                        compute_type=self.config.compute_type,
                    )
                    logger.info("Faster-whisper model loaded on GPU (CUDA)")
                    return
                else:
                    logger.warning("CUDA requested but not available, falling back to CPU")
            except Exception as e:
                logger.warning(f"GPU loading failed: {e}, falling back to CPU")

        # CPU fallback
        logger.info(f"Loading faster-whisper model: {self.config.model_size} on cpu")
        self._whisper_model = WhisperModel(
            self.config.model_size,
            device="cpu",
            compute_type="int8",
        )
        logger.info("Faster-whisper model loaded on CPU")

    def is_available(self) -> bool:
        """Check if faster-whisper is available."""
        try:
            from faster_whisper import WhisperModel
            return True
        except ImportError:
            return False

    def start_session(self) -> StreamingResult:
        """Start a new streaming session."""
        if not self.is_available():
            return StreamingResult(
                type="error",
                message="faster-whisper is not installed. Run: pip install faster-whisper"
            )

        try:
            self._load_whisper()
            self._vad.load()
        except Exception as e:
            return StreamingResult(type="error", message=str(e))

        with self._lock:
            self._is_recording = True
            self._start_time = time.time()
            self._last_transcribe_time = self._start_time
            self._audio_buffer = []
            self._buffer_duration = 0.0
            self._last_partial = ""
            self._accumulated_text = []
            self._current_segment_text = ""
            self._is_speaking = False
            self._silence_start = None
            self._speech_start = None
            self._vad.reset()

        logger.info(f"Streaming session started (model: {self.config.model_size}, mode: {self.config.mode.value})")

        return StreamingResult(
            type="ready",
            model=f"faster-whisper-{self.config.model_size}"
        )

    def process_chunk(self, audio_bytes: bytes) -> List[StreamingResult]:
        """
        Process an audio chunk and return transcription results.

        Args:
            audio_bytes: Raw PCM audio data (16kHz, 16-bit signed, mono)

        Returns:
            List of StreamingResult objects
        """
        if not self._is_recording:
            return [StreamingResult(type="error", message="Session not started")]

        results = []
        current_time = time.time()

        # Convert bytes to float32 numpy array
        audio_int16 = np.frombuffer(audio_bytes, dtype=np.int16)
        audio_float32 = audio_int16.astype(np.float32) / 32768.0

        # Process VAD
        is_speaking, vad_prob = self._vad.process_chunk(audio_float32)

        with self._lock:
            # Check for speech state change
            if is_speaking != self._is_speaking:
                self._is_speaking = is_speaking
                results.append(StreamingResult(
                    type="vad",
                    speaking=is_speaking,
                    probability=vad_prob
                ))

                if is_speaking:
                    # Speech started
                    self._speech_start = current_time
                    self._silence_start = None
                else:
                    # Speech ended - start silence timer
                    self._silence_start = current_time

            # Add to buffer based on mode
            should_buffer = False
            if self.config.mode == StreamingMode.CONTINUOUS:
                should_buffer = True
            elif self.config.mode == StreamingMode.VAD:
                # Buffer during speech and a bit after
                if is_speaking or (self._silence_start and
                    current_time - self._silence_start < self.config.silence_duration):
                    should_buffer = True
            elif self.config.mode == StreamingMode.PUSH_TO_TALK:
                should_buffer = True  # Controlled externally

            if should_buffer:
                self._audio_buffer.append(audio_float32)
                self._buffer_duration += len(audio_float32) / self.config.sample_rate

                # Trim buffer if too long
                while self._buffer_duration > self.config.max_buffer_length:
                    if self._audio_buffer:
                        removed = self._audio_buffer.pop(0)
                        self._buffer_duration -= len(removed) / self.config.sample_rate
                    else:
                        break

            # Check if we should transcribe
            should_transcribe = False
            time_since_last = current_time - self._last_transcribe_time

            if (self._buffer_duration >= self.config.min_audio_length and
                time_since_last >= self.config.transcribe_interval):
                should_transcribe = True

            # Check for finalization (silence after speech)
            should_finalize = False
            if (self._silence_start and not is_speaking and
                current_time - self._silence_start >= self.config.silence_duration and
                self._buffer_duration > 0):
                should_finalize = True
                should_transcribe = True

        # Transcribe if needed (outside lock for performance)
        if should_transcribe and self._audio_buffer:
            transcription_result = self._transcribe_buffer(finalize=should_finalize)
            if transcription_result:
                results.append(transcription_result)

            with self._lock:
                self._last_transcribe_time = current_time

                if should_finalize:
                    # Clear buffer after finalization
                    if self._current_segment_text:
                        self._accumulated_text.append(self._current_segment_text)
                    self._audio_buffer = []
                    self._buffer_duration = 0.0
                    self._current_segment_text = ""
                    self._last_partial = ""
                    self._speech_start = None
                    self._silence_start = None

        return results

    def _transcribe_buffer(self, finalize: bool = False) -> Optional[StreamingResult]:
        """Transcribe the current audio buffer."""
        try:
            with self._lock:
                if not self._audio_buffer:
                    return None
                audio = np.concatenate(self._audio_buffer)
                last_partial = self._last_partial

            # Transcribe with faster-whisper
            segments, info = self._whisper_model.transcribe(
                audio,
                language=self.config.language,
                beam_size=5 if finalize else 1,  # More accurate for final
                best_of=5 if finalize else 1,
                vad_filter=False,  # We handle VAD ourselves
                word_timestamps=False,
            )

            # Collect text from segments
            text_parts = []
            total_confidence = 0.0
            segment_count = 0

            for segment in segments:
                text_parts.append(segment.text.strip())
                # Approximate confidence from avg_logprob
                confidence = min(1.0, max(0.0, 1.0 + segment.avg_logprob / 5.0))
                total_confidence += confidence
                segment_count += 1

            text = " ".join(text_parts).strip()
            avg_confidence = total_confidence / segment_count if segment_count > 0 else 0.0

            if not text:
                return None

            with self._lock:
                duration = self._buffer_duration

                if finalize:
                    self._current_segment_text = text
                    return StreamingResult(
                        type="final",
                        text=text,
                        confidence=avg_confidence,
                        duration=duration
                    )
                else:
                    # Only send if text changed
                    if text != last_partial:
                        self._last_partial = text
                        self._current_segment_text = text
                        return StreamingResult(
                            type="partial",
                            text=text,
                            confidence=avg_confidence
                        )

            return None

        except Exception as e:
            logger.error(f"Transcription error: {e}")
            return StreamingResult(type="error", message=str(e))

    def stop_session(self) -> StreamingResult:
        """Stop the streaming session."""
        if not self._is_recording:
            return StreamingResult(type="error", message="No active session")

        # Final transcription of any remaining audio
        final_text = ""
        if self._audio_buffer:
            result = self._transcribe_buffer(finalize=True)
            if result and result.text:
                final_text = result.text

        with self._lock:
            if final_text:
                self._accumulated_text.append(final_text)

            total_text = " ".join(self._accumulated_text)
            duration = time.time() - self._start_time

            self._is_recording = False
            self._audio_buffer = []
            self._buffer_duration = 0.0

        logger.info(f"Streaming session stopped (duration: {duration:.1f}s)")

        return StreamingResult(
            type="stopped",
            text=total_text,
            duration=duration
        )

    def force_finalize(self) -> Optional[StreamingResult]:
        """Force finalization of current buffer (for push-to-talk release)."""
        if not self._is_recording or not self._audio_buffer:
            return None

        result = self._transcribe_buffer(finalize=True)

        with self._lock:
            if result and result.text:
                self._accumulated_text.append(result.text)
            self._audio_buffer = []
            self._buffer_duration = 0.0
            self._current_segment_text = ""
            self._last_partial = ""

        return result

    @property
    def is_recording(self) -> bool:
        """Whether a recording session is active."""
        return self._is_recording

    @property
    def is_speaking(self) -> bool:
        """Whether speech is currently detected."""
        return self._is_speaking

    def get_full_text(self) -> str:
        """Get all accumulated text from the session."""
        with self._lock:
            parts = self._accumulated_text.copy()
            if self._current_segment_text:
                parts.append(self._current_segment_text)
            return " ".join(parts)
