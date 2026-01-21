#!/bin/bash
# OpenTranscribe launcher with CUDA support

# Set CUDA library paths for faster-whisper
export LD_LIBRARY_PATH=/home/ubuntu/miniconda3/lib/python3.12/site-packages/nvidia/cublas/lib:/home/ubuntu/miniconda3/lib/python3.12/site-packages/nvidia/cudnn/lib:$LD_LIBRARY_PATH

# Change to backend directory
cd "$(dirname "$0")"

# Run the requested command
if [ "$1" == "server" ]; then
    python3 main.py
elif [ "$1" == "cli" ]; then
    python3 cli.py
else
    echo "OpenTranscribe Launcher"
    echo "Usage: ./run.sh [server|cli]"
    echo ""
    echo "  server - Start the API server"
    echo "  cli    - Run the interactive CLI"
fi
