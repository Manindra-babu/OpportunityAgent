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

class ManualRegistrationRequest(BaseModel):
    opportunity_id: int
    action: str = "yes"

class ThresholdUpdate(BaseModel):
    threshold: float

class OpportunityScoreOut(BaseModel):
    id: int
    opportunity_id: int
    score: float
    role_category: str
    match_reasoning: Optional[str] = None
    reason: Optional[str] = None
    fit_status: Optional[str] = None
    eligible: Optional[bool] = True
    calculated_at: Optional[datetime.datetime] = None
    evaluated_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class OpportunityOut(BaseModel):
    id: int
    source: str
    url: str
    title: str
    description: str
    deadline: Optional[str] = None
    start_date: Optional[str] = None
    is_upcoming: Optional[bool] = False
    category: str
    discovered_at: datetime.datetime
    user_score: Optional[OpportunityScoreOut] = None
    score_rel: Optional[OpportunityScoreOut] = None

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

class NewsItemOut(BaseModel):
    id: int
    source: str
    url: str
    title: str
    published_at: Optional[Any] = None
    summary: Optional[Any] = "Industry news and tech update."

    class Config:
        from_attributes = True

NewsArticleOut = NewsItemOut

class SettingsOut(BaseModel):
    relevance_threshold: float

class ActivityLogOut(BaseModel):
    id: int
    agent_name: str
    action: str
    details: str
    timestamp: Optional[Any] = None
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True

class FailureMemoryOut(BaseModel):
    id: int
    source_url: Optional[Any] = None
    domain: Optional[Any] = None
    failure_type: Optional[Any] = None
    error_type: Optional[Any] = None
    description: Optional[Any] = None
    error_details: Optional[Any] = None
    resolution: Optional[Any] = None
    resolution_status: Optional[Any] = None
    user_fix_note: Optional[str] = None
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True

class FieldMappingRuleOut(BaseModel):
    id: int
    source_label: Optional[Any] = None
    field_name: Optional[Any] = None
    target_profile_field: Optional[Any] = None
    mapped_value: Optional[Any] = None
    confidence: Optional[Any] = 1.0
    domain: Optional[Any] = None
    created_at: Optional[Any] = None

    class Config:
        from_attributes = True

class UserFixRequest(BaseModel):
    failure_id: int
    user_note: str
