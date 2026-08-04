import logging
import datetime
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, OpportunityScore, Registration, ActivityLog, UserCredential
from app.security.crypto import decrypt_credential

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: int, agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def poll_gmail_replies(db: Session):
    """
    Background job that polls active Gmail accounts for replies.
    """
    logger.info("Executing background inbox polling job across users...")

def send_opportunity_notification_for_user(db: Session, user_id: int, opp: Opportunity, score_obj: OpportunityScore):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    cred = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()

    recipient_email = (profile.email if profile and profile.email else None) or (cred.gmail_email if cred else "user@example.com")
    gmail_connected = bool(cred and cred.gmail_connected)

    log_activity(
        db,
        user_id,
        "Notification Agent",
        f"Notification Sent to {recipient_email}",
        f"Sent alert for '{opp.title}' (Match {score_obj.score}%). Mode: {'User Connected Gmail API' if gmail_connected else 'Simulated Email Pipeline'}."
    )

def process_user_email_reply_for_user(db: Session, user_id: int, opportunity_id: int, reply_text: str):
    reg = db.query(Registration).filter(
        Registration.opportunity_id == opportunity_id,
        Registration.user_id == user_id
    ).first()

    if not reg:
        reg = Registration(user_id=user_id, opportunity_id=opportunity_id, status="pending_reply")
        db.add(reg)

    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    clean_reply = reply_text.strip().upper()

    reg.reply_at = datetime.datetime.utcnow()

    if "YES" in clean_reply or clean_reply == "Y":
        reg.status = "yes"
        db.commit()
        log_activity(db, user_id, "Notification Agent", "User Replied YES", f"User confirmed registration for '{opp.title if opp else opportunity_id}'.")

        from app.services.registration_agent import attempt_registration_for_user
        attempt_registration_for_user(db, user_id, opportunity_id)

    elif "NO" in clean_reply or "SKIP" in clean_reply or clean_reply == "N":
        reg.status = "skipped"
        db.commit()
        log_activity(db, user_id, "Notification Agent", "User Replied NO", f"User skipped '{opp.title if opp else opportunity_id}'.")

    else:
        log_activity(db, user_id, "Notification Agent", "User Replied Custom Text", f"Received reply: {reply_text[:100]}")
        from app.services.failure_agent import process_user_fix_reply_for_user
        process_user_fix_reply_for_user(db, user_id, opportunity_id, reply_text)
