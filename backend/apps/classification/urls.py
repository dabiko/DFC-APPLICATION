"""
URL configuration for classification app.

Includes:
- Rule-based classification endpoints
- ML classification endpoints (Phase 1)
"""
from django.urls import path
from apps.classification.views import (
    # Rule-based classification
    ClassificationRuleListCreateView,
    ClassificationRuleDetailView,
    TestClassificationRuleView,
    ApplyClassificationManuallyView,
    BulkClassifyDocumentsView,
    ReclassifyForRuleView,
    ClassificationLogListView,
    ClassificationStatsView,
    # ML classification (Phase 1)
    MLModelListView,
    MLModelDetailView,
    MLModelActivateView,
    TrainModelView,
    ReviewQueueView,
    ReviewPredictionView,
    ClassifyDocumentMLView,
    BatchClassifyMLView,
    MLClassificationStatsView,
    ClassificationSettingsView,
    TrainingFeedbackListView,
    PredictionHistoryView,
)

app_name = 'classification'

urlpatterns = [
    # ==========================================================================
    # Rule-Based Classification
    # ==========================================================================

    # Classification rules management
    path('rules/', ClassificationRuleListCreateView.as_view(), name='rule_list_create'),
    path('rules/<int:pk>/', ClassificationRuleDetailView.as_view(), name='rule_detail'),
    path('rules/<int:pk>/test/', TestClassificationRuleView.as_view(), name='rule_test'),
    path('rules/<int:pk>/reclassify/', ReclassifyForRuleView.as_view(), name='rule_reclassify'),

    # Classification actions
    path('bulk-classify/', BulkClassifyDocumentsView.as_view(), name='bulk_classify'),

    # Classification logs
    path('logs/', ClassificationLogListView.as_view(), name='log_list'),

    # Statistics (rule-based)
    path('stats/', ClassificationStatsView.as_view(), name='stats'),

    # ==========================================================================
    # ML Classification (Phase 1)
    # ==========================================================================

    # ML Models management
    path('ml/models/', MLModelListView.as_view(), name='ml_model_list'),
    path('ml/models/<int:pk>/', MLModelDetailView.as_view(), name='ml_model_detail'),
    path('ml/models/<int:pk>/activate/', MLModelActivateView.as_view(), name='ml_model_activate'),

    # Model training
    path('ml/train/', TrainModelView.as_view(), name='ml_train'),

    # Review queue
    path('ml/review-queue/', ReviewQueueView.as_view(), name='ml_review_queue'),
    path('ml/predictions/<int:pk>/review/', ReviewPredictionView.as_view(), name='ml_prediction_review'),

    # Batch classification
    path('ml/batch-classify/', BatchClassifyMLView.as_view(), name='ml_batch_classify'),

    # ML Statistics
    path('ml/stats/', MLClassificationStatsView.as_view(), name='ml_stats'),

    # Settings
    path('settings/', ClassificationSettingsView.as_view(), name='settings'),

    # Training feedback
    path('ml/feedback/', TrainingFeedbackListView.as_view(), name='ml_feedback_list'),
]
