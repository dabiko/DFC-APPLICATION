from django.conf import settings
from django.db import models
from apps.core.fields import EncryptedTextField, EncryptedCharField
import uuid
import hashlib


class Document(models.Model):
    """
    Core document model for storing file metadata and content.

    Features:
    - UUID primary key for security
    - File integrity verification with SHA-256 checksum
    - Document versioning support
    - Metadata tracking (type, identifier, date, etc.)
    - Confidentiality levels
    - Full-text search support (extracted text)
    - OCR support for scanned documents
    - Multi-tenant organization support
    """

    CONFIDENTIALITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Internal'),
        ('CONFIDENTIAL', 'Confidential'),
        ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
    ]

    # Document Type Choices (controlled list)
    DOCUMENT_TYPE_CHOICES = [
        ('INVOICE', 'Invoice'),
        ('CONTRACT', 'Contract'),
        ('REPORT', 'Report'),
        ('KYC_RECORD', 'KYC Record'),
        ('FINANCIAL_STATEMENT', 'Financial Statement'),
        ('LOAN_APPLICATION', 'Loan Application'),
        ('IDENTITY_DOCUMENT', 'Identity Document'),
        ('CORRESPONDENCE', 'Correspondence'),
        ('POLICY', 'Policy'),
        ('PROCEDURE', 'Procedure'),
        ('AUDIT_REPORT', 'Audit Report'),
        ('COMPLIANCE_DOC', 'Compliance Document'),
        ('OTHER', 'Other'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Multi-tenant organization
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.PROTECT,
        related_name='documents',
        null=True,  # Nullable for migration - will be non-null after data migration
        blank=True,
        help_text='Organization this document belongs to'
    )

    # File information
    title = models.CharField(max_length=500)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text='File size in bytes')
    file_type = models.CharField(max_length=50, help_text='MIME type')
    checksum = models.CharField(
        max_length=64,
        unique=True,
        help_text='SHA-256 checksum for file integrity'
    )

    # MinIO/S3 Storage fields
    minio_bucket = models.CharField(
        max_length=255,
        blank=True,
        help_text='MinIO bucket name where file is stored'
    )
    minio_object_key = models.CharField(
        max_length=500,
        blank=True,
        help_text='MinIO object key (path) for the file'
    )
    minio_etag = models.CharField(
        max_length=64,
        blank=True,
        help_text='S3 ETag for file integrity verification'
    )
    storage_region = models.CharField(
        max_length=50,
        default='us-east-1',
        help_text='Storage region'
    )

    # Mandatory Metadata
    document_type = models.CharField(
        max_length=100,
        choices=DOCUMENT_TYPE_CHOICES,
        default='OTHER'
    )
    identifier = models.CharField(
        max_length=255,
        help_text='Customer ID, Contract Number, Invoice Number, etc.'
    )
    document_date = models.DateField()
    creator_source = models.CharField(
        max_length=255,
        help_text='Original creator or source of the document'
    )

    # Security
    confidentiality_level = models.CharField(
        max_length=20,
        choices=CONFIDENTIALITY_CHOICES,
        default='INTERNAL'
    )

    # Retention
    retention_period_years = models.IntegerField(
        default=7,
        help_text='Number of years to retain this document'
    )

    # Encrypted Sensitive Fields
    # These fields are encrypted at rest using Fernet symmetric encryption
    # Cannot be directly queried in database filters (use search index for searchable encrypted data)
    customer_id = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted customer identifier (PII)'
    )
    account_number = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted account number (sensitive financial data)'
    )
    tax_id = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted tax ID/SSN (PII - Personally Identifiable Information)'
    )
    notes = EncryptedTextField(
        null=True,
        blank=True,
        help_text='Encrypted internal notes (may contain sensitive information)'
    )

    # Relationships
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.PROTECT,
        related_name='documents'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_documents'
    )
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.PROTECT,
        related_name='documents'
    )

    # Versioning
    version_number = models.IntegerField(default=1)
    parent_version = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='versions'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='documents_created'
    )

    # Full-text content (extracted)
    extracted_text = models.TextField(
        blank=True,
        help_text='Text extracted from document for search indexing'
    )
    ocr_confidence = models.FloatField(
        null=True,
        blank=True,
        help_text='OCR confidence score (0.0 to 1.0)'
    )
    is_indexed = models.BooleanField(
        default=False,
        help_text='Whether document has been indexed for search'
    )

    # Thumbnails and conversions
    thumbnail_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='Path to thumbnail image in storage (200x200 JPEG)'
    )
    pdf_version_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text='Path to PDF version of document (for Office files)'
    )

    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        indexes = [
            models.Index(fields=['folder']),
            models.Index(fields=['owner']),
            models.Index(fields=['department']),
            models.Index(fields=['document_type']),
            models.Index(fields=['document_date']),
            models.Index(fields=['checksum']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_deleted']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} (v{self.version_number})"

    @staticmethod
    def calculate_checksum(file_obj):
        """Calculate SHA-256 checksum of file"""
        sha256 = hashlib.sha256()
        for chunk in file_obj.chunks():
            sha256.update(chunk)
        return sha256.hexdigest()

    @property
    def file_size_mb(self):
        """Return file size in megabytes"""
        return round(self.file_size / (1024 * 1024), 2)

    @property
    def is_current_version(self):
        """Check if this is the latest version"""
        return not self.versions.exists()


class Tag(models.Model):
    """
    Tags for categorizing and organizing documents.

    Features:
    - Color-coded tags for visual identification
    - Category grouping
    - Department-specific tags
    """
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(
        max_length=7,
        default='#808080',
        help_text='Hex color code (e.g., #FF5733)'
    )
    category = models.CharField(max_length=100, blank=True)
    department = models.ForeignKey(
        'users.Department',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='tags'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='tags_created'
    )

    class Meta:
        db_table = 'tags'
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'
        ordering = ['name']

    def __str__(self):
        return self.name


class DocumentTag(models.Model):
    """
    Many-to-many relationship for document tags with metadata.

    Tracks when and by whom tags were applied.
    """
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='document_tags'
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name='tagged_documents'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT
    )

    class Meta:
        db_table = 'document_tags'
        verbose_name = 'Document Tag'
        verbose_name_plural = 'Document Tags'
        unique_together = ['document', 'tag']
        ordering = ['created_at']

    def __str__(self):
        return f"{self.document.title} - {self.tag.name}"


class ChunkedUpload(models.Model):
    """
    Model for tracking chunked file uploads (for large files).

    Supports resumable uploads by storing chunks temporarily
    until all chunks are received and can be assembled.
    """
    STATUS_CHOICES = [
        ('UPLOADING', 'Uploading'),
        ('COMPLETE', 'Complete'),
        ('FAILED', 'Failed'),
        ('EXPIRED', 'Expired'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload_id = models.CharField(max_length=100, unique=True)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(help_text='Total file size in bytes')
    chunk_size = models.IntegerField(default=5242880, help_text='Chunk size in bytes (default 5MB)')
    total_chunks = models.IntegerField()
    uploaded_chunks = models.JSONField(default=list, help_text='List of uploaded chunk numbers')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='UPLOADING')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chunked_uploads'
    )

    # Metadata for final document
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    metadata = models.JSONField(default=dict, help_text='Metadata for final document')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(help_text='Upload session expiration time')

    class Meta:
        db_table = 'chunked_uploads'
        verbose_name = 'Chunked Upload'
        verbose_name_plural = 'Chunked Uploads'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.file_name} ({self.status})"

    @property
    def progress_percentage(self):
        """Calculate upload progress percentage"""
        if self.total_chunks == 0:
            return 0
        return (len(self.uploaded_chunks) / self.total_chunks) * 100

    @property
    def is_complete(self):
        """Check if all chunks have been uploaded"""
        return len(self.uploaded_chunks) == self.total_chunks

    def add_chunk(self, chunk_number):
        """Mark a chunk as uploaded"""
        if chunk_number not in self.uploaded_chunks:
            self.uploaded_chunks.append(chunk_number)
            self.uploaded_chunks.sort()
            self.save(update_fields=['uploaded_chunks', 'updated_at'])


class DocumentVersion(models.Model):
    """
    Explicit version tracking for documents.

    Features:
    - Complete version history with file snapshots
    - Change descriptions for each version
    - Checksum verification for version integrity
    - Permanent storage of all versions
    - Support for version comparison and restore

    Each version represents a snapshot of the document at a point in time,
    including the file content and metadata changes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Link to parent document
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='all_versions',
        help_text='The document this version belongs to'
    )

    # Version information
    version_number = models.IntegerField(
        help_text='Sequential version number (1, 2, 3, ...)'
    )

    # File information for this version
    file = models.FileField(
        upload_to='versions/%Y/%m/%d/',
        help_text='File storage path for this version'
    )
    file_name = models.CharField(
        max_length=255,
        help_text='Original filename for this version'
    )
    file_size = models.BigIntegerField(
        help_text='File size in bytes'
    )
    file_type = models.CharField(
        max_length=50,
        help_text='MIME type'
    )
    checksum = models.CharField(
        max_length=64,
        help_text='SHA-256 checksum for version integrity verification'
    )

    # MinIO/S3 Storage fields for versions
    minio_bucket = models.CharField(
        max_length=255,
        blank=True,
        help_text='MinIO bucket name where version file is stored'
    )
    minio_object_key = models.CharField(
        max_length=500,
        blank=True,
        help_text='MinIO object key (path) for the version file'
    )
    minio_etag = models.CharField(
        max_length=64,
        blank=True,
        help_text='S3 ETag for version file integrity verification'
    )

    # Version metadata
    change_description = models.TextField(
        blank=True,
        help_text='Description of changes in this version'
    )
    is_major_version = models.BooleanField(
        default=False,
        help_text='Whether this is a major version (significant changes)'
    )

    # Tracking
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='document_versions_created'
    )

    # Storage location (for future MinIO integration)
    storage_key = models.CharField(
        max_length=500,
        blank=True,
        help_text='MinIO storage key for this version'
    )

    class Meta:
        db_table = 'document_versions'
        verbose_name = 'Document Version'
        verbose_name_plural = 'Document Versions'
        unique_together = ['document', 'version_number']
        ordering = ['-version_number']
        indexes = [
            models.Index(fields=['document', '-version_number']),
            models.Index(fields=['created_at']),
            models.Index(fields=['checksum']),
        ]

    def __str__(self):
        return f"{self.document.title} - Version {self.version_number}"

    @property
    def is_current_version(self):
        """Check if this is the current version of the document"""
        return self.version_number == self.document.version_number

    @property
    def file_size_mb(self):
        """Get file size in megabytes"""
        return round(self.file_size / (1024 * 1024), 2)

    def get_next_version_number(self):
        """Get the next version number for this document"""
        latest = DocumentVersion.objects.filter(
            document=self.document
        ).order_by('-version_number').first()

        if latest:
            return latest.version_number + 1
        return 1

    @staticmethod
    def calculate_checksum(file_obj):
        """
        Calculate SHA-256 checksum for a file.

        Args:
            file_obj: File object (UploadedFile or similar)

        Returns:
            SHA-256 checksum hex string
        """
        sha256 = hashlib.sha256()

        # Reset file pointer to beginning
        file_obj.seek(0)

        # Read file in chunks
        for chunk in file_obj.chunks():
            sha256.update(chunk)

        # Reset file pointer again
        file_obj.seek(0)

        return sha256.hexdigest()
