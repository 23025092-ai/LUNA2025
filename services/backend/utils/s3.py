"""
MinIO/S3 utility functions for presigned URLs and object operations.
"""
import os
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from typing import Dict, List, Optional
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class S3Client:
    """MinIO/S3 client wrapper for object storage operations."""
    
    def __init__(self):
        """Initialize S3/MinIO client from environment variables."""
        self.endpoint_url = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "minioadmin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "minioadmin")
        self.bucket_name = os.getenv("MINIO_BUCKET", "luna-datasets")
        self.region = os.getenv("MINIO_REGION", "us-east-1")
        
        # Initialize boto3 client
        self.client = boto3.client(
            's3',
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region,
            config=Config(signature_version='s3v4')
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist."""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
            logger.info(f"Bucket {self.bucket_name} exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                logger.info(f"Creating bucket {self.bucket_name}")
                try:
                    self.client.create_bucket(Bucket=self.bucket_name)
                except ClientError as create_error:
                    logger.error(f"Failed to create bucket: {create_error}")
                    raise
            else:
                logger.error(f"Error checking bucket: {e}")
                raise
    
    def generate_presigned_upload_url(
        self,
        object_key: str,
        expires_in: int = 3600,
        content_type: Optional[str] = None
    ) -> str:
        """
        Generate presigned URL for uploading an object.
        
        Args:
            object_key: S3 object key
            expires_in: URL expiration time in seconds (default: 1 hour)
            content_type: Content type for the upload
            
        Returns:
            Presigned upload URL
        """
        try:
            params = {
                'Bucket': self.bucket_name,
                'Key': object_key
            }
            
            if content_type:
                params['ContentType'] = content_type
            
            url = self.client.generate_presigned_url(
                'put_object',
                Params=params,
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned upload URL for {object_key}")
            return url
        
        except ClientError as e:
            logger.error(f"Error generating presigned URL: {e}")
            raise
    
    def generate_presigned_download_url(
        self,
        object_key: str,
        expires_in: int = 3600
    ) -> str:
        """
        Generate presigned URL for downloading an object.
        
        Args:
            object_key: S3 object key
            expires_in: URL expiration time in seconds (default: 1 hour)
            
        Returns:
            Presigned download URL
        """
        try:
            url = self.client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key
                },
                ExpiresIn=expires_in
            )
            
            logger.info(f"Generated presigned download URL for {object_key}")
            return url
        
        except ClientError as e:
            logger.error(f"Error generating presigned download URL: {e}")
            raise
    
    def initiate_multipart_upload(
        self,
        object_key: str,
        content_type: Optional[str] = None
    ) -> str:
        """
        Initiate multipart upload.
        
        Args:
            object_key: S3 object key
            content_type: Content type for the upload
            
        Returns:
            Upload ID
        """
        try:
            params = {'Bucket': self.bucket_name, 'Key': object_key}
            if content_type:
                params['ContentType'] = content_type
            
            response = self.client.create_multipart_upload(**params)
            upload_id = response['UploadId']
            
            logger.info(f"Initiated multipart upload for {object_key}: {upload_id}")
            return upload_id
        
        except ClientError as e:
            logger.error(f"Error initiating multipart upload: {e}")
            raise
    
    def generate_presigned_multipart_urls(
        self,
        object_key: str,
        upload_id: str,
        part_count: int,
        expires_in: int = 3600
    ) -> List[Dict[str, any]]:
        """
        Generate presigned URLs for multipart upload parts.
        
        Args:
            object_key: S3 object key
            upload_id: Multipart upload ID
            part_count: Number of parts
            expires_in: URL expiration time in seconds
            
        Returns:
            List of presigned URLs with part numbers
        """
        urls = []
        try:
            for part_number in range(1, part_count + 1):
                url = self.client.generate_presigned_url(
                    'upload_part',
                    Params={
                        'Bucket': self.bucket_name,
                        'Key': object_key,
                        'UploadId': upload_id,
                        'PartNumber': part_number
                    },
                    ExpiresIn=expires_in
                )
                urls.append({
                    'part_number': part_number,
                    'url': url
                })
            
            logger.info(f"Generated {part_count} presigned multipart URLs for {object_key}")
            return urls
        
        except ClientError as e:
            logger.error(f"Error generating multipart URLs: {e}")
            raise
    
    def object_exists(self, object_key: str) -> bool:
        """
        Check if object exists in S3.
        
        Args:
            object_key: S3 object key
            
        Returns:
            True if object exists, False otherwise
        """
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error(f"Error checking object existence: {e}")
                raise
    
    def get_object_metadata(self, object_key: str) -> Dict:
        """
        Get object metadata.
        
        Args:
            object_key: S3 object key
            
        Returns:
            Object metadata
        """
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=object_key)
            return {
                'size': response['ContentLength'],
                'content_type': response.get('ContentType'),
                'etag': response.get('ETag', '').strip('"'),
                'last_modified': response.get('LastModified')
            }
        except ClientError as e:
            logger.error(f"Error getting object metadata: {e}")
            raise
    
    def delete_object(self, object_key: str) -> bool:
        """
        Delete object from S3.
        
        Args:
            object_key: S3 object key
            
        Returns:
            True if deleted successfully
        """
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_key)
            logger.info(f"Deleted object {object_key}")
            return True
        except ClientError as e:
            logger.error(f"Error deleting object: {e}")
            raise
    
    def delete_objects(self, object_keys: List[str]) -> bool:
        """
        Delete multiple objects from S3.
        
        Args:
            object_keys: List of S3 object keys
            
        Returns:
            True if all deleted successfully
        """
        try:
            if not object_keys:
                return True
            
            objects = [{'Key': key} for key in object_keys]
            self.client.delete_objects(
                Bucket=self.bucket_name,
                Delete={'Objects': objects}
            )
            logger.info(f"Deleted {len(object_keys)} objects")
            return True
        except ClientError as e:
            logger.error(f"Error deleting objects: {e}")
            raise


# Global S3 client instance
s3_client = S3Client()
