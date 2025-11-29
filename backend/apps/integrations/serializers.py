"""
Integrations Serializers.

Serializers for API keys, webhooks, and third-party integrations.
"""

from rest_framework import serializers
from .models import APIKey, Webhook, Integration, IntegrationLog


class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys (excludes sensitive data)."""

    created_by_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = APIKey
        fields = [
            'id', 'name', 'key_prefix', 'scope', 'allowed_ips', 'rate_limit',
            'is_active', 'expires_at', 'last_used_at', 'last_used_ip',
            'total_requests', 'is_expired', 'is_valid', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'key_prefix', 'last_used_at', 'last_used_ip',
            'total_requests', 'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None


class APIKeyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating API keys (returns the raw key once)."""

    raw_key = serializers.CharField(read_only=True)

    class Meta:
        model = APIKey
        fields = [
            'id', 'name', 'scope', 'allowed_ips', 'rate_limit',
            'expires_at', 'raw_key', 'key_prefix', 'created_at'
        ]
        read_only_fields = ['id', 'key_prefix', 'raw_key', 'created_at']

    def create(self, validated_data):
        # Generate the key
        raw_key, key_prefix, key_hash = APIKey.generate_key()

        # Create the API key
        api_key = APIKey.objects.create(
            organization=validated_data['organization'],
            created_by=validated_data.get('created_by'),
            name=validated_data['name'],
            key_prefix=key_prefix,
            key_hash=key_hash,
            scope=validated_data.get('scope', 'read'),
            allowed_ips=validated_data.get('allowed_ips', []),
            rate_limit=validated_data.get('rate_limit', 1000),
            expires_at=validated_data.get('expires_at'),
        )

        # Attach raw key for one-time display
        api_key.raw_key = raw_key
        return api_key


class WebhookSerializer(serializers.ModelSerializer):
    """Serializer for webhooks."""

    created_by_name = serializers.SerializerMethodField()
    success_rate = serializers.SerializerMethodField()
    event_types = serializers.SerializerMethodField()

    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'url', 'subscribed_events', 'is_active', 'is_verified',
            'max_retries', 'timeout_seconds', 'total_deliveries', 'successful_deliveries',
            'failed_deliveries', 'last_delivery_at', 'last_failure_at', 'last_failure_reason',
            'consecutive_failures', 'auto_disabled', 'auto_disabled_at',
            'success_rate', 'event_types', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_verified', 'total_deliveries', 'successful_deliveries',
            'failed_deliveries', 'last_delivery_at', 'last_failure_at', 'last_failure_reason',
            'consecutive_failures', 'auto_disabled', 'auto_disabled_at',
            'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.email
        return None

    def get_success_rate(self, obj):
        if obj.total_deliveries == 0:
            return 100.0
        return round((obj.successful_deliveries / obj.total_deliveries) * 100, 1)

    def get_event_types(self, obj):
        """Return event type choices for the frontend."""
        return [{'value': k, 'label': v} for k, v in Webhook.EVENT_TYPES]


class WebhookCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating webhooks."""

    secret = serializers.CharField(read_only=True)

    class Meta:
        model = Webhook
        fields = [
            'id', 'name', 'url', 'subscribed_events', 'max_retries',
            'timeout_seconds', 'secret', 'created_at'
        ]
        read_only_fields = ['id', 'secret', 'created_at']

    def validate_url(self, value):
        if not value.startswith('https://'):
            raise serializers.ValidationError("Webhook URL must use HTTPS")
        return value

    def validate_subscribed_events(self, value):
        valid_events = [e[0] for e in Webhook.EVENT_TYPES]
        for event in value:
            if event not in valid_events:
                raise serializers.ValidationError(f"Invalid event type: {event}")
        return value

    def create(self, validated_data):
        # Generate secret
        secret = Webhook.generate_secret()

        webhook = Webhook.objects.create(
            organization=validated_data['organization'],
            created_by=validated_data.get('created_by'),
            name=validated_data['name'],
            url=validated_data['url'],
            secret=secret,
            subscribed_events=validated_data.get('subscribed_events', []),
            max_retries=validated_data.get('max_retries', 3),
            timeout_seconds=validated_data.get('timeout_seconds', 30),
        )

        return webhook


class IntegrationSerializer(serializers.ModelSerializer):
    """Serializer for third-party integrations."""

    configured_by_name = serializers.SerializerMethodField()
    integration_type_display = serializers.CharField(
        source='get_integration_type_display',
        read_only=True
    )
    status_display = serializers.CharField(
        source='get_status_display',
        read_only=True
    )
    available_types = serializers.SerializerMethodField()

    class Meta:
        model = Integration
        fields = [
            'id', 'integration_type', 'integration_type_display', 'name', 'description',
            'config', 'status', 'status_display', 'status_message',
            'last_sync_at', 'last_error_at', 'available_types',
            'configured_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'status_message', 'last_sync_at',
            'last_error_at', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'config': {'write_only': False},
        }

    def get_configured_by_name(self, obj):
        if obj.configured_by:
            return f"{obj.configured_by.first_name} {obj.configured_by.last_name}".strip() or obj.configured_by.email
        return None

    def get_available_types(self, obj):
        """Return available integration types for the frontend."""
        return [{'value': k, 'label': v} for k, v in Integration.INTEGRATION_TYPES]


class IntegrationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating integrations."""

    class Meta:
        model = Integration
        fields = [
            'id', 'integration_type', 'name', 'description',
            'config', 'credentials', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'credentials': {'write_only': True},
        }


class IntegrationLogSerializer(serializers.ModelSerializer):
    """Serializer for integration logs."""

    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = IntegrationLog
        fields = [
            'id', 'action', 'action_display', 'status', 'endpoint', 'method',
            'status_code', 'duration_ms', 'error_message', 'ip_address',
            'created_at'
        ]
        read_only_fields = fields


class WebhookTestSerializer(serializers.Serializer):
    """Serializer for testing webhook endpoints."""

    event_type = serializers.ChoiceField(choices=Webhook.EVENT_TYPES)


class IntegrationTestSerializer(serializers.Serializer):
    """Serializer for testing integration connections."""

    test_connection = serializers.BooleanField(default=True)
