from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, SystemSettings, ActivityLog, UserCredential
from app.schemas import ThresholdUpdate
from app.security.auth import get_current_user
from app.config import settings
from app.services.relevance_agent import evaluate_all_unscored_for_user

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    threshold_rec = db.query(SystemSettings).filter(
        SystemSettings.key == "relevance_threshold",
        SystemSettings.user_id == current_user.id
    ).first()
    thresh_val = float(threshold_rec.value) if threshold_rec else settings.RELEVANCE_THRESHOLD

    cred = db.query(UserCredential).filter(UserCredential.user_id == current_user.id).first()

    return {
        "relevance_threshold": thresh_val,
        "groq_key_configured": bool(cred and cred.groq_connected),
        "gmail_configured": bool(cred and cred.gmail_connected),
        "gmail_email": cred.gmail_email if (cred and cred.gmail_connected) else None
    }

@router.post("/threshold")
def update_threshold(
    payload: ThresholdUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(SystemSettings).filter(
        SystemSettings.key == "relevance_threshold",
        SystemSettings.user_id == current_user.id
    ).first()

    if not rec:
        rec = SystemSettings(user_id=current_user.id, key="relevance_threshold", value=str(payload.threshold))
        db.add(rec)
    else:
        rec.value = str(payload.threshold)

    db.commit()

    log = ActivityLog(
        user_id=current_user.id,
        agent_name="Settings",
        action="Threshold Updated",
        details=f"Relevance threshold updated to {payload.threshold}%. Re-evaluating candidate matches..."
    )
    db.add(log)
    db.commit()

    # Re-evaluate all candidate matches against the new threshold
    evaluate_all_unscored_for_user(db, current_user.id)

    return {"status": "success", "threshold": payload.threshold}
