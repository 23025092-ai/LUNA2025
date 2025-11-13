"""
Celery worker tasks for async validation and processing.
"""
from celery import Celery
import os
import logging
from typing import Dict, Any
import json
from datetime import datetime

from .models import ValidationJob, Dataset, File, ValidationStatus
from .db import SessionLocal
from .utils.s3 import s3_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    'luna_tasks',
    broker=os.getenv('CELERY_BROKER_URL', 'amqp://guest:guest@localhost:5672//'),
    backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max
    task_soft_time_limit=3300,  # 55 minutes soft limit
)


@celery_app.task(bind=True, name='tasks.validate_dataset')
def validate_dataset(self, dataset_id: int) -> Dict[str, Any]:
    """
    Validate uploaded dataset.
    
    Args:
        dataset_id: Dataset ID to validate
        
    Returns:
        Validation results dictionary
    """
    db = SessionLocal()
    validation_logs = []
    
    try:
        # Get dataset
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        # Get or create validation job
        validation_job = db.query(ValidationJob).filter(
            ValidationJob.dataset_id == dataset_id,
            ValidationJob.celery_task_id == self.request.id
        ).first()
        
        if not validation_job:
            validation_job = ValidationJob(
                dataset_id=dataset_id,
                celery_task_id=self.request.id,
                status=ValidationStatus.PROCESSING,
                started_at=datetime.utcnow()
            )
            db.add(validation_job)
            db.commit()
        else:
            validation_job.status = ValidationStatus.PROCESSING
            validation_job.started_at = datetime.utcnow()
            db.commit()
        
        validation_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": f"Starting validation for dataset {dataset_id}"
        })
        
        # Get all files for this dataset
        files = db.query(File).filter(File.dataset_id == dataset_id).all()
        
        if not files:
            raise ValueError("No files found for dataset")
        
        validation_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": f"Found {len(files)} files to validate"
        })
        
        # Validate each file exists in S3
        missing_files = []
        validated_files = []
        
        for file_obj in files:
            if s3_client.object_exists(file_obj.s3_key):
                # Get metadata
                metadata = s3_client.get_object_metadata(file_obj.s3_key)
                validated_files.append({
                    "filename": file_obj.filename,
                    "s3_key": file_obj.s3_key,
                    "size": metadata.get('size', 0),
                    "status": "valid"
                })
                validation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "INFO",
                    "message": f"Validated file: {file_obj.filename}"
                })
            else:
                missing_files.append(file_obj.filename)
                validation_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "ERROR",
                    "message": f"Missing file in S3: {file_obj.filename}"
                })
        
        # Check if validation passed
        if missing_files:
            validation_job.status = ValidationStatus.FAILED
            validation_job.error_message = f"Missing files: {', '.join(missing_files)}"
            validation_job.validation_logs = validation_logs
            validation_job.completed_at = datetime.utcnow()
            db.commit()
            
            return {
                "status": "failed",
                "error": validation_job.error_message,
                "validated_files": validated_files,
                "missing_files": missing_files
            }
        
        # All files validated successfully
        validation_job.status = ValidationStatus.COMPLETED
        validation_job.validation_logs = validation_logs
        validation_job.validation_results = {
            "total_files": len(files),
            "validated_files": len(validated_files),
            "total_size_bytes": sum(f['size'] for f in validated_files),
            "files": validated_files
        }
        validation_job.completed_at = datetime.utcnow()
        
        # Update dataset
        dataset.is_complete = True
        dataset.file_count = len(validated_files)
        dataset.total_size_bytes = validation_job.validation_results['total_size_bytes']
        
        db.commit()
        
        validation_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "INFO",
            "message": f"Validation completed successfully for dataset {dataset_id}"
        })
        
        return {
            "status": "completed",
            "dataset_id": dataset_id,
            "validated_files": validated_files,
            "total_size_bytes": validation_job.validation_results['total_size_bytes']
        }
        
    except Exception as e:
        logger.error(f"Validation failed for dataset {dataset_id}: {e}", exc_info=True)
        
        # Update validation job with error
        if validation_job:
            validation_job.status = ValidationStatus.FAILED
            validation_job.error_message = str(e)
            validation_job.validation_logs = validation_logs
            validation_job.completed_at = datetime.utcnow()
            db.commit()
        
        raise
        
    finally:
        db.close()


@celery_app.task(name='tasks.cleanup_old_datasets')
def cleanup_old_datasets(days: int = 30) -> Dict[str, Any]:
    """
    Cleanup old datasets and files from S3.
    
    Args:
        days: Delete datasets older than this many days
        
    Returns:
        Cleanup results
    """
    db = SessionLocal()
    
    try:
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Find old datasets
        old_datasets = db.query(Dataset).filter(
            Dataset.created_at < cutoff_date
        ).all()
        
        deleted_count = 0
        deleted_size = 0
        
        for dataset in old_datasets:
            # Get all files
            files = db.query(File).filter(File.dataset_id == dataset.id).all()
            
            # Delete from S3
            s3_keys = [f.s3_key for f in files]
            if s3_keys:
                s3_client.delete_objects(s3_keys)
                deleted_size += sum(f.size_bytes for f in files)
            
            # Delete from DB (cascade will delete files and validation jobs)
            db.delete(dataset)
            deleted_count += 1
        
        db.commit()
        
        return {
            "deleted_datasets": deleted_count,
            "deleted_size_bytes": deleted_size
        }
        
    finally:
        db.close()
