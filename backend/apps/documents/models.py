from django.conf import settings
from django.db import models
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
