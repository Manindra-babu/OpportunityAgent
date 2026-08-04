from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile, UserCredential
from app.security.auth import hash_password, verify_password, create_jwt_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str = "Candidate"

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/signup")
def signup(payload: SignupRequest, response: Response, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    hashed = hash_password(payload.password)
    new_user = User(email=clean_email, password_hash=hashed)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize default profile for user
    profile = Profile(
        user_id=new_user.id,
        full_name=payload.full_name,
        email=clean_email,
        skills=["Python", "JavaScript", "React", "FastAPI", "Git"],
        projects=[{"title": "Multi-Agent Automation Platform", "description": "Automated workflow platform with LLMs and Playwright", "tech": "Python, React"}],
        education=[{"institution": "University", "degree": "Computer Science", "year": "2026"}],
        primary_domain="Full Stack Development",
        cgpa="8.5"
    )
    db.add(profile)

    # Initialize credentials record
    cred = UserCredential(user_id=new_user.id)
    db.add(cred)

    db.commit()

    # Create JWT session cookie
    token = create_jwt_token(new_user.id, new_user.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=604800, # 7 days
        samesite="lax"
    )

    return {
        "status": "success",
        "user": {"id": new_user.id, "email": new_user.email},
        "token": token
    }

@router.post("/login")
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_jwt_token(user.id, user.email)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        max_age=604800,
        samesite="lax"
    )

    return {
        "status": "success",
        "user": {"id": user.id, "email": user.email},
        "token": token
    }

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="session_token")
    return {"status": "success", "message": "Logged out successfully."}

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at
    }
