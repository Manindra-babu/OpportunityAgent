import re
import random
import datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserCredential, Profile, OTPVerification, ActivityLog
from app.schemas import (
    UserCreate, UserLogin, UserResponse, AuthMessageResponse,
    RequestOTPPayload, VerifyOTPAndSignupPayload
)
from app.security.auth import hash_password, verify_password, create_jwt_token, get_current_user
from app.services.notification_agent import send_otp_email

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])

EMAIL_REGEX = r"^[\w\.-]+@[\w\.-]+\.\w+$"

@router.post("/request-otp")
def request_otp(payload: RequestOTPPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()

    if not re.match(EMAIL_REGEX, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address."
        )

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in instead."
        )

    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=10)

    db.query(OTPVerification).filter(
        OTPVerification.email == email,
        OTPVerification.is_verified == False
    ).delete()

    otp_record = OTPVerification(
        email=email,
        otp_code=otp_code,
        expires_at=expires_at,
        is_verified=False
    )
    db.add(otp_record)
    db.commit()

    email_sent = send_otp_email(email, otp_code)
    logger.info(f"🔑 Real-Time OTP generated for {email}: {otp_code}")

    log = ActivityLog(
        agent_name="Auth Security Agent",
        action="Real-Time Signup OTP Dispatched",
        details=f"Generated 6-digit OTP [{otp_code}] for email: {email} (Sent to inbox: {email_sent})."
    )
    db.add(log)
    db.commit()

    return {
        "message": f"Verification code sent to {email}! Check your inbox or system console.",
        "otp_code": otp_code,
        "email_sent_to_inbox": email_sent,
        "expires_in_minutes": 10
    }

@router.post("/verify-otp-signup", response_model=AuthMessageResponse)
def verify_otp_signup(payload: VerifyOTPAndSignupPayload, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    # Strip spaces and formatting from OTP code
    otp_code = re.sub(r"\D", "", payload.otp_code)
    password = payload.password

    if not otp_code or len(otp_code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid 6-digit OTP code."
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    # Check if user already exists
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )

    otp_record = db.query(OTPVerification).filter(
        OTPVerification.email == email,
        OTPVerification.otp_code == otp_code,
        OTPVerification.is_verified == False
    ).order_by(OTPVerification.created_at.desc()).first()

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Please check the 6-digit code and try again."
        )

    if datetime.datetime.utcnow() > otp_record.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP code has expired. Please click 'Resend OTP' for a new code."
        )

    otp_record.is_verified = True

    hashed_pw = hash_password(password)
    user = User(email=email, password_hash=hashed_pw)
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = Profile(user_id=user.id, email=email, full_name=payload.full_name or "Candidate")
    cred = UserCredential(user_id=user.id)
    db.add(profile)
    db.add(cred)

    log = ActivityLog(
        user_id=user.id,
        agent_name="Auth Security Agent",
        action="Real-Time Signup OTP Verified",
        details=f"Successfully verified email OTP for {email}. Account created!"
    )
    db.add(log)
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
        message="Email verified and account created successfully!",
        token=token,
        user=UserResponse(id=user.id, email=user.email, created_at=user.created_at)
    )

@router.post("/signup", response_model=AuthMessageResponse)
def signup(payload: UserCreate, response: Response, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    password = payload.password

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

    profile = Profile(user_id=user.id, email=email, full_name=payload.full_name or "Candidate")
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
