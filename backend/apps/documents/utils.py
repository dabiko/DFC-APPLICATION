"""
Utility functions for document management.
"""
from django.db.models import Sum, Count
from django.conf import settings
from apps.documents.models import Document, ChunkedUpload
from apps.users.models import Department
import os
import hashlib
from datetime import datetime, timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


def _get_minio_bucket_size():
    """
    Sum the actual sizes of all current (non-deleted-marker) objects in the
    MinIO bucket by paginating ListObjectsV2.  Returns None on any error so
    callers can fall back gracefully.
    """
    try:
        from apps.documents.storage import get_s3_client
        s3 = get_s3_client()
        bucket = settings.AWS_STORAGE_BUCKET_NAME
        total = 0
        paginator = s3.get_paginator('list_objects_v2')
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get('Contents', []):
                total += obj.get('Size', 0)
        return total
    except Exception:
        logger.warning('Could not retrieve bucket size from MinIO; falling back to DB sum.')
        return None


def _get_minio_server_capacity():
    """
    Return (total_bytes, available_bytes) for the MinIO server's underlying
    disk via the MinIO admin API, signed with AWS Signature V4 using botocore
    (no extra packages required beyond boto3/botocore which are always present).
    Returns (None, None) on any error.
    """
    try:
        import json
        import requests
        from botocore.auth import SigV4Auth
        from botocore.awsrequest import AWSRequest
        from botocore.credentials import Credentials

        url = f"{settings.AWS_S3_ENDPOINT_URL}/minio/admin/v3/info"
        creds = Credentials(settings.AWS_ACCESS_KEY_ID, settings.AWS_SECRET_ACCESS_KEY)
        # MinIO admin API requires the empty-body SHA256 header to be set explicitly
        _EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        aws_req = AWSRequest(method='GET', url=url, headers={'x-amz-content-sha256': _EMPTY_SHA256})
        SigV4Auth(creds, 's3', settings.AWS_S3_REGION_NAME or 'us-east-1').add_auth(aws_req)

        resp = requests.get(url, headers=dict(aws_req.headers), timeout=5)
        resp.raise_for_status()
        info = resp.json()

        total = 0
        avail = 0
        for server in info.get('servers', []):
            for drive in server.get('drives', []):
                total += drive.get('totalspace', 0)
                avail += drive.get('availspace', 0)

        if total > 0:
            return total, avail
        return None, None
    except Exception:
        logger.warning('Could not retrieve server capacity from MinIO admin API.')
        return None, None


def get_storage_usage(department=None, user=None):
    """
    Get storage usage statistics.

    When called with no filters (org-wide), total_size_bytes is sourced from
    the actual MinIO bucket via ListObjectsV2 so it always reflects true disk
    usage.  Department- and user-scoped calls continue to use the DB because
    MinIO keys are not partitioned by those dimensions.
    """
    queryset = Document.objects.filter(is_deleted=False)

    if department:
        queryset = queryset.filter(department=department)

    if user:
        queryset = queryset.filter(owner=user)

    # Aggregate statistics
    stats = queryset.aggregate(
        total_size=Sum('file_size'),
        total_documents=Count('id')
    )

    db_total_size = stats['total_size'] or 0
    total_docs = stats['total_documents'] or 0

    # For unfiltered (org-wide) queries use MinIO as the source of truth.
    # For scoped queries the DB is the only option.
    if department is None and user is None:
        minio_size = _get_minio_bucket_size()
        total_size = minio_size if minio_size is not None else db_total_size
    else:
        total_size = db_total_size

    # Group by document type
    by_type = {}
    for doc_type, _ in Document.DOCUMENT_TYPE_CHOICES:
        type_stats = queryset.filter(document_type=doc_type).aggregate(
            count=Count('id'),
            size=Sum('file_size')
        )
        by_type[doc_type] = {
            'count': type_stats['count'] or 0,
            'size_bytes': type_stats['size'] or 0,
            'size_mb': round((type_stats['size'] or 0) / (1024 * 1024), 2)
        }

    return {
        'total_size_bytes': total_size,
        'total_size_mb': round(total_size / (1024 * 1024), 2),
        'total_size_gb': round(total_size / (1024 ** 3), 2),
        'total_documents': total_docs,
        'by_document_type': by_type,
    }


def get_department_quota_status(department):
    """
    Get storage quota status for a department.

    Args:
        department: Department instance

    Returns:
        Dictionary with quota information
    """
    usage = get_storage_usage(department=department)
    quota_bytes = getattr(department, 'storage_quota_gb', 100) * (1024 ** 3)  # Default 100GB

    used_bytes = usage['total_size_bytes']
    remaining_bytes = quota_bytes - used_bytes
    usage_percentage = (used_bytes / quota_bytes * 100) if quota_bytes > 0 else 0

    return {
        'quota_bytes': quota_bytes,
        'quota_gb': round(quota_bytes / (1024 ** 3), 2),
        'used_bytes': used_bytes,
        'used_gb': usage['total_size_gb'],
        'remaining_bytes': max(0, remaining_bytes),
        'remaining_gb': round(max(0, remaining_bytes) / (1024 ** 3), 2),
        'usage_percentage': round(usage_percentage, 2),
        'is_quota_exceeded': used_bytes >= quota_bytes,
        'total_documents': usage['total_documents'],
    }


def check_storage_quota(user, file_size):
    """
    Check if uploading a file would exceed storage quota.

    Args:
        user: User instance
        file_size: Size of file to upload in bytes

    Returns:
        Tuple (can_upload: bool, message: str)
    """
    department = user.department
    if not department:
        return True, "No department assigned"

    quota_status = get_department_quota_status(department)

    if quota_status['is_quota_exceeded']:
        return False, f"Storage quota exceeded. Used {quota_status['used_gb']}GB of {quota_status['quota_gb']}GB"

    if quota_status['remaining_bytes'] < file_size:
        file_size_mb = round(file_size / (1024 * 1024), 2)
        remaining_mb = round(quota_status['remaining_bytes'] / (1024 * 1024), 2)
        return False, f"Insufficient storage. File size: {file_size_mb}MB, Available: {remaining_mb}MB"

    return True, "Sufficient storage available"


def get_chunk_storage_path(upload_id, chunk_number):
    """
    Get the file path for storing a chunk.

    Args:
        upload_id: Unique upload identifier
        chunk_number: Chunk number

    Returns:
        File path for chunk storage
    """
    chunk_dir = os.path.join(settings.MEDIA_ROOT, 'chunks', upload_id)
    os.makedirs(chunk_dir, exist_ok=True)
    return os.path.join(chunk_dir, f'chunk_{chunk_number:04d}')


def store_chunk(upload_id, chunk_number, chunk_data):
    """
    Store a chunk to temporary storage.

    Args:
        upload_id: Unique upload identifier
        chunk_number: Chunk number
        chunk_data: File-like object containing chunk data

    Returns:
        Path to stored chunk
    """
    chunk_path = get_chunk_storage_path(upload_id, chunk_number)

    with open(chunk_path, 'wb') as f:
        for chunk in chunk_data.chunks():
            f.write(chunk)

    logger.info(f"Chunk {chunk_number} stored for upload {upload_id}")
    return chunk_path


def assemble_chunks(chunked_upload):
    """
    Assemble all chunks into a single file.

    Args:
        chunked_upload: ChunkedUpload instance

    Returns:
        Path to assembled file
    """
    upload_id = chunked_upload.upload_id
    total_chunks = chunked_upload.total_chunks

    # Create output file path
    output_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f'{upload_id}_{chunked_upload.file_name}')

    # Assemble chunks
    with open(output_path, 'wb') as output_file:
        for chunk_number in range(total_chunks):
            chunk_path = get_chunk_storage_path(upload_id, chunk_number)

            if not os.path.exists(chunk_path):
                raise FileNotFoundError(f"Chunk {chunk_number} not found for upload {upload_id}")

            with open(chunk_path, 'rb') as chunk_file:
                output_file.write(chunk_file.read())

    logger.info(f"Chunks assembled for upload {upload_id}: {output_path}")
    return output_path


def cleanup_chunks(upload_id):
    """
    Delete chunk files after assembly or expiration.

    Args:
        upload_id: Unique upload identifier
    """
    chunk_dir = os.path.join(settings.MEDIA_ROOT, 'chunks', upload_id)

    if os.path.exists(chunk_dir):
        import shutil
        shutil.rmtree(chunk_dir)
        logger.info(f"Chunks cleaned up for upload {upload_id}")


def cleanup_expired_uploads():
    """
    Clean up expired chunked uploads.
    Should be run periodically via Celery task.
    """
    expired_uploads = ChunkedUpload.objects.filter(
        expires_at__lt=timezone.now(),
        status='UPLOADING'
    )

    count = 0
    for upload in expired_uploads:
        cleanup_chunks(upload.upload_id)
        upload.status = 'EXPIRED'
        upload.save()
        count += 1

    logger.info(f"Cleaned up {count} expired uploads")
    return count


def calculate_file_checksum(file_path):
    """
    Calculate SHA-256 checksum for a file.

    Args:
        file_path: Path to file

    Returns:
        SHA-256 checksum hex string
    """
    sha256 = hashlib.sha256()

    with open(file_path, 'rb') as f:
        while True:
            data = f.read(65536)  # Read in 64kb chunks
            if not data:
                break
            sha256.update(data)

    return sha256.hexdigest()


def get_user_storage_summary(user):
    """
    Get comprehensive storage summary for a user.

    Args:
        user: User instance

    Returns:
        Dictionary with user's storage information
    """
    user_usage = get_storage_usage(user=user)
    dept_quota = get_department_quota_status(user.department) if user.department else None

    return {
        'user': {
            'id': user.id,
            'username': user.username,
            'department': user.department.name if user.department else None,
        },
        'personal_usage': user_usage,
        'department_quota': dept_quota,
    }


# File Naming Convention Utilities

def sanitize_filename_component(text):
    """
    Remove/replace invalid characters from filename component.

    Args:
        text: Text to sanitize

    Returns:
        Sanitized text safe for use in filenames
    """
    import re

    # Remove invalid characters (keep only alphanumeric, spaces, hyphens, underscores)
    text = re.sub(r'[^\w\s-]', '', text)

    # Replace multiple spaces with single underscore
    text = re.sub(r'[\s]+', '_', text)

    # Remove leading/trailing underscores and hyphens
    text = text.strip('_-')

    return text


def generate_filename(document):
    """
    Generate standardized filename following convention:
    YYYY-MM-DD_CustomerID_DocType_ShortDesc_V{n}.ext

    Format ensures:
    - Chronological sorting by date
    - Clear identification via customer ID
    - Document type for quick classification
    - Brief description for context
    - Version tracking

    Args:
        document: Document instance

    Returns:
        Standardized filename string

    Example:
        2025-10-20_123456_Invoice_PaymentReceipt_V1.pdf
    """
    # Date component (YYYY-MM-DD)
    date_str = document.document_date.strftime('%Y-%m-%d')

    # Customer/Identifier component
    customer_id = document.identifier or 'UNKNOWN'
    safe_customer_id = sanitize_filename_component(customer_id)

    # Document type component
    doc_type = document.get_document_type_display()
    safe_doc_type = sanitize_filename_component(doc_type)

    # Short description from title (limit to 50 chars)
    short_desc = document.title[:50] if document.title else 'Document'
    safe_desc = sanitize_filename_component(short_desc)

    # Version component
    version = document.version_number or 1

    # Combine components
    filename = f"{date_str}_{safe_customer_id}_{safe_doc_type}_{safe_desc}_V{version}"

    # Add original file extension
    original_extension = os.path.splitext(document.file_name)[1]
    if not original_extension:
        # Default to .pdf if no extension
        original_extension = '.pdf'

    filename += original_extension.lower()

    return filename


def validate_filename(filename):
    """
    Validate filename against naming convention.

    Args:
        filename: Filename to validate

    Returns:
        Tuple (is_valid: bool, errors: list)
    """
    import re

    errors = []

    # Check for invalid characters
    if re.search(r'[<>:"/\\|?*]', filename):
        errors.append('Filename contains invalid characters: < > : " / \\ | ? *')

    # Check length (Windows max path is 260 chars, filename should be reasonable)
    if len(filename) > 200:
        errors.append(f'Filename too long ({len(filename)} chars). Maximum 200 characters.')

    # Check for dangerous extensions
    dangerous_extensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.vbs', '.js']
    file_ext = os.path.splitext(filename)[1].lower()
    if file_ext in dangerous_extensions:
        errors.append(f'Dangerous file extension: {file_ext}')

    # Check if filename is empty or just extension
    name_without_ext = os.path.splitext(filename)[0]
    if not name_without_ext or name_without_ext.strip() == '':
        errors.append('Filename is empty or contains only extension')

    is_valid = len(errors) == 0

    return is_valid, errors


def rename_document_file(document, new_filename=None):
    """
    Rename document file to follow naming convention.

    Args:
        document: Document instance
        new_filename: Optional custom filename (will be sanitized)

    Returns:
        New filename
    """
    if new_filename:
        # Use custom filename but sanitize it
        name_without_ext = os.path.splitext(new_filename)[0]
        safe_name = sanitize_filename_component(name_without_ext)
        extension = os.path.splitext(document.file_name)[1]
        final_filename = safe_name + extension.lower()
    else:
        # Generate standard filename
        final_filename = generate_filename(document)

    # Validate the filename
    is_valid, errors = validate_filename(final_filename)
    if not is_valid:
        logger.warning(f"Generated filename has validation errors: {errors}")
        # Fallback to simple safe name
        safe_title = sanitize_filename_component(document.title or 'document')
        extension = os.path.splitext(document.file_name)[1] or '.pdf'
        final_filename = f"{safe_title}_V{document.version_number}{extension}"

    # Update document file_name (metadata only, doesn't rename physical file)
    document.file_name = final_filename
    document.save(update_fields=['file_name'])

    logger.info(f"Document {document.id} renamed to: {final_filename}")

    return final_filename


def get_metadata_schema():
    """
    Get the metadata schema definition with all fields and constraints.

    Returns:
        Dictionary describing metadata schema
    """
    from apps.documents.constants import (
        DOCUMENT_TYPES,
        CONFIDENTIALITY_LEVELS,
        RETENTION_PERIODS
    )

    schema = {
        'version': '1.0',
        'fields': [
            {
                'name': 'title',
                'type': 'string',
                'required': True,
                'max_length': 500,
                'description': 'Document title or description',
            },
            {
                'name': 'document_type',
                'type': 'choice',
                'required': True,
                'choices': DOCUMENT_TYPES,
                'description': 'Type of document from controlled vocabulary',
            },
            {
                'name': 'identifier',
                'type': 'string',
                'required': True,
                'max_length': 255,
                'description': 'Customer ID, Contract Number, Invoice Number, etc.',
            },
            {
                'name': 'document_date',
                'type': 'date',
                'required': True,
                'format': 'YYYY-MM-DD',
                'description': 'Date of the document (cannot be in future)',
            },
            {
                'name': 'creator_source',
                'type': 'string',
                'required': True,
                'max_length': 255,
                'description': 'Original creator or source of the document',
            },
            {
                'name': 'department',
                'type': 'foreign_key',
                'required': True,
                'model': 'Department',
                'description': 'Department that owns this document',
            },
            {
                'name': 'confidentiality_level',
                'type': 'choice',
                'required': True,
                'choices': CONFIDENTIALITY_LEVELS,
                'description': 'Security classification level',
            },
            {
                'name': 'retention_period_years',
                'type': 'integer',
                'required': True,
                'choices': RETENTION_PERIODS,
                'description': 'Number of years to retain document (-1 for permanent)',
            },
            {
                'name': 'keywords',
                'type': 'list',
                'required': False,
                'item_type': 'string',
                'max_items': 20,
                'description': 'Keywords/tags for document classification',
            },
            {
                'name': 'folder',
                'type': 'foreign_key',
                'required': False,
                'model': 'Folder',
                'description': 'Folder containing this document',
            },
        ],
        'naming_convention': {
            'format': 'YYYY-MM-DD_CustomerID_DocType_ShortDesc_V{n}.ext',
            'example': '2025-10-20_123456_Invoice_PaymentReceipt_V1.pdf',
            'components': [
                'Date (YYYY-MM-DD)',
                'Customer/Identifier',
                'Document Type',
                'Short Description (max 50 chars)',
                'Version Number (V{n})',
                'File Extension',
            ],
        },
    }

    return schema


# Document Versioning Utilities

def create_new_version(document, new_file, change_description='', user=None, is_major=False):
    """
    Create a new version of a document.

    This function creates a complete snapshot of the document with the new file,
    increments the version number, and stores the previous state in version history.

    Args:
        document: Document instance to version
        new_file: New file object (UploadedFile)
        change_description: Description of changes in this version
        user: User creating the version
        is_major: Whether this is a major version

    Returns:
        DocumentVersion instance

    Example:
        new_version = create_new_version(
            document=doc,
            new_file=request.FILES['file'],
            change_description="Updated financial figures",
            user=request.user
        )
    """
    from apps.documents.models import DocumentVersion
    import mimetypes

    # Calculate checksum for new file
    checksum = DocumentVersion.calculate_checksum(new_file)

    # Check if file content actually changed
    if checksum == document.checksum:
        raise ValueError('New version has identical content to current version')

    # Get next version number
    next_version = DocumentVersion.objects.filter(
        document=document
    ).aggregate(models.Max('version_number'))['version_number__max']

    if next_version:
        next_version += 1
    else:
        next_version = 1

    # Extract file metadata
    file_name = new_file.name
    file_size = new_file.size
    file_type = mimetypes.guess_type(file_name)[0] or 'application/octet-stream'

    # Create version snapshot
    version = DocumentVersion.objects.create(
        document=document,
        version_number=next_version,
        file=new_file,
        file_name=file_name,
        file_size=file_size,
        file_type=file_type,
        checksum=checksum,
        change_description=change_description,
        is_major_version=is_major,
        created_by=user
    )

    # Update main document to point to latest version
    document.version_number = next_version
    document.file = new_file
    document.file_name = file_name
    document.file_size = file_size
    document.file_type = file_type
    document.checksum = checksum
    document.save(update_fields=[
        'version_number', 'file', 'file_name', 'file_size',
        'file_type', 'checksum', 'updated_at'
    ])

    logger.info(
        f"Created version {next_version} for document {document.id} "
        f"({document.title}) by user {user.username if user else 'system'}"
    )

    return version


def create_initial_version(document, user=None):
    """
    Create initial version (v1) for a document.

    This should be called when a document is first uploaded to establish
    the version history baseline.

    Args:
        document: Document instance
        user: User creating the initial version

    Returns:
        DocumentVersion instance or None if version already exists
    """
    from apps.documents.models import DocumentVersion

    # Check if initial version already exists
    if DocumentVersion.objects.filter(document=document, version_number=1).exists():
        logger.warning(f"Initial version already exists for document {document.id}")
        return None

    # Create version 1
    version = DocumentVersion.objects.create(
        document=document,
        version_number=1,
        file=document.file,
        file_name=document.file_name,
        file_size=document.file_size,
        file_type=document.file_type,
        checksum=document.checksum,
        change_description="Initial upload",
        is_major_version=True,
        created_by=user or document.created_by
    )

    logger.info(f"Created initial version for document {document.id}")

    return version


def restore_version(document, version_number, user):
    """
    Restore a document to a previous version.

    This creates a new version using the content from the specified previous version.
    The version history is preserved (we don't actually delete or revert).

    Args:
        document: Document instance
        version_number: Version number to restore to
        user: User performing the restore

    Returns:
        DocumentVersion instance (the new version created from old content)

    Raises:
        DocumentVersion.DoesNotExist: If version not found
        ValueError: If trying to restore to current version
    """
    from apps.documents.models import DocumentVersion

    # Get the version to restore
    try:
        version_to_restore = DocumentVersion.objects.get(
            document=document,
            version_number=version_number
        )
    except DocumentVersion.DoesNotExist:
        raise DocumentVersion.DoesNotExist(
            f"Version {version_number} not found for document {document.id}"
        )

    # Check if already at this version
    if version_to_restore.version_number == document.version_number:
        raise ValueError(f"Document is already at version {version_number}")

    # Create new version from old content
    new_version = create_new_version(
        document=document,
        new_file=version_to_restore.file,
        change_description=f"Restored from version {version_number}",
        user=user,
        is_major=False
    )

    logger.info(
        f"Restored document {document.id} to version {version_number}, "
        f"created new version {new_version.version_number}"
    )

    return new_version


def get_version_history(document, limit=None):
    """
    Get version history for a document.

    Args:
        document: Document instance
        limit: Optional limit on number of versions to return

    Returns:
        QuerySet of DocumentVersion instances, ordered by version number (newest first)
    """
    from apps.documents.models import DocumentVersion

    queryset = DocumentVersion.objects.filter(
        document=document
    ).select_related('created_by').order_by('-version_number')

    if limit:
        queryset = queryset[:limit]

    return queryset


def compare_versions(version1, version2):
    """
    Compare two versions of a document.

    Args:
        version1: First DocumentVersion instance
        version2: Second DocumentVersion instance

    Returns:
        Dictionary with comparison data

    Raises:
        ValueError: If versions belong to different documents
    """
    if version1.document_id != version2.document_id:
        raise ValueError("Cannot compare versions from different documents")

    # Ensure version1 is the earlier version
    if version1.version_number > version2.version_number:
        version1, version2 = version2, version1

    # Calculate differences
    file_size_diff = version2.file_size - version1.file_size
    time_diff = version2.created_at - version1.created_at

    comparison = {
        'version1': {
            'number': version1.version_number,
            'created_at': version1.created_at,
            'created_by': version1.created_by.get_full_name(),
            'file_size': version1.file_size,
            'file_size_mb': version1.file_size_mb,
            'checksum': version1.checksum,
            'change_description': version1.change_description,
            'is_major': version1.is_major_version,
        },
        'version2': {
            'number': version2.version_number,
            'created_at': version2.created_at,
            'created_by': version2.created_by.get_full_name(),
            'file_size': version2.file_size,
            'file_size_mb': version2.file_size_mb,
            'checksum': version2.checksum,
            'change_description': version2.change_description,
            'is_major': version2.is_major_version,
        },
        'differences': {
            'file_size_change': file_size_diff,
            'file_size_change_mb': round(file_size_diff / (1024 * 1024), 2),
            'time_between_versions': {
                'days': time_diff.days,
                'hours': time_diff.seconds // 3600,
                'total_seconds': time_diff.total_seconds(),
            },
            'checksum_changed': version1.checksum != version2.checksum,
            'created_by_same_user': version1.created_by_id == version2.created_by_id,
        },
        'summary': {
            'versions_apart': version2.version_number - version1.version_number,
            'size_increased': file_size_diff > 0,
            'size_decreased': file_size_diff < 0,
            'size_unchanged': file_size_diff == 0,
        }
    }

    return comparison


def get_version_statistics(document):
    """
    Get statistics about document versions.

    Args:
        document: Document instance

    Returns:
        Dictionary with version statistics
    """
    from apps.documents.models import DocumentVersion
    from django.db.models import Count, Sum, Avg, Max, Min

    versions = DocumentVersion.objects.filter(document=document)

    stats = versions.aggregate(
        total_versions=Count('id'),
        total_storage=Sum('file_size'),
        avg_file_size=Avg('file_size'),
        max_file_size=Max('file_size'),
        min_file_size=Min('file_size'),
        major_versions=Count('id', filter=models.Q(is_major_version=True)),
    )

    # Get first and last version times
    first_version = versions.order_by('version_number').first()
    last_version = versions.order_by('-version_number').first()

    if first_version and last_version:
        time_span = last_version.created_at - first_version.created_at
    else:
        time_span = None

    return {
        'total_versions': stats['total_versions'] or 0,
        'major_versions': stats['major_versions'] or 0,
        'minor_versions': (stats['total_versions'] or 0) - (stats['major_versions'] or 0),
        'current_version': document.version_number,
        'total_storage_bytes': stats['total_storage'] or 0,
        'total_storage_mb': round((stats['total_storage'] or 0) / (1024 * 1024), 2),
        'total_storage_gb': round((stats['total_storage'] or 0) / (1024 ** 3), 4),
        'average_file_size_mb': round((stats['avg_file_size'] or 0) / (1024 * 1024), 2),
        'largest_version_mb': round((stats['max_file_size'] or 0) / (1024 * 1024), 2),
        'smallest_version_mb': round((stats['min_file_size'] or 0) / (1024 * 1024), 2),
        'time_span_days': time_span.days if time_span else 0,
        'first_version_date': first_version.created_at if first_version else None,
        'last_version_date': last_version.created_at if last_version else None,
    }


def delete_old_versions(document, keep_latest=5):
    """
    Delete old versions keeping only the latest N versions.

    NOTE: Use with caution! This permanently deletes version history.
    Consider retention policies before using this function.

    Args:
        document: Document instance
        keep_latest: Number of latest versions to keep (default: 5)

    Returns:
        Number of versions deleted
    """
    from apps.documents.models import DocumentVersion

    # Get versions to delete (skip the latest N)
    versions_to_delete = DocumentVersion.objects.filter(
        document=document
    ).order_by('-version_number')[keep_latest:]

    count = versions_to_delete.count()

    if count > 0:
        # Delete the versions (this will also delete associated files)
        versions_to_delete.delete()
        logger.warning(
            f"Deleted {count} old versions for document {document.id}, "
            f"kept latest {keep_latest} versions"
        )

    return count
