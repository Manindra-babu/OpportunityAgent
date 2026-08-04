import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

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
    skills: List[str] = []
    projects: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    github_username: Optional[str] = None
    github_repos: List[Dict[str, Any]] = []
    resume_path: Optional[str] = None
    primary_domain: str = "Full Stack Development"
    cgpa: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

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
    reason: str
    eligible: bool
    evaluated_at: datetime.datetime

    class Config:
        from_attributes = True

class RegistrationOut(BaseModel):
    id: int
    opportunity_id: int
    status: str
    reply_at: Optional[datetime.datetime] = None
    registered_at: Optional[datetime.datetime] = None
    notes: Optional[str] = None

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
    score_rel: Optional[OpportunityScoreOut] = None
    registration_rel: Optional[RegistrationOut] = None

    class Config:
        from_attributes = True

class FailureMemoryOut(BaseModel):
    id: int
    domain: str
    failure_type: str
    description: str
    resolution: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class FieldMappingRuleOut(BaseModel):
    id: int
    domain: Optional[str] = None
    source_label: str
    target_profile_field: str
    transform: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class NewsItemOut(BaseModel):
    id: int
    title: str
    source: str
    url: str
    published_at: Optional[str] = None

    class Config:
        from_attributes = True

class ActivityLogOut(BaseModel):
    id: int
    agent_name: str
    action: str
    details: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class ThresholdUpdate(BaseModel):
    threshold: float

class ManualRegistrationRequest(BaseModel):
    opportunity_id: int
    action: str # "yes", "no", "skip", "register_now"

class UserFixRequest(BaseModel):
    opportunity_id: int
    field_name: str
    field_value: str
    remember_rule: bool = True
