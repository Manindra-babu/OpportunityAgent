import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credentials = relationship("UserCredential", back_populates="user", uselist=False, cascade="all, delete-orphan")

class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    is_verified = Column(Boolean, default=False)

class UserCredential(Base):
    __tablename__ = "user_credentials"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    groq_api_key_encrypted = Column(Text, nullable=True)
    groq_connected = Column(Boolean, default=False)
    gmail_refresh_token_encrypted = Column(Text, nullable=True)
    gmail_email = Column(String, nullable=True)
    gmail_connected = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="credentials")

class Profile(Base):
    __tablename__ = "profile"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=True)
    skills = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    education = Column(JSON, default=list)
    github_username = Column(String, nullable=True)
    github_repos = Column(JSON, default=list)
    resume_path = Column(String, nullable=True)
    primary_domain = Column(String, default="Full Stack Development")
    cgpa = Column(String, nullable=True)
    full_name = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="profile")

class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    deadline = Column(String, nullable=True)
    category = Column(String, default="Internship")
    discovered_at = Column(DateTime, default=datetime.datetime.utcnow)

class OpportunityScore(Base):
    __tablename__ = "opportunity_scores"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id", ondelete="CASCADE"))
    score = Column(Float)
    role_category = Column(String)
    reason = Column(Text)
    eligible = Column(Boolean, default=True)
    evaluated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id", ondelete="CASCADE"))
    status = Column(String, default="pending_reply")
    reply_at = Column(DateTime, nullable=True)
    registered_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

class FailureMemory(Base):
    __tablename__ = "failure_memory"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    domain = Column(String, index=True)
    failure_type = Column(String)
    description = Column(Text)
    resolution = Column(Text)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class FieldMappingRule(Base):
    __tablename__ = "field_mapping_rules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    domain = Column(String, nullable=True, index=True)
    source_label = Column(String)
    target_profile_field = Column(String)
    transform = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class NewsItem(Base):
    __tablename__ = "news_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    source = Column(String)
    url = Column(String, unique=True, index=True)
    published_at = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    agent_name = Column(String, index=True)
    action = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=True)
    key = Column(String, index=True)
    value = Column(Text)
