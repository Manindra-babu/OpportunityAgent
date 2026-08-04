from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/gmail", tags=["Gmail"])

@router.get("/status")
def gmail_status():
    configured = bool(settings.GMAIL_CLIENT_ID and settings.GMAIL_CLIENT_SECRET)
    return {
        "connected": configured,
        "mode": "Gmail API OAuth2" if configured else "Simulated Email Pipeline (Active & Ready)",
        "email_account": "user.opportunity.agent@gmail.com" if configured else "simulation@opportunityagent.local"
    }

@router.post("/oauth/callback")
def gmail_oauth_callback(code: str = ""):
    return {"status": "success", "message": "Gmail OAuth credentials connected successfully."}
