"""Audio processing utilities."""
import tempfile
import os
import subprocess
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# Video file extensions that require audio extraction
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'}

# Audio file extensions (no extraction needed)
AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.opus'}


def convert_to_wav(audio_path: str, sample_rate: int = 16000) -> str:
    """
    Convert audio file to WAV format with specified sample rate.

    Args:
        audio_path: Path to input audio file
        sample_rate: Target sample rate (default 16000 for most models)

    Returns:
        Path to converted WAV file (temporary file)

    Raises:
        RuntimeError: If pydub is not installed and ffmpeg conversion fails
    """
    # If already a WAV file, check if conversion is needed
    if audio_path.lower().endswith('.wav'):
        try:
            import wave
            with wave.open(audio_path, "rb") as wf:
                if wf.getnchannels() == 1 and wf.getsampwidth() == 2 and wf.getframerate() == sample_rate:
                    return audio_path  # Already in correct format
        except Exception:
            pass  # Fall through to conversion

    try:
        from pydub import AudioSegment

        audio = AudioSegment.from_file(audio_path)
        audio = audio.set_frame_rate(sample_rate).set_channels(1).set_sample_width(2)

        # Create temp file
        tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        tmp_path = tmp_file.name
        tmp_file.close()

        audio.export(tmp_path, format="wav")
        return tmp_path

    except ImportError:
        # Try ffmpeg directly as fallback
        try:
            tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            tmp_path = tmp_file.name
            tmp_file.close()

            result = subprocess.run(
                ["ffmpeg", "-i", audio_path, "-ar", str(sample_rate),
                 "-ac", "1", "-acodec", "pcm_s16le", "-y", tmp_path],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0 and os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                return tmp_path
            # Clean up on failure
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass

        logger.warning("Neither pydub nor ffmpeg available for audio conversion, returning original path")
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


def is_video_file(file_path: str) -> bool:
    """
    Check if a file is a video file based on extension.

    Args:
        file_path: Path to the file

    Returns:
        True if the file has a video extension
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in VIDEO_EXTENSIONS


def is_audio_file(file_path: str) -> bool:
    """
    Check if a file is an audio file based on extension.

    Args:
        file_path: Path to the file

    Returns:
        True if the file has an audio extension
    """
    ext = os.path.splitext(file_path)[1].lower()
    return ext in AUDIO_EXTENSIONS


def extract_audio_from_video(video_path: str, output_format: str = "wav") -> Tuple[str, bool]:
    """
    Extract audio track from a video file using ffmpeg.

    Args:
        video_path: Path to the video file
        output_format: Output audio format (default: wav for best compatibility)

    Returns:
        Tuple of (audio_path, was_extracted):
            - audio_path: Path to the extracted audio file (temp file)
            - was_extracted: True if extraction was performed, False if it was already audio

    Raises:
        RuntimeError: If ffmpeg is not available or extraction fails
    """
    # Check if it's already an audio file
    if is_audio_file(video_path):
        return video_path, False

    # Check if ffmpeg is available
    try:
        subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            check=True,
            timeout=10
        )
    except (subprocess.CalledProcessError, FileNotFoundError, subprocess.TimeoutExpired):
        raise RuntimeError("ffmpeg is not available. Please install ffmpeg to process video files.")

    # Create temp file for extracted audio
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{output_format}")
    output_path = tmp_file.name
    tmp_file.close()

    try:
        # Extract audio using ffmpeg
        # -i: input file
        # -vn: no video
        # -acodec: audio codec (pcm_s16le for WAV, libmp3lame for MP3)
        # -ar: sample rate (16000 Hz is optimal for speech recognition)
        # -ac: audio channels (1 = mono, best for speech)
        # -y: overwrite output file

        if output_format == "wav":
            codec_args = ["-acodec", "pcm_s16le"]
        elif output_format == "mp3":
            codec_args = ["-acodec", "libmp3lame", "-q:a", "2"]
        else:
            codec_args = []

        cmd = [
            "ffmpeg",
            "-i", video_path,
            "-vn",  # No video
            *codec_args,
            "-ar", "16000",  # 16kHz sample rate (optimal for STT)
            "-ac", "1",  # Mono
            "-y",  # Overwrite
            output_path
        ]

        logger.info(f"Extracting audio from video: {os.path.basename(video_path)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout for large files
        )

        if result.returncode != 0:
            # Clean up failed output
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise RuntimeError(f"ffmpeg extraction failed: {result.stderr}")

        # Verify output file exists and has content
        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
            if os.path.exists(output_path):
                os.unlink(output_path)
            raise RuntimeError("Audio extraction produced empty output")

        logger.info(f"Audio extracted successfully: {output_path} ({os.path.getsize(output_path)} bytes)")
        return output_path, True

    except subprocess.TimeoutExpired:
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise RuntimeError("Audio extraction timed out (exceeded 10 minutes)")
    except Exception as e:
        if os.path.exists(output_path):
            os.unlink(output_path)
        raise RuntimeError(f"Audio extraction failed: {str(e)}")
