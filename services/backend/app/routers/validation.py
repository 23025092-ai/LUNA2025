"""
Validation router for checking dataset validation status.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

from ...db import get_db
from ...models import ValidationJob, Dataset

logger = logging.getLogger(__name__)

router = APIRouter()


class ValidationStatusResponse(BaseModel):
    dataset_id: int
    validation_job_id: int
    status: str
    started_at: Optional[str]
    completed_at: Optional[str]
    error_message: Optional[str]
    validation_logs: Optional[List[Dict[str, Any]]]
    validation_results: Optional[Dict[str, Any]]


@router.get("/{dataset_id}/status", response_model=ValidationStatusResponse)
async def get_validation_status(
    dataset_id: int,
    db: Session = Depends(get_db)
):
    """
    Get validation status for a dataset.
    """
    try:
        # Get dataset
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )
        
        # Get latest validation job
        validation_job = db.query(ValidationJob).filter(
            ValidationJob.dataset_id == dataset_id
        ).order_by(ValidationJob.created_at.desc()).first()
        
        if not validation_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No validation job found for this dataset"
            )
        
        return ValidationStatusResponse(
            dataset_id=dataset_id,
            validation_job_id=validation_job.id,
            status=validation_job.status.value,
            started_at=validation_job.started_at.isoformat() if validation_job.started_at else None,
            completed_at=validation_job.completed_at.isoformat() if validation_job.completed_at else None,
            error_message=validation_job.error_message,
            validation_logs=validation_job.validation_logs,
            validation_results=validation_job.validation_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting validation status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get validation status: {str(e)}"
        )
