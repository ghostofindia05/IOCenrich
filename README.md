# IOCenrich

**IOCenrich** is a modern, open-source Threat Intelligence & Indicator of Compromise (IOC) extraction, enrichment, and analysis platform. It automates the process of extracting threat indicators from unstructured security reports, enriching them with telemetry from leading threat intelligence vendors, and presenting them in a beautiful, interactive analytical workspace.

---

## 🚀 Key Features

*   **Automated IOC Extraction & Defanging:** Extracts IP addresses (IPv4/IPv6), domains, URLs, and hashes (MD5, SHA-1, SHA-256) from raw, unstructured text. Offers automatic defanging to prevent accidental execution/clicking.
*   **Asynchronous Multi-Source Enrichment:** Dispatches parallel tasks to query security telemetry from:
    *   **VirusTotal:** Reputation, detected engine counts, and historical tags.
    *   **AbuseIPDB:** Abuse reports, confidence score, and ISP metadata.
    *   **GreyNoise:** Internet-wide scanning activity and scanner classification.
    *   **AlienVault OTX:** Pulse counts and threat classifications.
    *   **URLhaus:** Active malware distribution status and payloads.
*   **Forensic Evidence Capture:** Leverages headless Playwright workers to capture visual screenshots and record redirect chains of suspicious URLs, safely routed through an optional Cloudflare WARP proxy to mask the server's identity.
*   **Unified Threat Scoring:** Normalized algorithm calculating a threat score (0-100) based on cross-vendor telemetry.
*   **Interactive Visualizations:**
    *   **Knowledge Graph:** Visualizes relationships between submissions, domains, IPs, and records.
    *   **Geographic Map:** Interactive choropleth map plotting threat distribution by country.
*   **Production Process Utilities:** Simple one-click startup scripts for development and deployment.

---

## 🏗️ Architecture

```
                       ┌─────────────────────────┐
                       │   Next.js Web UI        │
                       │   (React / Tailwind)    │
                       └────────────┬────────────┘
                                    │
                                    ▼ (SuperTokens Auth Proxy)
                       ┌─────────────────────────┐
                       │   FastAPI Backend API   │
                       └────────────┬────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
  ┌──────────────────┐                            ┌──────────────────┐
  │   PostgreSQL     │                            │      Redis       │
  │   (Relational)   │                            │ (Celery + Cache) │
  └──────────────────┘                            └─────────┬────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │  Celery Workers  │
                                                  │   (Playwright)   │
                                                  └─────────┬────────┘
                                                            │
                                                            ▼
                                                  ┌──────────────────┐
                                                  │ External APIs    │
                                                  │  (VirusTotal,    │
                                                  │   AbuseIPDB, OTX)│
                                                  └──────────────────┘
```

---

## 🛠️ Prerequisites

*   **Docker & Docker Compose** (for running PostgreSQL and Redis services)
*   **Python 3.11+**
*   **Node.js 18+** & **npm**

---

## ⚡ Quick Start

We provide unified setup and startup scripts for both Windows and Linux/macOS.

### 1. Requirements Setup

Run the setup script from the root directory. This will check dependencies, initialize the Python virtual environment (`venv`), install Node.js modules, run Playwright browser installations, and copy default `.env` configs.

*   **Windows:**
    ```cmd
    setup.bat
    ```
*   **Linux / macOS:**
    ```bash
    ./setup.sh
    ```

### 2. Run Infrastructure Services

Boot the database and Redis cache using Docker Compose:
```bash
docker compose up -d
```

### 3. Apply Database Migrations

With PostgreSQL running, initialize the schema:
*   **Windows:**
    ```cmd
    cd backend
    venv\Scripts\activate
    alembic upgrade head
    ```
*   **Linux / macOS:**
    ```bash
    cd backend
    source venv/bin/activate
    alembic upgrade head
    ```

### 4. Launch Services

Open three terminals and run the starting scripts to launch all parts of the application:

#### Development Mode:

| Component | Windows Script | Linux/macOS Script |
|---|---|---|
| **Backend API** | `start-backend.bat` | `./start-backend.sh` |
| **Frontend UI** | `start-frontend.bat` | `./start-frontend.sh` |
| **Celery Worker** | `start-worker.bat` | `./start-worker.sh` |

#### Production Mode:

| Component | Windows Script | Linux/macOS Script |
|---|---|---|
| **Backend API** | `start-backend-prod.bat` | `./start-backend-prod.sh` |
| **Frontend UI** | `start-frontend-prod.bat` | `./start-frontend-prod.sh` |
| **Celery Worker** | `start-worker.bat` | `./start-worker.sh` | (Same as Dev)

Once started, navigate to:
*   **Web Interface:** `http://localhost:3000`
*   **Interactive API Documentation:** `http://localhost:8000/docs`

---

## ⚙️ Configuration & API Integrations

The system is fully functional out of the box with simulated data. To enable live vendor lookups, configure your API keys by logging into the Web UI and heading to the **Settings** page.

Keys are encrypted at rest using AES-256-GCM envelope encryption using a Master Key defined in your `.env`:
*   `VAULT_MASTER_KEY`: Your envelope encryption key.
*   `VAULT_SALT`: Random salt for derivation.

---

## 📄 License

This project is licensed under the MIT License. Feel free to use, modify, and distribute.
