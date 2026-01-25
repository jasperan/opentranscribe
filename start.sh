#!/bin/bash
# OpenTranscribe - Single command startup script
# Starts both backend (FastAPI) and frontend (Next.js)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR"

# Default ports
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Get external IP
get_external_ip() {
    curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || hostname -I | awk '{print $1}'
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill $HTTPS_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     OpenTranscribe                           ║"
echo "║         Real-time Speech-to-Text Transcription               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Kill any existing processes on our ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
kill $(lsof -t -i:$BACKEND_PORT) 2>/dev/null || true
kill $(lsof -t -i:$FRONTEND_PORT) 2>/dev/null || true
sleep 1

# Start backend
echo -e "${GREEN}Starting backend on port $BACKEND_PORT...${NC}"
cd "$BACKEND_DIR"
nohup uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT > /tmp/opentranscribe-backend.log 2>&1 &
BACKEND_PID=$!
sleep 2

# Verify backend started
if curl -s http://localhost:$BACKEND_PORT/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend started successfully${NC}"
else
    echo -e "${RED}✗ Backend failed to start. Check /tmp/opentranscribe-backend.log${NC}"
    cat /tmp/opentranscribe-backend.log
    exit 1
fi

# Start frontend
echo -e "${GREEN}Starting frontend on port $FRONTEND_PORT...${NC}"
cd "$FRONTEND_DIR"
nohup npm run dev -- -p $FRONTEND_PORT -H 0.0.0.0 > /tmp/opentranscribe-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

# Verify frontend started
if curl -s http://localhost:$FRONTEND_PORT/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend started successfully${NC}"
else
    echo -e "${YELLOW}⏳ Frontend still starting...${NC}"
fi

# Generate SSL certificates if they don't exist
HTTPS_PORT=${HTTPS_PORT:-3443}
if [ ! -f "$SCRIPT_DIR/certs/localhost.pem" ]; then
    echo -e "${YELLOW}Generating SSL certificates...${NC}"
    mkdir -p "$SCRIPT_DIR/certs"
    openssl req -x509 -newkey rsa:2048 \
        -keyout "$SCRIPT_DIR/certs/localhost-key.pem" \
        -out "$SCRIPT_DIR/certs/localhost.pem" \
        -days 365 -nodes \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:$(curl -s ifconfig.me 2>/dev/null || echo '127.0.0.1')" \
        2>/dev/null
fi

# Start HTTPS proxy
echo -e "${GREEN}Starting HTTPS proxy on port $HTTPS_PORT...${NC}"
cd "$SCRIPT_DIR"
nohup node https-server.js > /tmp/opentranscribe-https.log 2>&1 &
HTTPS_PID=$!
sleep 2

if curl -sk https://localhost:$HTTPS_PORT/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ HTTPS proxy started successfully${NC}"
else
    echo -e "${YELLOW}⏳ HTTPS proxy still starting...${NC}"
fi

# Get external IP
EXTERNAL_IP=$(get_external_ip)

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}OpenTranscribe is running!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}HTTPS App:${NC}      https://$EXTERNAL_IP:$HTTPS_PORT/app"
echo -e "  ${GREEN}HTTPS Live:${NC}     https://$EXTERNAL_IP:$HTTPS_PORT/app/live"
echo -e "  ${GREEN}API Docs:${NC}       http://$EXTERNAL_IP:$BACKEND_PORT/docs"
echo ""
echo -e "  ${YELLOW}Local URLs:${NC}"
echo -e "    HTTPS:        https://localhost:$HTTPS_PORT"
echo -e "    HTTP:         http://localhost:$FRONTEND_PORT"
echo -e "    Backend API:  http://localhost:$BACKEND_PORT"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}⚠ Your browser will show a security warning for the self-signed${NC}"
echo -e "${YELLOW}  certificate. Click 'Advanced' → 'Proceed' to continue.${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running and show logs
tail -f /tmp/opentranscribe-backend.log /tmp/opentranscribe-frontend.log 2>/dev/null &
TAIL_PID=$!

# Wait for any process to exit
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
