"""
Serializers for classification models.
"""
from rest_framework import serializers
from apps.classification.models import ClassificationRule, ClassificationLog
from apps.users.serializers import UserBasicSerializer


class ClassificationRuleSerializer(serializers.ModelSerializer):
    """
    Serializer for ClassificationRule model.
    """
    created_by_details = UserBasicSerializer(source='created_by', read_only=True)
    updated_by_details = UserBasicSerializer(source='updated_by', read_only=True)

    class Meta:
        model = ClassificationRule
        fields = [
            'id',
            'name',
            'description',
            'priority',
            'is_active',
            'conditions',
            'actions',
            'applied_count',
            'last_applied_at',
            'created_at',
            'created_by',
            'created_by_details',
            'updated_at',
            'updated_by',
            'updated_by_details',
        ]
        read_only_fields = ['id', 'applied_count', 'last_applied_at', 'created_at', 'updated_at']

    def validate_conditions(self, value):
        """Validate conditions structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Conditions must be a dictionary")

        valid_keys = {
            'filename_contains', 'content_contains', 'file_type',
            'document_type', 'min_file_size_mb', 'max_file_size_mb',
            'department_id'
        }

        invalid_keys = set(value.keys()) - valid_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid condition keys: {invalid_keys}. Valid keys: {valid_keys}"
            )

        return value

    def validate_actions(self, value):
        """Validate actions structure."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Actions must be a dictionary")

        valid_keys = {
            'move_to_folder', 'set_document_type', 'add_tags',
            'set_confidentiality', 'assign_to_department'
        }

        invalid_keys = set(value.keys()) - valid_keys
        if invalid_keys:
            raise serializers.ValidationError(
                f"Invalid action keys: {invalid_keys}. Valid keys: {valid_keys}"
            )

        if not value:
            raise serializers.ValidationError("At least one action must be specified")

        return value

    def create(self, validated_data):
        """Set created_by from request user."""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Set updated_by from request user."""
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class ClassificationRuleListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for listing classification rules.
    """
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ClassificationRule
        fields = [
            'id',
            'name',
            'description',
            'priority',
            'is_active',
            'applied_count',
            'last_applied_at',
            'created_at',
            'created_by_name',
        ]


class ClassificationLogSerializer(serializers.ModelSerializer):
    """
    Serializer for ClassificationLog model.
    """
    rule_name = serializers.CharField(source='rule.name', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    document_file_name = serializers.CharField(source='document.file_name', read_only=True)

    class Meta:
        model = ClassificationLog
        fields = [
            'id',
            'rule',
            'rule_name',
            'document',
            'document_title',
            'document_file_name',
            'applied_at',
            'conditions_matched',
            'actions_applied',
            'success',
            'error_message',
            'triggered_by',
        ]
        read_only_fields = ['id', 'applied_at']
