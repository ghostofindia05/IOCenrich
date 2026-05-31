#!/usr/bin/env bash
# IOCenrich — Frontend Startup (Linux/macOS)
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "\n============================================================"
echo -e "  IOCenrich — Frontend (Next.js Dev Server)"
echo -e "  Listening on: http://localhost:3000"
echo -e "============================================================\n"

# ── Check node_modules ───────────────────────────────────────
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${RED}[ERROR] Node modules not found. Run ./setup.sh first.${NC}"
    exit 1
fi

# ── Check .env.local ─────────────────────────────────────────
if [ ! -f "frontend/.env.local" ]; then
    echo -e "${YELLOW}[WARN]  frontend/.env.local not found.${NC}"
    if [ -f "frontend/.env.local.example" ]; then
        echo -e "${BLUE}[INFO]  Copying .env.local.example to .env.local...${NC}"
        cp frontend/.env.local.example frontend/.env.local
    fi
fi

# ── Start Next.js ────────────────────────────────────────────
echo -e "${BLUE}[INFO] Starting Next.js development server (verbose)...${NC}"
echo -e "       Press CTRL+C to stop.\n"

cd frontend
npm run dev

echo -e "\n[INFO] Frontend stopped."
