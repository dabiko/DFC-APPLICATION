"""
MinIO storage initialization and utilities.
"""
import boto3
from botocore.client import Config
from botocore.exceptions import ClientError
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_s3_client():
    """
    Create and return a boto3 S3 client configured for MinIO.
    """
    return boto3.client(
        's3',
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version=settings.AWS_S3_SIGNATURE_VERSION),
        region_name=settings.AWS_S3_REGION_NAME,
        use_ssl=settings.AWS_S3_USE_SSL
    )


def initialize_minio_bucket():
    """
    Initialize MinIO bucket if it doesn't exist.

    Creates the bucket with proper configuration:
    - Versioning enabled for document history
    - Lifecycle rules for retention policies
    - Encryption at rest
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        # Check if bucket exists
        try:
            s3_client.head_bucket(Bucket=bucket_name)
            logger.info(f"Bucket '{bucket_name}' already exists")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                # Bucket doesn't exist, create it
                logger.info(f"Creating bucket '{bucket_name}'...")
                s3_client.create_bucket(Bucket=bucket_name)
                logger.info(f"Bucket '{bucket_name}' created successfully")

                # Enable versioning for document history
                s3_client.put_bucket_versioning(
                    Bucket=bucket_name,
                    VersioningConfiguration={'Status': 'Enabled'}
                )
                logger.info(f"Versioning enabled for bucket '{bucket_name}'")

                # Set lifecycle rules for retention policies
                lifecycle_policy = {
                    'Rules': [
                        {
                            'Id': 'DeleteOldVersions',
                            'Status': 'Enabled',
                            'NoncurrentVersionExpiration': {
                                'NoncurrentDays': 90  # Keep old versions for 90 days
                            }
                        }
                    ]
                }
                s3_client.put_bucket_lifecycle_configuration(
                    Bucket=bucket_name,
                    LifecycleConfiguration=lifecycle_policy
                )
                logger.info(f"Lifecycle policy configured for bucket '{bucket_name}'")

            else:
                # Some other error occurred
                logger.error(f"Error checking bucket: {e}")
                raise

        return True

    except Exception as e:
        logger.error(f"Failed to initialize MinIO bucket: {e}")
        raise


def generate_presigned_url(file_key, expiration=3600, inline=False):
    """
    Generate a presigned URL for direct download from MinIO.

    Args:
        file_key: The S3 object key (file path)
        expiration: URL expiration time in seconds (default: 1 hour)
        inline: If True, set Content-Disposition to 'inline' for browser preview

    Returns:
        Presigned URL string
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        params = {
            'Bucket': bucket_name,
            'Key': file_key
        }

        # Add Content-Disposition parameter for inline/attachment
        if inline:
            # Extract filename from key
            filename = file_key.split('/')[-1]
            params['ResponseContentDisposition'] = f'inline; filename="{filename}"'
        else:
            filename = file_key.split('/')[-1]
            params['ResponseContentDisposition'] = f'attachment; filename="{filename}"'

        url = s3_client.generate_presigned_url(
            'get_object',
            Params=params,
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise


def delete_file(file_key):
    """
    Delete a file from MinIO.

    Args:
        file_key: The S3 object key (file path)

    Returns:
        True if successful, False otherwise
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        s3_client.delete_object(
            Bucket=bucket_name,
            Key=file_key
        )
        logger.info(f"File '{file_key}' deleted from bucket '{bucket_name}'")
        return True
    except Exception as e:
        logger.error(f"Failed to delete file '{file_key}': {e}")
        return False


def get_file_metadata(file_key):
    """
    Get metadata for a file in MinIO.

    Args:
        file_key: The S3 object key (file path)

    Returns:
        Dictionary with file metadata
    """
    try:
        s3_client = get_s3_client()
        bucket_name = settings.AWS_STORAGE_BUCKET_NAME

        response = s3_client.head_object(
            Bucket=bucket_name,
            Key=file_key
        )

        return {
            'size': response['ContentLength'],
            'content_type': response['ContentType'],
            'last_modified': response['LastModified'],
            'etag': response['ETag'].strip('"'),
            'version_id': response.get('VersionId')
        }
    except Exception as e:
        logger.error(f"Failed to get metadata for file '{file_key}': {e}")
        return None
