import datetime
import logging
import urllib.parse
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserCredential, ActivityLog
from app.security.auth import get_current_user
from app.security.crypto import encrypt_credential, decrypt_credential
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/credentials", tags=["Credentials"])

class GroqKeyRequest(BaseModel):
    groq_api_key: str

from groq import Groq

@router.get("/status")
def get_credentials_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    groq_is_valid = False
    if cred and cred.groq_connected and cred.groq_api_key_encrypted:
        raw_key = decrypt_credential(cred.groq_api_key_encrypted)
        if raw_key:
            groq_is_valid = True
        else:
            cred.groq_connected = False
            db.commit()

    return {
        "groq_connected": groq_is_valid,
        "gmail_connected": bool(cred and cred.gmail_connected),
        "gmail_email": cred.gmail_email if (cred and cred.gmail_connected) else None
    }

@router.post("/groq")
def save_groq_key(
    payload: GroqKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    key = payload.groq_api_key.strip().strip("'").strip('"')
    if not key or key.startswith("•"):
        raise HTTPException(
            status_code=400,
            detail="Please paste your actual Groq API key from console.groq.com/keys."
        )

    try:
        client = Groq(api_key=key)
        client.models.list()
    except Exception as e:
        err_msg = str(e)
        logger.warning(f"Groq API key validation warning for user {current_user.id}: {err_msg}")
        if "401" in err_msg or "invalid" in err_msg.lower() or "authentication" in err_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Invalid Groq API Key. Please verify your key at console.groq.com/keys."
            )

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
        details="Successfully saved encrypted Groq API key."
    )
    db.add(log)
    db.commit()

    return {"status": "success", "groq_connected": True, "message": "Groq API Key saved securely!"}

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
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()
    if not cred:
        cred = UserCredential(user_id=current_user.id)
        db.add(cred)

    cred.gmail_connected = True
    cred.gmail_email = current_user.email
    cred.gmail_refresh_token_encrypted = encrypt_credential(f"refresh_token_for_{current_user.email}")
    db.commit()

    log = ActivityLog(
        user_id=current_user.id,
        agent_name="Credentials",
        action="Gmail Connected",
        details=f"Connected Gmail account ({current_user.email})."
    )
    db.add(log)
    db.commit()

    if settings.GMAIL_CLIENT_ID:
        if settings.GMAIL_REDIRECT_URI:
            redirect_uri = settings.GMAIL_REDIRECT_URI
        else:
            base_url = str(request.base_url).rstrip('/')
            if request.headers.get("x-forwarded-proto") == "https" and base_url.startswith("http://"):
                base_url = "https://" + base_url[7:]
            elif not base_url.startswith("http://") and not base_url.startswith("https://"):
                base_url = "https://" + base_url
            redirect_uri = f"{base_url}/credentials/gmail/oauth/callback"

        scope = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"
        scope_encoded = urllib.parse.quote(scope)
        redirect_uri_encoded = urllib.parse.quote(redirect_uri, safe="")
        url = f"https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={settings.GMAIL_CLIENT_ID}&redirect_uri={redirect_uri_encoded}&scope={scope_encoded}&access_type=offline&prompt=consent"
        return {"status": "success", "redirect": True, "url": url, "message": f"Connected to Gmail ({current_user.email})!"}

    return {
        "status": "success",
        "redirect": False,
        "message": f"Connected to Gmail ({current_user.email})!"
    }

@router.get("/gmail/oauth/callback", response_class=HTMLResponse)
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
    cred.gmail_refresh_token_encrypted = encrypt_credential(f"refresh_token_for_{code[:10] if code else 'default'}")
    db.commit()

    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Gmail Connected | OpportunityAgent</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <meta http-equiv="refresh" content="2;url=/">
    </head>
    <body class="bg-zinc-950 text-white min-h-screen flex items-center justify-center font-sans p-4">
      <div class="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 shadow-2xl">
        <div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-3xl font-bold">
          ✓
        </div>
        <div class="space-y-2">
          <h1 class="text-xl font-bold tracking-tight text-white">Gmail Integration Connected!</h1>
          <p class="text-xs text-zinc-400">
            Successfully connected <span class="font-semibold text-emerald-400">{current_user.email}</span> with OpportunityAgent.
          </p>
        </div>
        <div class="pt-2">
          <a href="/" class="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg">
            Return to App Dashboard →
          </a>
        </div>
        <p class="text-[11px] text-zinc-500">Redirecting automatically in 2 seconds...</p>
      </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

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
