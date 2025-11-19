"""
Serializers for Audit Log API.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.audit.models import AuditLog

User = get_user_model()


class UserBriefSerializer(serializers.ModelSerializer):
    """Brief user serializer for audit logs."""

    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name']
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    """
    Serializer for AuditLog model.

    Includes user details and formatted timestamps.
    """

    user_details = UserBriefSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    resource_type_display = serializers.CharField(source='get_resource_type_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_details',
            'action',
            'action_display',
            'resource_type',
            'resource_type_display',
            'resource_id',
            'resource_name',
            'timestamp',
            'ip_address',
            'user_agent',
            'outcome',
            'outcome_display',
            'error_message',
            'before_value',
            'after_value',
            'changed_fields',
            'metadata',
        ]
        read_only_fields = fields


class AuditLogListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing audit logs.

    Excludes heavy fields like before_value, after_value for performance.
    """

    user_details = UserBriefSerializer(source='user', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    resource_type_display = serializers.CharField(source='get_resource_type_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'user',
            'user_details',
            'action',
            'action_display',
            'resource_type',
            'resource_type_display',
            'resource_id',
            'resource_name',
            'timestamp',
            'ip_address',
            'outcome',
            'changed_fields',
        ]
        read_only_fields = fields


class AuditLogChangeSerializer(serializers.Serializer):
    """
    Serializer for representing changes in audit logs.

    Used for detailed change views showing before/after comparison.
    """

    field_name = serializers.CharField()
    before_value = serializers.JSONField()
    after_value = serializers.JSONField()
    display_name = serializers.CharField(required=False)

    class Meta:
        fields = ['field_name', 'before_value', 'after_value', 'display_name']


class AuditLogStatsSerializer(serializers.Serializer):
    """
    Serializer for audit log statistics.
    """

    total_actions = serializers.IntegerField()
    actions_by_type = serializers.DictField(child=serializers.IntegerField())
    actions_by_user = serializers.DictField(child=serializers.IntegerField())
    actions_by_resource_type = serializers.DictField(child=serializers.IntegerField())
    recent_actions = AuditLogListSerializer(many=True, read_only=True)
    success_rate = serializers.FloatField()
    date_range = serializers.DictField()

    class Meta:
        fields = [
            'total_actions',
            'actions_by_type',
            'actions_by_user',
            'actions_by_resource_type',
            'recent_actions',
            'success_rate',
            'date_range',
        ]


class ComplianceReportSerializer(serializers.Serializer):
    """
    Serializer for compliance reports.
    """

    report_type = serializers.ChoiceField(choices=[
        ('access', 'Access Report'),
        ('changes', 'Change History'),
        ('user_activity', 'User Activity'),
        ('retention_compliance', 'Retention Compliance'),
    ])
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    total_entries = serializers.IntegerField()
    entries = AuditLogSerializer(many=True, read_only=True)
    summary = serializers.DictField()

    class Meta:
        fields = [
            'report_type',
            'start_date',
            'end_date',
            'total_entries',
            'entries',
            'summary',
        ]
