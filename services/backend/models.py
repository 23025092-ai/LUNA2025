"""
SQLAlchemy database models for LUNA2025 backend.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Text, Float, ForeignKey, JSON, TIMESTAMP, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from enum import Enum
from .db import Base


class ValidationStatus(str, Enum):
    """Validation job status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Team(Base):
    """Team model for competition participants."""
    __tablename__ = "teams"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    api_key = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="team")
    datasets = relationship("Dataset", back_populates="team")


class User(Base):
    """User model for authentication."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="user")  # 'admin' or 'user'
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    team = relationship("Team", back_populates="users")


class Dataset(Base):
    """Dataset model for uploaded X-ray datasets."""
    __tablename__ = "datasets"
    
    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    manifest_path = Column(Text)  # S3 path to manifest.json
    is_complete = Column(Boolean, default=False)
    file_count = Column(Integer, default=0)
    total_size_bytes = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    team = relationship("Team", back_populates="datasets")
    files = relationship("File", back_populates="dataset", cascade="all, delete-orphan")
    validation_jobs = relationship("ValidationJob", back_populates="dataset", cascade="all, delete-orphan")


class File(Base):
    """File model for individual files in a dataset."""
    __tablename__ = "files"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    s3_key = Column(Text, nullable=False)  # Full S3 object key
    size_bytes = Column(Integer, default=0)
    content_type = Column(String(100))
    checksum_md5 = Column(String(32))  # MD5 hash
    is_uploaded = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    dataset = relationship("Dataset", back_populates="files")


class ValidationJob(Base):
    """Validation job model for dataset validation tasks."""
    __tablename__ = "validation_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    status = Column(SQLEnum(ValidationStatus), default=ValidationStatus.PENDING, nullable=False, index=True)
    celery_task_id = Column(String(255), unique=True, index=True)
    started_at = Column(TIMESTAMP)
    completed_at = Column(TIMESTAMP)
    error_message = Column(Text)
    validation_logs = Column(JSON)  # Structured validation logs
    validation_results = Column(JSON)  # Validation results
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    dataset = relationship("Dataset", back_populates="validation_jobs")


class Artifact(Base):
    """Artifact model for processed outputs (analysis results, reports, etc)."""
    __tablename__ = "artifacts"
    
    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=True)
    validation_job_id = Column(Integer, ForeignKey("validation_jobs.id"), nullable=True)
    artifact_type = Column(String(50), nullable=False)  # 'report', 'analysis', 'processed_image', etc
    s3_key = Column(Text, nullable=False)
    filename = Column(String(255))
    size_bytes = Column(Integer, default=0)
    metadata = Column(JSON)
    created_at = Column(TIMESTAMP, server_default=func.now())
    
    # Note: No relationships defined to keep it flexible
