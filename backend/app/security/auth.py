import datetime
import jwt
from typing import Optional
from passlib.context import CryptContext
from fastapi import Request, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings

# Enterprise password hashing context using Bcrypt with automatic salting
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback verification if legacy sha256 hash exists
        import hashlib
        salt = "opportunity_agent_salt_2026"
        legacy_hash = hashlib.sha256((plain_password + salt).encode('utf-8')).hexdigest()
        return legacy_hash == hashed_password

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
