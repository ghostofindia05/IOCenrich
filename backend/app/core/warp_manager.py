"""
warp_manager.py

Cloudflare WARP manager — proxy mode only.

Exposes a local SOCKS5 proxy on 127.0.0.1:40000 when active.
Only traffic that explicitly routes through this proxy (i.e. Playwright)
goes through Cloudflare. All other services (FastAPI, enrichment tasks,
external API calls) continue using the server's real internet connection.
"""

import subprocess
import logging

logger = logging.getLogger(__name__)

WARP_PROXY_HOST = "127.0.0.1"
WARP_PROXY_PORT = 40000
WARP_PROXY_URL = f"socks5://{WARP_PROXY_HOST}:{WARP_PROXY_PORT}"


def _run_warp_cli(*args: str, timeout: int = 10) -> tuple[int, str]:
    """Run a warp-cli command. Returns (returncode, combined stdout+stderr)."""
    try:
        result = subprocess.run(
            ["/usr/bin/warp-cli", *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return result.returncode, (result.stdout + result.stderr).strip()
    except FileNotFoundError:
        return -1, "warp-cli not found — Cloudflare WARP is not installed."
    except subprocess.TimeoutExpired:
        return -1, f"warp-cli timed out after {timeout}s."
    except Exception as e:
        return -1, str(e)


def _ensure_proxy_mode() -> tuple[bool, str]:
    """
    Ensure WARP is running in proxy mode (not full-tunnel VPN).
    warp-cli mode proxy  →  WARP opens a local SOCKS5 proxy on port 40000
    and does NOT redirect system-wide traffic.
    """
    code, output = _run_warp_cli("mode", "proxy")
    if code != 0:
        logger.error("[WARP] Failed to set proxy mode: %s", output)
        return False, f"Could not set proxy mode: {output}"
    logger.info("[WARP] Proxy mode confirmed.")
    return True, output


def get_warp_status() -> tuple[bool, str]:
    """
    Check if WARP is currently connected.

    Returns:
        (is_connected: bool, message: str)
    """
    code, output = _run_warp_cli("status")
    if code != 0:
        return False, output

    if "Connected" in output and "Disconnected" not in output:
        return True, f"WARP proxy is active on {WARP_PROXY_URL}"
    return False, f"WARP is not connected. Current status: {output}"


def ensure_warp_connected() -> tuple[bool, str]:
    """
    Make sure WARP is in proxy mode and connected before a Playwright capture.

    Steps:
      1. Set WARP to proxy mode (no system-wide VPN effect).
      2. If not connected, call warp-cli connect.
      3. Confirm connected state (up to 3 retries).

    Returns:
        (success: bool, message: str)

    Fail-open: if warp-cli is missing or connection fails we return False
    so the caller can log a warning and proceed without WARP rather than
    blocking the feature entirely.
    """
    # Step 1: enforce proxy mode
    ok, msg = _ensure_proxy_mode()
    if not ok:
        return False, msg

    # Step 2: check current state
    connected, status_msg = get_warp_status()
    if connected:
        logger.info("[WARP] Already connected in proxy mode.")
        return True, status_msg

    # Step 3: connect
    logger.warning("[WARP] Not connected — attempting to connect...")
    code, output = _run_warp_cli("connect")
    if code != 0:
        logger.error("[WARP] warp-cli connect failed: %s", output)
        return False, f"WARP connect failed: {output}"

    # Step 4: wait for Connected state
    import time
    for attempt in range(3):
        time.sleep(2)
        connected, status_msg = get_warp_status()
        if connected:
            logger.info("[WARP] Connected on attempt %d. Proxy: %s", attempt + 1, WARP_PROXY_URL)
            return True, status_msg
        logger.debug("[WARP] Waiting for connection... attempt %d/3", attempt + 1)

    return False, "WARP did not reach Connected state after 3 attempts."


def verify_warp_active() -> tuple[bool, str]:
    """
    Public API used by the /api/settings/warp-status health endpoint.
    Returns current connection state without attempting to reconnect.
    """
    return get_warp_status()


def get_proxy_url() -> str:
    """Return the SOCKS5 proxy URL for Playwright configuration."""
    return WARP_PROXY_URL
