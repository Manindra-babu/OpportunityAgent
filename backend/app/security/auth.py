import os
import hashlib
import datetime
import jwt
from typing import Optional
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings

SALT = "opportunity_agent_secure_salt_2026"

def hash_password(password: str) -> str:
    """
    Generates a secure PBKDF2-HMAC-SHA256 password hash.
    100% crash-proof across all Python and operating system environments.
    """
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), SALT.encode('utf-8'), 100000)
    return key.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    new_hash = hash_password(plain_password)
    if new_hash == hashed_password:
        return True

    # Fallback check for legacy SHA256 hashes
    legacy_salt = "opportunity_agent_salt_2026"
    legacy_hash = hashlib.sha256((plain_password + legacy_salt).encode('utf-8')).hexdigest()
    if legacy_hash == hashed_password:
        return True

    return False

def create_jwt_token(user_id: int, email: str, expires_delta: Optional[datetime.timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(days=7)

    payload = {
        "sub": str(user_id),
        "email": email,
        "iss": "OpportunityAgent",
        "exp": expire,
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"], issuer="OpportunityAgent")
        return payload
    except Exception:
        return None

def get_current_user_optional(request: Request, db: Session = Depends(get_db)):
    from app.models import User

    # 1. Check httpOnly Session Cookie
    token = request.cookies.get("session_token")

    # 2. Fallback to Bearer Authorization Header
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        return None

    payload = decode_jwt_token(token)
    if not payload:
        return None

    user_id = int(payload.get("sub", 0))
    user = db.query(User).filter(User.id == user_id).first()
    return user

def get_current_user(request: Request, db: Session = Depends(get_db)):
    user = get_current_user_optional(request, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication session expired or invalid. Please log in again."
        )
    return user
