@echo off
echo Starting OpenTranscribe Backend...
cd /d "%~dp0backend" || (echo Error: backend directory not found & exit /b 1)
python main.py

