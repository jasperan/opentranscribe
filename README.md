# OpenTranscribe

A React app for transcribing MP3 audio files using OpenAI's Whisper model via a Python backend API.

## Features
- Drag-and-drop MP3 upload
- High-accuracy transcription with Whisper (base model)
- Multi-language support: English, Spanish, and auto-detect
- Verbatim text output
- Fast API backend with FastAPI

## Prerequisites

- **Node.js** (v18+)
- **Python** (v3.8+)
- **pip** (Python package manager)

## Setup

### 1. Install Frontend Dependencies

```bash
npm install
```

### 2. Install Python Backend Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Run the Application

**Terminal 1 - Start Python Backend:**
```bash
cd backend
python main.py
```
The API will run on `http://localhost:8000`

**Terminal 2 - Start Frontend:**
```bash
npm run dev
```
The app will open at `http://localhost:5173`

## Usage

1. Open the app in your browser
2. Drag and drop an MP3 file or click to upload
3. Wait for transcription (first request may take longer as the model loads)
4. Copy or view the transcribed text

## API Endpoints

- `GET /` - API status
- `GET /health` - Health check
- `POST /transcribe` - Transcribe audio file (multipart/form-data)

## Build for Production

### Frontend
```bash
npm run build
```
Deploy the `dist/` folder` to any static host.

### Backend
The backend can be deployed to any Python hosting service:
- **Heroku**: Add `Procfile` with `web: uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Railway/Render**: Configure to run `python backend/main.py`
- **Docker**: Create a Dockerfile for containerized deployment

**Note:** Update `VITE_API_URL` environment variable in the frontend to point to your deployed backend URL.

## Supported Formats & Languages
- **Audio Formats**: MP3, WAV, and other audio formats supported by Whisper
- **Languages**: 
  - English (en)
  - Spanish (es)
  - Auto-detect (automatically detects the language)

## Model Information
- Uses OpenAI Whisper `base` model (~150MB download on first use)
- Model is cached after first load for faster subsequent requests