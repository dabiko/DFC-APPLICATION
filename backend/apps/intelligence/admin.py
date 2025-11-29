"""
Admin configuration for Document Intelligence app.
"""
from django.contrib import admin
from .models import (
    ExtractedEntity,
    ExtractedTable,
    DocumentSummary,
    ExtractedKeyValue,
    IntelligenceJob,
    IntelligenceSettings,
)


@admin.register(ExtractedEntity)
class ExtractedEntityAdmin(admin.ModelAdmin):
    list_display = [
        'entity_type', 'value', 'document', 'confidence_score',
        'is_verified', 'created_at'
    ]
    list_filter = ['entity_type', 'is_verified', 'extraction_method', 'created_at']
    search_fields = ['value', 'normalized_value', 'document__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(ExtractedTable)
class ExtractedTableAdmin(admin.ModelAdmin):
    list_display = [
        'table_number', 'title', 'document', 'row_count', 'column_count',
        'table_type', 'confidence_score', 'created_at'
    ]
    list_filter = ['table_type', 'is_verified', 'created_at']
    search_fields = ['title', 'document__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['document', 'table_number']


@admin.register(DocumentSummary)
class DocumentSummaryAdmin(admin.ModelAdmin):
    list_display = [
        'document', 'summary_type', 'word_count', 'sentiment',
        'user_rating', 'created_at'
    ]
    list_filter = ['summary_type', 'sentiment', 'created_at']
    search_fields = ['document__title', 'summary_text']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(ExtractedKeyValue)
class ExtractedKeyValueAdmin(admin.ModelAdmin):
    list_display = [
        'key', 'value', 'document', 'value_type', 'confidence_score',
        'is_verified', 'created_at'
    ]
    list_filter = ['value_type', 'is_verified', 'created_at']
    search_fields = ['key', 'value', 'document__title']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(IntelligenceJob)
class IntelligenceJobAdmin(admin.ModelAdmin):
    list_display = [
        'document', 'job_type', 'status', 'progress_percent',
        'entities_found', 'tables_found', 'duration_seconds', 'created_at'
    ]
    list_filter = ['job_type', 'status', 'created_at']
    search_fields = ['document__title']
    readonly_fields = [
        'started_at', 'completed_at', 'duration_seconds',
        'entities_found', 'tables_found', 'key_values_found',
        'summaries_generated', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']

    actions = ['cancel_jobs']

    def cancel_jobs(self, request, queryset):
        """Cancel selected pending/processing jobs."""
        updated = queryset.filter(
            status__in=['PENDING', 'PROCESSING']
        ).update(status='CANCELLED')
        self.message_user(request, f'{updated} jobs cancelled.')
    cancel_jobs.short_description = 'Cancel selected jobs'


@admin.register(IntelligenceSettings)
class IntelligenceSettingsAdmin(admin.ModelAdmin):
    list_display = [
        'enable_entity_extraction', 'enable_table_extraction',
        'enable_summarization', 'auto_process_on_upload', 'updated_at'
    ]
    readonly_fields = ['updated_at']

    def has_add_permission(self, request):
        # Singleton - prevent adding more instances
        return not IntelligenceSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        # Prevent deletion
        return False
