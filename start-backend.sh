#!/bin/bash
set -e

echo "Starting OpenTranscribe Backend..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend" || { echo "Error: backend directory not found"; exit 1; }

python main.py

