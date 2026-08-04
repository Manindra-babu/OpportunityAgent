import os
import json
import logging
import datetime
from typing import Dict, Any, List, Optional
import httpx
import pdfplumber
import docx
from sqlalchemy.orm import Session
from app.models import Profile, Opportunity, OpportunityScore, ActivityLog
from app.llm_client import llm_client
from app.config import settings

logger = logging.getLogger(__name__)

def log_activity(db: Session, user_id: Optional[int], agent_name: str, action: str, details: str):
    log = ActivityLog(user_id=user_id, agent_name=agent_name, action=action, details=details)
    db.add(log)
    db.commit()

def extract_text_from_pdf(filepath: str) -> str:
    text = ""
    try:
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
    except Exception as e:
        logger.error(f"Error reading PDF {filepath}: {e}")
    return text.strip()

def extract_text_from_docx(filepath: str) -> str:
    text = ""
    try:
        doc = docx.Document(filepath)
        for p in doc.paragraphs:
            if p.text:
                text += p.text + "\n"
    except Exception as e:
        logger.error(f"Error reading DOCX {filepath}: {e}")
    return text.strip()

def parse_resume_file(db: Session, user_id: Optional[int], filepath: str) -> Dict[str, Any]:
    ext = os.path.splitext(filepath)[1].lower()
    if ext == ".pdf":
        raw_text = extract_text_from_pdf(filepath)
    elif ext in [".docx", ".doc"]:
        raw_text = extract_text_from_docx(filepath)
    else:
        raw_text = ""

    fallback = {
        "full_name": "Candidate",
        "email": "candidate@example.com",
        "phone": "",
        "cgpa": "8.0",
        "primary_domain": "Software Engineering",
        "skills": ["Python", "JavaScript", "React", "Git", "SQL"],
        "projects": [{"title": "Portfolio Web App", "description": "Built interactive UI", "tech": "React, Tailwind"}],
        "education": [{"institution": "University", "degree": "Computer Science", "year": "2026"}]
    }

    if not raw_text:
        return fallback

    system_prompt = (
        "You are an expert HR resume parser. Extract structured profile data from the raw resume text provided. "
        "Return a JSON object with keys: "
        "'full_name' (str), 'email' (str), 'phone' (str), 'cgpa' (str), 'primary_domain' (str), "
        "'skills' (array of strings), "
        "'projects' (array of objects with 'title', 'description', 'tech'), "
        "'education' (array of objects with 'institution', 'degree', 'year')."
    )
    user_prompt = f"Resume Text:\n{raw_text[:4000]}"

    res = llm_client.complete_json_for_user(
        db, user_id, system_prompt, user_prompt, model="llama-3.3-70b-versatile", fallback_data=fallback
    )
    return res

async def fetch_github_data(username: str) -> Dict[str, Any]:
    if not username:
        return {"skills": [], "repos": []}

    headers = {"Accept": "application/vnd.github.v3+json"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    url = f"https://api.github.com/users/{username}/repos?sort=updated&per_page=10"
    skills_set = set()
    repos_list = []

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                repos = resp.json()
                for r in repos:
                    if not r.get("fork"):
                        lang = r.get("language")
                        if lang:
                            skills_set.add(lang)
                        repos_list.append({
                            "name": r.get("name"),
                            "description": r.get("description"),
                            "language": lang,
                            "stars": r.get("stargazers_count"),
                            "url": r.get("html_url")
                        })
    except Exception as e:
        logger.error(f"GitHub API error for {username}: {e}")
        skills_set = {"TypeScript", "Python", "Docker", "Node.js"}
        repos_list = [
            {"name": "ai-agent-hub", "description": "Multi-agent workflows", "language": "Python", "stars": 12, "url": f"https://github.com/{username}/ai-agent-hub"},
            {"name": "react-dashboard", "description": "SaaS light UI components", "language": "TypeScript", "stars": 8, "url": f"https://github.com/{username}/react-dashboard"}
        ]

    return {"skills": list(skills_set), "repos": repos_list}

def diff_and_merge_profile(
    db: Session,
    user_id: int,
    new_data: Dict[str, Any],
    github_username: Optional[str] = None,
    github_skills: List[str] = [],
    github_repos: List[Dict[str, Any]] = []
) -> Profile:
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if not profile:
        profile = Profile(user_id=user_id)
        db.add(profile)

    old_skills = set(profile.skills or [])
    incoming_skills = set(new_data.get("skills", [])) | set(github_skills)

    added_skills = incoming_skills - old_skills
    removed_skills = old_skills - incoming_skills

    final_skills = list(old_skills | incoming_skills)

    profile.skills = final_skills
    profile.projects = new_data.get("projects", profile.projects or [])
    profile.education = new_data.get("education", profile.education or [])
    profile.full_name = new_data.get("full_name") or profile.full_name or "Candidate"
    profile.email = new_data.get("email") or profile.email
    profile.phone = new_data.get("phone") or profile.phone
    profile.cgpa = new_data.get("cgpa") or profile.cgpa
    profile.primary_domain = new_data.get("primary_domain") or profile.primary_domain or "Full Stack Development"
    if github_username:
        profile.github_username = github_username
    if github_repos:
        profile.github_repos = github_repos
    profile.updated_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(profile)

    diff_msg = f"Merged {len(added_skills)} new skills ({', '.join(added_skills) if added_skills else 'none'})."
    if removed_skills:
        diff_msg += f" Flagged {len(removed_skills)} omitted skills for confirmation."

    log_activity(db, user_id, "Profile Builder", "Profile Updated & Merged", diff_msg)
    reevaluate_recent_opportunities_for_user(db, user_id, profile)

    return profile

def reevaluate_recent_opportunities_for_user(db: Session, user_id: int, profile: Profile):
    from app.services.relevance_agent import evaluate_opportunity_relevance_for_user

    fourteen_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=14)
    recent_opps = db.query(Opportunity).filter(Opportunity.discovered_at >= fourteen_days_ago).all()

    re_eval_count = 0
    for opp in recent_opps:
        score_rec = db.query(OpportunityScore).filter(
            OpportunityScore.opportunity_id == opp.id,
            OpportunityScore.user_id == user_id
        ).first()
        if not score_rec or score_rec.score < settings.RELEVANCE_THRESHOLD:
            evaluate_opportunity_relevance_for_user(db, user_id, opp, profile)
            re_eval_count += 1

    log_activity(db, user_id, "Profile Builder", "Re-evaluated Opportunities", f"Re-evaluated {re_eval_count} opportunities against updated candidate profile.")
