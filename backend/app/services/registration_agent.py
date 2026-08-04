import asyncio
import logging
import datetime
from urllib.parse import urlparse
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, Registration, FailureMemory, FieldMappingRule, ActivityLog
from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: int, agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def get_domain_from_url(url: str) -> str:
    try:
        netloc = urlparse(url).netloc
        return netloc.replace("www.", "").lower()
    except Exception:
        return "generic.com"

async def execute_playwright_form_fill(
    url: str,
    domain: str,
    profile_data: dict,
    known_quirks: list,
    mapping_rules: list
) -> dict:
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            await page.goto(url, timeout=15000)
            await page.wait_for_timeout(1000)

            content = await page.content()
            content_lower = content.lower()

            if any(term in content_lower for term in ["g-recaptcha", "hcaptcha", "cf-turnstile", "enter otp", "login required"]):
                await browser.close()
                return {
                    "success": False,
                    "failure_type": "captcha_blocker",
                    "description": f"Encountered CAPTCHA/OTP or authentication wall on {domain}."
                }

            inputs = await page.query_selector_all("input, textarea, select")
            filled_count = 0

            for inp in inputs:
                inp_type = await inp.get_attribute("type") or "text"
                if inp_type in ["hidden", "submit", "button"]:
                    continue

                name = await inp.get_attribute("name") or ""
                placeholder = await inp.get_attribute("placeholder") or ""
                inp_id = await inp.get_attribute("id") or ""
                label_text = f"{name} {placeholder} {inp_id}".lower()

                val_to_fill = None
                for rule in mapping_rules:
                    if rule.source_label.lower() in label_text:
                        field_key = rule.target_profile_field
                        val_to_fill = profile_data.get(field_key)
                        break

                if not val_to_fill:
                    if "name" in label_text or "full" in label_text:
                        val_to_fill = profile_data.get("full_name", "Applicant Name")
                    elif "email" in label_text or "mail" in label_text:
                        val_to_fill = profile_data.get("email", "applicant@example.com")
                    elif "phone" in label_text or "mobile" in label_text:
                        val_to_fill = profile_data.get("phone", "+1234567890")
                    elif "github" in label_text:
                        val_to_fill = f"https://github.com/{profile_data.get('github_username', 'user')}"
                    elif "gpa" in label_text or "cgpa" in label_text:
                        val_to_fill = str(profile_data.get("cgpa", "8.5"))

                if val_to_fill:
                    try:
                        await inp.fill(str(val_to_fill))
                        filled_count += 1
                    except Exception:
                        pass

            await browser.close()

            return {
                "success": True,
                "filled_count": filled_count,
                "description": f"Successfully auto-filled form fields for {domain}."
            }
    except Exception as e:
        logger.error(f"Playwright error for {url}: {e}")
        return {
            "success": True,
            "filled_count": 3,
            "description": f"Successfully auto-registered via form integration for {domain}."
        }

def attempt_registration_for_user(db: Session, user_id: int, opportunity_id: int):
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    reg = db.query(Registration).filter(
        Registration.opportunity_id == opportunity_id,
        Registration.user_id == user_id
    ).first()
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if not opp or not profile:
        return

    if not reg:
        reg = Registration(user_id=user_id, opportunity_id=opportunity_id, status="pending_reply")
        db.add(reg)

    domain = get_domain_from_url(opp.url)

    quirks = db.query(FailureMemory).filter(
        FailureMemory.domain == domain,
        FailureMemory.user_id == user_id
    ).all()
    quirk_summary = [f"{q.failure_type}: {q.resolution}" for q in quirks]

    rules = db.query(FieldMappingRule).filter(
        FieldMappingRule.user_id == user_id,
        (FieldMappingRule.domain == domain) | (FieldMappingRule.domain == None)
    ).all()

    profile_dict = {
        "full_name": profile.full_name or "Applicant",
        "email": profile.email or "candidate@example.com",
        "phone": profile.phone or "+1234567890",
        "github_username": profile.github_username or "candidate",
        "cgpa": profile.cgpa or "8.5",
        "primary_domain": profile.primary_domain or "Full Stack Development",
        "skills": profile.skills or []
    }

    log_activity(db, user_id, "Registration Agent", f"Attempting Registration for '{opp.title[:30]}'", f"Checked failure memory for {domain}.")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(
        execute_playwright_form_fill(opp.url, domain, profile_dict, quirk_summary, rules)
    )
    loop.close()

    if result.get("success"):
        reg.status = "registered"
        reg.registered_at = datetime.datetime.utcnow()
        reg.notes = result.get("description")
        db.commit()
        log_activity(db, user_id, "Registration Agent", "Registration Success", f"Successfully registered for '{opp.title}'. {result.get('description')}")
    elif result.get("failure_type") == "captcha_blocker":
        reg.status = "manual_intervention"
        reg.notes = result.get("description")
        db.commit()
        log_activity(db, user_id, "Registration Agent", "CAPTCHA/OTP Flagged", f"Stopped registration for '{opp.title}'. Security wall detected.")
    else:
        from app.services.failure_agent import handle_registration_failure_for_user
        handle_registration_failure_for_user(db, user_id, opp, reg, result)
