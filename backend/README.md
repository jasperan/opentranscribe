# OpenTranscribe Backend

Python FastAPI backend for audio transcription using OpenAI Whisper.

## Setup

1. Install dependencies:
```bash
pip install -r ../requirements.txt
```

2. Run the server:
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `POST /transcribe` - Transcribe audio file

### Transcribe Endpoint

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: 
  - `file` (audio file) - required
  - `language` (string, optional) - Language code: `'en'` (English), `'es'` (Spanish), `'auto'` or omit for auto-detect

**Response:**
```json
{
  "text": "Transcribed text here",
  "language": "en",
  "detected_language": "en"
}
```

**Example with language:**
```bash
curl -X POST "http://localhost:8000/transcribe" \
  -F "file=@audio.mp3" \
  -F "language=es"
```

## Model

Uses OpenAI Whisper `base` model. The model is downloaded automatically on first use (~150MB) and cached for subsequent requests.

