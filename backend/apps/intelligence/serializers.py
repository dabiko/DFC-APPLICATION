"""
Serializers for Document Intelligence API.
"""
from rest_framework import serializers
from .models import (
    ExtractedEntity,
    ExtractedTable,
    DocumentSummary,
    ExtractedKeyValue,
    IntelligenceJob,
    IntelligenceSettings,
)


class ExtractedEntitySerializer(serializers.ModelSerializer):
    """Serializer for extracted entities."""

    class Meta:
        model = ExtractedEntity
        fields = [
            'id', 'document', 'entity_type', 'value', 'normalized_value',
            'start_position', 'end_position', 'page_number', 'context',
            'confidence_score', 'extraction_method', 'is_verified',
            'verified_by', 'verified_at', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtractedEntityListSerializer(serializers.ModelSerializer):
    """Compact serializer for entity lists."""

    class Meta:
        model = ExtractedEntity
        fields = [
            'id', 'entity_type', 'value', 'normalized_value',
            'confidence_score', 'is_verified'
        ]


class ExtractedTableSerializer(serializers.ModelSerializer):
    """Serializer for extracted tables."""

    class Meta:
        model = ExtractedTable
        fields = [
            'id', 'document', 'table_number', 'title', 'page_number',
            'headers', 'rows', 'row_count', 'column_count', 'table_type',
            'confidence_score', 'raw_html', 'raw_markdown', 'has_merged_cells',
            'extraction_method', 'is_verified', 'verified_by', 'verified_at',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtractedTableListSerializer(serializers.ModelSerializer):
    """Compact serializer for table lists."""

    class Meta:
        model = ExtractedTable
        fields = [
            'id', 'table_number', 'title', 'page_number',
            'row_count', 'column_count', 'table_type', 'confidence_score'
        ]


class DocumentSummarySerializer(serializers.ModelSerializer):
    """Serializer for document summaries."""

    class Meta:
        model = DocumentSummary
        fields = [
            'id', 'document', 'summary_type', 'summary_text', 'key_points',
            'topics', 'sentiment', 'sentiment_score', 'model_used',
            'word_count', 'compression_ratio', 'coherence_score',
            'relevance_score', 'user_rating', 'user_feedback', 'rated_by',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtractedKeyValueSerializer(serializers.ModelSerializer):
    """Serializer for extracted key-value pairs."""

    class Meta:
        model = ExtractedKeyValue
        fields = [
            'id', 'document', 'key', 'value', 'normalized_key',
            'normalized_value', 'value_type', 'page_number', 'confidence_score',
            'group_name', 'group_order', 'is_verified', 'verified_by',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ExtractedKeyValueListSerializer(serializers.ModelSerializer):
    """Compact serializer for key-value lists."""

    class Meta:
        model = ExtractedKeyValue
        fields = [
            'id', 'key', 'value', 'normalized_key', 'value_type',
            'confidence_score', 'is_verified'
        ]


class IntelligenceJobSerializer(serializers.ModelSerializer):
    """Serializer for intelligence processing jobs."""
    created_by_name = serializers.CharField(
        source='created_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = IntelligenceJob
        fields = [
            'id', 'document', 'job_type', 'status', 'progress_percent',
            'current_task', 'entities_found', 'tables_found', 'key_values_found',
            'summaries_generated', 'error_message', 'started_at', 'completed_at',
            'duration_seconds', 'config', 'created_by', 'created_by_name',
            'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'progress_percent', 'current_task',
            'entities_found', 'tables_found', 'key_values_found',
            'summaries_generated', 'error_message', 'started_at',
            'completed_at', 'duration_seconds', 'created_at'
        ]


class IntelligenceSettingsSerializer(serializers.ModelSerializer):
    """Serializer for intelligence settings."""

    class Meta:
        model = IntelligenceSettings
        fields = [
            'enable_entity_extraction', 'entity_confidence_threshold',
            'entity_types_enabled', 'enable_table_extraction',
            'table_extraction_method', 'enable_summarization',
            'default_summary_type', 'max_summary_length',
            'enable_key_value_extraction', 'key_value_templates',
            'auto_process_on_upload', 'process_document_types',
            'max_file_size_mb', 'max_pages', 'batch_size', 'timeout_seconds',
            'updated_at', 'updated_by'
        ]
        read_only_fields = ['updated_at']


# =============================================================================
# Request/Response Serializers
# =============================================================================

class ProcessDocumentRequestSerializer(serializers.Serializer):
    """Request serializer for processing a document."""
    document_id = serializers.UUIDField()
    job_type = serializers.ChoiceField(
        choices=IntelligenceJob.JobType.choices,
        default=IntelligenceJob.JobType.FULL
    )
    config = serializers.JSONField(required=False, default=dict)


class BatchProcessRequestSerializer(serializers.Serializer):
    """Request serializer for batch processing documents."""
    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    job_type = serializers.ChoiceField(
        choices=IntelligenceJob.JobType.choices,
        default=IntelligenceJob.JobType.FULL
    )
    config = serializers.JSONField(required=False, default=dict)


class VerifyEntityRequestSerializer(serializers.Serializer):
    """Request serializer for verifying an entity."""
    corrected_value = serializers.CharField(required=False, allow_blank=True)


class RateSummaryRequestSerializer(serializers.Serializer):
    """Request serializer for rating a summary."""
    rating = serializers.IntegerField(min_value=1, max_value=5)
    feedback = serializers.CharField(required=False, allow_blank=True)


class DocumentIntelligenceResponseSerializer(serializers.Serializer):
    """Response serializer for full document intelligence."""
    document_id = serializers.UUIDField()
    entities = ExtractedEntityListSerializer(many=True)
    tables = ExtractedTableListSerializer(many=True)
    key_values = ExtractedKeyValueListSerializer(many=True)
    summary = DocumentSummarySerializer(allow_null=True)
    processing_job = IntelligenceJobSerializer(allow_null=True)


class IntelligenceStatsSerializer(serializers.Serializer):
    """Serializer for intelligence statistics."""
    total_documents_processed = serializers.IntegerField()
    total_entities_extracted = serializers.IntegerField()
    total_tables_extracted = serializers.IntegerField()
    total_summaries_generated = serializers.IntegerField()
    entities_by_type = serializers.DictField(child=serializers.IntegerField())
    average_confidence = serializers.FloatField()
    jobs_pending = serializers.IntegerField()
    jobs_processing = serializers.IntegerField()
    jobs_completed_today = serializers.IntegerField()
    jobs_failed_today = serializers.IntegerField()
