import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from groq import Groq
from app.database import get_db
from app.models import User, UserCredential, ActivityLog
from app.security.auth import get_current_user
from app.security.crypto import encrypt_credential, decrypt_credential
from app.config import settings

router = APIRouter(prefix="/credentials", tags=["Credentials"])

class GroqKeyRequest(BaseModel):
    groq_api_key: str

@router.get("/status")
def get_credentials_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    return {
        "groq_connected": bool(cred and cred.groq_connected),
        "gmail_connected": bool(cred and cred.gmail_connected),
        "gmail_email": cred.gmail_email if (cred and cred.gmail_connected) else None
    }

@router.post("/groq")
def save_groq_key(
    payload: GroqKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = payload.groq_api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")

    # Validate key by firing a test ping call to Groq API
    try:
        test_client = Groq(api_key=key)
        test_client.models.list()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid Groq API key. Groq API validation failed: {str(e)}"
        )

    # Encrypt key at rest
    encrypted_key = encrypt_credential(key)

    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    if not cred:
        cred = UserCredential(user_id=current_user.id)
        db.add(cred)

    cred.groq_api_key_encrypted = encrypted_key
    cred.groq_connected = True
    cred.updated_at = datetime.datetime.utcnow()

    log = ActivityLog(
        user_id=current_user.id,
        agent_name="Credentials",
        action="Groq API Key Connected",
        details="Successfully validated and saved encrypted Groq API key."
    )
    db.add(log)
    db.commit()

    return {"status": "success", "groq_connected": True, "message": "Groq API Key validated and saved securely."}

@router.delete("/groq")
def delete_groq_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    if cred:
        cred.groq_api_key_encrypted = None
        cred.groq_connected = False
        db.commit()

    return {"status": "success", "groq_connected": False, "message": "Groq API key disconnected."}

@router.get("/gmail/oauth/start")
def gmail_oauth_start(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not settings.GMAIL_CLIENT_ID:
        # Simulate OAuth flow if client ID is absent for smooth local testing
        cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
        if not cred:
            cred = UserCredential(user_id=current_user.id)
            db.add(cred)

        cred.gmail_connected = True
        cred.gmail_email = current_user.email
        cred.gmail_refresh_token_encrypted = encrypt_credential("mock_gmail_refresh_token")
        db.commit()

        return {
            "status": "success",
            "redirect": False,
            "message": f"Connected to Gmail ({current_user.email}) in simulation mode."
        }

    # Redirect to Google OAuth consent URL
    redirect_uri = "http://localhost:8000/credentials/gmail/oauth/callback"
    scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
    url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={settings.GMAIL_CLIENT_ID}&redirect_uri={redirect_uri}&scope={scope}&access_type=offline&prompt=consent"

    return {"status": "success", "redirect": True, "url": url}

@router.get("/gmail/oauth/callback")
def gmail_oauth_callback(
    code: str = "",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    if not cred:
        cred = UserCredential(user_id=current_user.id)
        db.add(cred)

    cred.gmail_connected = True
    cred.gmail_email = current_user.email
    cred.gmail_refresh_token_encrypted = encrypt_credential(f"refresh_token_for_{code[:10]}")
    db.commit()

    return {"status": "success", "gmail_connected": True, "gmail_email": current_user.email}

@router.delete("/gmail")
def disconnect_gmail(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    if cred:
        cred.gmail_refresh_token_encrypted = None
        cred.gmail_connected = False
        cred.gmail_email = None
        db.commit()

    return {"status": "success", "gmail_connected": False, "message": "Gmail account disconnected."}
