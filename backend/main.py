from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import whisper
import tempfile
import os
from typing import Optional

app = FastAPI(title="OpenTranscribe API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Whisper model (cached after first load)
_model = None

def get_model():
    global _model
    if _model is None:
        print("Loading Whisper model...")
        _model = whisper.load_model("base")  # Using 'base' model for better accuracy
        print("Whisper model loaded successfully")
    return _model

@app.get("/")
async def root():
    return {"message": "OpenTranscribe API is running"}

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None)
):
    """
    Transcribe audio file using Whisper.
    Accepts audio files (MP3, WAV, etc.) and returns transcribed text.
    
    Parameters:
    - file: Audio file to transcribe
    - language: Optional language code (e.g., 'en', 'es'). If None, auto-detects language.
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(
                status_code=400,
                detail="File must be an audio file"
            )
        
        # Validate language code if provided
        valid_languages = ['en', 'es', 'auto', None]
        if language and language not in ['en', 'es', 'auto']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid language code. Supported: 'en' (English), 'es' (Spanish), 'auto' (auto-detect)"
            )
        
        # Convert 'auto' to None for Whisper
        whisper_language = None if language in ['auto', None] else language
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            # Load model and transcribe
            model = get_model()
            result = model.transcribe(tmp_path, language=whisper_language)
            
            text = result["text"].strip()
            
            if not text:
                text = "No speech detected."
            
            return {
                "text": text,
                "language": result.get("language", "unknown"),
                "detected_language": result.get("language", "unknown")
            }
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

