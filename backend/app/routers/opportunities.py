from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Opportunity, OpportunityScore, Registration
from app.schemas import OpportunityOut, ManualRegistrationRequest
from app.security.auth import get_current_user
from app.services.discovery_agent import run_discovery_pipeline
from app.services.relevance_agent import evaluate_all_unscored_for_user
from app.services.notification_agent import process_user_email_reply_for_user
from app.services.registration_agent import attempt_registration_for_user

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])

@router.get("", response_model=List[OpportunityOut])
def list_opportunities(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    min_score: Optional[float] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Evaluate any unscored opportunities for this logged-in user first
    evaluate_all_unscored_for_user(db, current_user.id)

    opps = db.query(Opportunity).all()
    results = []

    for opp in opps:
        score_rec = db.query(OpportunityScore).filter(
            OpportunityScore.opportunity_id == opp.id,
            OpportunityScore.user_id == current_user.id
        ).first()

        reg_rec = db.query(Registration).filter(
            Registration.opportunity_id == opp.id,
            Registration.user_id == current_user.id
        ).first()

        if category and category != "All" and opp.category != category:
            continue
        if min_score is not None and (not score_rec or score_rec.score < min_score):
            continue
        if status and status != "All":
            current_status = reg_rec.status if reg_rec else "pending_reply"
            if current_status != status:
                continue

        results.append({
            "id": opp.id,
            "source": opp.source,
            "url": opp.url,
            "title": opp.title,
            "description": opp.description,
            "deadline": opp.deadline,
            "category": opp.category,
            "discovered_at": opp.discovered_at,
            "score_rel": score_rec,
            "registration_rel": reg_rec
        })

    results.sort(key=lambda x: x["discovered_at"], reverse=True)
    return results

@router.post("/trigger-discovery")
async def trigger_discovery(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    added = await run_discovery_pipeline(db)
    evaluate_all_unscored_for_user(db, current_user.id)
    return {"message": f"Discovery completed. Added {len(added)} new opportunities."}

@router.post("/manual-action")
def manual_action(
    payload: ManualRegistrationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    action = payload.action.lower()
    opp_id = payload.opportunity_id

    if action in ["yes", "no", "skip"]:
        process_user_email_reply_for_user(db, current_user.id, opp_id, action)
        return {"status": "success", "message": f"Processed action '{action}' for user"}
    elif action == "register_now":
        attempt_registration_for_user(db, current_user.id, opp_id)
        return {"status": "success", "message": "Initiated manual registration attempt"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action string")
