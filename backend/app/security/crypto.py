import logging
from cryptography.fernet import Fernet
from app.config import settings

logger = logging.getLogger(__name__)

fernet = Fernet(settings.CREDENTIAL_ENCRYPTION_KEY.encode())

def encrypt_credential(plain_text: str) -> str:
    if not plain_text:
        return ""
    try:
        encrypted_bytes = fernet.encrypt(plain_text.encode('utf-8'))
        return encrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Credential encryption error: {e}")
        return ""

def decrypt_credential(cipher_text: str) -> str:
    if not cipher_text:
        return ""
    try:
        decrypted_bytes = fernet.decrypt(cipher_text.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Credential decryption error: {e}")
        return ""
