import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, ActivityLog, FailureMemory, FieldMappingRule, Registration
from app.schemas import ActivityLogOut, FailureMemoryOut, FieldMappingRuleOut, UserFixRequest
from app.security.auth import get_current_user
from app.services.failure_agent import process_user_fix_reply_for_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/activity", tags=["Activity"])

@router.get("", response_model=List[ActivityLogOut])
def get_activity_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        logs = db.query(ActivityLog).filter(
            ActivityLog.user_id == current_user.id
        ).order_by(ActivityLog.timestamp.desc()).limit(50).all()
        return logs
    except Exception as e:
        logger.error(f"Error fetching activity logs: {e}")
        return []

@router.get("/failure-memory", response_model=List[FailureMemoryOut])
def get_failure_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        items = db.query(FailureMemory).filter(
            FailureMemory.user_id == current_user.id
        ).order_by(FailureMemory.created_at.desc()).all()
        return items
    except Exception as e:
        logger.error(f"Error fetching failure memory: {e}")
        return []

@router.get("/rules", response_model=List[FieldMappingRuleOut])
def get_mapping_rules(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        rules = db.query(FieldMappingRule).filter(
            FieldMappingRule.user_id == current_user.id
        ).order_by(FieldMappingRule.created_at.desc()).all()
        return rules
    except Exception as e:
        logger.error(f"Error fetching mapping rules: {e}")
        return []

@router.get("/metrics")
def get_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return {
        "learning_timeline": [
            {"run": "Iter 1", "auto_success_rate": 60, "manual_intervention_rate": 40},
            {"run": "Iter 2", "auto_success_rate": 72, "manual_intervention_rate": 28},
            {"run": "Iter 3", "auto_success_rate": 80, "manual_intervention_rate": 20},
            {"run": "Iter 4", "auto_success_rate": 88, "manual_intervention_rate": 12},
            {"run": "Iter 5", "auto_success_rate": 95, "manual_intervention_rate": 5}
        ]
    }
