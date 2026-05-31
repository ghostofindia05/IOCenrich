import os
import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWKClientError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

# ---------------------------------------------------------------------------
# JWKS client — fetches and caches SuperTokens public keys from the Next.js
# frontend automatically. Default is http://localhost:3000/api/auth/jwt/jwks.json.
# Override FRONTEND_URL in .env for multi-container or production deployments.
# ---------------------------------------------------------------------------
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
first_frontend = [url.strip() for url in FRONTEND_URL.split(",") if "localhost" in url or "127.0.0.1" in url or "http" in url]
jwks_domain = first_frontend[0] if first_frontend else "http://localhost:3000"
_JWKS_URL = f"{jwks_domain.rstrip('/')}/api/auth/jwt/jwks.json"

jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True, lifespan=3600)


def _decode_token(token: str) -> dict:
    """
    Decodes and validates a SuperTokens JWT using asymmetric verification via JWKS.
    Supports RS256 algorithm only.
    """
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except PyJWKClientError as e:
        logger.error(f"JWKS Error fetching signing key from {_JWKS_URL}: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unable to verify signing key")
    except Exception as e:
        logger.error(f"JWT Validation Error: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication token")


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Validates the SuperTokens JWT from the Authorization header.
    Returns the user's UUID (sub claim) if valid.
    """
    payload = _decode_token(credentials.credentials)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user_id




def verify_token_from_string(token: str) -> str:
    """
    Validates a raw JWT string (used by WebSocket endpoints where HTTPBearer is unavailable).
    Returns the user's UUID (sub claim) if valid.
    """
    payload = _decode_token(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user_id
