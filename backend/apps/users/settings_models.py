"""
User Settings and Preferences Models.

This module contains models for managing user preferences and settings,
supporting a multi-tier settings hierarchy:
- Personal (User-level)
- Workspace (Team/Department-level)
- Organization (Tenant-level)
- System (Global defaults)
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
import json


class UserPreferences(models.Model):
    """
    Personal settings for each user.

    Stores user-specific preferences for:
    - Theme and display settings
    - Language and locale
    - Notification preferences
    - Default behaviors
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preferences',
        primary_key=True
    )

    # Display Settings
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    ]
    theme = models.CharField(
        max_length=20,
        choices=THEME_CHOICES,
        default='system',
        help_text='UI theme preference'
    )

    DENSITY_CHOICES = [
        ('comfortable', 'Comfortable'),
        ('compact', 'Compact'),
    ]
    display_density = models.CharField(
        max_length=20,
        choices=DENSITY_CHOICES,
        default='comfortable',
        help_text='UI density preference'
    )

    # Language and Locale
    LANGUAGE_CHOICES = [
        ('en', 'English'),
        ('fr', 'French'),
        ('es', 'Spanish'),
        ('de', 'German'),
        ('pt', 'Portuguese'),
        ('zh', 'Chinese'),
        ('ja', 'Japanese'),
    ]
    language = models.CharField(
        max_length=10,
        choices=LANGUAGE_CHOICES,
        default='en',
        help_text='Preferred language'
    )

    TIMEZONE_CHOICES = [
        ('UTC', 'UTC'),
        ('America/New_York', 'Eastern Time (US)'),
        ('America/Chicago', 'Central Time (US)'),
        ('America/Denver', 'Mountain Time (US)'),
        ('America/Los_Angeles', 'Pacific Time (US)'),
        ('Europe/London', 'London'),
        ('Europe/Paris', 'Paris'),
        ('Europe/Berlin', 'Berlin'),
        ('Asia/Tokyo', 'Tokyo'),
        ('Asia/Shanghai', 'Shanghai'),
        ('Asia/Singapore', 'Singapore'),
        ('Australia/Sydney', 'Sydney'),
    ]
    timezone = models.CharField(
        max_length=50,
        choices=TIMEZONE_CHOICES,
        default='UTC',
        help_text='Preferred timezone'
    )

    DATE_FORMAT_CHOICES = [
        ('MM/DD/YYYY', 'MM/DD/YYYY'),
        ('DD/MM/YYYY', 'DD/MM/YYYY'),
        ('YYYY-MM-DD', 'YYYY-MM-DD'),
    ]
    date_format = models.CharField(
        max_length=20,
        choices=DATE_FORMAT_CHOICES,
        default='MM/DD/YYYY',
        help_text='Preferred date format'
    )

    TIME_FORMAT_CHOICES = [
        ('12h', '12-hour'),
        ('24h', '24-hour'),
    ]
    time_format = models.CharField(
        max_length=10,
        choices=TIME_FORMAT_CHOICES,
        default='12h',
        help_text='Preferred time format'
    )

    # Document View Preferences
    DEFAULT_VIEW_CHOICES = [
        ('grid', 'Grid View'),
        ('list', 'List View'),
    ]
    default_document_view = models.CharField(
        max_length=10,
        choices=DEFAULT_VIEW_CHOICES,
        default='list',
        help_text='Default view for document lists'
    )

    items_per_page = models.IntegerField(
        default=25,
        validators=[MinValueValidator(10), MaxValueValidator(100)],
        help_text='Number of items per page (10-100)'
    )

    show_file_extensions = models.BooleanField(
        default=True,
        help_text='Show file extensions in document names'
    )

    show_thumbnails = models.BooleanField(
        default=True,
        help_text='Show document thumbnails when available'
    )

    # Navigation Preferences
    start_page = models.CharField(
        max_length=50,
        default='dashboard',
        help_text='Default page after login'
    )

    sidebar_collapsed = models.BooleanField(
        default=False,
        help_text='Remember sidebar collapsed state'
    )

    show_recent_items = models.BooleanField(
        default=True,
        help_text='Show recent items in sidebar'
    )

    recent_items_count = models.IntegerField(
        default=10,
        validators=[MinValueValidator(5), MaxValueValidator(25)],
        help_text='Number of recent items to display'
    )

    # Keyboard Shortcuts
    enable_keyboard_shortcuts = models.BooleanField(
        default=True,
        help_text='Enable keyboard shortcuts'
    )

    # Accessibility
    enable_animations = models.BooleanField(
        default=True,
        help_text='Enable UI animations'
    )

    high_contrast_mode = models.BooleanField(
        default=False,
        help_text='Enable high contrast mode for accessibility'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_preferences'
        verbose_name = 'User Preferences'
        verbose_name_plural = 'User Preferences'

    def __str__(self):
        return f"Preferences for {self.user.username}"


class NotificationSettings(models.Model):
    """
    User notification preferences.

    Controls how and when the user receives notifications:
    - Email notifications
    - In-app notifications
    - Push notifications (future)
    - Quiet hours
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings',
        primary_key=True
    )

    # Email Notifications
    email_enabled = models.BooleanField(
        default=True,
        help_text='Enable email notifications'
    )

    email_document_shared = models.BooleanField(
        default=True,
        help_text='Email when document is shared with you'
    )

    email_workflow_assigned = models.BooleanField(
        default=True,
        help_text='Email when workflow task is assigned'
    )

    email_workflow_completed = models.BooleanField(
        default=True,
        help_text='Email when your workflow task is completed'
    )

    email_retention_reminder = models.BooleanField(
        default=True,
        help_text='Email reminders about document retention'
    )

    email_weekly_digest = models.BooleanField(
        default=True,
        help_text='Receive weekly activity digest'
    )

    email_security_alerts = models.BooleanField(
        default=True,
        help_text='Security-related alerts (always recommended)'
    )

    # In-App Notifications
    in_app_enabled = models.BooleanField(
        default=True,
        help_text='Enable in-app notifications'
    )

    in_app_document_shared = models.BooleanField(
        default=True,
        help_text='Notify when document is shared'
    )

    in_app_workflow_updates = models.BooleanField(
        default=True,
        help_text='Notify about workflow updates'
    )

    in_app_mentions = models.BooleanField(
        default=True,
        help_text='Notify when mentioned in comments'
    )

    in_app_system_updates = models.BooleanField(
        default=True,
        help_text='System update notifications'
    )

    # Desktop Notifications (Browser)
    desktop_enabled = models.BooleanField(
        default=False,
        help_text='Enable browser desktop notifications'
    )

    # Quiet Hours
    quiet_hours_enabled = models.BooleanField(
        default=False,
        help_text='Enable quiet hours (no notifications)'
    )

    quiet_hours_start = models.TimeField(
        null=True,
        blank=True,
        help_text='Start of quiet hours'
    )

    quiet_hours_end = models.TimeField(
        null=True,
        blank=True,
        help_text='End of quiet hours'
    )

    # Notification Sound
    notification_sound = models.BooleanField(
        default=True,
        help_text='Play sound for notifications'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notification_settings'
        verbose_name = 'Notification Settings'
        verbose_name_plural = 'Notification Settings'

    def __str__(self):
        return f"Notification settings for {self.user.username}"


class SecuritySettings(models.Model):
    """
    User security preferences beyond MFA.

    Controls security-related behaviors:
    - Session preferences
    - Login alerts
    - API access
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='security_settings',
        primary_key=True
    )

    # Session Settings
    SESSION_TIMEOUT_CHOICES = [
        (15, '15 minutes'),
        (30, '30 minutes'),
        (60, '1 hour'),
        (120, '2 hours'),
        (240, '4 hours'),
        (480, '8 hours'),
    ]
    session_timeout = models.IntegerField(
        choices=SESSION_TIMEOUT_CHOICES,
        default=60,
        help_text='Session timeout in minutes'
    )

    require_mfa_for_sensitive = models.BooleanField(
        default=True,
        help_text='Require MFA for sensitive operations'
    )

    # Login Security
    login_notification_email = models.BooleanField(
        default=True,
        help_text='Email notification on new login'
    )

    login_notification_new_device = models.BooleanField(
        default=True,
        help_text='Notify on login from new device'
    )

    login_notification_new_location = models.BooleanField(
        default=True,
        help_text='Notify on login from new location'
    )

    # Allowed IP addresses (JSON array of CIDR ranges)
    ip_whitelist = models.TextField(
        blank=True,
        default='',
        help_text='JSON array of allowed IP addresses/ranges'
    )

    # API Access
    api_access_enabled = models.BooleanField(
        default=False,
        help_text='Allow API access with personal tokens'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'security_settings'
        verbose_name = 'Security Settings'
        verbose_name_plural = 'Security Settings'

    def __str__(self):
        return f"Security settings for {self.user.username}"

    def get_ip_whitelist(self):
        """Return IP whitelist as list"""
        if not self.ip_whitelist:
            return []
        try:
            return json.loads(self.ip_whitelist)
        except json.JSONDecodeError:
            return []

    def set_ip_whitelist(self, ip_list):
        """Set IP whitelist from list"""
        self.ip_whitelist = json.dumps(ip_list)
