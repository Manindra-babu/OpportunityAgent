import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class RequestOTPPayload(BaseModel):
    email: str

class VerifyOTPAndSignupPayload(BaseModel):
    email: str
    otp_code: str
    password: str
    full_name: Optional[str] = "Candidate"

class UserCreate(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = "Candidate"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class AuthMessageResponse(BaseModel):
    message: str
    token: str
    user: UserResponse

class ProfileBase(BaseModel):
    skills: List[Any] = []
    projects: List[Any] = []
    education: List[Any] = []
    github_username: Optional[Any] = None
    github_repos: List[Any] = []
    resume_path: Optional[Any] = None
    primary_domain: Optional[Any] = "Full Stack Development"
    cgpa: Optional[Any] = None
    full_name: Optional[Any] = None
    email: Optional[Any] = None
    phone: Optional[Any] = None

class ProfileCreate(ProfileBase):
    pass

class ProfileOut(ProfileBase):
    id: int
    updated_at: datetime.datetime

    class Config:
        from_attributes = True

class OpportunityScoreOut(BaseModel):
    id: int
    opportunity_id: int
    score: float
    role_category: str
    match_reasoning: str
    fit_status: str
    calculated_at: datetime.datetime

    class Config:
        from_attributes = True

class OpportunityOut(BaseModel):
    id: int
    source: str
    url: str
    title: str
    description: str
    deadline: Optional[str] = None
    category: str
    discovered_at: datetime.datetime
    user_score: Optional[OpportunityScoreOut] = None

    class Config:
        from_attributes = True

class OpportunityListResponse(BaseModel):
    items: List[OpportunityOut]
    total: int
    high_match_count: int

class ApplicationOut(BaseModel):
    id: int
    opportunity_id: int
    status: str
    action_type: str
    applied_at: datetime.datetime

    class Config:
        from_attributes = True

class InboxMessageOut(BaseModel):
    id: int
    sender: str
    subject: str
    snippet: str
    full_body: str
    extracted_deadline: Optional[str] = None
    extracted_link: Optional[str] = None
    is_action_required: bool
    status: str
    received_at: datetime.datetime

    class Config:
        from_attributes = True

class NewsArticleOut(BaseModel):
    id: int
    source: str
    url: str
    title: str
    summary: str
    published_at: datetime.datetime

    class Config:
        from_attributes = True

class SettingsOut(BaseModel):
    relevance_threshold: float

class ActivityLogOut(BaseModel):
    id: int
    agent_name: str
    action: str
    details: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FailureMemoryOut(BaseModel):
    id: int
    source_url: str
    error_type: str
    error_details: str
    resolution_status: str
    user_fix_note: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True
