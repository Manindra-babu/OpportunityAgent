import datetime
import hashlib
import jwt
from typing import Optional
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings

def hash_password(password: str) -> str:
    # Deterministic salted SHA256 fallback for maximum compatibility across environments
    salt = "opportunity_agent_salt_2026"
    return hashlib.sha256((password + salt).encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_jwt_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7),
        "iat": datetime.datetime.utcnow()
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception:
        return None

def get_current_user_optional(request: Request, db: Session = Depends(get_db)):
    from app.models import User
    
    # Check Cookie first, then Authorization Header
    token = request.cookies.get("session_token")
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
            detail="Authentication required. Please log in."
        )
    return user
