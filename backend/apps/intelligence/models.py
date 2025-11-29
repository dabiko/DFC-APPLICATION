"""
Document Intelligence Models

This module provides models for intelligent document processing:
- Named Entity Recognition (NER): Extract people, organizations, dates, amounts
- Table Extraction: Detect and extract tables from documents
- Document Summarization: AI-powered document summaries
- Key-Value Pair Extraction: Extract structured data from unstructured documents
- Relationship Mapping: Identify relationships between extracted entities
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


# =============================================================================
# Named Entity Recognition
# =============================================================================

class ExtractedEntity(models.Model):
    """
    Named entities extracted from documents using NLP.

    Entity types:
    - PERSON: Names of people
    - ORGANIZATION: Company names, institutions
    - DATE: Dates and time expressions
    - MONEY: Currency amounts
    - PERCENTAGE: Percentages
    - LOCATION: Addresses, cities, countries
    - PHONE: Phone numbers
    - EMAIL: Email addresses
    - ACCOUNT_NUMBER: Bank account, invoice numbers
    - REFERENCE: Document reference numbers
    """

    class EntityType(models.TextChoices):
        PERSON = 'PERSON', 'Person'
        ORGANIZATION = 'ORGANIZATION', 'Organization'
        DATE = 'DATE', 'Date'
        MONEY = 'MONEY', 'Money'
        PERCENTAGE = 'PERCENTAGE', 'Percentage'
        LOCATION = 'LOCATION', 'Location'
        PHONE = 'PHONE', 'Phone Number'
        EMAIL = 'EMAIL', 'Email Address'
        ACCOUNT_NUMBER = 'ACCOUNT_NUMBER', 'Account Number'
        REFERENCE = 'REFERENCE', 'Reference Number'
        CUSTOM = 'CUSTOM', 'Custom'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='extracted_entities'
    )

    # Entity details
    entity_type = models.CharField(
        max_length=50,
        choices=EntityType.choices,
        db_index=True
    )

    value = models.TextField(
        help_text='The extracted entity value (e.g., "John Smith", "$5,000")'
    )

    normalized_value = models.TextField(
        blank=True,
        help_text='Normalized/standardized value (e.g., "5000.00" for money)'
    )

    # Position in document
    start_position = models.IntegerField(
        null=True,
        blank=True,
        help_text='Character start position in extracted text'
    )

    end_position = models.IntegerField(
        null=True,
        blank=True,
        help_text='Character end position in extracted text'
    )

    page_number = models.IntegerField(
        null=True,
        blank=True,
        help_text='Page number where entity was found (1-indexed)'
    )

    # Context
    context = models.TextField(
        blank=True,
        help_text='Surrounding text for context'
    )

    # Confidence
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Extraction confidence (0.0 to 1.0)'
    )

    # Metadata
    extraction_method = models.CharField(
        max_length=50,
        default='nlp',
        help_text='Method used for extraction (nlp, regex, ml)'
    )

    is_verified = models.BooleanField(
        default=False,
        help_text='Whether entity has been verified by a user'
    )

    verified_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_entities'
    )

    verified_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extracted_entities'
        ordering = ['document', 'start_position']
        indexes = [
            models.Index(fields=['document', 'entity_type']),
            models.Index(fields=['entity_type', 'value']),
            models.Index(fields=['document', '-confidence_score']),
            models.Index(fields=['is_verified']),
        ]
        verbose_name = 'Extracted Entity'
        verbose_name_plural = 'Extracted Entities'

    def __str__(self):
        return f"{self.entity_type}: {self.value[:50]}"


# =============================================================================
# Table Extraction
# =============================================================================

class ExtractedTable(models.Model):
    """
    Tables extracted from documents.

    Stores structured table data with headers and rows,
    supporting various table formats (bordered, borderless, merged cells).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='extracted_tables'
    )

    # Table identification
    table_number = models.IntegerField(
        help_text='Table number in document (1-indexed)'
    )

    title = models.CharField(
        max_length=500,
        blank=True,
        help_text='Table title/caption if detected'
    )

    # Location
    page_number = models.IntegerField(
        null=True,
        blank=True,
        help_text='Page number where table starts'
    )

    # Table structure
    headers = models.JSONField(
        default=list,
        help_text='List of column headers'
    )

    rows = models.JSONField(
        default=list,
        help_text='List of row data (each row is a list of cell values)'
    )

    row_count = models.IntegerField(
        default=0,
        help_text='Number of data rows (excluding header)'
    )

    column_count = models.IntegerField(
        default=0,
        help_text='Number of columns'
    )

    # Table type detection
    table_type = models.CharField(
        max_length=50,
        default='generic',
        help_text='Detected table type (financial, schedule, contacts, generic)'
    )

    # Confidence
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Extraction confidence (0.0 to 1.0)'
    )

    # Raw data
    raw_html = models.TextField(
        blank=True,
        help_text='Raw HTML representation of table'
    )

    raw_markdown = models.TextField(
        blank=True,
        help_text='Markdown representation of table'
    )

    # Metadata
    has_merged_cells = models.BooleanField(
        default=False,
        help_text='Whether table contains merged cells'
    )

    extraction_method = models.CharField(
        max_length=50,
        default='camelot',
        help_text='Method used for extraction (camelot, tabula, custom)'
    )

    # Verification
    is_verified = models.BooleanField(
        default=False
    )

    verified_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_tables'
    )

    verified_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extracted_tables'
        ordering = ['document', 'table_number']
        unique_together = ['document', 'table_number']
        indexes = [
            models.Index(fields=['document', 'page_number']),
            models.Index(fields=['table_type']),
        ]
        verbose_name = 'Extracted Table'
        verbose_name_plural = 'Extracted Tables'

    def __str__(self):
        if self.title:
            return f"Table {self.table_number}: {self.title[:50]}"
        return f"Table {self.table_number} ({self.row_count}x{self.column_count})"

    def to_dataframe(self):
        """Convert table to pandas DataFrame."""
        try:
            import pandas as pd
            return pd.DataFrame(self.rows, columns=self.headers)
        except ImportError:
            return None


# =============================================================================
# Document Summarization
# =============================================================================

class DocumentSummary(models.Model):
    """
    AI-generated summaries of documents.

    Supports multiple summary types:
    - BRIEF: 1-2 sentence overview
    - STANDARD: Paragraph summary with key points
    - DETAILED: Comprehensive summary with sections
    - BULLET_POINTS: Key points as bullet list
    - EXECUTIVE: Executive summary format
    """

    class SummaryType(models.TextChoices):
        BRIEF = 'BRIEF', 'Brief (1-2 sentences)'
        STANDARD = 'STANDARD', 'Standard Summary'
        DETAILED = 'DETAILED', 'Detailed Summary'
        BULLET_POINTS = 'BULLET_POINTS', 'Bullet Points'
        EXECUTIVE = 'EXECUTIVE', 'Executive Summary'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='summaries'
    )

    # Summary content
    summary_type = models.CharField(
        max_length=20,
        choices=SummaryType.choices,
        default=SummaryType.STANDARD
    )

    summary_text = models.TextField(
        help_text='The generated summary'
    )

    # Key points (structured extraction)
    key_points = models.JSONField(
        default=list,
        help_text='List of key points/takeaways'
    )

    # Topics/themes
    topics = models.JSONField(
        default=list,
        help_text='Main topics identified in document'
    )

    # Sentiment analysis
    sentiment = models.CharField(
        max_length=20,
        blank=True,
        help_text='Overall sentiment (positive, negative, neutral)'
    )

    sentiment_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(-1.0), MaxValueValidator(1.0)],
        help_text='Sentiment score (-1.0 to 1.0)'
    )

    # Generation metadata
    model_used = models.CharField(
        max_length=100,
        default='extractive',
        help_text='Model/method used for summarization'
    )

    word_count = models.IntegerField(
        default=0,
        help_text='Word count of summary'
    )

    compression_ratio = models.FloatField(
        null=True,
        blank=True,
        help_text='Ratio of summary length to original'
    )

    # Quality metrics
    coherence_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    relevance_score = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    # User feedback
    user_rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='User rating (1-5 stars)'
    )

    user_feedback = models.TextField(
        blank=True,
        help_text='Optional user feedback'
    )

    rated_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rated_summaries'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'document_summaries'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['document', 'summary_type']),
            models.Index(fields=['summary_type', '-created_at']),
        ]
        verbose_name = 'Document Summary'
        verbose_name_plural = 'Document Summaries'

    def __str__(self):
        return f"{self.get_summary_type_display()} for {self.document.title[:30]}"


# =============================================================================
# Key-Value Extraction
# =============================================================================

class ExtractedKeyValue(models.Model):
    """
    Key-value pairs extracted from documents.

    Used for extracting structured data like:
    - Invoice number: INV-2024-001
    - Date: November 29, 2024
    - Total Amount: $5,000.00
    - Customer Name: Acme Corp
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='extracted_key_values'
    )

    # Key-value data
    key = models.CharField(
        max_length=255,
        help_text='The field name/label'
    )

    value = models.TextField(
        help_text='The extracted value'
    )

    normalized_key = models.CharField(
        max_length=255,
        blank=True,
        help_text='Standardized key name (e.g., "invoice_number")'
    )

    normalized_value = models.TextField(
        blank=True,
        help_text='Normalized/parsed value'
    )

    value_type = models.CharField(
        max_length=50,
        default='text',
        help_text='Data type (text, number, date, currency, boolean)'
    )

    # Location
    page_number = models.IntegerField(
        null=True,
        blank=True
    )

    # Confidence
    confidence_score = models.FloatField(
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)]
    )

    # Grouping (for multi-field forms)
    group_name = models.CharField(
        max_length=100,
        blank=True,
        help_text='Group name for related fields (e.g., "billing_address")'
    )

    group_order = models.IntegerField(
        default=0,
        help_text='Order within group'
    )

    # Verification
    is_verified = models.BooleanField(default=False)

    verified_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_key_values'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'extracted_key_values'
        ordering = ['document', 'group_name', 'group_order']
        indexes = [
            models.Index(fields=['document', 'normalized_key']),
            models.Index(fields=['normalized_key', 'value']),
            models.Index(fields=['document', 'group_name']),
        ]
        verbose_name = 'Extracted Key-Value'
        verbose_name_plural = 'Extracted Key-Values'

    def __str__(self):
        return f"{self.key}: {self.value[:50]}"


# =============================================================================
# Document Intelligence Processing Job
# =============================================================================

class IntelligenceJob(models.Model):
    """
    Tracks intelligence processing jobs for documents.

    A job can include multiple processing tasks:
    - Entity extraction
    - Table extraction
    - Summarization
    - Key-value extraction
    """

    class JobStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        PROCESSING = 'PROCESSING', 'Processing'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class JobType(models.TextChoices):
        FULL = 'FULL', 'Full Analysis'
        ENTITIES = 'ENTITIES', 'Entity Extraction Only'
        TABLES = 'TABLES', 'Table Extraction Only'
        SUMMARY = 'SUMMARY', 'Summarization Only'
        KEY_VALUES = 'KEY_VALUES', 'Key-Value Extraction Only'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='intelligence_jobs'
    )

    job_type = models.CharField(
        max_length=20,
        choices=JobType.choices,
        default=JobType.FULL
    )

    status = models.CharField(
        max_length=20,
        choices=JobStatus.choices,
        default=JobStatus.PENDING
    )

    # Progress tracking
    progress_percent = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )

    current_task = models.CharField(
        max_length=100,
        blank=True,
        help_text='Current task being processed'
    )

    # Results summary
    entities_found = models.IntegerField(default=0)
    tables_found = models.IntegerField(default=0)
    key_values_found = models.IntegerField(default=0)
    summaries_generated = models.IntegerField(default=0)

    # Error handling
    error_message = models.TextField(blank=True)
    error_details = models.JSONField(default=dict, blank=True)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.FloatField(null=True, blank=True)

    # Configuration
    config = models.JSONField(
        default=dict,
        blank=True,
        help_text='Job configuration options'
    )

    # Audit
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='intelligence_jobs_created'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'intelligence_jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['document', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['job_type', 'status']),
        ]
        verbose_name = 'Intelligence Job'
        verbose_name_plural = 'Intelligence Jobs'

    def __str__(self):
        return f"{self.get_job_type_display()} - {self.document.title[:30]} ({self.status})"

    def start(self):
        """Mark job as started."""
        from django.utils import timezone
        self.status = self.JobStatus.PROCESSING
        self.started_at = timezone.now()
        self.save(update_fields=['status', 'started_at', 'updated_at'])

    def complete(self):
        """Mark job as completed."""
        from django.utils import timezone
        now = timezone.now()
        self.status = self.JobStatus.COMPLETED
        self.completed_at = now
        self.progress_percent = 100
        if self.started_at:
            self.duration_seconds = (now - self.started_at).total_seconds()
        self.save()

    def fail(self, error_message, error_details=None):
        """Mark job as failed."""
        from django.utils import timezone
        self.status = self.JobStatus.FAILED
        self.completed_at = timezone.now()
        self.error_message = error_message
        if error_details:
            self.error_details = error_details
        if self.started_at:
            self.duration_seconds = (self.completed_at - self.started_at).total_seconds()
        self.save()

    def update_progress(self, percent, current_task=''):
        """Update job progress."""
        self.progress_percent = min(percent, 100)
        self.current_task = current_task
        self.save(update_fields=['progress_percent', 'current_task', 'updated_at'])


# =============================================================================
# Intelligence Settings
# =============================================================================

class IntelligenceSettings(models.Model):
    """
    Global settings for document intelligence processing.
    Singleton model - only one instance should exist.
    """

    # Entity extraction settings
    enable_entity_extraction = models.BooleanField(
        default=True,
        help_text='Enable named entity recognition'
    )

    entity_confidence_threshold = models.FloatField(
        default=0.7,
        validators=[MinValueValidator(0.0), MaxValueValidator(1.0)],
        help_text='Minimum confidence for entity extraction'
    )

    entity_types_enabled = models.JSONField(
        default=list,
        help_text='List of enabled entity types'
    )

    # Table extraction settings
    enable_table_extraction = models.BooleanField(
        default=True,
        help_text='Enable table detection and extraction'
    )

    table_extraction_method = models.CharField(
        max_length=50,
        default='auto',
        help_text='Table extraction method (auto, camelot, tabula, custom)'
    )

    # Summarization settings
    enable_summarization = models.BooleanField(
        default=True,
        help_text='Enable document summarization'
    )

    default_summary_type = models.CharField(
        max_length=20,
        default='STANDARD',
        help_text='Default summary type to generate'
    )

    max_summary_length = models.IntegerField(
        default=500,
        help_text='Maximum summary length in words'
    )

    # Key-value extraction settings
    enable_key_value_extraction = models.BooleanField(
        default=True,
        help_text='Enable key-value pair extraction'
    )

    key_value_templates = models.JSONField(
        default=dict,
        help_text='Templates for common document types (invoice, contract, etc.)'
    )

    # Processing settings
    auto_process_on_upload = models.BooleanField(
        default=False,
        help_text='Automatically process documents on upload'
    )

    process_document_types = models.JSONField(
        default=list,
        help_text='Document types to auto-process'
    )

    max_file_size_mb = models.IntegerField(
        default=50,
        help_text='Maximum file size for processing (MB)'
    )

    max_pages = models.IntegerField(
        default=100,
        help_text='Maximum pages to process per document'
    )

    # Performance settings
    batch_size = models.IntegerField(
        default=10,
        help_text='Number of documents to process in batch'
    )

    timeout_seconds = models.IntegerField(
        default=300,
        help_text='Processing timeout per document'
    )

    # Audit
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_intelligence_settings'
    )

    class Meta:
        db_table = 'intelligence_settings'
        verbose_name = 'Intelligence Settings'
        verbose_name_plural = 'Intelligence Settings'

    def __str__(self):
        return 'Document Intelligence Settings'

    def save(self, *args, **kwargs):
        # Singleton - ensure only one instance
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings
