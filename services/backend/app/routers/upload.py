"""
Upload router for dataset upload with presigned URLs.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime
import uuid

from ...db import get_db
from ...models import Dataset, File, Team, ValidationJob, ValidationStatus
from ...utils.s3 import s3_client
from ...tasks import validate_dataset

logger = logging.getLogger(__name__)

router = APIRouter()


class FileUploadRequest(BaseModel):
    filename: str
    content_type: str = "application/octet-stream"
    size_bytes: int = 0


class UploadStartRequest(BaseModel):
    dataset_name: str
    description: str = ""
    files: List[FileUploadRequest]
    team_id: int


class UploadStartResponse(BaseModel):
    dataset_id: int
    upload_urls: List[Dict[str, Any]]
    expires_in: int = 3600


class UploadCompleteRequest(BaseModel):
    dataset_id: int


class UploadCompleteResponse(BaseModel):
    dataset_id: int
    validation_job_id: int
    status: str
    message: str


@router.post("/start", response_model=UploadStartResponse)
async def upload_start(
    request: UploadStartRequest,
    db: Session = Depends(get_db)
):
    """
    Start dataset upload process.
    
    Returns presigned URLs for uploading files to S3/MinIO.
    """
    try:
        # Verify team exists
        team = db.query(Team).filter(Team.id == request.team_id).first()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found"
            )
        
        # Create dataset
        dataset = Dataset(
            team_id=request.team_id,
            name=request.dataset_name,
            description=request.description,
            file_count=len(request.files),
            is_complete=False
        )
        db.add(dataset)
        db.commit()
        db.refresh(dataset)
        
        logger.info(f"Created dataset {dataset.id} for team {request.team_id}")
        
        # Generate presigned URLs for each file
        upload_urls = []
        
        for file_req in request.files:
            # Generate S3 key
            file_uuid = str(uuid.uuid4())
            s3_key = f"datasets/{dataset.id}/{file_uuid}/{file_req.filename}"
            
            # Generate presigned URL
            presigned_url = s3_client.generate_presigned_upload_url(
                object_key=s3_key,
                expires_in=3600,  # 1 hour
                content_type=file_req.content_type
            )
            
            # Create file record
            file_obj = File(
                dataset_id=dataset.id,
                filename=file_req.filename,
                s3_key=s3_key,
                size_bytes=file_req.size_bytes,
                content_type=file_req.content_type,
                is_uploaded=False
            )
            db.add(file_obj)
            
            upload_urls.append({
                "file_id": None,  # Will be set after commit
                "filename": file_req.filename,
                "upload_url": presigned_url,
                "s3_key": s3_key,
                "method": "PUT",
                "headers": {
                    "Content-Type": file_req.content_type
                }
            })
        
        db.commit()
        
        # Update file IDs in response
        files = db.query(File).filter(File.dataset_id == dataset.id).all()
        for i, file_obj in enumerate(files):
            upload_urls[i]["file_id"] = file_obj.id
        
        logger.info(f"Generated {len(upload_urls)} presigned URLs for dataset {dataset.id}")
        
        return UploadStartResponse(
            dataset_id=dataset.id,
            upload_urls=upload_urls,
            expires_in=3600
        )
        
    except Exception as e:
        logger.error(f"Error starting upload: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start upload: {str(e)}"
        )


@router.post("/complete", response_model=UploadCompleteResponse)
async def upload_complete(
    request: UploadCompleteRequest,
    db: Session = Depends(get_db)
):
    """
    Mark upload as complete and trigger validation.
    
    This endpoint is idempotent - calling it multiple times won't create duplicate validation jobs.
    """
    try:
        # Get dataset
        dataset = db.query(Dataset).filter(Dataset.id == request.dataset_id).first()
        if not dataset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dataset not found"
            )
        
        # Check if already completed
        if dataset.is_complete:
            # Find existing validation job
            existing_job = db.query(ValidationJob).filter(
                ValidationJob.dataset_id == request.dataset_id
            ).order_by(ValidationJob.created_at.desc()).first()
            
            if existing_job:
                return UploadCompleteResponse(
                    dataset_id=dataset.id,
                    validation_job_id=existing_job.id,
                    status="already_completed",
                    message="Dataset already marked complete and validation already queued/completed"
                )
        
        # Mark files as uploaded
        files = db.query(File).filter(File.dataset_id == request.dataset_id).all()
        for file_obj in files:
            file_obj.is_uploaded = True
        
        # Create validation job
        validation_job = ValidationJob(
            dataset_id=request.dataset_id,
            status=ValidationStatus.PENDING
        )
        db.add(validation_job)
        db.commit()
        db.refresh(validation_job)
        
        # Enqueue Celery task
        task = validate_dataset.apply_async(
            args=[request.dataset_id],
            task_id=f"validate-{request.dataset_id}-{validation_job.id}"
        )
        
        # Update validation job with Celery task ID
        validation_job.celery_task_id = task.id
        db.commit()
        
        logger.info(f"Queued validation for dataset {request.dataset_id}, task {task.id}")
        
        return UploadCompleteResponse(
            dataset_id=dataset.id,
            validation_job_id=validation_job.id,
            status="queued",
            message="Upload marked complete, validation queued"
        )
        
    except Exception as e:
        logger.error(f"Error completing upload: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete upload: {str(e)}"
        )
