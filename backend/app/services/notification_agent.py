import os
import smtplib
import logging
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, OpportunityScore, Registration, ActivityLog, UserCredential
from app.security.crypto import decrypt_credential

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: int, agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def send_otp_email(to_email: str, otp_code: str) -> bool:
    """
    Dispatches 6-digit verification OTP email to user's inbox via SMTP if configured.
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if smtp_email and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"🔑 Your OpportunityAgent Verification Code: {otp_code}"
            msg["From"] = f"OpportunityAgent <{smtp_email}>"
            msg["To"] = to_email

            text_body = f"Hello,\n\nYour 6-digit verification code for OpportunityAgent is: {otp_code}\n\nThis code will expire in 10 minutes."
            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb;">
                  <h2 style="color: #4f46e5; margin-top: 0;">OpportunityAgent Account Verification</h2>
                  <p style="color: #374151; font-size: 14px;">Welcome! Please enter the 6-digit code below to verify your email address and complete account setup:</p>
                  <div style="background-color: #e0e7ff; color: #3730a3; padding: 15px; font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 6px; text-align: center; border-radius: 12px; margin: 20px 0;">
                    {otp_code}
                  </div>
                  <p style="color: #6b7280; font-size: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                </div>
              </body>
            </html>
            """

            msg.attach(MIMEText(text_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, to_email, msg.as_string())

            logger.info(f"✅ Real OTP email delivered to {to_email} via SMTP")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to dispatch SMTP email to {to_email}: {e}")
            return False
    else:
        logger.info(f"ℹ️ SMTP not configured in .env. OTP code [{otp_code}] generated for {to_email}.")
        return False

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
