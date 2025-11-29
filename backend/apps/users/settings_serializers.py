"""
Serializers for User Settings and Preferences.

Provides serializers for:
- Profile settings (personal information)
- Preferences (display, language, behavior)
- Notification settings
- Security settings
"""

from rest_framework import serializers
from apps.users.models import CustomUser, Department
from apps.users.settings_models import (
    UserPreferences,
    NotificationSettings,
    SecuritySettings,
)


class ProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for user profile information.

    Allows users to update their personal information:
    - Name, email, phone
    - Job title
    - Address
    - Avatar
    """
    department_name = serializers.CharField(source='department.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            # Read-only identity fields
            'id', 'username', 'employee_id', 'email',
            'organization', 'organization_name',
            'department', 'department_name',
            'date_joined', 'last_login',
            # Editable profile fields
            'first_name', 'last_name', 'full_name',
            'phone_number', 'job_title', 'avatar',
            # Address fields
            'address_line1', 'address_line2',
            'city', 'state', 'postal_code', 'country',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'username', 'employee_id', 'email',
            'organization', 'organization_name',
            'department', 'department_name',
            'date_joined', 'last_login',
            'created_at', 'updated_at', 'full_name',
        ]

    def update(self, instance, validated_data):
        """Update profile fields"""
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AvatarUploadSerializer(serializers.ModelSerializer):
    """Serializer for avatar upload"""

    class Meta:
        model = CustomUser
        fields = ['avatar']

    def validate_avatar(self, value):
        """Validate avatar file"""
        if value:
            # Check file size (max 5MB)
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Avatar image must be less than 5MB"
                )
            # Check file type
            allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Avatar must be a JPEG, PNG, GIF, or WebP image"
                )
        return value


class UserPreferencesSerializer(serializers.ModelSerializer):
    """
    Serializer for user preferences.

    Includes:
    - Display settings (theme, density)
    - Language and locale
    - Document view preferences
    - Navigation preferences
    - Accessibility settings
    """

    class Meta:
        model = UserPreferences
        fields = [
            # Display Settings
            'theme', 'display_density',
            # Language and Locale
            'language', 'timezone', 'date_format', 'time_format',
            # Document View
            'default_document_view', 'items_per_page',
            'show_file_extensions', 'show_thumbnails',
            # Navigation
            'start_page', 'sidebar_collapsed',
            'show_recent_items', 'recent_items_count',
            # Keyboard & Accessibility
            'enable_keyboard_shortcuts',
            'enable_animations', 'high_contrast_mode',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']


class NotificationSettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for notification settings.

    Controls:
    - Email notifications
    - In-app notifications
    - Desktop notifications
    - Quiet hours
    """

    class Meta:
        model = NotificationSettings
        fields = [
            # Email Notifications
            'email_enabled',
            'email_document_shared',
            'email_workflow_assigned',
            'email_workflow_completed',
            'email_retention_reminder',
            'email_weekly_digest',
            'email_security_alerts',
            # In-App Notifications
            'in_app_enabled',
            'in_app_document_shared',
            'in_app_workflow_updates',
            'in_app_mentions',
            'in_app_system_updates',
            # Desktop Notifications
            'desktop_enabled',
            # Quiet Hours
            'quiet_hours_enabled',
            'quiet_hours_start',
            'quiet_hours_end',
            # Sound
            'notification_sound',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, attrs):
        """Validate quiet hours settings"""
        if attrs.get('quiet_hours_enabled'):
            if not attrs.get('quiet_hours_start') or not attrs.get('quiet_hours_end'):
                raise serializers.ValidationError({
                    'quiet_hours_start': 'Start time is required when quiet hours are enabled',
                    'quiet_hours_end': 'End time is required when quiet hours are enabled',
                })
        return attrs


class SecuritySettingsSerializer(serializers.ModelSerializer):
    """
    Serializer for security settings.

    Controls:
    - Session timeout
    - MFA requirements
    - Login notifications
    - IP whitelist
    - API access
    """
    ip_whitelist_list = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        write_only=True
    )
    ip_whitelist_display = serializers.SerializerMethodField()

    class Meta:
        model = SecuritySettings
        fields = [
            # Session
            'session_timeout',
            'require_mfa_for_sensitive',
            # Login Security
            'login_notification_email',
            'login_notification_new_device',
            'login_notification_new_location',
            # IP Whitelist
            'ip_whitelist_list',
            'ip_whitelist_display',
            # API Access
            'api_access_enabled',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_ip_whitelist_display(self, obj):
        """Return IP whitelist as list"""
        return obj.get_ip_whitelist()

    def update(self, instance, validated_data):
        """Handle IP whitelist separately"""
        ip_list = validated_data.pop('ip_whitelist_list', None)
        if ip_list is not None:
            instance.set_ip_whitelist(ip_list)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class AllSettingsSerializer(serializers.Serializer):
    """
    Combined serializer for all user settings.

    Returns profile, preferences, notifications, and security
    in a single response for efficient loading.
    """
    profile = ProfileSerializer()
    preferences = UserPreferencesSerializer()
    notifications = NotificationSettingsSerializer()
    security = SecuritySettingsSerializer()


class QuickPreferencesSerializer(serializers.Serializer):
    """
    Serializer for quick preference updates.

    Allows updating individual preferences without loading
    the full settings page.
    """
    theme = serializers.ChoiceField(
        choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')],
        required=False
    )
    sidebar_collapsed = serializers.BooleanField(required=False)
    default_document_view = serializers.ChoiceField(
        choices=[('grid', 'Grid'), ('list', 'List')],
        required=False
    )

    def update(self, instance, validated_data):
        """Update only provided preferences"""
        preferences, _ = UserPreferences.objects.get_or_create(user=instance)

        for attr, value in validated_data.items():
            setattr(preferences, attr, value)
        preferences.save()
        return preferences
