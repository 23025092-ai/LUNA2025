"""
Health check router.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os
import logging

from ...db import get_db, engine
from ...utils.s3 import s3_client

logger = logging.getLogger(__name__)

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    database: str
    s3: str
    version: str


class ReadinessResponse(BaseModel):
    ready: bool
    checks: dict


@router.get("/health", response_model=HealthResponse)
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint.
    """
    # Check database
    try:
        db.execute("SELECT 1")
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"
    
    # Check S3/MinIO
    try:
        s3_client.client.list_buckets()
        s3_status = "healthy"
    except Exception as e:
        logger.error(f"S3 health check failed: {e}")
        s3_status = "unhealthy"
    
    overall_status = "healthy" if db_status == "healthy" and s3_status == "healthy" else "degraded"
    
    return HealthResponse(
        status=overall_status,
        database=db_status,
        s3=s3_status,
        version="1.0.0"
    )


@router.get("/readiness", response_model=ReadinessResponse)
async def readiness_check(db: Session = Depends(get_db)):
    """
    Readiness check for Kubernetes.
    """
    checks = {}
    
    # Database check
    try:
        db.execute("SELECT 1")
        checks["database"] = True
    except Exception:
        checks["database"] = False
    
    # S3 check
    try:
        s3_client.client.list_buckets()
        checks["s3"] = True
    except Exception:
        checks["s3"] = False
    
    ready = all(checks.values())
    
    return ReadinessResponse(
        ready=ready,
        checks=checks
    )


@router.get("/liveness")
async def liveness_check():
    """
    Liveness check for Kubernetes.
    """
    return {"alive": True}
