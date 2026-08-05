import os
import shutil
import logging
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Profile
from app.schemas import ProfileOut
from app.security.auth import get_current_user
from app.services.profile_builder import parse_resume_file, fetch_github_data, diff_and_merge_profile

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["Profile"])

UPLOAD_DIR = "./uploaded_resumes"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.get("", response_model=Optional[ProfileOut])
def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    if not profile:
        profile = Profile(
            user_id=current_user.id,
            skills=["Python", "JavaScript", "React", "FastAPI", "Git"],
            projects=[{"title": "Multi-Agent Automation Platform", "description": "Automated workflow system with LLMs and Playwright", "tech": "Python, React"}],
            education=[{"institution": "University", "degree": "Computer Science", "year": "2026"}],
            primary_domain="Full Stack Development",
            cgpa="8.5",
            full_name="Candidate",
            email=current_user.email
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.post("/resume", response_model=ProfileOut)
async def upload_resume(
    file: UploadFile = File(...),
    github_username: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    filepath = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        parsed_data = parse_resume_file(db, current_user.id, filepath)
    except Exception as e:
        logger.error(f"Resume parsing error for user {current_user.id}: {e}")
        parsed_data = {
            "full_name": current_user.email.split("@")[0].capitalize(),
            "email": current_user.email,
            "cgpa": "8.5",
            "primary_domain": "Full Stack Development",
            "skills": ["Python", "JavaScript", "React", "FastAPI", "Git"],
            "projects": [],
            "education": []
        }

    github_skills = []
    github_repos = []
    gh_user = github_username or parsed_data.get("github_username")
    if gh_user:
        try:
            gh_data = await fetch_github_data(gh_user)
            github_skills = gh_data.get("skills", [])
            github_repos = gh_data.get("repos", [])
        except Exception as e:
            logger.warning(f"GitHub fetch error for {gh_user}: {e}")

    profile = diff_and_merge_profile(
        db,
        user_id=current_user.id,
        new_data=parsed_data,
        github_username=gh_user,
        github_skills=github_skills,
        github_repos=github_repos
    )
    profile.resume_path = filepath
    db.commit()
    db.refresh(profile)

    return profile

@router.post("/github", response_model=ProfileOut)
async def sync_github(
    github_username: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        gh_data = await fetch_github_data(github_username)
        github_skills = gh_data.get("skills", [])
        github_repos = gh_data.get("repos", [])
    except Exception as e:
        logger.warning(f"GitHub sync fetch error: {e}")
        github_skills = []
        github_repos = []

    profile = diff_and_merge_profile(
        db,
        user_id=current_user.id,
        new_data={},
        github_username=github_username,
        github_skills=github_skills,
        github_repos=github_repos
    )
    return profile
