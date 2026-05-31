import os
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
from app.core.config import settings

logger = logging.getLogger(__name__)

def _get_kek(user_id: str) -> bytes:
    # Use PBKDF2HMAC to derive the Key Encryption Key (KEK) from the Master Key
    # The salt uses the static vault salt (min 16 bytes) combined with the user_id
    salt = settings.VAULT_SALT.encode('utf-8') + user_id.encode('utf-8')
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
        backend=default_backend()
    )
    return kdf.derive(settings.VAULT_MASTER_KEY.encode('utf-8'))

def encrypt_api_key(api_key: str, user_id: str) -> str:
    """Encrypts a user's third-party API key using Envelope Encryption."""
    kek = _get_kek(user_id)
    # Generate unique Data Encryption Key (DEK) for this specific secret
    dek = os.urandom(32)
    
    # 1. Encrypt api_key with DEK
    aesgcm_dek = AESGCM(dek)
    nonce_dek = os.urandom(12)
    ciphertext_secret = aesgcm_dek.encrypt(nonce_dek, api_key.encode('utf-8'), None)
    
    # 2. Encrypt DEK with KEK
    aesgcm_kek = AESGCM(kek)
    nonce_kek = os.urandom(12)
    ciphertext_dek = aesgcm_kek.encrypt(nonce_kek, dek, None)
    
    # Format: nonce_kek (12 bytes) + ciphertext_dek (48 bytes) + nonce_dek (12 bytes) + ciphertext_secret (variable)
    # AES-256-GCM adds a 16-byte authentication tag, so a 32-byte DEK results in 48-byte ciphertext.
    combined = nonce_kek + ciphertext_dek + nonce_dek + ciphertext_secret
    return combined.hex()

def decrypt_api_key(encrypted_hex: str, user_id: str) -> str:
    """Decrypts a previously encrypted API key using Envelope Encryption."""
    try:
        kek = _get_kek(user_id)
        combined = bytes.fromhex(encrypted_hex)
        
        nonce_kek = combined[:12]
        ciphertext_dek = combined[12:60]
        nonce_dek = combined[60:72]
        ciphertext_secret = combined[72:]
        
        # 1. Decrypt DEK with KEK
        aesgcm_kek = AESGCM(kek)
        dek = aesgcm_kek.decrypt(nonce_kek, ciphertext_dek, None)
        
        # 2. Decrypt secret with DEK
        aesgcm_dek = AESGCM(dek)
        decrypted = aesgcm_dek.decrypt(nonce_dek, ciphertext_secret, None)
        
        return decrypted.decode('utf-8')
    except Exception as e:
        logger.warning(f"Failed to decrypt API key for user {user_id}. Decryption key may have been rotated. Error: {e}")
        return ""

