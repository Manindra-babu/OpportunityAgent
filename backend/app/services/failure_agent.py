import logging
import datetime
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, Registration, FailureMemory, FieldMappingRule, ActivityLog
from app.services.registration_agent import get_domain_from_url
from app.llm_client import llm_client

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: int, agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def handle_registration_failure_for_user(db: Session, user_id: int, opp: Opportunity, reg: Registration, failure_info: dict):
    domain = get_domain_from_url(opp.url)
    failure_type = failure_info.get("failure_type", "missing_field")
    desc = failure_info.get("description", f"Form auto-fill encountered an error on {domain}.")

    reg.status = "failed"
    reg.notes = f"Failure: {failure_type}. {desc}"
    db.commit()

    mem = FailureMemory(
        user_id=user_id,
        domain=domain,
        failure_type=failure_type,
        description=desc,
        resolution="Awaiting candidate fix input"
    )
    db.add(mem)
    db.commit()

    log_activity(db, user_id, "Failure-Detection Agent", f"Failure Flagged for {domain}", f"Sent prompt for user correction on '{opp.title[:30]}'.")

def process_user_fix_reply_for_user(db: Session, user_id: int, opportunity_id: int, user_fix_text: str):
    opp = db.query(Opportunity).filter(Opportunity.id == opportunity_id).first()
    reg = db.query(Registration).filter(
        Registration.opportunity_id == opportunity_id,
        Registration.user_id == user_id
    ).first()
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    if not opp:
        return

    domain = get_domain_from_url(opp.url)

    system_prompt = (
        "You are an AI Fix-Application Agent. Analyze the user's corrective response to a registration failure. "
        "Extract:\n"
        "- 'target_profile_field' (e.g. 'phone', 'github_username', 'cgpa', 'full_name')\n"
        "- 'field_value' (the value provided or implied by user)\n"
        "- 'field_label' (the label expected on the website form)\n"
        "- 'learned_rule' (a 1-sentence description of how to resolve this on future runs)"
    )
    user_prompt = f"Failure Domain: {domain}\nUser Correction Reply: {user_fix_text}"

    fallback = {
        "target_profile_field": "phone",
        "field_value": user_fix_text,
        "field_label": "Mobile / Contact Number",
        "learned_rule": f"For {domain}, map contact number to '{user_fix_text}'."
    }

    res = llm_client.complete_json_for_user(
        db, user_id, system_prompt, user_prompt, model="llama-3.1-8b-instant", fallback_data=fallback
    )

    target_field = res.get("target_profile_field", "phone")
    val = res.get("field_value", user_fix_text)
    label = res.get("field_label", "Contact")
    learned_rule = res.get("learned_rule", f"Learned rule for {domain}")

    if profile and hasattr(profile, target_field):
        setattr(profile, target_field, val)

    rule = FieldMappingRule(
        user_id=user_id,
        domain=domain,
        source_label=label,
        target_profile_field=target_field,
        transform=None
    )
    db.add(rule)

    mem = db.query(FailureMemory).filter(
        FailureMemory.domain == domain,
        FailureMemory.user_id == user_id
    ).order_by(FailureMemory.id.desc()).first()

    if mem:
        mem.resolution = f"Resolved: {learned_rule}"
    else:
        mem = FailureMemory(
            user_id=user_id,
            domain=domain,
            failure_type="user_corrected",
            description=f"User fix applied for {domain}",
            resolution=learned_rule
        )
        db.add(mem)

    db.commit()

    log_activity(db, user_id, "Fix-Application Agent", f"Learned New Rule for {domain}", f"Persisted rule: '{learned_rule}'. Re-submitting registration.")

    from app.services.registration_agent import attempt_registration_for_user
    attempt_registration_for_user(db, user_id, opportunity_id)
