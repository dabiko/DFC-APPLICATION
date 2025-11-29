"""
Organization Settings Models.

Provides configuration models for organization-level settings:
- OrganizationSettings: General settings (branding, contact info)
- OrganizationSecurityPolicy: Security configuration (password, MFA, sessions)
- OrganizationFeatureFlags: Feature availability based on subscription
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class OrganizationSettings(models.Model):
    """
    Organization-level settings for branding and configuration.
    One-to-one relationship with Organization.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='settings'
    )

    # Branding
    logo = models.ImageField(
        upload_to='organization_logos/',
        null=True,
        blank=True,
        help_text="Organization logo (recommended: 200x200px)"
    )
    primary_color = models.CharField(
        max_length=7,
        default='#3B82F6',
        help_text="Primary brand color in hex format"
    )
    secondary_color = models.CharField(
        max_length=7,
        default='#1E40AF',
        help_text="Secondary brand color in hex format"
    )

    # Contact Information
    contact_email = models.EmailField(
        blank=True,
        help_text="Primary contact email for the organization"
    )
    contact_phone = models.CharField(
        max_length=50,
        blank=True,
        help_text="Primary contact phone number"
    )
    website = models.URLField(
        blank=True,
        help_text="Organization website URL"
    )

    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)

    # General Settings
    timezone = models.CharField(
        max_length=50,
        default='UTC',
        help_text="Organization default timezone"
    )
    date_format = models.CharField(
        max_length=20,
        default='YYYY-MM-DD',
        help_text="Default date format"
    )
    language = models.CharField(
        max_length=10,
        default='en',
        help_text="Default language code"
    )

    # Document Settings
    default_confidentiality = models.CharField(
        max_length=50,
        default='internal',
        choices=[
            ('public', 'Public'),
            ('internal', 'Internal'),
            ('confidential', 'Confidential'),
            ('highly_confidential', 'Highly Confidential'),
        ],
        help_text="Default confidentiality level for new documents"
    )
    require_classification = models.BooleanField(
        default=True,
        help_text="Require documents to be classified on upload"
    )
    allow_external_sharing = models.BooleanField(
        default=False,
        help_text="Allow sharing documents with external users"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization_settings'
        verbose_name = 'Organization Settings'
        verbose_name_plural = 'Organization Settings'

    def __str__(self):
        return f"Settings for {self.organization.name}"


class OrganizationSecurityPolicy(models.Model):
    """
    Security policy configuration for an organization.
    Defines password requirements, MFA settings, session policies, etc.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='security_policy'
    )

    # Password Policy
    password_min_length = models.PositiveIntegerField(
        default=8,
        validators=[MinValueValidator(6), MaxValueValidator(32)],
        help_text="Minimum password length"
    )
    password_require_uppercase = models.BooleanField(
        default=True,
        help_text="Require at least one uppercase letter"
    )
    password_require_lowercase = models.BooleanField(
        default=True,
        help_text="Require at least one lowercase letter"
    )
    password_require_numbers = models.BooleanField(
        default=True,
        help_text="Require at least one number"
    )
    password_require_special = models.BooleanField(
        default=False,
        help_text="Require at least one special character"
    )
    password_expiry_days = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(365)],
        help_text="Password expiry in days (0 = never expires)"
    )
    password_history_count = models.PositiveIntegerField(
        default=3,
        validators=[MaxValueValidator(24)],
        help_text="Number of previous passwords to prevent reuse"
    )

    # MFA Policy
    mfa_required = models.BooleanField(
        default=False,
        help_text="Require MFA for all users"
    )
    mfa_required_for_admins = models.BooleanField(
        default=True,
        help_text="Require MFA for admin users"
    )
    mfa_grace_period_days = models.PositiveIntegerField(
        default=7,
        validators=[MaxValueValidator(30)],
        help_text="Days to enable MFA after account creation"
    )
    allowed_mfa_methods = models.JSONField(
        default=list,
        help_text="Allowed MFA methods: ['totp', 'sms', 'email']"
    )

    # Session Policy
    session_timeout_minutes = models.PositiveIntegerField(
        default=60,
        validators=[MinValueValidator(5), MaxValueValidator(1440)],
        help_text="Session timeout in minutes"
    )
    max_concurrent_sessions = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(20)],
        help_text="Maximum concurrent sessions per user"
    )
    require_reauthentication = models.BooleanField(
        default=True,
        help_text="Require re-authentication for sensitive operations"
    )

    # Login Security
    max_login_attempts = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(3), MaxValueValidator(10)],
        help_text="Failed attempts before account lockout"
    )
    lockout_duration_minutes = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(5), MaxValueValidator(1440)],
        help_text="Account lockout duration in minutes"
    )
    login_notification_enabled = models.BooleanField(
        default=True,
        help_text="Notify users on new login"
    )
    suspicious_activity_alerts = models.BooleanField(
        default=True,
        help_text="Alert admins on suspicious login activity"
    )

    # IP Restrictions
    ip_whitelist_enabled = models.BooleanField(
        default=False,
        help_text="Enable IP whitelisting"
    )
    ip_whitelist = models.JSONField(
        default=list,
        help_text="List of allowed IP addresses/ranges"
    )

    # Data Security
    data_export_restricted = models.BooleanField(
        default=False,
        help_text="Restrict bulk data exports"
    )
    require_encryption = models.BooleanField(
        default=True,
        help_text="Require encryption for all documents"
    )
    audit_log_retention_days = models.PositiveIntegerField(
        default=365,
        validators=[MinValueValidator(30), MaxValueValidator(2555)],
        help_text="Audit log retention period in days"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization_security_policies'
        verbose_name = 'Organization Security Policy'
        verbose_name_plural = 'Organization Security Policies'

    def __str__(self):
        return f"Security Policy for {self.organization.name}"

    def save(self, *args, **kwargs):
        # Ensure allowed_mfa_methods has defaults
        if not self.allowed_mfa_methods:
            self.allowed_mfa_methods = ['totp']
        super().save(*args, **kwargs)

    def get_password_requirements(self):
        """Return human-readable password requirements."""
        requirements = [f"Minimum {self.password_min_length} characters"]
        if self.password_require_uppercase:
            requirements.append("At least one uppercase letter")
        if self.password_require_lowercase:
            requirements.append("At least one lowercase letter")
        if self.password_require_numbers:
            requirements.append("At least one number")
        if self.password_require_special:
            requirements.append("At least one special character")
        return requirements


class OrganizationFeatureFlags(models.Model):
    """
    Feature flags and capabilities for an organization.
    Controls feature availability based on subscription plan.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.OneToOneField(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='feature_flags'
    )

    # Core Features
    advanced_search = models.BooleanField(
        default=True,
        help_text="Full-text search with filters"
    )
    ocr_processing = models.BooleanField(
        default=True,
        help_text="OCR for scanned documents"
    )
    version_control = models.BooleanField(
        default=True,
        help_text="Document version history"
    )
    folder_templates = models.BooleanField(
        default=True,
        help_text="Pre-defined folder templates"
    )

    # Collaboration
    external_sharing = models.BooleanField(
        default=False,
        help_text="Share with external users"
    )
    real_time_collaboration = models.BooleanField(
        default=False,
        help_text="Real-time document editing"
    )
    comments_annotations = models.BooleanField(
        default=True,
        help_text="Document comments and annotations"
    )

    # Compliance & Security
    advanced_audit = models.BooleanField(
        default=False,
        help_text="Advanced audit logging and reports"
    )
    retention_policies = models.BooleanField(
        default=True,
        help_text="Document retention policies"
    )
    legal_hold = models.BooleanField(
        default=False,
        help_text="Legal hold capability"
    )
    compliance_reports = models.BooleanField(
        default=False,
        help_text="Compliance reporting features"
    )
    data_classification = models.BooleanField(
        default=True,
        help_text="Automatic data classification"
    )

    # Workflow & Automation
    basic_workflows = models.BooleanField(
        default=True,
        help_text="Basic approval workflows"
    )
    advanced_workflows = models.BooleanField(
        default=False,
        help_text="Complex workflow designer"
    )
    scheduled_tasks = models.BooleanField(
        default=False,
        help_text="Scheduled automation tasks"
    )
    api_access = models.BooleanField(
        default=False,
        help_text="REST API access"
    )
    webhooks = models.BooleanField(
        default=False,
        help_text="Webhook integrations"
    )

    # Analytics & Reporting
    basic_analytics = models.BooleanField(
        default=True,
        help_text="Basic usage analytics"
    )
    advanced_analytics = models.BooleanField(
        default=False,
        help_text="Advanced analytics and insights"
    )
    custom_reports = models.BooleanField(
        default=False,
        help_text="Custom report builder"
    )
    export_reports = models.BooleanField(
        default=True,
        help_text="Export reports to PDF/Excel"
    )

    # Administration
    custom_roles = models.BooleanField(
        default=True,
        help_text="Create custom roles"
    )
    sso_integration = models.BooleanField(
        default=False,
        help_text="SSO/SAML integration"
    )
    custom_branding = models.BooleanField(
        default=False,
        help_text="Custom branding and white-labeling"
    )
    priority_support = models.BooleanField(
        default=False,
        help_text="Priority customer support"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization_feature_flags'
        verbose_name = 'Organization Feature Flags'
        verbose_name_plural = 'Organization Feature Flags'

    def __str__(self):
        return f"Features for {self.organization.name}"

    @classmethod
    def get_plan_features(cls, plan):
        """
        Return feature configuration based on subscription plan.
        """
        PLAN_FEATURES = {
            'free': {
                'advanced_search': True,
                'ocr_processing': False,
                'version_control': True,
                'folder_templates': False,
                'external_sharing': False,
                'real_time_collaboration': False,
                'comments_annotations': True,
                'advanced_audit': False,
                'retention_policies': False,
                'legal_hold': False,
                'compliance_reports': False,
                'data_classification': False,
                'basic_workflows': False,
                'advanced_workflows': False,
                'scheduled_tasks': False,
                'api_access': False,
                'webhooks': False,
                'basic_analytics': True,
                'advanced_analytics': False,
                'custom_reports': False,
                'export_reports': False,
                'custom_roles': False,
                'sso_integration': False,
                'custom_branding': False,
                'priority_support': False,
            },
            'starter': {
                'advanced_search': True,
                'ocr_processing': True,
                'version_control': True,
                'folder_templates': True,
                'external_sharing': False,
                'real_time_collaboration': False,
                'comments_annotations': True,
                'advanced_audit': False,
                'retention_policies': True,
                'legal_hold': False,
                'compliance_reports': False,
                'data_classification': True,
                'basic_workflows': True,
                'advanced_workflows': False,
                'scheduled_tasks': False,
                'api_access': False,
                'webhooks': False,
                'basic_analytics': True,
                'advanced_analytics': False,
                'custom_reports': False,
                'export_reports': True,
                'custom_roles': True,
                'sso_integration': False,
                'custom_branding': False,
                'priority_support': False,
            },
            'professional': {
                'advanced_search': True,
                'ocr_processing': True,
                'version_control': True,
                'folder_templates': True,
                'external_sharing': True,
                'real_time_collaboration': True,
                'comments_annotations': True,
                'advanced_audit': True,
                'retention_policies': True,
                'legal_hold': True,
                'compliance_reports': True,
                'data_classification': True,
                'basic_workflows': True,
                'advanced_workflows': True,
                'scheduled_tasks': True,
                'api_access': True,
                'webhooks': False,
                'basic_analytics': True,
                'advanced_analytics': True,
                'custom_reports': True,
                'export_reports': True,
                'custom_roles': True,
                'sso_integration': False,
                'custom_branding': True,
                'priority_support': False,
            },
            'enterprise': {
                'advanced_search': True,
                'ocr_processing': True,
                'version_control': True,
                'folder_templates': True,
                'external_sharing': True,
                'real_time_collaboration': True,
                'comments_annotations': True,
                'advanced_audit': True,
                'retention_policies': True,
                'legal_hold': True,
                'compliance_reports': True,
                'data_classification': True,
                'basic_workflows': True,
                'advanced_workflows': True,
                'scheduled_tasks': True,
                'api_access': True,
                'webhooks': True,
                'basic_analytics': True,
                'advanced_analytics': True,
                'custom_reports': True,
                'export_reports': True,
                'custom_roles': True,
                'sso_integration': True,
                'custom_branding': True,
                'priority_support': True,
            },
        }
        return PLAN_FEATURES.get(plan, PLAN_FEATURES['free'])
