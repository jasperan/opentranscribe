"""Verbatim Transcription Service - Internal API.

This service runs on localhost:8000 and is only accessible from the Next.js frontend.
It is NOT exposed externally - all public access goes through Next.js API routes.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
import asyncio
import tempfile
import os
import uuid
from typing import Optional
import logging
import hashlib
import time

from models import get_model, list_models, get_available_models, get_default_model
from diff import DiffEngine
from utils.audio import is_video_file, extract_audio_from_video
from streaming import VoskStreamingTranscriber, WhisperStreamingTranscriber
from streaming.vosk_streaming import StreamingConfig, RecordingMode, OutputMode
from streaming.whisper_streaming import StreamingConfig as WhisperConfig, StreamingMode

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Verbatim Transcription Service",
    description="Internal multi-model speech-to-text transcription API",
    version="3.0.0",
    docs_url="/docs" if os.getenv("VERBATIM_ENV", "development") == "development" else None,
    redoc_url=None,
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all requests for debugging (development only)."""
    start_time = time.time()
    logger.info(f"Request: {request.method} {request.url.path}")
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(f"Response: {response.status_code} ({duration:.3f}s)")
    return response


# CORS - Only allow localhost origins (Next.js frontend)
# In production, this service is not exposed externally
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


def compute_audio_fingerprint(file_path: str) -> str:
    """Compute SHA-256 fingerprint of audio file for duplicate detection."""
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def get_audio_duration(file_path: str) -> float:
    """Get audio duration in seconds using ffprobe if available."""
    try:
        import subprocess
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        if result.returncode == 0 and result.stdout.strip():
            return float(result.stdout.strip())
    except Exception as e:
        logger.warning(f"Could not get audio duration: {e}")
    return 0.0


# Maximum file upload size (500 MB)
MAX_UPLOAD_SIZE = 500 * 1024 * 1024

# Audio magic bytes for validation
AUDIO_MAGIC_BYTES = {
    b'\xff\xfb': 'audio/mpeg',      # MP3
    b'\xff\xfa': 'audio/mpeg',      # MP3
    b'\xff\xf3': 'audio/mpeg',      # MP3
    b'\xff\xf2': 'audio/mpeg',      # MP3
    b'ID3': 'audio/mpeg',           # MP3 with ID3 tag
    b'RIFF': 'audio/wav',           # WAV
    b'fLaC': 'audio/flac',          # FLAC
    b'OggS': 'audio/ogg',           # OGG
    b'\x00\x00\x00': 'audio/mp4',   # M4A/MP4 (partial)
}

# Video magic bytes for validation
VIDEO_MAGIC_BYTES = {
    b'\x00\x00\x00': 'video/mp4',   # MP4/M4V (ftyp box)
    b'\x1a\x45\xdf\xa3': 'video/webm',  # WebM/MKV (EBML header)
    b'RIFF': 'video/avi',           # AVI
    b'\x00\x00\x01\xb3': 'video/mpeg',  # MPEG
    b'\x00\x00\x01\xba': 'video/mpeg',  # MPEG-PS
}

# Supported content types
SUPPORTED_AUDIO_TYPES = {'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/ogg', 'audio/mp4', 'audio/m4a', 'audio/webm'}
SUPPORTED_VIDEO_TYPES = {'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska', 'video/mpeg', 'video/avi'}


def validate_media_file(file_path: str, content_type: str) -> tuple[bool, str]:
    """
    Validate audio or video file by checking magic bytes.

    Returns:
        Tuple of (is_valid, media_type) where media_type is 'audio', 'video', or 'unknown'
    """
    try:
        with open(file_path, "rb") as f:
            header = f.read(12)

        # Check against known audio magic bytes
        for magic, _ in AUDIO_MAGIC_BYTES.items():
            if header.startswith(magic):
                return True, 'audio'

        # Check for MP4/M4A/MOV container (ftyp box)
        if b'ftyp' in header:
            # Need to determine if it's audio-only (M4A) or video (MP4/MOV)
            # For simplicity, check content-type or extension
            if content_type and content_type.startswith('audio/'):
                return True, 'audio'
            # Assume video for MP4/MOV containers
            return True, 'video'

        # Check against known video magic bytes
        for magic, _ in VIDEO_MAGIC_BYTES.items():
            if header.startswith(magic):
                return True, 'video'

        # Check for MKV/WebM (EBML header)
        if header[:4] == b'\x1a\x45\xdf\xa3':
            return True, 'video'

        logger.warning(f"File failed magic byte validation: {header[:8].hex()}")
        return False, 'unknown'
    except Exception as e:
        logger.error(f"Failed to validate media file: {e}")
        return False, 'unknown'


def validate_audio_file(file_path: str, content_type: str) -> bool:
    """Validate audio file by checking magic bytes, not just extension. (Legacy wrapper)"""
    is_valid, media_type = validate_media_file(file_path, content_type)
    return is_valid and media_type == 'audio'


@app.get("/")
async def root():
    """API status endpoint."""
    return {
        "service": "Verbatim Transcription Service",
        "version": "3.0.0",
        "status": "running",
        "default_model": get_default_model()
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "service": "verbatim-transcription"}


@app.get("/models")
async def get_models():
    """List all available STT models."""
    return {
        "models": list_models(),
        "available": get_available_models(),
        "default": get_default_model()
    }


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    model: Optional[str] = Form(None)
):
    """
    Transcribe audio or video file using selected STT model.

    For video files, audio is automatically extracted before transcription.

    Parameters:
    - file: Audio or video file to transcribe (MP3, WAV, FLAC, OGG, M4A, MP4, MKV, AVI, MOV)
    - language: Optional language code ('en', 'es', 'auto'). Default: auto-detect
    - model: STT model to use. Default: faster-whisper

    Returns:
    - text: Transcribed text
    - language: Detected/used language
    - model: Model used for transcription
    - duration: Processing time in seconds
    - audio_duration: Audio file duration in seconds
    - fingerprint: Audio file fingerprint for duplicate detection
    - segments: Word/phrase level timestamps
    - source_type: 'audio' or 'video' indicating original file type
    """
    tmp_path = None
    extracted_audio_path = None
    try:
        # Accept both audio and video files
        content_type = file.content_type or ""
        is_audio = content_type.startswith("audio/")
        is_video = content_type.startswith("video/")

        # Safe filename extraction
        filename = file.filename or ""
        # Strip path components to prevent directory traversal
        filename = os.path.basename(filename)

        if not is_audio and not is_video:
            # Check by file extension as fallback
            suffix = os.path.splitext(filename)[1].lower()
            if suffix in {'.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma', '.opus'}:
                is_audio = True
            elif suffix in {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp'}:
                is_video = True
            else:
                raise HTTPException(
                    status_code=400,
                    detail="File must be an audio or video file"
                )

        # Get model (use default if not specified)
        model_id = model or get_default_model()

        try:
            transcriber = get_model(model_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not transcriber.is_available():
            raise HTTPException(
                status_code=400,
                detail=f"Model '{model_id}' is not available. Install its dependencies."
            )

        # Save uploaded file temporarily
        suffix = os.path.splitext(filename)[1] if filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)} MB."
                )
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Validate media file magic bytes
        is_valid, media_type = validate_media_file(tmp_path, content_type)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Invalid file format. File does not appear to be a valid audio or video file."
            )

        # Determine the audio file to transcribe
        audio_path = tmp_path
        source_type = media_type

        # If it's a video file, extract audio first
        if media_type == 'video' or is_video_file(tmp_path):
            logger.info(f"Video file detected, extracting audio from: {file.filename}")
            try:
                extracted_audio_path, was_extracted = extract_audio_from_video(tmp_path)
                if was_extracted:
                    audio_path = extracted_audio_path
                    source_type = 'video'
                    logger.info(f"Audio extracted successfully for transcription")
            except RuntimeError as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to extract audio from video: {str(e)}"
                )

        # Compute fingerprint and duration from the original file
        fingerprint = compute_audio_fingerprint(tmp_path)
        audio_duration = get_audio_duration(audio_path)

        # Transcribe the audio
        result = transcriber.transcribe(audio_path, language=language)

        return {
            "text": result.text,
            "language": result.language,
            "detected_language": result.language,
            "model": result.model_name,
            "processing_duration": result.duration,
            "audio_duration": audio_duration,
            "fingerprint": fingerprint,
            "source_type": source_type,
            "segments": [
                {"start": s.start, "end": s.end, "text": s.text}
                for s in result.segments
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )
    finally:
        # Clean up temp files
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)
        if extracted_audio_path and os.path.exists(extracted_audio_path):
            os.unlink(extracted_audio_path)


@app.post("/diarize")
async def diarize_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    num_speakers: Optional[int] = Form(None)
):
    """
    Transcribe audio with speaker diarization (who said what).

    This endpoint uses 2x minutes due to additional processing.

    Parameters:
    - file: Audio file to transcribe
    - language: Optional language code
    - model: STT model to use (default: faster-whisper)
    - num_speakers: Optional hint for number of speakers

    Returns:
    - text: Full transcribed text
    - speakers: List of identified speakers
    - segments: Segments with speaker labels
    - processing_duration: Time taken
    - audio_duration: Audio file duration
    - fingerprint: Audio file fingerprint
    """
    tmp_path = None
    try:
        # Basic content-type check
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
            )

        # Safe filename extraction
        filename = os.path.basename(file.filename) if file.filename else ""

        # Save uploaded file temporarily
        suffix = os.path.splitext(filename)[1] if filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)} MB."
                )
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Validate audio file magic bytes
        if not validate_audio_file(tmp_path, file.content_type):
            raise HTTPException(
                status_code=400,
                detail="Invalid audio file format."
            )

        # Compute fingerprint and duration
        fingerprint = compute_audio_fingerprint(tmp_path)
        audio_duration = get_audio_duration(tmp_path)

        # Get transcription model
        model_id = model or get_default_model()
        try:
            transcriber = get_model(model_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        if not transcriber.is_available():
            raise HTTPException(
                status_code=400,
                detail=f"Model '{model_id}' is not available."
            )

        # First, get transcription
        start_time = time.time()
        transcription = transcriber.transcribe(tmp_path, language=language)

        # Try to run diarization with pyannote
        try:
            from pyannote.audio import Pipeline
            import torch

            # Check if pyannote model is available
            # Note: This requires HF token and model download
            # For MVP, we'll provide a simplified version

            # Placeholder: Return transcription with mock speaker labels
            # TODO: Implement full pyannote integration
            speakers = ["Speaker 1", "Speaker 2"]
            segments_with_speakers = []

            for i, segment in enumerate(transcription.segments):
                segments_with_speakers.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "speaker": speakers[i % len(speakers)]  # Alternating for demo
                })

            processing_duration = time.time() - start_time

            return {
                "text": transcription.text,
                "language": transcription.language,
                "model": transcription.model_name,
                "speakers": speakers,
                "segments": segments_with_speakers,
                "processing_duration": processing_duration,
                "audio_duration": audio_duration,
                "fingerprint": fingerprint,
                "diarization_enabled": True,
                "diarization_note": "Full diarization requires pyannote.audio setup"
            }

        except ImportError:
            # pyannote not installed - return transcription without speaker labels
            processing_duration = time.time() - start_time

            return {
                "text": transcription.text,
                "language": transcription.language,
                "model": transcription.model_name,
                "speakers": [],
                "segments": [
                    {"start": s.start, "end": s.end, "text": s.text, "speaker": None}
                    for s in transcription.segments
                ],
                "processing_duration": processing_duration,
                "audio_duration": audio_duration,
                "fingerprint": fingerprint,
                "diarization_enabled": False,
                "diarization_note": "Install pyannote.audio for speaker diarization"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Diarization failed")
        raise HTTPException(
            status_code=500,
            detail=f"Diarization failed: {str(e)}"
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.post("/compare")
async def compare_models(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    models: Optional[str] = Form(None)
):
    """
    Run transcription with multiple models and compare results.

    Parameters:
    - file: Audio file to transcribe
    - language: Optional language code
    - models: Comma-separated list of model IDs to compare.
              If not specified, uses all available models.

    Returns:
    - baseline: Reference transcription (from fastest high-accuracy model)
    - comparisons: List of comparisons with diff details
    """
    tmp_path = None
    try:
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
            )

        # Determine which models to use
        if models:
            model_ids = [m.strip() for m in models.split(",")]
        else:
            model_ids = get_available_models()

        if not model_ids:
            raise HTTPException(
                status_code=400,
                detail="No models available for comparison"
            )

        # Safe filename extraction
        filename = os.path.basename(file.filename) if file.filename else ""

        # Save uploaded file temporarily
        suffix = os.path.splitext(filename)[1] if filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            if len(content) > MAX_UPLOAD_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)} MB."
                )
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # Validate audio file
        if not validate_audio_file(tmp_path, file.content_type):
            raise HTTPException(
                status_code=400,
                detail="Invalid audio file format."
            )

        results = []

        # Run each model
        for model_id in model_ids:
            try:
                transcriber = get_model(model_id)
                if transcriber.is_available():
                    result = transcriber.transcribe(tmp_path, language=language)
                    results.append(result)
            except Exception as e:
                logger.warning(f"Model {model_id} failed: {e}")

        if not results:
            raise HTTPException(
                status_code=500,
                detail="All models failed to transcribe"
            )

        # Use first result as baseline
        baseline = results[0]
        diff_engine = DiffEngine(baseline)

        # Compare other models against baseline
        comparisons = [diff_engine.compare(r) for r in results[1:]]

        return diff_engine.to_dict(comparisons)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Comparison failed")
        raise HTTPException(
            status_code=500,
            detail=f"Comparison failed: {str(e)}"
        )
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# Store active streaming sessions
streaming_sessions: dict[str, VoskStreamingTranscriber] = {}


@app.websocket("/ws/transcribe/stream")
async def websocket_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time streaming transcription.

    Protocol:
    - Client sends: {"type": "start", "language": "en", "mode": "toggle", "output_mode": "display", "vad_enabled": false}
    - Client sends: {"type": "audio", "data": "<base64 PCM audio>"}
    - Client sends: {"type": "config", "vad_enabled": true, "silence_timeout": 1.5}
    - Client sends: {"type": "stop"}

    - Server sends: {"type": "ready"}
    - Server sends: {"type": "partial", "text": "hello wor"}
    - Server sends: {"type": "final", "text": "hello world", "confidence": 0.95, "timestamp": 1.2}
    - Server sends: {"type": "vad", "speaking": true/false}
    - Server sends: {"type": "error", "message": "..."}
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    transcriber: Optional[VoskStreamingTranscriber] = None

    logger.info(f"WebSocket connection opened: {session_id}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                # Parse configuration
                language = data.get("language", "en")
                mode_str = data.get("mode", "toggle")
                output_mode_str = data.get("output_mode", "display")
                vad_enabled = data.get("vad_enabled", False)
                silence_timeout = data.get("silence_timeout", 1.5)

                # Map string modes to enums
                mode_map = {
                    "push_to_talk": RecordingMode.PUSH_TO_TALK,
                    "toggle": RecordingMode.TOGGLE,
                    "vad": RecordingMode.VAD,
                    "toggle_vad": RecordingMode.TOGGLE_VAD,
                }
                output_map = {
                    "display": OutputMode.DISPLAY,
                    "auto_save": OutputMode.AUTO_SAVE,
                    "clipboard": OutputMode.CLIPBOARD,
                }

                config = StreamingConfig(
                    language=language,
                    recording_mode=mode_map.get(mode_str, RecordingMode.TOGGLE),
                    output_mode=output_map.get(output_mode_str, OutputMode.DISPLAY),
                    vad_enabled=vad_enabled or mode_str in ("vad", "toggle_vad"),
                    silence_timeout=silence_timeout,
                )

                # Create and start transcriber
                transcriber = VoskStreamingTranscriber(config)

                if not transcriber.is_available():
                    await websocket.send_json({
                        "type": "error",
                        "message": "Vosk is not installed. Run: pip install vosk"
                    })
                    continue

                result = transcriber.start_session()
                streaming_sessions[session_id] = transcriber
                await websocket.send_json(result.to_dict())

            elif msg_type == "audio":
                if transcriber is None or not transcriber.is_recording:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session. Send 'start' first."
                    })
                    continue

                # Decode base64 audio data
                try:
                    audio_data = base64.b64decode(data.get("data", ""))
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Invalid audio data: {str(e)}"
                    })
                    continue

                # Process audio chunk
                results = transcriber.process_chunk(audio_data)
                for result in results:
                    await websocket.send_json(result.to_dict())

            elif msg_type == "config":
                # Update configuration mid-session
                if transcriber is not None:
                    if "vad_enabled" in data:
                        transcriber.config.vad_enabled = data["vad_enabled"]
                    if "silence_timeout" in data:
                        transcriber.config.silence_timeout = data["silence_timeout"]
                    await websocket.send_json({"type": "config_updated"})

            elif msg_type == "stop":
                if transcriber is not None and transcriber.is_recording:
                    result = transcriber.stop_session()
                    await websocket.send_json(result.to_dict())

                    # Handle auto-save if configured
                    if transcriber.config.output_mode == OutputMode.AUTO_SAVE:
                        # TODO: Save to history database
                        await websocket.send_json({
                            "type": "saved",
                            "message": "Transcription saved to history"
                        })

                # Clean up session
                if session_id in streaming_sessions:
                    del streaming_sessions[session_id]
                transcriber = None

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.exception(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except Exception:
            pass
    finally:
        # Stop transcriber session to free resources
        if transcriber is not None and transcriber.is_recording:
            try:
                transcriber.stop_session()
            except Exception:
                pass
        # Clean up on disconnect
        if session_id in streaming_sessions:
            del streaming_sessions[session_id]
        logger.info(f"WebSocket session cleaned up: {session_id}")


@app.get("/streaming/status")
async def streaming_status():
    """Get status of streaming transcription service."""
    # Check if Vosk is available
    try:
        test_transcriber = VoskStreamingTranscriber()
        vosk_available = test_transcriber.is_available()
    except Exception:
        vosk_available = False

    return {
        "available": vosk_available,
        "active_sessions": len(streaming_sessions),
        "supported_modes": ["push_to_talk", "toggle", "vad", "toggle_vad"],
        "supported_output_modes": ["display", "auto_save", "clipboard"],
        "sample_rate": 16000,
        "format": "PCM 16-bit mono"
    }


# ============================================================================
# Live Streaming with Faster-Whisper
# ============================================================================

# Store active live streaming sessions
live_sessions: dict[str, WhisperStreamingTranscriber] = {}


@app.websocket("/ws/live/stream")
async def websocket_live_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time streaming transcription using faster-whisper.

    This provides higher accuracy than Vosk with auto-correcting partial results.

    Protocol:
    - Client sends: {"type": "start", "language": "en", "model": "base", "mode": "vad"}
    - Client sends: {"type": "audio", "data": "<base64 PCM audio>"}
    - Client sends: {"type": "finalize"} (force finalize current segment)
    - Client sends: {"type": "stop"}

    - Server sends: {"type": "ready", "model": "faster-whisper-base"}
    - Server sends: {"type": "vad", "speaking": true, "probability": 0.92}
    - Server sends: {"type": "partial", "text": "Hello world", "confidence": 0.85}
    - Server sends: {"type": "final", "text": "Hello world, how are you?", "duration": 2.3}
    - Server sends: {"type": "stopped", "total_duration": 45.2}
    - Server sends: {"type": "error", "message": "..."}
    """
    await websocket.accept()
    session_id = str(uuid.uuid4())
    transcriber: Optional[WhisperStreamingTranscriber] = None

    logger.info(f"Live WebSocket connection opened: {session_id}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "start":
                # Parse configuration
                language = data.get("language")  # None = auto-detect
                model_size = data.get("model", "base")
                mode_str = data.get("mode", "vad")
                vad_threshold = data.get("vad_threshold", 0.5)
                silence_duration = data.get("silence_duration", 1.0)

                # Map string mode to enum
                mode_map = {
                    "continuous": StreamingMode.CONTINUOUS,
                    "vad": StreamingMode.VAD,
                    "push_to_talk": StreamingMode.PUSH_TO_TALK,
                }

                config = WhisperConfig(
                    language=language if language else None,
                    model_size=model_size,
                    mode=mode_map.get(mode_str, StreamingMode.VAD),
                    vad_threshold=vad_threshold,
                    silence_duration=silence_duration,
                )

                # Create and start transcriber
                transcriber = WhisperStreamingTranscriber(config)

                if not transcriber.is_available():
                    await websocket.send_json({
                        "type": "error",
                        "message": "faster-whisper is not installed. Run: pip install faster-whisper"
                    })
                    continue

                result = transcriber.start_session()
                live_sessions[session_id] = transcriber
                await websocket.send_json(result.to_dict())

            elif msg_type == "audio":
                if transcriber is None or not transcriber.is_recording:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No active session. Send 'start' first."
                    })
                    continue

                # Decode base64 audio data
                try:
                    audio_data = base64.b64decode(data.get("data", ""))
                    if len(audio_data) > 0:
                        logger.debug(f"Live audio chunk: {len(audio_data)} bytes")
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Invalid audio data: {str(e)}"
                    })
                    continue

                # Process audio chunk
                results = transcriber.process_chunk(audio_data)
                if results:
                    logger.debug(f"Live transcription results: {len(results)} items")
                for result in results:
                    logger.debug(f"Sending result: {result.to_dict()}")
                    await websocket.send_json(result.to_dict())

            elif msg_type == "finalize":
                # Force finalization of current buffer (for push-to-talk release)
                if transcriber is not None and transcriber.is_recording:
                    result = transcriber.force_finalize()
                    if result:
                        await websocket.send_json(result.to_dict())

            elif msg_type == "stop":
                if transcriber is not None and transcriber.is_recording:
                    result = transcriber.stop_session()
                    await websocket.send_json(result.to_dict())

                # Clean up session
                if session_id in live_sessions:
                    del live_sessions[session_id]
                transcriber = None

            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        logger.info(f"Live WebSocket disconnected: {session_id}")
    except Exception as e:
        logger.exception(f"Live WebSocket error: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except Exception:
            pass
    finally:
        # Stop transcriber session to free resources
        if transcriber is not None and transcriber.is_recording:
            try:
                transcriber.stop_session()
            except Exception:
                pass
        # Clean up on disconnect
        if session_id in live_sessions:
            del live_sessions[session_id]
        logger.info(f"Live WebSocket session cleaned up: {session_id}")


@app.get("/live/status")
async def live_status():
    """Get status of live streaming transcription service."""
    # Check if faster-whisper is available
    try:
        test_transcriber = WhisperStreamingTranscriber()
        whisper_available = test_transcriber.is_available()
    except Exception:
        whisper_available = False

    # Check if VAD is available
    try:
        from streaming.whisper_streaming import SileroVAD
        vad = SileroVAD()
        vad_available = vad.is_available()
    except Exception:
        vad_available = False

    return {
        "available": whisper_available,
        "vad_available": vad_available,
        "active_sessions": len(live_sessions),
        "supported_modes": ["continuous", "vad", "push_to_talk"],
        "supported_models": ["tiny", "base", "small", "medium", "large-v3"],
        "default_model": "base",
        "sample_rate": 16000,
        "format": "PCM 16-bit signed mono"
    }


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Verbatim Transcription Service (Internal)")
    print("=" * 60)
    print("This service is for internal use only.")
    print("Public access should go through Next.js API routes.")
    print("=" * 60)
    print(f"Binding to: 127.0.0.1:8000")
    print(f"Available models: {get_available_models()}")
    print("=" * 60)

    # Bind to localhost only - not accessible externally
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
