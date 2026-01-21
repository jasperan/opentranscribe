"""OpenTranscribe API Server with multi-model STT support."""
from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
from typing import Optional
import logging

from models import get_model, list_models, get_available_models, get_default_model
from diff import DiffEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="OpenTranscribe API",
    description="Multi-model speech-to-text transcription API",
    version="2.0.0"
)


# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    logger.info(f"Origin header: {request.headers.get('origin', 'None')}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/")
async def root():
    """API status endpoint."""
    return {
        "message": "OpenTranscribe API is running",
        "version": "2.0.0",
        "default_model": get_default_model()
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


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
    Transcribe audio file using selected STT model.

    Parameters:
    - file: Audio file to transcribe (MP3, WAV, etc.)
    - language: Optional language code ('en', 'es', 'auto'). Default: auto-detect
    - model: STT model to use. Default: faster-whisper

    Returns:
    - text: Transcribed text
    - language: Detected/used language
    - model: Model used for transcription
    - duration: Processing time in seconds
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
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
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
            # Transcribe
            result = transcriber.transcribe(tmp_path, language=language)

            return {
                "text": result.text,
                "language": result.language,
                "detected_language": result.language,
                "model": result.model_name,
                "duration": result.duration,
                "segments": [
                    {"start": s.start, "end": s.end, "text": s.text}
                    for s in result.segments
                ]
            }
        finally:
            # Clean up
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


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
    try:
        # Validate file type
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

        # Save uploaded file temporarily
        suffix = os.path.splitext(file.filename)[1] if file.filename else ".mp3"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        try:
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

            # Use first result (faster-whisper if available) as baseline
            baseline = results[0]
            diff_engine = DiffEngine(baseline)

            # Compare other models against baseline
            comparisons = [diff_engine.compare(r) for r in results[1:]]

            return diff_engine.to_dict(comparisons)

        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Comparison failed")
        raise HTTPException(
            status_code=500,
            detail=f"Comparison failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Starting OpenTranscribe API Server (Multi-Model)")
    print("=" * 60)
    print("Server will be available at:")
    print("  - http://localhost:8000")
    print("  - API Docs: http://localhost:8000/docs")
    print("  - Health Check: http://localhost:8000/health")
    print("  - Models: http://localhost:8000/models")
    print("=" * 60)
    print("Available models:", get_available_models())
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
