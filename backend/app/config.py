import os
import base64
from cryptography.fernet import Fernet

try:
    from dotenv import load_dotenv
    load_dotenv()
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
except ImportError:
    pass

def get_or_create_fernet_key():
    key = os.getenv("CREDENTIAL_ENCRYPTION_KEY", "")
    if not key:
        key = Fernet.generate_key().decode()
    elif isinstance(key, str):
        try:
            Fernet(key.encode())
        except Exception:
            key = base64.urlsafe_b64encode(key.zfill(32)[:32].encode()).decode()
    return key

def get_database_url():
    url = os.getenv("DATABASE_URL", "sqlite:///./opportunity_agent.db")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url

class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    JWT_SECRET: str = os.getenv("JWT_SECRET", "opportunity-agent-super-secret-jwt-key-2026")
    CREDENTIAL_ENCRYPTION_KEY: str = get_or_create_fernet_key()
    DATABASE_URL: str = get_database_url()
    GMAIL_CLIENT_ID: str = os.getenv("GMAIL_CLIENT_ID", "")
    GMAIL_CLIENT_SECRET: str = os.getenv("GMAIL_CLIENT_SECRET", "")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    RELEVANCE_THRESHOLD: float = float(os.getenv("RELEVANCE_THRESHOLD", "70.0"))

settings = Settings()
