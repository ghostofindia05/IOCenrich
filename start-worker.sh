#!/usr/bin/env bash
# IOCenrich — Celery Worker Startup (Linux/macOS)
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n============================================================"
echo -e "  IOCenrich — Celery Background Worker"
echo -e "  Processes IOC enrichment tasks from the Redis queue."
echo -e "============================================================\n"

# ── Activate virtual environment ─────────────────────────────
if [ ! -f "backend/venv/bin/activate" ]; then
    echo -e "${RED}[ERROR] Virtual environment not found. Run ./setup.sh first.${NC}"
    exit 1
fi

echo -e "${BLUE}[INFO] Activating Python virtual environment...${NC}"
source backend/venv/bin/activate

# ── Check Redis ──────────────────────────────────────────────
echo -e "${BLUE}[INFO] Checking Redis connection...${NC}"
if ! command -v redis-cli &> /dev/null; then
    echo -e "${YELLOW}[WARN]  redis-cli not installed. Cannot check Redis connection.${NC}"
else
    if ! redis-cli ping &> /dev/null; then
        echo -e "${RED}[ERROR] Redis is not responding on localhost:6379.${NC}"
        echo -e "        Start Redis before running the worker."
        echo -e "        Quick start: docker run -d -p 6379:6379 redis:7-alpine"
        exit 1
    else
        echo -e "       ${GREEN}[OK]   Redis is reachable.${NC}"
    fi
fi

# ── Start Celery ─────────────────────────────────────────────
echo -e "\n${BLUE}[INFO] Starting Celery worker (verbose, log level: INFO)...${NC}"
echo -e "       Worker processes: IOC enrichment, DNS resolution, threat intel queries"
echo -e "       Press CTRL+C to stop.\n"

cd backend
venv/bin/celery -A app.workers.celery_app.celery_app worker \
    --loglevel=info \
    -E

echo -e "\n[INFO] Celery worker stopped."
