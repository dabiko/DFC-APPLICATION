"""
Integrations Models.

Provides configuration for API keys, webhooks, and third-party integrations:
- APIKey: Secure API key management for programmatic access
- Webhook: Webhook endpoint configuration for event notifications
- Integration: Third-party service integrations (SSO, storage, etc.)
- IntegrationLog: Audit log for integration activities
"""

import secrets
import hashlib
from django.db import models
from django.core.validators import URLValidator
from django.utils import timezone
import uuid


class APIKey(models.Model):
    """
    API key for programmatic access to the DFC API.
    Keys are hashed for security - only shown once on creation.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='api_keys'
    )
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_integration_api_keys'
    )

    # Key identification
    name = models.CharField(
        max_length=100,
        help_text="Friendly name for the API key"
    )
    key_prefix = models.CharField(
        max_length=8,
        help_text="First 8 characters of the key for identification"
    )
    key_hash = models.CharField(
        max_length=64,
        help_text="SHA-256 hash of the full API key"
    )

    # Permissions and scopes
    SCOPE_CHOICES = [
        ('read', 'Read Only'),
        ('write', 'Read & Write'),
        ('admin', 'Full Admin Access'),
    ]
    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default='read',
        help_text="Access level for this API key"
    )
    allowed_ips = models.JSONField(
        default=list,
        blank=True,
        help_text="List of allowed IP addresses (empty = all IPs allowed)"
    )
    rate_limit = models.PositiveIntegerField(
        default=1000,
        help_text="Maximum requests per hour"
    )

    # Status
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration date"
    )

    # Usage tracking
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_used_ip = models.GenericIPAddressField(null=True, blank=True)
    total_requests = models.PositiveIntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integration_api_keys'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active'], name='apikey_org_active_idx'),
            models.Index(fields=['key_prefix'], name='apikey_prefix_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"

    @property
    def is_expired(self):
        """Check if the API key has expired."""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    @property
    def is_valid(self):
        """Check if the API key is valid for use."""
        return self.is_active and not self.is_expired

    @classmethod
    def generate_key(cls):
        """Generate a new API key with prefix and hash."""
        # Generate a secure random key (40 characters)
        raw_key = f"dfc_{secrets.token_urlsafe(32)}"
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_prefix, key_hash

    def verify_key(self, raw_key):
        """Verify if a raw key matches this API key."""
        test_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return test_hash == self.key_hash

    def record_usage(self, ip_address=None):
        """Record API key usage."""
        self.last_used_at = timezone.now()
        if ip_address:
            self.last_used_ip = ip_address
        self.total_requests += 1
        self.save(update_fields=['last_used_at', 'last_used_ip', 'total_requests'])


class Webhook(models.Model):
    """
    Webhook configuration for event-driven integrations.
    Sends HTTP POST requests to external URLs when events occur.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='webhooks'
    )
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_webhooks'
    )

    # Webhook configuration
    name = models.CharField(
        max_length=100,
        help_text="Friendly name for the webhook"
    )
    url = models.URLField(
        max_length=500,
        validators=[URLValidator(schemes=['https'])],
        help_text="HTTPS endpoint URL to receive events"
    )
    secret = models.CharField(
        max_length=64,
        help_text="Secret for signing webhook payloads"
    )

    # Event subscriptions
    EVENT_TYPES = [
        ('document.created', 'Document Created'),
        ('document.updated', 'Document Updated'),
        ('document.deleted', 'Document Deleted'),
        ('document.shared', 'Document Shared'),
        ('document.downloaded', 'Document Downloaded'),
        ('folder.created', 'Folder Created'),
        ('folder.updated', 'Folder Updated'),
        ('folder.deleted', 'Folder Deleted'),
        ('user.created', 'User Created'),
        ('user.updated', 'User Updated'),
        ('user.deleted', 'User Deleted'),
        ('user.login', 'User Login'),
        ('workflow.started', 'Workflow Started'),
        ('workflow.completed', 'Workflow Completed'),
        ('workflow.failed', 'Workflow Failed'),
        ('retention.applied', 'Retention Policy Applied'),
        ('legal_hold.placed', 'Legal Hold Placed'),
        ('legal_hold.released', 'Legal Hold Released'),
    ]
    subscribed_events = models.JSONField(
        default=list,
        help_text="List of event types to send to this webhook"
    )

    # Status and reliability
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the endpoint has been verified"
    )

    # Retry configuration
    max_retries = models.PositiveSmallIntegerField(
        default=3,
        help_text="Maximum retry attempts for failed deliveries"
    )
    timeout_seconds = models.PositiveSmallIntegerField(
        default=30,
        help_text="Request timeout in seconds"
    )

    # Statistics
    total_deliveries = models.PositiveIntegerField(default=0)
    successful_deliveries = models.PositiveIntegerField(default=0)
    failed_deliveries = models.PositiveIntegerField(default=0)
    last_delivery_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)
    last_failure_reason = models.TextField(blank=True)
    consecutive_failures = models.PositiveSmallIntegerField(default=0)

    # Auto-disable on failures
    auto_disabled = models.BooleanField(
        default=False,
        help_text="Automatically disabled due to repeated failures"
    )
    auto_disabled_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integration_webhooks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'is_active'], name='webhook_org_active_idx'),
        ]

    def __str__(self):
        return f"{self.name} - {self.url[:50]}"

    @classmethod
    def generate_secret(cls):
        """Generate a new webhook secret."""
        return secrets.token_hex(32)

    def record_delivery(self, success, failure_reason=None):
        """Record a webhook delivery attempt."""
        self.total_deliveries += 1
        self.last_delivery_at = timezone.now()

        if success:
            self.successful_deliveries += 1
            self.consecutive_failures = 0
        else:
            self.failed_deliveries += 1
            self.consecutive_failures += 1
            self.last_failure_at = timezone.now()
            self.last_failure_reason = failure_reason or ''

            # Auto-disable after 10 consecutive failures
            if self.consecutive_failures >= 10 and not self.auto_disabled:
                self.auto_disabled = True
                self.auto_disabled_at = timezone.now()
                self.is_active = False

        self.save()


class Integration(models.Model):
    """
    Third-party service integrations (SSO, cloud storage, etc.).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='integrations'
    )
    configured_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='configured_integrations'
    )

    # Integration type
    INTEGRATION_TYPES = [
        # Authentication
        ('sso_saml', 'SAML SSO'),
        ('sso_oauth', 'OAuth 2.0 SSO'),
        ('sso_oidc', 'OpenID Connect'),
        ('ldap', 'LDAP/Active Directory'),
        # Cloud Storage
        ('aws_s3', 'Amazon S3'),
        ('azure_blob', 'Azure Blob Storage'),
        ('google_cloud', 'Google Cloud Storage'),
        ('sharepoint', 'Microsoft SharePoint'),
        ('onedrive', 'Microsoft OneDrive'),
        ('dropbox', 'Dropbox Business'),
        ('box', 'Box'),
        # Communication
        ('slack', 'Slack'),
        ('teams', 'Microsoft Teams'),
        ('email_smtp', 'Custom SMTP'),
        # Other
        ('custom', 'Custom Integration'),
    ]
    integration_type = models.CharField(
        max_length=50,
        choices=INTEGRATION_TYPES,
        help_text="Type of integration"
    )
    name = models.CharField(
        max_length=100,
        help_text="Display name for this integration"
    )
    description = models.TextField(
        blank=True,
        help_text="Description of the integration"
    )

    # Configuration (encrypted in production)
    config = models.JSONField(
        default=dict,
        help_text="Integration-specific configuration"
    )
    credentials = models.JSONField(
        default=dict,
        help_text="Encrypted credentials for the integration"
    )

    # Status
    STATUS_CHOICES = [
        ('pending', 'Pending Setup'),
        ('testing', 'Testing'),
        ('active', 'Active'),
        ('error', 'Error'),
        ('disabled', 'Disabled'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    status_message = models.TextField(
        blank=True,
        help_text="Current status message or error details"
    )
    last_sync_at = models.DateTimeField(null=True, blank=True)
    last_error_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'integration_services'
        ordering = ['-created_at']
        unique_together = ['organization', 'integration_type', 'name']
        indexes = [
            models.Index(fields=['organization', 'status'], name='integration_org_status_idx'),
            models.Index(fields=['integration_type'], name='integration_type_idx'),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_integration_type_display()})"


class IntegrationLog(models.Model):
    """
    Audit log for integration activities.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # References
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='integration_logs'
    )
    api_key = models.ForeignKey(
        APIKey,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )
    webhook = models.ForeignKey(
        Webhook,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )
    integration = models.ForeignKey(
        Integration,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logs'
    )

    # Event details
    ACTION_TYPES = [
        ('api_request', 'API Request'),
        ('webhook_delivery', 'Webhook Delivery'),
        ('integration_sync', 'Integration Sync'),
        ('config_change', 'Configuration Change'),
        ('auth_attempt', 'Authentication Attempt'),
        ('error', 'Error'),
    ]
    action = models.CharField(max_length=30, choices=ACTION_TYPES)
    status = models.CharField(max_length=20)  # success, failure, pending

    # Request/Response details
    endpoint = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    request_data = models.JSONField(default=dict, blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)

    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    duration_ms = models.PositiveIntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Timestamp
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'integration_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['organization', 'created_at'], name='intlog_org_time_idx'),
            models.Index(fields=['action', 'status'], name='intlog_action_status_idx'),
        ]

    def __str__(self):
        return f"{self.action} - {self.status} ({self.created_at})"
