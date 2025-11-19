"""
DRF serializers for retention policies and legal holds.

Serializers:
- RetentionPolicySerializer: CRUD for retention policies
- LegalHoldSerializer: CRUD for legal holds
- LegalHoldDocumentSerializer: Add/remove documents from legal holds
- RetentionScheduleSerializer: View retention schedules
"""

from rest_framework import serializers
from apps.retention.models import (
    RetentionPolicy,
    LegalHold,
    LegalHoldDocument,
    RetentionSchedule
)
from apps.documents.models import Document


class RetentionPolicySerializer(serializers.ModelSerializer):
    """Serializer for retention policies"""

    created_by_name = serializers.SerializerMethodField()
    applied_document_count = serializers.SerializerMethodField()

    class Meta:
        model = RetentionPolicy
        fields = [
            'id',
            'name',
            'description',
            'policy_type',
            'retention_days',
            'criteria',
            'grace_period_days',
            'notify_before_days',
            'is_active',
            'priority',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
            'applied_document_count',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        """Get creator's full name"""
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None

    def get_applied_document_count(self, obj):
        """Get count of documents with this policy applied"""
        return obj.schedules.count()

    def validate_retention_days(self, value):
        """Validate retention days is positive"""
        if value <= 0:
            raise serializers.ValidationError("Retention days must be positive")
        return value

    def validate_criteria(self, value):
        """Validate criteria JSON structure"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Criteria must be a JSON object")

        # Validate allowed criteria keys
        allowed_keys = [
            'document_type',
            'department_id',
            'folder_id',
            'tags',
            'confidentiality_level'
        ]

        for key in value.keys():
            if key not in allowed_keys:
                raise serializers.ValidationError(
                    f"Invalid criteria key: {key}. Allowed: {allowed_keys}"
                )

        return value


class LegalHoldDocumentSerializer(serializers.ModelSerializer):
    """Serializer for documents under legal hold"""

    document_title = serializers.CharField(source='document.title', read_only=True)
    document_type = serializers.CharField(source='document.document_type', read_only=True)
    added_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LegalHoldDocument
        fields = [
            'id',
            'legal_hold',
            'document',
            'document_title',
            'document_type',
            'added_by',
            'added_by_name',
            'added_at',
            'reason',
        ]
        read_only_fields = ['id', 'added_by', 'added_at']

    def get_added_by_name(self, obj):
        """Get user who added document to hold"""
        if obj.added_by:
            return obj.added_by.get_full_name() or obj.added_by.username
        return None


class LegalHoldSerializer(serializers.ModelSerializer):
    """Serializer for legal holds"""

    placed_by_name = serializers.SerializerMethodField()
    released_by_name = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    held_documents = LegalHoldDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = LegalHold
        fields = [
            'id',
            'case_number',
            'case_name',
            'description',
            'is_active',
            'placed_by',
            'placed_by_name',
            'placed_at',
            'released_by',
            'released_by_name',
            'released_at',
            'notes',
            'document_count',
            'held_documents',
        ]
        read_only_fields = [
            'id',
            'placed_by',
            'placed_at',
            'released_by',
            'released_at',
        ]

    def get_placed_by_name(self, obj):
        """Get user who placed the hold"""
        if obj.placed_by:
            return obj.placed_by.get_full_name() or obj.placed_by.username
        return None

    def get_released_by_name(self, obj):
        """Get user who released the hold"""
        if obj.released_by:
            return obj.released_by.get_full_name() or obj.released_by.username
        return None

    def get_document_count(self, obj):
        """Get count of documents under this hold"""
        return obj.documents.count()

    def validate_case_number(self, value):
        """Validate case number is unique"""
        if self.instance is None:  # Creating new
            if LegalHold.objects.filter(case_number=value).exists():
                raise serializers.ValidationError(
                    "Legal hold with this case number already exists"
                )
        return value


class RetentionScheduleSerializer(serializers.ModelSerializer):
    """Serializer for retention schedules (read-only)"""

    document_title = serializers.CharField(source='document.title', read_only=True)
    document_type = serializers.CharField(source='document.document_type', read_only=True)
    policy_name = serializers.CharField(source='policy.name', read_only=True)
    can_delete = serializers.SerializerMethodField()
    days_until_deletion = serializers.SerializerMethodField()

    class Meta:
        model = RetentionSchedule
        fields = [
            'id',
            'document',
            'document_title',
            'document_type',
            'policy',
            'policy_name',
            'retention_end_date',
            'notification_date',
            'deletion_date',
            'status',
            'notification_sent',
            'can_delete',
            'days_until_deletion',
            'created_at',
            'updated_at',
            'deleted_at',
        ]
        read_only_fields = [
            'id',
            'document',
            'document_title',
            'document_type',
            'policy',
            'policy_name',
            'retention_end_date',
            'notification_date',
            'deletion_date',
            'status',
            'notification_sent',
            'can_delete',
            'days_until_deletion',
            'created_at',
            'updated_at',
            'deleted_at',
        ]  # All fields are read-only

    def get_can_delete(self, obj):
        """Check if document can be deleted (no legal holds)"""
        return obj.can_delete()

    def get_days_until_deletion(self, obj):
        """Calculate days until deletion"""
        from django.utils import timezone
        delta = obj.deletion_date - timezone.now()
        return max(0, delta.days)


class AddDocumentsToLegalHoldSerializer(serializers.Serializer):
    """Serializer for bulk adding documents to legal hold"""

    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text="List of document UUIDs to add to legal hold"
    )
    reason = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Reason for placing these documents on hold"
    )

    def validate_document_ids(self, value):
        """Validate all document IDs exist"""
        existing_docs = Document.objects.filter(
            id__in=value,
            is_deleted=False
        ).values_list('id', flat=True)

        existing_set = set(existing_docs)
        provided_set = set(value)

        missing = provided_set - existing_set
        if missing:
            raise serializers.ValidationError(
                f"Documents not found or deleted: {list(missing)}"
            )

        return value


class RemoveDocumentsFromLegalHoldSerializer(serializers.Serializer):
    """Serializer for bulk removing documents from legal hold"""

    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        help_text="List of document UUIDs to remove from legal hold"
    )


class ReleaseLegalHoldSerializer(serializers.Serializer):
    """Serializer for releasing a legal hold"""

    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Notes about why the hold was released"
    )
