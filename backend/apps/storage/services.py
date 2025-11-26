"""
Storage service layer for MinIO/S3-compatible object storage.

This module provides a clean abstraction over Django-storages and boto3
for handling file operations with MinIO in a multi-tenant environment.
"""

import hashlib
import os
import mimetypes
from datetime import datetime, timedelta
from typing import BinaryIO, Dict, Optional, Tuple
from urllib.parse import quote

import boto3
from botocore.exceptions import ClientError

# python-magic is optional - requires libmagic which is not always available on Windows
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
from django.conf import settings
from django.core.files.base import File
from django.core.files.storage import default_storage


class StorageService:
    """
    Service class for managing file storage operations with MinIO.

    Provides methods for:
    - Uploading files with checksum validation
    - Downloading files via signed URLs
    - Deleting files
    - Generating temporary signed URLs
    - Multi-tenant bucket organization
    """

    def __init__(self):
        """Initialize boto3 S3 client for MinIO."""
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=boto3.session.Config(signature_version='s3v4')
        )
        self.default_bucket = settings.AWS_STORAGE_BUCKET_NAME

    def get_organization_bucket(self, organization_id: str) -> str:
        """
        Get bucket name for a specific organization.

        In multi-tenant setup, we can either:
        1. Use separate buckets per organization: dfc-org-{org_id}
        2. Use single bucket with prefixes: dfc-documents/{org_id}/

        Currently using prefixes in single bucket for simplicity.

        Args:
            organization_id: UUID of the organization

        Returns:
            Bucket name string
        """
        return self.default_bucket

    def get_object_key(
        self,
        organization_id: str,
        document_id: str,
        filename: str,
        version: int = 1,
        category: str = 'documents'
    ) -> str:
        """
        Generate object key path for MinIO storage.

        Structure: {org_id}/{category}/{year}/{month}/{doc_id}_v{version}_{filename}

        Args:
            organization_id: Organization UUID
            document_id: Document UUID
            filename: Original filename
            version: Document version number
            category: Storage category (documents, thumbnails, temp)

        Returns:
            Full object key path
        """
        now = datetime.now()
        year = now.strftime('%Y')
        month = now.strftime('%m')

        # Sanitize filename
        safe_filename = self._sanitize_filename(filename)

        # Build object key
        object_key = f"{organization_id}/{category}/{year}/{month}/{document_id}_v{version}_{safe_filename}"

        return object_key

    def upload_file(
        self,
        file_obj: BinaryIO,
        organization_id: str,
        document_id: str,
        filename: str,
        version: int = 1,
        metadata: Optional[Dict[str, str]] = None
    ) -> Dict[str, any]:
        """
        Upload file to MinIO with checksum validation.

        Args:
            file_obj: File object to upload
            organization_id: Organization UUID
            document_id: Document UUID
            filename: Original filename
            version: Document version number
            metadata: Optional custom metadata

        Returns:
            Dictionary containing:
                - bucket: Bucket name
                - object_key: Full object path
                - file_size: File size in bytes
                - checksum: SHA-256 checksum
                - mime_type: MIME type
                - etag: S3 ETag
        """
        # Get bucket and object key
        bucket = self.get_organization_bucket(organization_id)
        object_key = self.get_object_key(organization_id, document_id, filename, version)

        # Read file content - ensure we get bytes
        try:
            file_content = file_obj.read()
            if hasattr(file_obj, 'seek'):
                file_obj.seek(0)  # Reset position
        except Exception as read_error:
            return {
                'success': False,
                'error': f'Failed to read file: {str(read_error)}',
                'error_code': 'READ_ERROR'
            }

        # Ensure file_content is bytes
        if not isinstance(file_content, bytes):
            try:
                file_content = file_content.encode('utf-8')
            except (AttributeError, UnicodeDecodeError):
                file_content = bytes(file_content)

        # Calculate SHA-256 checksum
        checksum = hashlib.sha256(file_content).hexdigest()

        # Detect MIME type
        mime_type = self._detect_mime_type(file_obj, filename)

        # Prepare metadata - ensure all values are strings
        upload_metadata = {
            'original-filename': str(filename),
            'document-id': str(document_id),
            'organization-id': str(organization_id),
            'version': str(version),
            'sha256-checksum': str(checksum),
            'upload-timestamp': datetime.utcnow().isoformat()
        }

        if metadata:
            # Ensure all custom metadata values are strings
            for key, value in metadata.items():
                upload_metadata[str(key)] = str(value) if value is not None else ''

        # Upload to MinIO
        try:
            # Build upload parameters
            upload_params = {
                'Bucket': bucket,
                'Key': object_key,
                'Body': file_content,
                'Metadata': upload_metadata,
                'ContentType': mime_type,
            }

            # Only enable server-side encryption if configured
            # MinIO requires KMS configuration for SSE, which may not be available in dev
            if getattr(settings, 'AWS_S3_ENCRYPTION', False):
                upload_params['ServerSideEncryption'] = 'AES256'

            response = self.s3_client.put_object(**upload_params)

            return {
                'success': True,
                'bucket': bucket,
                'object_key': object_key,
                'file_size': len(file_content),
                'checksum': checksum,
                'mime_type': mime_type,
                'etag': response.get('ETag', '').strip('"'),
                'version_id': response.get('VersionId'),
            }

        except ClientError as e:
            return {
                'success': False,
                'error': str(e),
                'error_code': e.response['Error']['Code']
            }
        except TypeError as te:
            # Handle serialization errors - log full traceback
            import traceback
            print(f"TypeError during MinIO upload: {te}")
            print(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Type error during upload: {str(te)}',
                'error_code': 'TYPE_ERROR'
            }
        except Exception as e:
            # Catch-all for any other errors - log full traceback
            import traceback
            print(f"Exception during MinIO upload: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'error_code': 'UNKNOWN_ERROR'
            }

    def download_file(self, bucket: str, object_key: str) -> Optional[bytes]:
        """
        Download file content from MinIO.

        Args:
            bucket: Bucket name
            object_key: Object key path

        Returns:
            File content as bytes, or None if error
        """
        try:
            response = self.s3_client.get_object(Bucket=bucket, Key=object_key)
            return response['Body'].read()
        except ClientError as e:
            print(f"Error downloading file: {e}")
            return None

    def delete_file(self, bucket: str, object_key: str) -> bool:
        """
        Delete file from MinIO.

        Args:
            bucket: Bucket name
            object_key: Object key path

        Returns:
            True if successful, False otherwise
        """
        try:
            self.s3_client.delete_object(Bucket=bucket, Key=object_key)
            return True
        except ClientError as e:
            print(f"Error deleting file: {e}")
            return False

    def generate_signed_url(
        self,
        bucket: str,
        object_key: str,
        expiration: int = 3600,
        response_headers: Optional[Dict[str, str]] = None
    ) -> Optional[str]:
        """
        Generate temporary signed URL for file access.

        Args:
            bucket: Bucket name
            object_key: Object key path
            expiration: URL expiration time in seconds (default: 1 hour)
            response_headers: Optional response headers (e.g., Content-Disposition)

        Returns:
            Signed URL string, or None if error
        """
        try:
            params = {
                'Bucket': bucket,
                'Key': object_key
            }

            if response_headers:
                params['ResponseContentDisposition'] = response_headers.get(
                    'ContentDisposition',
                    f'attachment; filename="{os.path.basename(object_key)}"'
                )

            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params=params,
                ExpiresIn=expiration
            )

            return url

        except ClientError as e:
            print(f"Error generating signed URL: {e}")
            return None

    def copy_file(
        self,
        source_bucket: str,
        source_key: str,
        dest_bucket: str,
        dest_key: str
    ) -> bool:
        """
        Copy file within MinIO.

        Args:
            source_bucket: Source bucket name
            source_key: Source object key
            dest_bucket: Destination bucket name
            dest_key: Destination object key

        Returns:
            True if successful, False otherwise
        """
        try:
            copy_source = {'Bucket': source_bucket, 'Key': source_key}
            copy_params = {
                'CopySource': copy_source,
                'Bucket': dest_bucket,
                'Key': dest_key,
            }

            # Only enable server-side encryption if configured
            if getattr(settings, 'AWS_S3_ENCRYPTION', False):
                copy_params['ServerSideEncryption'] = 'AES256'

            self.s3_client.copy_object(**copy_params)
            return True
        except ClientError as e:
            print(f"Error copying file: {e}")
            return False

    def file_exists(self, bucket: str, object_key: str) -> bool:
        """
        Check if file exists in MinIO.

        Args:
            bucket: Bucket name
            object_key: Object key path

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=bucket, Key=object_key)
            return True
        except ClientError:
            return False

    def get_file_metadata(self, bucket: str, object_key: str) -> Optional[Dict]:
        """
        Get file metadata from MinIO.

        Args:
            bucket: Bucket name
            object_key: Object key path

        Returns:
            Dictionary of metadata, or None if error
        """
        try:
            response = self.s3_client.head_object(Bucket=bucket, Key=object_key)
            return {
                'content_type': response.get('ContentType'),
                'content_length': response.get('ContentLength'),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag', '').strip('"'),
                'metadata': response.get('Metadata', {}),
                'version_id': response.get('VersionId'),
            }
        except ClientError as e:
            print(f"Error getting file metadata: {e}")
            return None

    def list_organization_files(
        self,
        organization_id: str,
        prefix: str = '',
        max_keys: int = 1000
    ) -> list:
        """
        List all files for an organization.

        Args:
            organization_id: Organization UUID
            prefix: Optional prefix filter
            max_keys: Maximum number of keys to return

        Returns:
            List of object keys
        """
        bucket = self.get_organization_bucket(organization_id)
        full_prefix = f"{organization_id}/{prefix}" if prefix else f"{organization_id}/"

        try:
            response = self.s3_client.list_objects_v2(
                Bucket=bucket,
                Prefix=full_prefix,
                MaxKeys=max_keys
            )

            return [obj['Key'] for obj in response.get('Contents', [])]

        except ClientError as e:
            print(f"Error listing files: {e}")
            return []

    def calculate_organization_storage(self, organization_id: str) -> int:
        """
        Calculate total storage used by an organization.

        Args:
            organization_id: Organization UUID

        Returns:
            Total storage in bytes
        """
        bucket = self.get_organization_bucket(organization_id)
        prefix = f"{organization_id}/"

        total_size = 0

        try:
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=bucket, Prefix=prefix)

            for page in pages:
                for obj in page.get('Contents', []):
                    total_size += obj['Size']

            return total_size

        except ClientError as e:
            print(f"Error calculating storage: {e}")
            return 0

    def _sanitize_filename(self, filename: str) -> str:
        """
        Sanitize filename to be URL-safe and filesystem-safe.

        Args:
            filename: Original filename

        Returns:
            Sanitized filename
        """
        # Remove path components
        filename = os.path.basename(filename)

        # Replace unsafe characters
        unsafe_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', ' ']
        for char in unsafe_chars:
            filename = filename.replace(char, '_')

        return filename

    def _detect_mime_type(self, file_obj: BinaryIO, filename: str) -> str:
        """
        Detect MIME type of file using python-magic and mimetypes.

        Args:
            file_obj: File object
            filename: Filename

        Returns:
            MIME type string
        """
        # Try python-magic first (more accurate, but requires libmagic)
        if MAGIC_AVAILABLE:
            try:
                file_obj.seek(0)
                mime = magic.from_buffer(file_obj.read(2048), mime=True)
                file_obj.seek(0)
                return mime
            except Exception:
                pass

        # Fallback to mimetypes based on extension
        mime_type, _ = mimetypes.guess_type(filename)
        return mime_type or 'application/octet-stream'


# Singleton instance
storage_service = StorageService()
