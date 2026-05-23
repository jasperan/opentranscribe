"""Verbatim Transcription Service - Internal API.

This service runs on localhost:8000 and is only accessible from the Next.js frontend.
It is NOT exposed externally - all public access goes through Next.js API routes.
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import os
import time
from typing import Optional
from concurrent.futures import ThreadPoolExecutor
import logging

from models import get_model, list_models, get_available_models, get_default_model
from diff import DiffEngine
from utils.audio import is_video_file, extract_audio_from_video
from utils.upload import (
    save_upload_to_disk, get_transcriber, cleanup_files,
    validate_language, get_audio_duration, MAX_UPLOAD_SIZE,
)
from streaming import VoskStreamingTranscriber, WhisperStreamingTranscriber
from streaming.vosk_streaming import StreamingConfig, RecordingMode, OutputMode
from streaming.whisper_streaming import StreamingConfig as WhisperConfig, StreamingMode
from streaming.websocket_endpoint import SessionRegistry, WebSocketStreamingEndpoint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Verbatim Transcription Service",
    description="Internal multi-model speech-to-text transcription API",
    version="3.1.0",
    docs_url="/docs" if os.getenv("VERBATIM_ENV", "development") == "development" else None,
    redoc_url=None,
)

# Thread pool for parallel model comparison (C2)
_executor = ThreadPoolExecutor(max_workers=4)


# Conditional request logging (m1: only in development)
if os.getenv("VERBATIM_ENV", "development") == "development":
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


# ============================================================================
# Session timeout management (M5)
# ============================================================================
SESSION_TIMEOUT_SECONDS = 1800  # 30 minutes

# Store active streaming sessions with timestamps
streaming_sessions = SessionRegistry(SESSION_TIMEOUT_SECONDS, logger)
live_sessions = SessionRegistry(SESSION_TIMEOUT_SECONDS, logger)


def _create_vosk_transcriber(data: dict) -> VoskStreamingTranscriber:
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
    mode_str = data.get("mode", "toggle")
    config = StreamingConfig(
        language=data.get("language", "en"),
        recording_mode=mode_map.get(mode_str, RecordingMode.TOGGLE),
        output_mode=output_map.get(data.get("output_mode", "display"), OutputMode.DISPLAY),
        vad_enabled=data.get("vad_enabled", False) or mode_str in ("vad", "toggle_vad"),
        silence_timeout=data.get("silence_timeout", 1.5),
    )
    return VoskStreamingTranscriber(config)


def _update_vosk_config(transcriber: VoskStreamingTranscriber, data: dict) -> None:
    if "vad_enabled" in data:
        transcriber.config.vad_enabled = data["vad_enabled"]
    if "silence_timeout" in data:
        transcriber.config.silence_timeout = data["silence_timeout"]


def _create_whisper_transcriber(data: dict) -> WhisperStreamingTranscriber:
    mode_map = {
        "continuous": StreamingMode.CONTINUOUS,
        "vad": StreamingMode.VAD,
        "push_to_talk": StreamingMode.PUSH_TO_TALK,
    }
    language = data.get("language")
    config = WhisperConfig(
        language=language if language else None,
        model_size=data.get("model", "base"),
        mode=mode_map.get(data.get("mode", "vad"), StreamingMode.VAD),
        vad_threshold=data.get("vad_threshold", 0.5),
        silence_duration=data.get("silence_duration", 1.0),
    )
    return WhisperStreamingTranscriber(config)


def _update_whisper_config(transcriber: WhisperStreamingTranscriber, data: dict) -> None:
    if "vad_threshold" in data:
        transcriber.config.vad_threshold = data["vad_threshold"]
    if "silence_duration" in data:
        transcriber.config.silence_duration = data["silence_duration"]


streaming_endpoint = WebSocketStreamingEndpoint(
    sessions=streaming_sessions,
    transcriber_factory=_create_vosk_transcriber,
    config_updater=_update_vosk_config,
    unavailable_message="Vosk is not installed. Run: pip install vosk",
    logger=logger,
    log_label="WebSocket",
)

live_endpoint = WebSocketStreamingEndpoint(
    sessions=live_sessions,
    transcriber_factory=_create_whisper_transcriber,
    config_updater=_update_whisper_config,
    unavailable_message="faster-whisper is not installed. Run: pip install faster-whisper",
    logger=logger,
    reject_empty_audio=True,
    finalizer=lambda transcriber: transcriber.force_finalize(),
    log_label="Live WebSocket",
)


# ============================================================================
# REST endpoints
# ============================================================================

@app.get("/")
async def root():
    """API status endpoint."""
    return {
        "service": "Verbatim Transcription Service",
        "version": "3.1.0",
        "status": "running",
        "default_model": get_default_model()
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    # Opportunistically clean up stale sessions
    streaming_sessions.cleanup_stale()
    live_sessions.cleanup_stale()
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
    """
    uploaded = None
    extracted_audio_path = None
    try:
        # Validate inputs (m5: language validation)
        lang = validate_language(language)
        transcriber = get_transcriber(model)

        # Stream upload to disk (C1+M1: shared helper, no full-memory load)
        uploaded = await save_upload_to_disk(file, allow_video=True)

        # Determine audio path (extract from video if needed)
        audio_path = uploaded.tmp_path
        source_type = uploaded.media_type

        if uploaded.media_type == 'video' or is_video_file(uploaded.tmp_path):
            logger.info(f"Video file detected, extracting audio")
            try:
                extracted_audio_path, was_extracted = extract_audio_from_video(uploaded.tmp_path)
                if was_extracted:
                    audio_path = extracted_audio_path
                    source_type = 'video'
            except RuntimeError as e:
                raise HTTPException(status_code=500, detail=f"Failed to extract audio from video: {str(e)}")

        audio_duration = get_audio_duration(audio_path)
        result = transcriber.transcribe(audio_path, language=lang)

        return {
            "status": "success",
            "text": result.text,
            "language": result.language,
            "detected_language": result.language,
            "model": result.model_name,
            "processing_duration": result.duration,
            "audio_duration": audio_duration,
            "fingerprint": uploaded.fingerprint,
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
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        cleanup_files(
            uploaded.tmp_path if uploaded else None,
            extracted_audio_path,
        )


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
    """
    uploaded = None
    try:
        lang = validate_language(language)
        transcriber = get_transcriber(model)

        # m6: validate num_speakers if provided
        if num_speakers is not None and (num_speakers < 1 or num_speakers > 20):
            raise HTTPException(status_code=400, detail="num_speakers must be between 1 and 20")

        uploaded = await save_upload_to_disk(file, allow_video=False)
        audio_duration = get_audio_duration(uploaded.tmp_path)

        start_time = time.time()
        transcription = transcriber.transcribe(uploaded.tmp_path, language=lang)

        # Try pyannote diarization (C4: real implementation instead of mock)
        try:
            from pyannote.audio import Pipeline

            hf_token = os.getenv("HF_TOKEN") or os.getenv("HUGGING_FACE_HUB_TOKEN")
            if not hf_token:
                raise ImportError("HF_TOKEN not set - pyannote requires authentication")

            pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=hf_token
            )

            diarization_kwargs = {}
            if num_speakers is not None:
                diarization_kwargs["num_speakers"] = num_speakers

            diarization = pipeline(uploaded.tmp_path, **diarization_kwargs)

            speakers = sorted(set(label for _, _, label in diarization.itertracks(yield_label=True)))
            segments_with_speakers = []
            for segment in transcription.segments:
                seg_mid = (segment.start + segment.end) / 2
                speaker = None
                for turn, _, label in diarization.itertracks(yield_label=True):
                    if turn.start <= seg_mid <= turn.end:
                        speaker = label
                        break
                segments_with_speakers.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text,
                    "speaker": speaker or (speakers[0] if speakers else None)
                })

            processing_duration = time.time() - start_time
            return {
                "status": "success",
                "text": transcription.text,
                "language": transcription.language,
                "model": transcription.model_name,
                "speakers": speakers,
                "segments": segments_with_speakers,
                "processing_duration": processing_duration,
                "audio_duration": audio_duration,
                "fingerprint": uploaded.fingerprint,
                "diarization_enabled": True,
            }

        except ImportError:
            processing_duration = time.time() - start_time
            return {
                "status": "success",
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
                "fingerprint": uploaded.fingerprint,
                "diarization_enabled": False,
                "diarization_note": "Install pyannote.audio and set HF_TOKEN for speaker diarization"
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Diarization failed")
        raise HTTPException(status_code=500, detail=f"Diarization failed: {str(e)}")
    finally:
        cleanup_files(uploaded.tmp_path if uploaded else None)


@app.post("/compare")
async def compare_models(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    models: Optional[str] = Form(None)
):
    """
    Run transcription with multiple models and compare results.
    Models run in parallel using a thread pool (C2).
    """
    uploaded = None
    try:
        lang = validate_language(language)

        if models:
            model_ids = [m.strip() for m in models.split(",")]
        else:
            model_ids = get_available_models()

        if not model_ids:
            raise HTTPException(status_code=400, detail="No models available for comparison")

        uploaded = await save_upload_to_disk(file, allow_video=False)

        # C2: Run models in parallel using thread pool
        def _run_model(model_id: str):
            try:
                transcriber = get_model(model_id)
                if transcriber.is_available():
                    return transcriber.transcribe(uploaded.tmp_path, language=lang)
            except Exception as e:
                logger.warning(f"Model {model_id} failed: {e}")
            return None

        loop = asyncio.get_event_loop()
        futures = [loop.run_in_executor(_executor, _run_model, mid) for mid in model_ids]
        raw_results = await asyncio.gather(*futures)
        results = [r for r in raw_results if r is not None]

        if not results:
            raise HTTPException(status_code=500, detail="All models failed to transcribe")

        baseline = results[0]
        diff_engine = DiffEngine(baseline)
        comparisons = [diff_engine.compare(r) for r in results[1:]]

        return diff_engine.to_dict(comparisons)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Comparison failed")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")
    finally:
        cleanup_files(uploaded.tmp_path if uploaded else None)


# ============================================================================
# WebSocket streaming: Vosk (lightweight, real-time)
# ============================================================================

@app.websocket("/ws/transcribe/stream")
async def websocket_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time streaming transcription (Vosk)."""
    await streaming_endpoint.handle(websocket)


@app.get("/streaming/status")
async def streaming_status():
    """Get status of streaming transcription service."""
    try:
        test_transcriber = VoskStreamingTranscriber()
        vosk_available = test_transcriber.is_available()
    except Exception:
        vosk_available = False

    streaming_sessions.cleanup_stale()

    return {
        "available": vosk_available,
        "active_sessions": len(streaming_sessions),
        "supported_modes": ["push_to_talk", "toggle", "vad", "toggle_vad"],
        "supported_output_modes": ["display", "auto_save", "clipboard"],
        "sample_rate": 16000,
        "format": "PCM 16-bit mono"
    }


# ============================================================================
# WebSocket streaming: Faster-Whisper with Silero VAD
# ============================================================================

@app.websocket("/ws/live/stream")
async def websocket_live_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time streaming transcription using faster-whisper."""
    await live_endpoint.handle(websocket)


@app.get("/live/status")
async def live_status():
    """Get status of live streaming transcription service."""
    try:
        test_transcriber = WhisperStreamingTranscriber()
        whisper_available = test_transcriber.is_available()
    except Exception:
        whisper_available = False

    try:
        from streaming.whisper_streaming import SileroVAD
        vad = SileroVAD()
        vad_available = vad.is_available()
    except Exception:
        vad_available = False

    live_sessions.cleanup_stale()

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

    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
