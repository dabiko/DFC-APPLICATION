"""
System-wide settings models for super admin functionality.

These settings apply to the entire platform, not individual organizations.
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class SystemSettings(models.Model):
    """
    Singleton model for platform-wide system configuration.
    Only one instance should exist.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Platform Identity
    platform_name = models.CharField(
        max_length=100,
        default='Digital Filing Cabinet',
        help_text='Platform name displayed to users'
    )
    platform_tagline = models.CharField(
        max_length=255,
        default='Enterprise Document Management',
        help_text='Platform tagline'
    )
    support_email = models.EmailField(
        default='support@dfc.com',
        help_text='Platform support email'
    )
    support_phone = models.CharField(
        max_length=50,
        blank=True,
        help_text='Platform support phone'
    )

    # Maintenance Mode
    maintenance_mode = models.BooleanField(
        default=False,
        help_text='Enable maintenance mode (blocks all non-admin access)'
    )
    maintenance_message = models.TextField(
        blank=True,
        default='The system is currently undergoing scheduled maintenance. Please check back soon.',
        help_text='Message displayed during maintenance'
    )
    maintenance_allowed_ips = models.JSONField(
        default=list,
        help_text='List of IP addresses allowed during maintenance'
    )
    maintenance_started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when maintenance mode was last activated'
    )
    maintenance_started_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_activations',
        help_text='User who activated maintenance mode'
    )
    maintenance_estimated_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Estimated end time for the maintenance window (shown to users)'
    )

    # Registration Settings
    allow_registration = models.BooleanField(
        default=True,
        help_text='Allow new organization registration'
    )
    require_email_verification = models.BooleanField(
        default=True,
        help_text='Require email verification for new users'
    )
    auto_approve_organizations = models.BooleanField(
        default=True,
        help_text='Auto-approve new organization registrations'
    )
    default_trial_days = models.PositiveIntegerField(
        default=14,
        validators=[MinValueValidator(0), MaxValueValidator(90)],
        help_text='Default trial period for new organizations'
    )

    # Security Settings
    global_rate_limit = models.PositiveIntegerField(
        default=1000,
        validators=[MinValueValidator(100), MaxValueValidator(100000)],
        help_text='Global API rate limit per minute'
    )
    max_file_size_mb = models.PositiveIntegerField(
        default=500,
        validators=[MinValueValidator(1), MaxValueValidator(5000)],
        help_text='Maximum file upload size in MB'
    )
    allowed_file_types = models.JSONField(
        default=list,
        help_text='List of allowed file extensions (empty = all allowed)'
    )
    blocked_file_types = models.JSONField(
        default=list,
        help_text='List of blocked file extensions'
    )

    # Email Settings
    email_from_name = models.CharField(
        max_length=100,
        default='Digital Filing Cabinet',
        help_text='From name for system emails'
    )
    email_from_address = models.EmailField(
        default='noreply@dfc.com',
        help_text='From address for system emails'
    )
    smtp_host = models.CharField(
        max_length=255,
        blank=True,
        help_text='SMTP server host'
    )
    smtp_port = models.PositiveIntegerField(
        default=587,
        help_text='SMTP server port'
    )
    smtp_use_tls = models.BooleanField(
        default=True,
        help_text='Use TLS for SMTP connection'
    )
    smtp_username = models.CharField(
        max_length=255,
        blank=True,
        help_text='SMTP authentication username'
    )
    # Note: SMTP password should be stored in environment variables/secrets manager

    # Storage Settings
    storage_provider = models.CharField(
        max_length=50,
        default='minio',
        choices=[
            ('minio', 'MinIO'),
            ('s3', 'Amazon S3'),
            ('azure', 'Azure Blob Storage'),
            ('gcs', 'Google Cloud Storage'),
        ],
        help_text='Primary storage provider'
    )
    storage_region = models.CharField(
        max_length=50,
        blank=True,
        help_text='Storage region/endpoint'
    )
    storage_bucket = models.CharField(
        max_length=100,
        default='dfc-documents',
        help_text='Default storage bucket'
    )
    enable_redundant_storage = models.BooleanField(
        default=False,
        help_text='Enable redundant storage for backups'
    )

    # Search Settings
    search_provider = models.CharField(
        max_length=50,
        default='elasticsearch',
        choices=[
            ('elasticsearch', 'Elasticsearch'),
            ('opensearch', 'OpenSearch'),
            ('database', 'Database Full-Text Search'),
        ],
        help_text='Search engine provider'
    )
    search_index_delay_seconds = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(0), MaxValueValidator(300)],
        help_text='Delay before indexing new documents'
    )
    enable_ocr = models.BooleanField(
        default=True,
        help_text='Enable OCR for scanned documents'
    )
    ocr_languages = models.JSONField(
        default=list,
        help_text='Supported OCR languages'
    )

    # Audit & Compliance
    audit_retention_days = models.PositiveIntegerField(
        default=365,
        validators=[MinValueValidator(30), MaxValueValidator(3650)],
        help_text='Days to retain audit logs'
    )
    enable_gdpr_compliance = models.BooleanField(
        default=True,
        help_text='Enable GDPR compliance features'
    )
    data_residency_required = models.BooleanField(
        default=False,
        help_text='Require data residency in specific regions'
    )

    # Feature Toggles (Global)
    enable_public_api = models.BooleanField(
        default=True,
        help_text='Enable public API access'
    )
    enable_webhooks = models.BooleanField(
        default=True,
        help_text='Enable webhook integrations'
    )
    enable_third_party_integrations = models.BooleanField(
        default=True,
        help_text='Enable third-party integrations'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'system_settings'
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'

    def __str__(self):
        return f"System Settings (updated {self.updated_at})"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and SystemSettings.objects.exists():
            raise ValueError('Only one SystemSettings instance is allowed')
        # Set default values for JSONFields if empty
        if not self.allowed_file_types:
            self.allowed_file_types = []
        if not self.blocked_file_types:
            self.blocked_file_types = ['.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif']
        if not self.maintenance_allowed_ips:
            self.maintenance_allowed_ips = []
        if not self.ocr_languages:
            self.ocr_languages = ['eng']
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        """Get or create the singleton settings instance."""
        settings, created = cls.objects.get_or_create(pk=cls.objects.first().pk if cls.objects.exists() else None)
        return settings


class AuditConfiguration(models.Model):
    """
    Configuration for audit logging behavior.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Event Categories to Log
    log_auth_events = models.BooleanField(default=True, help_text='Log authentication events')
    log_document_events = models.BooleanField(default=True, help_text='Log document operations')
    log_folder_events = models.BooleanField(default=True, help_text='Log folder operations')
    log_user_events = models.BooleanField(default=True, help_text='Log user management events')
    log_permission_events = models.BooleanField(default=True, help_text='Log permission changes')
    log_search_events = models.BooleanField(default=False, help_text='Log search queries')
    log_api_events = models.BooleanField(default=True, help_text='Log API access')
    log_system_events = models.BooleanField(default=True, help_text='Log system events')

    # Alert Configuration
    alert_on_failed_logins = models.BooleanField(default=True)
    failed_login_threshold = models.PositiveIntegerField(default=5)
    alert_on_bulk_deletion = models.BooleanField(default=True)
    bulk_deletion_threshold = models.PositiveIntegerField(default=10)
    alert_on_permission_changes = models.BooleanField(default=True)
    alert_recipients = models.JSONField(default=list, help_text='Email addresses for alerts')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'audit_configuration'
        verbose_name = 'Audit Configuration'
        verbose_name_plural = 'Audit Configurations'

    def __str__(self):
        return "Audit Configuration"


class PlatformAnnouncement(models.Model):
    """
    Platform-wide announcements visible to all users.
    """

    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
        ('maintenance', 'Maintenance'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(
        max_length=20,
        choices=SEVERITY_CHOICES,
        default='info'
    )

    is_active = models.BooleanField(default=True)
    is_dismissible = models.BooleanField(default=True)

    # Targeting
    target_all_users = models.BooleanField(default=True)
    target_plans = models.JSONField(
        default=list,
        help_text='List of subscription plans to target (empty = all)'
    )

    # Schedule
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_announcements'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_announcements'
        ordering = ['-created_at']
        verbose_name = 'Platform Announcement'
        verbose_name_plural = 'Platform Announcements'

    def __str__(self):
        return f"[{self.severity}] {self.title}"


class SystemHealthCheck(models.Model):
    """
    Record of system health checks and their results.
    """

    STATUS_CHOICES = [
        ('healthy', 'Healthy'),
        ('degraded', 'Degraded'),
        ('unhealthy', 'Unhealthy'),
        ('unknown', 'Unknown'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    service_name = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    details = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)

    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'system_health_checks'
        ordering = ['-checked_at']
        verbose_name = 'System Health Check'
        verbose_name_plural = 'System Health Checks'
        indexes = [
            models.Index(fields=['service_name', '-checked_at']),
            models.Index(fields=['status', '-checked_at']),
        ]

    def __str__(self):
        return f"{self.service_name}: {self.status} ({self.checked_at})"
