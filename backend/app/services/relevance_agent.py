import logging
import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, OpportunityScore, Registration, ActivityLog, SystemSettings
from app.llm_client import llm_client
from app.config import settings

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: Optional[int], agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def get_user_threshold(db: Session, user_id: int) -> float:
    thresh_rec = db.query(SystemSettings).filter(
        SystemSettings.key == "relevance_threshold",
        SystemSettings.user_id == user_id
    ).first()
    if thresh_rec and thresh_rec.value:
        try:
            return float(thresh_rec.value)
        except ValueError:
            pass
    return settings.RELEVANCE_THRESHOLD

def evaluate_opportunity_relevance_for_user(
    db: Session,
    user_id: int,
    opp: Opportunity,
    profile: Optional[Profile] = None
) -> OpportunityScore:
    if not profile:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    user_thresh = get_user_threshold(db, user_id)

    skills_str = ", ".join(profile.skills) if profile and profile.skills else "Python, React, JavaScript"
    domain_str = profile.primary_domain if profile and profile.primary_domain else "Full Stack Development"
    projects_str = str(profile.projects) if profile and profile.projects else "Full stack web applications"

    system_prompt = (
        "You are an AI Relevance Evaluation Agent. Evaluate how closely an opportunity matches a candidate's profile. "
        "Return a JSON object containing:\n"
        "- 'score' (number between 0 and 100)\n"
        "- 'role_category' (string e.g. 'Full Stack', 'Backend', 'AI/ML', 'Frontend', 'Mobile')\n"
        "- 'reason' (string concise 1-2 sentence match explanation)\n"
        "- 'eligible' (boolean true if candidate satisfies basic domain/tech alignment, false otherwise)"
    )

    user_prompt = (
        f"CANDIDATE PROFILE:\n"
        f"Primary Domain: {domain_str}\n"
        f"Skills: {skills_str}\n"
        f"Projects: {projects_str}\n\n"
        f"OPPORTUNITY:\n"
        f"Title: {opp.title}\n"
        f"Source: {opp.source}\n"
        f"Category: {opp.category}\n"
        f"Description: {opp.description}\n"
    )

    title_lower = opp.title.lower()
    desc_lower = opp.description.lower()
    match_count = sum(1 for s in (profile.skills if profile else []) if s.lower() in title_lower or s.lower() in desc_lower)

    calculated_score = min(98.0, max(45.0, 60.0 + (match_count * 12.0)))
    if "full stack" in title_lower or "python" in title_lower or "react" in title_lower or "agent" in title_lower or "ai" in title_lower or "machine learning" in title_lower:
        calculated_score = max(calculated_score, 88.0)

    fallback = {
        "score": calculated_score,
        "role_category": "Full Stack / AI",
        "reason": f"Strong match with candidate skills in {skills_str[:30]}.",
        "eligible": True
    }

    res = llm_client.complete_json_for_user(
        db, user_id, system_prompt, user_prompt, model="llama-3.3-70b-versatile", fallback_data=fallback
    )

    score_val = float(res.get("score", calculated_score))
    role_cat = str(res.get("role_category", "Engineering"))
    reason_val = str(res.get("reason", "Evaluated score based on candidate profile compatibility."))
    eligible_val = bool(res.get("eligible", True))

    existing_score = db.query(OpportunityScore).filter(
        OpportunityScore.opportunity_id == opp.id,
        OpportunityScore.user_id == user_id
    ).first()

    if not existing_score:
        score_obj = OpportunityScore(
            user_id=user_id,
            opportunity_id=opp.id,
            score=score_val,
            role_category=role_cat,
            reason=reason_val,
            eligible=eligible_val,
            evaluated_at=datetime.datetime.utcnow()
        )
        db.add(score_obj)
    else:
        existing_score.score = score_val
        existing_score.role_category = role_cat
        existing_score.reason = reason_val
        existing_score.eligible = eligible_val
        existing_score.evaluated_at = datetime.datetime.utcnow()
        score_obj = existing_score

    # Initialize user registration record based on dynamic user threshold
    reg = db.query(Registration).filter(
        Registration.opportunity_id == opp.id,
        Registration.user_id == user_id
    ).first()

    if not reg:
        reg = Registration(
            user_id=user_id,
            opportunity_id=opp.id,
            status="pending_reply" if (score_val >= user_thresh and eligible_val) else "skipped"
        )
        db.add(reg)
    else:
        if score_val >= user_thresh and eligible_val and reg.status == "skipped":
            reg.status = "pending_reply"

    db.commit()
    db.refresh(score_obj)

    log_activity(
        db,
        user_id,
        "Relevance Agent",
        f"Scored '{opp.title[:30]}...'",
        f"Score: {score_val}/100 ({'Qualified' if score_val >= user_thresh else 'Below Threshold'} vs target {user_thresh}%). Reason: {reason_val}"
    )

    if score_val >= user_thresh and eligible_val:
        from app.services.notification_agent import send_opportunity_notification_for_user
        send_opportunity_notification_for_user(db, user_id, opp, score_obj)

    return score_obj

def evaluate_all_unscored_for_user(db: Session, user_id: int):
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    opps = db.query(Opportunity).all()

    for opp in opps:
        evaluate_opportunity_relevance_for_user(db, user_id, opp, profile)
