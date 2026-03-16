"""
URL configuration for documents app.
"""
from django.urls import path
from apps.documents.views import (
    DocumentUploadView,
    CheckDuplicateView,
    DocumentListView,
    DocumentDetailView,
    DocumentUpdateView,
    DocumentDeleteView,
    DocumentDownloadView,
    DocumentTextContentView,
    DocumentVersionCreateView,
    TagListCreateView,
    TagDetailView,
    ChunkedUploadInitiateView,
    ChunkedUploadChunkView,
    ChunkedUploadStatusView,
    StorageUsageView,
    DepartmentQuotaView,
    MetadataSchemaView,
    DocumentMetadataUpdateView,
    BulkMetadataUpdateView,
    DocumentVersionUploadView,
    DocumentVersionListView,
    DocumentVersionDetailView,
    DocumentVersionRestoreView,
    DocumentVersionCompareView,
    DocumentVersionStatsView,
    BulkMoveDocumentsView,
    BulkCopyDocumentsView,
    BulkDeleteDocumentsView,
    BulkExportDocumentsView,
    DocumentGenerateThumbnailView,
    DocumentConvertToPDFView,
    DocumentThumbnailView,
    DocumentExtractTextView,
    DocumentOCRView,
    DocumentExtractedTextView,
    # Shortcut views
    DocumentShortcutCreateView,
    DocumentShortcutListView,
    DocumentShortcutDetailView,
    DocumentShortcutDeleteView,
    DocumentShortcutLocationsView,
    DocumentCanDeleteView,
    BulkCreateShortcutsView,
    # Recent Activity views
    RecentActivityListView,
    RecentActivityDetailView,
    RecentActivityPinView,
    RecentActivityClearView,
    RecentActivityStatsView,
    AdminRecentActivityListView,
    # My Documents views
    MyDocumentsListView,
    MyDocumentsStatsView,
    # Pinned Items views (Quick Access)
    PinnedItemListView,
    PinnedItemCreateView,
    PinnedItemDetailView,
    PinnedItemReorderView,
    PinnedItemUpdateView,
    CheckPinStatusView,
    # Document State views
    DocumentStateStatsView,
    DocumentsByStateView,
    PendingReviewView,
    DocumentStateHistoryView,
    DocumentStateChangeView,
    DocumentAllowedTransitionsView,
    # Document Trash views
    DocumentTrashListView,
    DocumentRestoreView,
    DocumentPermanentDeleteView,
    DocumentEmptyTrashView,
    # Orphaned document cleanup
    DocumentOrphanedCleanupView,
    # Dashboard stats
    DocumentDashboardStatsView,
)
from apps.classification.views import ApplyClassificationManuallyView

app_name = 'documents'

urlpatterns = [
    # Document endpoints
    path('upload/', DocumentUploadView.as_view(), name='document_upload'),
    path('check-duplicates/', CheckDuplicateView.as_view(), name='check_duplicates'),
    path('', DocumentListView.as_view(), name='document_list'),
    path('<uuid:id>/', DocumentDetailView.as_view(), name='document_detail'),
    path('<uuid:id>/update/', DocumentUpdateView.as_view(), name='document_update'),
    path('<uuid:id>/delete/', DocumentDeleteView.as_view(), name='document_delete'),
    path('<uuid:id>/download/', DocumentDownloadView.as_view(), name='document_download'),
    path('<uuid:id>/text-content/', DocumentTextContentView.as_view(), name='document_text_content'),
    path('<uuid:id>/versions/', DocumentVersionCreateView.as_view(), name='document_version_create'),

    # Chunked upload endpoints
    path('chunked-upload/initiate/', ChunkedUploadInitiateView.as_view(), name='chunked_upload_initiate'),
    path('chunked-upload/<str:upload_id>/chunk/', ChunkedUploadChunkView.as_view(), name='chunked_upload_chunk'),
    path('chunked-upload/<str:upload_id>/status/', ChunkedUploadStatusView.as_view(), name='chunked_upload_status'),

    # Storage monitoring endpoints
    path('storage/usage/', StorageUsageView.as_view(), name='storage_usage'),
    path('storage/quota/<int:department_id>/', DepartmentQuotaView.as_view(), name='department_quota'),

    # Tag endpoints
    path('tags/', TagListCreateView.as_view(), name='tag_list_create'),
    path('tags/<int:pk>/', TagDetailView.as_view(), name='tag_detail'),

    # Metadata endpoints
    path('metadata/schema/', MetadataSchemaView.as_view(), name='metadata_schema'),
    path('<uuid:pk>/metadata/', DocumentMetadataUpdateView.as_view(), name='document_metadata_update'),
    path('metadata/bulk-update/', BulkMetadataUpdateView.as_view(), name='bulk_metadata_update'),

    # Document versioning endpoints
    path('<uuid:pk>/versions/upload/', DocumentVersionUploadView.as_view(), name='version_upload'),
    path('<uuid:pk>/versions/list/', DocumentVersionListView.as_view(), name='version_list'),
    path('<uuid:pk>/versions/<int:version_number>/', DocumentVersionDetailView.as_view(), name='version_detail'),
    path('<uuid:pk>/versions/restore/', DocumentVersionRestoreView.as_view(), name='version_restore'),
    path('<uuid:pk>/versions/compare/', DocumentVersionCompareView.as_view(), name='version_compare'),
    path('<uuid:pk>/versions/stats/', DocumentVersionStatsView.as_view(), name='version_stats'),

    # Bulk operations endpoints
    path('bulk-move/', BulkMoveDocumentsView.as_view(), name='bulk_move'),
    path('bulk-copy/', BulkCopyDocumentsView.as_view(), name='bulk_copy'),
    path('bulk-delete/', BulkDeleteDocumentsView.as_view(), name='bulk_delete'),
    path('bulk-export/', BulkExportDocumentsView.as_view(), name='bulk_export'),

    # Thumbnail and conversion endpoints
    path('<uuid:id>/generate-thumbnail/', DocumentGenerateThumbnailView.as_view(), name='generate_thumbnail'),
    path('<uuid:id>/convert-to-pdf/', DocumentConvertToPDFView.as_view(), name='convert_to_pdf'),
    path('<uuid:id>/thumbnail/', DocumentThumbnailView.as_view(), name='get_thumbnail'),

    # Text extraction endpoints
    path('<uuid:id>/extract-text/', DocumentExtractTextView.as_view(), name='extract_text'),
    path('<uuid:id>/ocr/', DocumentOCRView.as_view(), name='ocr_document'),
    path('<uuid:id>/extracted-text/', DocumentExtractedTextView.as_view(), name='get_extracted_text'),

    # Classification endpoint
    path('<uuid:pk>/classify/', ApplyClassificationManuallyView.as_view(), name='classify_document'),

    # Document shortcut endpoints
    path('shortcuts/', DocumentShortcutCreateView.as_view(), name='shortcut_create'),
    path('shortcuts/list/', DocumentShortcutListView.as_view(), name='shortcut_list'),
    path('shortcuts/bulk/', BulkCreateShortcutsView.as_view(), name='shortcut_bulk_create'),
    path('shortcuts/<uuid:id>/', DocumentShortcutDetailView.as_view(), name='shortcut_detail'),
    path('shortcuts/<uuid:id>/delete/', DocumentShortcutDeleteView.as_view(), name='shortcut_delete'),
    path('<uuid:id>/shortcut-locations/', DocumentShortcutLocationsView.as_view(), name='shortcut_locations'),
    path('<uuid:id>/can-delete/', DocumentCanDeleteView.as_view(), name='can_delete'),

    # Recent Activity endpoints
    path('recent/', RecentActivityListView.as_view(), name='recent_list'),
    path('recent/stats/', RecentActivityStatsView.as_view(), name='recent_stats'),
    path('recent/clear/', RecentActivityClearView.as_view(), name='recent_clear'),
    path('recent/<uuid:id>/', RecentActivityDetailView.as_view(), name='recent_detail'),
    path('recent/<uuid:id>/pin/', RecentActivityPinView.as_view(), name='recent_pin'),

    # Admin Recent Activity endpoint
    path('admin/recent/', AdminRecentActivityListView.as_view(), name='admin_recent_list'),

    # My Documents endpoints
    path('my-documents/', MyDocumentsListView.as_view(), name='my_documents_list'),
    path('my-documents/stats/', MyDocumentsStatsView.as_view(), name='my_documents_stats'),

    # Pinned Items endpoints (Quick Access)
    path('pinned/', PinnedItemListView.as_view(), name='pinned_list'),
    path('pinned/create/', PinnedItemCreateView.as_view(), name='pinned_create'),
    path('pinned/reorder/', PinnedItemReorderView.as_view(), name='pinned_reorder'),
    path('pinned/check/', CheckPinStatusView.as_view(), name='pinned_check'),
    path('pinned/<uuid:id>/', PinnedItemDetailView.as_view(), name='pinned_detail'),
    path('pinned/<uuid:id>/update/', PinnedItemUpdateView.as_view(), name='pinned_update'),

    # Document State endpoints
    path('states/stats/', DocumentStateStatsView.as_view(), name='state_stats'),
    path('states/my-documents/', DocumentsByStateView.as_view(), name='documents_by_state'),
    path('states/pending-review/', PendingReviewView.as_view(), name='pending_review'),
    path('<uuid:id>/state-history/', DocumentStateHistoryView.as_view(), name='state_history'),
    path('<uuid:id>/change-state/', DocumentStateChangeView.as_view(), name='change_state'),
    path('<uuid:id>/allowed-transitions/', DocumentAllowedTransitionsView.as_view(), name='allowed_transitions'),

    # Document Trash endpoints
    path('trash/', DocumentTrashListView.as_view(), name='document_trash_list'),
    path('trash/empty/', DocumentEmptyTrashView.as_view(), name='document_empty_trash'),
    path('trash/<uuid:id>/restore/', DocumentRestoreView.as_view(), name='document_restore'),
    path('trash/<uuid:id>/delete/', DocumentPermanentDeleteView.as_view(), name='document_permanent_delete'),

    # Orphaned document cleanup endpoint
    path('<uuid:id>/cleanup-orphaned/', DocumentOrphanedCleanupView.as_view(), name='document_orphaned_cleanup'),

    # Dashboard stats endpoint
    path('stats/', DocumentDashboardStatsView.as_view(), name='document_dashboard_stats'),
]
