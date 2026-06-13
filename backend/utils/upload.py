"""Shared file upload handling for all transcription endpoints.

Addresses:
- C1: Stream file to disk instead of loading entirely into memory
- M1: Single source of truth for upload validation, temp file management
- M9: MAX_UPLOAD_SIZE defined once
- m5: Language code validation
"""
import os
import hashlib
import logging
import tempfile
from dataclasses import dataclass
from typing import Optional

from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# Single source of truth for upload limits
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB
STREAM_CHUNK_SIZE = 64 * 1024  # 64 KB chunks for streaming to disk

# Valid language codes (ISO 639-1 subset supported by Whisper)
VALID_LANGUAGES = {
    'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru',
    'zh', 'ja', 'ko', 'ar', 'hi', 'tr', 'vi', 'th', 'sv', 'da',
    'no', 'fi', 'hu', 'cs', 'ro', 'bg', 'uk', 'he', 'id', 'ms',
    'ca', 'hr', 'sk', 'sl', 'et', 'lt', 'lv', 'ta', 'te', 'ml',
}

# Magic byte prefixes for media validation (only the prefixes are used)
AUDIO_MAGIC_PREFIXES = (
    b'\xff\xfb', b'\xff\xfa', b'\xff\xf3', b'\xff\xf2',  # MPEG audio frames
    b'ID3',   # MP3 with ID3 tag
    b'RIFF',  # WAV
    b'fLaC',  # FLAC
    b'OggS',  # Ogg
    b'\x00\x00\x00',  # MP4-family container box
)

VIDEO_MAGIC_PREFIXES = (
    b'\x00\x00\x00',  # MP4-family container box
    b'\x1a\x45\xdf\xa3',  # WebM/Matroska
    b'RIFF',  # AVI
    b'\x00\x00\x01\xb3', b'\x00\x00\x01\xba',  # MPEG program/sequence
)

AUDIO_EXTENSIONS = {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.opus'}
VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'}


@dataclass
class UploadedFile:
    """Result of processing an uploaded file."""
    tmp_path: str
    media_type: str  # 'audio' or 'video'
    fingerprint: str
    content_type: str


def validate_language(language: Optional[str]) -> Optional[str]:
    """Validate and normalize language code. Returns None for auto-detect."""
    if language is None or language == 'auto':
        return None
    lang = language.strip().lower()
    if lang not in VALID_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: '{language}'. Use 'auto' for auto-detection."
        )
    return lang


def validate_media_file(file_path: str, content_type: str) -> tuple[bool, str]:
    """Validate file by checking magic bytes. Returns (is_valid, media_type)."""
    try:
        with open(file_path, "rb") as f:
            header = f.read(12)

        if header.startswith(AUDIO_MAGIC_PREFIXES):
            return True, 'audio'

        if b'ftyp' in header:
            if content_type and content_type.startswith('audio/'):
                return True, 'audio'
            return True, 'video'

        if header.startswith(VIDEO_MAGIC_PREFIXES):
            return True, 'video'

        if header[:4] == b'\x1a\x45\xdf\xa3':
            return True, 'video'

        logger.warning(f"File failed magic byte validation: {header[:8].hex()}")
        return False, 'unknown'
    except Exception as e:
        logger.error(f"Failed to validate media file: {e}")
        return False, 'unknown'


def compute_fingerprint(file_path: str) -> str:
    """Compute SHA-256 fingerprint of a file."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using ffprobe."""
    try:
        import subprocess
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"Could not get audio duration: {e}")
    return 0.0


async def save_upload_to_disk(
    file: UploadFile,
    *,
    allow_video: bool = False,
) -> UploadedFile:
    """
    Stream an uploaded file to disk and validate it.

    Streams in chunks (C1 fix) instead of reading entire file into memory.
    Validates content type, file extension, size, and magic bytes.

    Args:
        file: FastAPI UploadFile
        allow_video: If True, accept video files (for /transcribe endpoint)

    Returns:
        UploadedFile with tmp_path, media_type, fingerprint

    Raises:
        HTTPException on validation failure
    """
    content_type = file.content_type or ""
    is_audio = content_type.startswith("audio/")
    is_video = content_type.startswith("video/")

    # Safe filename extraction - prevent directory traversal
    filename = os.path.basename(file.filename) if file.filename else ""

    if not is_audio and not is_video:
        suffix = os.path.splitext(filename)[1].lower()
        if suffix in AUDIO_EXTENSIONS:
            is_audio = True
        elif suffix in VIDEO_EXTENSIONS:
            is_video = True
        else:
            raise HTTPException(status_code=400, detail="File must be an audio or video file")

    if is_video and not allow_video:
        raise HTTPException(status_code=400, detail="File must be an audio file")

    # Stream to temp file (C1: avoid loading entire file into memory)
    suffix = os.path.splitext(filename)[1] if filename else ".mp3"
    tmp_path = None
    total_size = 0

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_path = tmp_file.name
            async for chunk in file.stream():
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)} MB."
                    )
                tmp_file.write(chunk)

        # Validate magic bytes
        is_valid, media_type = validate_media_file(tmp_path, content_type)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. File does not appear to be a valid audio or video file."
            )

        if media_type == 'video' and not allow_video:
            raise HTTPException(status_code=400, detail="File must be an audio file")

        fingerprint = compute_fingerprint(tmp_path)

        return UploadedFile(
            tmp_path=tmp_path,
            media_type=media_type,
            fingerprint=fingerprint,
            content_type=content_type,
        )

    except HTTPException:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise
    except Exception as e:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")


def get_transcriber(model_id: Optional[str]):
    """Get a validated, available transcriber instance."""
    from models import get_model, get_default_model

    model_id = model_id or get_default_model()
    try:
        transcriber = get_model(model_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not transcriber.is_available():
        raise HTTPException(
            status_code=400,
            detail=f"Model '{model_id}' is not available. Install its dependencies."
        )
    return transcriber


def cleanup_files(*paths: Optional[str]) -> None:
    """Clean up temporary files safely."""
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass
