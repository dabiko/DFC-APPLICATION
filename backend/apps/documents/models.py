from django.conf import settings
from django.db import models
from apps.core.fields import EncryptedTextField, EncryptedCharField
import uuid
import hashlib


class DocumentState(models.TextChoices):
    """Document lifecycle states."""
    DRAFT = 'DRAFT', 'Draft'
    IN_REVIEW = 'IN_REVIEW', 'In Review'
    APPROVED = 'APPROVED', 'Approved'
    PUBLISHED = 'PUBLISHED', 'Published'
    ARCHIVED = 'ARCHIVED', 'Archived'


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
    - Document lifecycle state management
    """

    CONFIDENTIALITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Internal'),
        ('CONFIDENTIAL', 'Confidential'),
        ('HIGHLY_CONFIDENTIAL', 'Highly Confidential'),
    ]

    # Document Type Choices (controlled list)
    # Synced with frontend constants - frontend/src/constants/metadata.ts
    DOCUMENT_TYPE_CHOICES = [
        ('INVOICE', 'Invoice'),
        ('CONTRACT', 'Contract'),
        ('REPORT', 'Report'),
        ('KYC_RECORD', 'KYC Record'),
        ('STATEMENT', 'Statement'),
        ('FINANCIAL_STATEMENT', 'Financial Statement'),  # Legacy, kept for backwards compatibility
        ('CORRESPONDENCE', 'Correspondence'),
        ('POLICY_DOCUMENT', 'Policy'),
        ('POLICY', 'Policy'),  # Legacy, kept for backwards compatibility
        ('PROCEDURE_DOCUMENT', 'Procedure'),
        ('PROCEDURE', 'Procedure'),  # Legacy, kept for backwards compatibility
        ('MEMO', 'Memo'),
        ('PRESENTATION', 'Presentation'),
        ('SPREADSHEET', 'Spreadsheet'),
        ('FORM', 'Form'),
        ('CERTIFICATE', 'Certificate'),
        ('AGREEMENT', 'Agreement'),
        ('AUDIT_REPORT', 'Audit Report'),
        ('BANK_STATEMENT', 'Bank Statement'),
        ('TAX_DOCUMENT', 'Tax Document'),
        ('LEGAL_DOCUMENT', 'Legal Document'),
        ('PASSPORT', 'Passport'),
        ('ID_CARD', 'ID Card'),
        ('LOAN_APPLICATION', 'Loan Application'),
        ('IDENTITY_DOCUMENT', 'Identity Document'),
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
    file = models.FileField(
        upload_to='documents/%Y/%m/%d/',
        blank=True,
        null=True,
        help_text='Legacy file field - files are stored in MinIO, not here'
    )
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

    # Document State / Lifecycle
    state = models.CharField(
        max_length=20,
        choices=DocumentState.choices,
        default=DocumentState.DRAFT,
        db_index=True,
        help_text='Current lifecycle state of the document'
    )
    submitted_for_review_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document was submitted for review'
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_submitted',
        help_text='User who submitted the document for review'
    )
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document was reviewed (approved/rejected)'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_reviewed',
        help_text='User who reviewed the document'
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document was approved'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_approved',
        help_text='User who approved the document'
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document was published'
    )
    published_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_published',
        help_text='User who published the document'
    )
    archived_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When document was archived'
    )
    archived_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents_archived',
        help_text='User who archived the document'
    )
    review_notes = models.TextField(
        blank=True,
        help_text='Notes from reviewer (optional)'
    )
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection (if rejected)'
    )

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
            models.Index(fields=['state']),
            models.Index(fields=['state', 'owner']),
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

    def can_delete(self):
        """
        Check if document can be deleted (no shortcuts exist).

        Returns:
            tuple: (can_delete: bool, message: str or None)
        """
        shortcut_count = self.shortcuts.count()
        if shortcut_count > 0:
            return False, f"Cannot delete: {shortcut_count} shortcut(s) reference this document"
        return True, None

    def get_shortcut_locations(self):
        """
        Return list of folders where this document has shortcuts.

        Returns:
            QuerySet of tuples: (folder_name, folder_path)
        """
        return self.shortcuts.select_related('folder').values_list(
            'folder__name', 'folder__path'
        )

    @property
    def shortcut_count(self):
        """Return the number of shortcuts pointing to this document"""
        return self.shortcuts.count()


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


class DocumentShortcut(models.Model):
    """
    A shortcut/reference to a document in another folder.

    This model enables documents to appear in multiple folders without
    duplicating the actual file in storage. The shortcut inherits all
    metadata from the original document (single source of truth).

    Features:
    - Points to original document via ForeignKey with PROTECT
    - Cannot delete original while shortcuts exist
    - Unique constraint prevents duplicate shortcuts in same folder
    - Full audit trail with created_by and created_at
    - Proxy properties provide read-only access to original metadata
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    original_document = models.ForeignKey(
        Document,
        on_delete=models.PROTECT,  # Prevents deletion of original while shortcuts exist
        related_name='shortcuts',
        help_text='The original document this shortcut points to'
    )

    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.CASCADE,
        related_name='document_shortcuts',
        help_text='The folder where this shortcut appears'
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_shortcuts',
        help_text='User who created this shortcut'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_shortcuts'
        verbose_name = 'Document Shortcut'
        verbose_name_plural = 'Document Shortcuts'
        unique_together = ['original_document', 'folder']  # One shortcut per document per folder
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['folder']),
            models.Index(fields=['original_document']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"Shortcut to '{self.original_document.title}' in {self.folder.name}"

    # Proxy properties for read-only metadata access from original document
    @property
    def title(self):
        return self.original_document.title

    @property
    def file_name(self):
        return self.original_document.file_name

    @property
    def file_size(self):
        return self.original_document.file_size

    @property
    def file_type(self):
        return self.original_document.file_type

    @property
    def document_type(self):
        return self.original_document.document_type

    @property
    def confidentiality_level(self):
        return self.original_document.confidentiality_level

    @property
    def owner(self):
        return self.original_document.owner

    @property
    def department(self):
        return self.original_document.department

    @property
    def document_date(self):
        return self.original_document.document_date

    @property
    def version_number(self):
        return self.original_document.version_number

    @property
    def checksum(self):
        return self.original_document.checksum

    @property
    def minio_bucket(self):
        return self.original_document.minio_bucket

    @property
    def minio_object_key(self):
        return self.original_document.minio_object_key

    @property
    def original_folder(self):
        """Return the folder where the original document is stored"""
        return self.original_document.folder

    @property
    def original_folder_path(self):
        """Return the full path of the original document's folder"""
        return self.original_document.folder.path

    @property
    def is_shortcut(self):
        """Always returns True - identifies this as a shortcut"""
        return True


class RecentActivity(models.Model):
    """
    Optimized table for tracking recent document/folder activities.

    This model is separate from AuditLog for performance reasons:
    - Smaller table with specific indexes for fast queries
    - Auto-cleanup of entries older than retention period (30 days)
    - Denormalized fields to avoid JOINs for common queries

    Features:
    - Track VIEW, EDIT, UPLOAD, DOWNLOAD, SHARED activities
    - Support for both documents and folders
    - Pin frequently accessed items (max 10 per user)
    - Time-based grouping (Today, Yesterday, This Week, etc.)
    - Admin access to view other users' recent activities

    Configuration:
    - Retention Period: 30 days
    - Max Pinned Items: 10 per user
    - Admin Access: Enabled
    """

    class ActivityType(models.TextChoices):
        VIEWED = 'VIEWED', 'Viewed'
        EDITED = 'EDITED', 'Edited'
        UPLOADED = 'UPLOADED', 'Uploaded'
        DOWNLOADED = 'DOWNLOADED', 'Downloaded'
        SHARED = 'SHARED', 'Shared'

    class ResourceType(models.TextChoices):
        DOCUMENT = 'DOCUMENT', 'Document'
        FOLDER = 'FOLDER', 'Folder'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User who performed the activity
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recent_activities'
    )

    # Resource reference (document or folder)
    resource_type = models.CharField(
        max_length=20,
        choices=ResourceType.choices
    )
    resource_id = models.UUIDField(
        help_text='UUID of the document or folder'
    )

    # Activity details
    activity_type = models.CharField(
        max_length=20,
        choices=ActivityType.choices
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )

    # Denormalized fields for faster queries (avoid JOINs)
    resource_name = models.CharField(
        max_length=500,
        help_text='Name of the document or folder'
    )
    file_type = models.CharField(
        max_length=50,
        blank=True,
        help_text='MIME type (for documents only)'
    )
    file_size = models.BigIntegerField(
        default=0,
        help_text='File size in bytes (for documents only)'
    )

    # Parent folder information
    folder_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Parent folder UUID'
    )
    folder_name = models.CharField(
        max_length=255,
        blank=True,
        help_text='Parent folder name'
    )
    folder_path = models.CharField(
        max_length=1000,
        blank=True,
        help_text='Full path to the resource'
    )

    # Security classification
    confidentiality_level = models.CharField(
        max_length=20,
        blank=True,
        help_text='Confidentiality level (PUBLIC, INTERNAL, etc.)'
    )

    # Pinning feature
    is_pinned = models.BooleanField(
        default=False,
        help_text='Whether this item is pinned by the user'
    )
    pinned_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the item was pinned'
    )

    class Meta:
        db_table = 'recent_activities'
        verbose_name = 'Recent Activity'
        verbose_name_plural = 'Recent Activities'
        ordering = ['-timestamp']
        indexes = [
            # Primary query: user's recent activities sorted by time
            models.Index(fields=['user', '-timestamp']),
            # Filter by resource type
            models.Index(fields=['user', 'resource_type', '-timestamp']),
            # Filter by activity type
            models.Index(fields=['user', 'activity_type', '-timestamp']),
            # Pinned items query
            models.Index(fields=['user', 'is_pinned', '-timestamp']),
            # Resource lookup (for updating/deleting when resource is modified)
            models.Index(fields=['resource_type', 'resource_id']),
        ]
        constraints = [
            # Ensure unique activity per user/resource/activity_type combination
            # This allows updating timestamp instead of creating duplicates
            models.UniqueConstraint(
                fields=['user', 'resource_type', 'resource_id', 'activity_type'],
                name='unique_user_resource_activity'
            )
        ]

    # Configuration constants
    RETENTION_DAYS = 30
    MAX_PINNED_ITEMS = 10

    def __str__(self):
        return f"{self.user.username} {self.activity_type} {self.resource_name}"

    @classmethod
    def log_activity(
        cls,
        user,
        resource_type: str,
        resource_id: str,
        activity_type: str,
        resource_name: str,
        file_type: str = '',
        file_size: int = 0,
        folder_id: str = None,
        folder_name: str = '',
        folder_path: str = '',
        confidentiality_level: str = ''
    ):
        """
        Log or update a recent activity entry.

        Uses update_or_create to update timestamp if activity already exists,
        preventing duplicate entries for repeated actions on the same resource.

        Args:
            user: The user performing the activity
            resource_type: 'DOCUMENT' or 'FOLDER'
            resource_id: UUID of the resource
            activity_type: One of ActivityType choices
            resource_name: Display name of the resource
            file_type: MIME type (for documents)
            file_size: File size in bytes (for documents)
            folder_id: Parent folder UUID
            folder_name: Parent folder name
            folder_path: Full path to resource
            confidentiality_level: Security classification

        Returns:
            tuple: (RecentActivity instance, created boolean)
        """
        from django.utils import timezone

        return cls.objects.update_or_create(
            user=user,
            resource_type=resource_type,
            resource_id=resource_id,
            activity_type=activity_type,
            defaults={
                'resource_name': resource_name,
                'file_type': file_type,
                'file_size': file_size,
                'folder_id': folder_id,
                'folder_name': folder_name,
                'folder_path': folder_path,
                'confidentiality_level': confidentiality_level,
                'timestamp': timezone.now(),
            }
        )

    @classmethod
    def cleanup_old_entries(cls, days: int = None):
        """
        Remove entries older than retention period.

        Should be run periodically via Celery beat or management command.

        Args:
            days: Number of days to retain (defaults to RETENTION_DAYS)

        Returns:
            int: Number of deleted entries
        """
        from django.utils import timezone
        from datetime import timedelta

        if days is None:
            days = cls.RETENTION_DAYS

        cutoff_date = timezone.now() - timedelta(days=days)
        deleted_count, _ = cls.objects.filter(
            timestamp__lt=cutoff_date,
            is_pinned=False  # Don't delete pinned items
        ).delete()

        return deleted_count

    @classmethod
    def get_user_pinned_count(cls, user) -> int:
        """Get the count of pinned items for a user."""
        return cls.objects.filter(user=user, is_pinned=True).count()

    def can_pin(self) -> tuple:
        """
        Check if this activity can be pinned.

        Returns:
            tuple: (can_pin: bool, reason: str or None)
        """
        if self.is_pinned:
            return False, "Item is already pinned"

        pinned_count = self.get_user_pinned_count(self.user)
        if pinned_count >= self.MAX_PINNED_ITEMS:
            return False, f"Maximum of {self.MAX_PINNED_ITEMS} pinned items reached"

        return True, None

    def pin(self) -> bool:
        """
        Pin this activity item.

        Returns:
            bool: True if successfully pinned, False otherwise
        """
        from django.utils import timezone

        can_pin, reason = self.can_pin()
        if not can_pin:
            return False

        self.is_pinned = True
        self.pinned_at = timezone.now()
        self.save(update_fields=['is_pinned', 'pinned_at'])
        return True

    def unpin(self) -> bool:
        """
        Unpin this activity item.

        Returns:
            bool: True if successfully unpinned
        """
        self.is_pinned = False
        self.pinned_at = None
        self.save(update_fields=['is_pinned', 'pinned_at'])
        return True


class PinnedItem(models.Model):
    """
    Pinned items for Quick Access section in My Documents.

    Allows users to pin documents and folders for quick access.
    Supports:
    - Pinning owned documents
    - Pinning owned folders
    - Pinning shared items (as shortcuts)
    - Custom ordering via drag-and-drop
    - Maximum 20 pinned items per user

    Usage:
        # Pin a document
        pinned = PinnedItem.objects.create(
            user=user,
            item_type='DOCUMENT',
            document=document,
            display_order=0
        )

        # Pin a folder
        pinned = PinnedItem.objects.create(
            user=user,
            item_type='FOLDER',
            folder=folder,
            display_order=1
        )

        # Pin a shared item
        pinned = PinnedItem.objects.create(
            user=user,
            item_type='SHARED_DOCUMENT',
            shared_item_id=shared_access_id,
            shared_item_name='Shared Report.pdf',
            display_order=2
        )
    """

    ITEM_TYPE_CHOICES = [
        ('DOCUMENT', 'Document'),
        ('FOLDER', 'Folder'),
        ('SHARED_DOCUMENT', 'Shared Document'),
        ('SHARED_FOLDER', 'Shared Folder'),
    ]

    MAX_PINNED_ITEMS = 20

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Owner of the pin
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pinned_items'
    )

    # Item type
    item_type = models.CharField(
        max_length=20,
        choices=ITEM_TYPE_CHOICES
    )

    # For owned documents
    document = models.ForeignKey(
        'Document',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='pins'
    )

    # For owned folders
    folder = models.ForeignKey(
        'folders.Folder',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='pins'
    )

    # For shared items (reference to SharedItemAccess)
    shared_item_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='ID of SharedItemAccess for shared items'
    )
    shared_item_name = models.CharField(
        max_length=500,
        blank=True,
        help_text='Cached name for shared items'
    )

    # Display order for drag-and-drop reordering
    display_order = models.IntegerField(
        default=0,
        db_index=True,
        help_text='Order of item in Quick Access (lower = first)'
    )

    # Custom label (optional override)
    custom_label = models.CharField(
        max_length=255,
        blank=True,
        help_text='Custom display label (optional)'
    )

    # Timestamps
    pinned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Pinned Item'
        verbose_name_plural = 'Pinned Items'
        db_table = 'pinned_items'
        ordering = ['display_order', '-pinned_at']
        # Ensure unique pins per user
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'document'],
                condition=models.Q(document__isnull=False),
                name='unique_user_document_pin'
            ),
            models.UniqueConstraint(
                fields=['user', 'folder'],
                condition=models.Q(folder__isnull=False),
                name='unique_user_folder_pin'
            ),
            models.UniqueConstraint(
                fields=['user', 'shared_item_id'],
                condition=models.Q(shared_item_id__isnull=False),
                name='unique_user_shared_item_pin'
            ),
        ]
        indexes = [
            models.Index(fields=['user', 'display_order']),
            models.Index(fields=['user', 'item_type']),
        ]

    def __str__(self):
        return f"Pin: {self.get_display_name()} ({self.user.email})"

    def get_display_name(self) -> str:
        """Get the display name for this pinned item."""
        if self.custom_label:
            return self.custom_label
        if self.document:
            return self.document.title
        if self.folder:
            return self.folder.name
        if self.shared_item_name:
            return self.shared_item_name
        return "Unknown Item"

    def get_item_id(self) -> str:
        """Get the ID of the pinned item."""
        if self.document:
            return str(self.document.id)
        if self.folder:
            return str(self.folder.id)
        if self.shared_item_id:
            return str(self.shared_item_id)
        return str(self.id)

    @classmethod
    def get_user_pin_count(cls, user) -> int:
        """Get the count of pinned items for a user."""
        return cls.objects.filter(user=user).count()

    @classmethod
    def can_user_pin(cls, user) -> tuple:
        """
        Check if user can pin more items.

        Returns:
            tuple: (can_pin: bool, reason: str or None)
        """
        pin_count = cls.get_user_pin_count(user)
        if pin_count >= cls.MAX_PINNED_ITEMS:
            return False, f"Maximum of {cls.MAX_PINNED_ITEMS} pinned items reached"
        return True, None

    @classmethod
    def get_next_order(cls, user) -> int:
        """Get the next display order for a new pin."""
        last_pin = cls.objects.filter(user=user).order_by('-display_order').first()
        if last_pin:
            return last_pin.display_order + 1
        return 0

    @classmethod
    def reorder_items(cls, user, ordered_ids: list) -> int:
        """
        Reorder pinned items based on provided ID list.

        Args:
            user: The user whose pins to reorder
            ordered_ids: List of pin IDs in desired order

        Returns:
            int: Number of items updated
        """
        updated_count = 0
        for index, pin_id in enumerate(ordered_ids):
            updated = cls.objects.filter(
                id=pin_id,
                user=user
            ).update(display_order=index)
            updated_count += updated
        return updated_count

    def clean(self):
        """Validate the pinned item."""
        from django.core.exceptions import ValidationError

        # Must have exactly one item reference
        refs = [self.document, self.folder, self.shared_item_id]
        non_null_refs = [r for r in refs if r is not None]

        if len(non_null_refs) == 0:
            raise ValidationError("Must specify document, folder, or shared_item_id")
        if len(non_null_refs) > 1:
            raise ValidationError("Can only specify one of document, folder, or shared_item_id")

        # Validate item_type matches the reference
        if self.document and self.item_type != 'DOCUMENT':
            raise ValidationError("item_type must be 'DOCUMENT' when document is set")
        if self.folder and self.item_type != 'FOLDER':
            raise ValidationError("item_type must be 'FOLDER' when folder is set")
        if self.shared_item_id and self.item_type not in ['SHARED_DOCUMENT', 'SHARED_FOLDER']:
            raise ValidationError("item_type must be 'SHARED_DOCUMENT' or 'SHARED_FOLDER' for shared items")

    def save(self, *args, **kwargs):
        # Auto-set display_order for new items
        if self._state.adding and self.display_order == 0:
            self.display_order = self.get_next_order(self.user)
        super().save(*args, **kwargs)


class DocumentStateTransition(models.Model):
    """
    Audit trail for document state changes.

    Records every state transition with:
    - From/to states
    - Who made the change
    - When it happened
    - Optional notes/reason

    This provides a complete audit trail for document lifecycle management.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='state_transitions',
        help_text='Document that changed state'
    )

    from_state = models.CharField(
        max_length=20,
        choices=DocumentState.choices,
        help_text='Previous state'
    )
    to_state = models.CharField(
        max_length=20,
        choices=DocumentState.choices,
        help_text='New state'
    )

    transitioned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='document_state_transitions',
        help_text='User who made the state change'
    )

    transitioned_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the state change occurred'
    )

    notes = models.TextField(
        blank=True,
        help_text='Optional notes for this transition'
    )

    # For rejection transitions
    rejection_reason = models.TextField(
        blank=True,
        help_text='Reason for rejection (if applicable)'
    )

    class Meta:
        db_table = 'document_state_transitions'
        verbose_name = 'Document State Transition'
        verbose_name_plural = 'Document State Transitions'
        ordering = ['-transitioned_at']
        indexes = [
            models.Index(fields=['document', '-transitioned_at']),
            models.Index(fields=['transitioned_by', '-transitioned_at']),
            models.Index(fields=['from_state', 'to_state']),
        ]

    def __str__(self):
        return f"{self.document.title}: {self.from_state} → {self.to_state}"

    # Valid state transitions
    VALID_TRANSITIONS = {
        DocumentState.DRAFT: [DocumentState.IN_REVIEW],
        DocumentState.IN_REVIEW: [DocumentState.APPROVED, DocumentState.DRAFT],  # DRAFT = rejected
        DocumentState.APPROVED: [DocumentState.PUBLISHED, DocumentState.ARCHIVED],
        DocumentState.PUBLISHED: [DocumentState.ARCHIVED],
        DocumentState.ARCHIVED: [DocumentState.DRAFT],  # Restore
    }

    @classmethod
    def is_valid_transition(cls, from_state: str, to_state: str) -> bool:
        """
        Check if a state transition is valid.

        Args:
            from_state: Current state
            to_state: Target state

        Returns:
            bool: True if transition is valid
        """
        valid_targets = cls.VALID_TRANSITIONS.get(from_state, [])
        return to_state in valid_targets

    @classmethod
    def get_allowed_transitions(cls, current_state: str) -> list:
        """
        Get list of valid target states from current state.

        Args:
            current_state: The current document state

        Returns:
            list: List of valid target states
        """
        return cls.VALID_TRANSITIONS.get(current_state, [])

    @classmethod
    def create_transition(
        cls,
        document: Document,
        to_state: str,
        user,
        notes: str = '',
        rejection_reason: str = ''
    ):
        """
        Create a state transition and update the document.

        Args:
            document: The document to transition
            to_state: Target state
            user: User making the transition
            notes: Optional notes
            rejection_reason: Reason for rejection (if rejecting)

        Returns:
            DocumentStateTransition: The created transition record

        Raises:
            ValueError: If transition is invalid
        """
        from django.utils import timezone

        from_state = document.state

        if not cls.is_valid_transition(from_state, to_state):
            raise ValueError(
                f"Invalid transition from {from_state} to {to_state}. "
                f"Allowed: {cls.get_allowed_transitions(from_state)}"
            )

        # Create transition record
        transition = cls.objects.create(
            document=document,
            from_state=from_state,
            to_state=to_state,
            transitioned_by=user,
            notes=notes,
            rejection_reason=rejection_reason
        )

        # Update document state
        now = timezone.now()
        document.state = to_state

        # Update relevant timestamp fields based on transition
        if to_state == DocumentState.IN_REVIEW:
            document.submitted_for_review_at = now
            document.submitted_by = user
        elif to_state == DocumentState.APPROVED:
            document.reviewed_at = now
            document.reviewed_by = user
            document.approved_at = now
            document.approved_by = user
            document.review_notes = notes
        elif to_state == DocumentState.DRAFT and from_state == DocumentState.IN_REVIEW:
            # Rejection
            document.reviewed_at = now
            document.reviewed_by = user
            document.rejection_reason = rejection_reason
        elif to_state == DocumentState.PUBLISHED:
            document.published_at = now
            document.published_by = user
        elif to_state == DocumentState.ARCHIVED:
            document.archived_at = now
            document.archived_by = user
        elif to_state == DocumentState.DRAFT and from_state == DocumentState.ARCHIVED:
            # Restore from archive
            document.archived_at = None
            document.archived_by = None

        document.save()

        return transition
