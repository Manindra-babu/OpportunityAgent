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

def send_email_notification(to_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """
    Sends email notification via SMTP to candidate's email address.
    """
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        logger.info(f"SMTP not configured in environment. Logged notification alert for {to_email}.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"OpportunityAgent Notification <{smtp_email}>"
        msg["To"] = to_email

        msg.attach(MIMEText(text_content, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())

        logger.info(f"✅ Real notification email dispatched to {to_email}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to dispatch email notification to {to_email}: {e}")
        return False

def send_otp_email(to_email: str, otp_code: str) -> bool:
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

            text_body = f"Hello,\n\nYour verification code is: {otp_code}\n\nExpires in 10 minutes."
            html_body = f"""
            <html>
              <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
                <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb;">
                  <h2 style="color: #4f46e5; margin-top: 0;">OpportunityAgent Account Verification</h2>
                  <p style="color: #374151; font-size: 14px;">Enter the 6-digit verification code below:</p>
                  <div style="background-color: #e0e7ff; color: #3730a3; padding: 15px; font-size: 28px; font-weight: bold; font-family: monospace; letter-spacing: 6px; text-align: center; border-radius: 12px; margin: 20px 0;">
                    {otp_code}
                  </div>
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

            return True
        except Exception as e:
            logger.error(f"Failed to dispatch OTP: {e}")
            return False
    return False

def send_opportunity_notification_for_user(db: Session, user_id: int, opp: Opportunity, score_obj: OpportunityScore):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    cred = db.query(UserCredential).filter(UserCredential.user_id == user_id).first()

    recipient_email = (profile.email if profile and profile.email else None) or (cred.gmail_email if cred and cred.gmail_email else None)
    if not recipient_email or recipient_email == "user@example.com":
        return

    subject = f"🎯 High Match Opportunity Found: {opp.title} ({score_obj.score}% Match)"
    text_content = f"New Opportunity Match!\n\nTitle: {opp.title}\nCategory: {opp.category}\nMatch Score: {score_obj.score}%\nReasoning: {score_obj.reason}\n\nApply Link: {opp.url}"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb;">
          <h2 style="color: #4f46e5; margin-top: 0;">🎯 New Opportunity Match</h2>
          <div style="background-color: #e0e7ff; color: #3730a3; padding: 12px 18px; border-radius: 10px; font-weight: bold; margin-bottom: 20px;">
            Match Score: {score_obj.score}% | Category: {opp.category}
          </div>
          <h3 style="color: #111827; margin: 0 0 10px 0;">{opp.title}</h3>
          <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">{opp.description}</p>
          <div style="background-color: #f3f4f6; padding: 12px; border-radius: 8px; font-size: 13px; color: #374151; margin: 15px 0;">
            <strong>AI Match Reasoning:</strong> {score_obj.reason}
          </div>
          <a href="{opp.url}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 14px; margin-top: 15px;">
            View & Apply Now &rarr;
          </a>
        </div>
      </body>
    </html>
    """

    sent = send_email_notification(recipient_email, subject, text_content, html_content)

    log_activity(
        db,
        user_id,
        "Notification Agent",
        f"Notification Alert to {recipient_email}",
        f"Alert for '{opp.title}' (Match {score_obj.score}%). Status: {'Delivered via Email' if sent else 'Logged in Notification Activity feed'}."
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
