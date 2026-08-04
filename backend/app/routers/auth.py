import re
import datetime
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserCredential, Profile
from app.schemas import UserCreate, UserLogin, UserResponse, AuthMessageResponse
from app.security.auth import hash_password, verify_password, create_jwt_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@router.post("/signup", response_model=AuthMessageResponse)
def signup(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password

    # Input validations
    if not re.match(EMAIL_REGEX, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid email address."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    hashed_pw = hash_password(password)
    user = User(email=email, password_hash=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize empty profile and credentials records
    profile = Profile(user_id=user.id, email=email)
    cred = UserCredential(user_id=user.id)
    db.add(profile)
    db.add(cred)
    db.commit()

    token = create_jwt_token(user.id, user.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=604800
    )

    return AuthMessageResponse(
        message="Account created successfully!",
        token=token,
        user=UserResponse(id=user.id, email=user.email, created_at=user.created_at)
    )

@router.post("/login", response_model=AuthMessageResponse)
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please check your credentials and try again."
        )

    token = create_jwt_token(user.id, user.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=604800
    )

    return AuthMessageResponse(
        message="Logged in successfully!",
        token=token,
        user=UserResponse(id=user.id, email=user.email, created_at=user.created_at)
    )

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="session_token")
    return {"message": "Logged out successfully."}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at
    )
