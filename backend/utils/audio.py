"""Audio processing utilities."""
import tempfile
import os
from typing import Optional


def convert_to_wav(audio_path: str, sample_rate: int = 16000) -> str:
    """
    Convert audio file to WAV format with specified sample rate.

    Args:
        audio_path: Path to input audio file
        sample_rate: Target sample rate (default 16000 for most models)

    Returns:
        Path to converted WAV file (temporary file)
    """
    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_frame_rate(sample_rate).set_channels(1)

        # Create temp file
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp_path = tmp_file.name
        tmp_file.close()

        audio.export(tmp_path, format="wav")
        return tmp_path

    except ImportError:
        # If pydub not available, return original path and hope it works
        return audio_path


def get_audio_duration(audio_path: str) -> Optional[float]:
    """
    Get duration of audio file in seconds.

    Args:
        audio_path: Path to audio file

    Returns:
        Duration in seconds, or None if unable to determine
    """
    try:
        from pydub import AudioSegment
        audio = AudioSegment.from_file(audio_path)
        return len(audio) / 1000.0  # Convert ms to seconds
    except Exception:
        return None
