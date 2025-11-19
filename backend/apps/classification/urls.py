"""
URL configuration for classification app.
"""
from django.urls import path
from apps.classification.views import (
    ClassificationRuleListCreateView,
    ClassificationRuleDetailView,
    TestClassificationRuleView,
    ApplyClassificationManuallyView,
    BulkClassifyDocumentsView,
    ReclassifyForRuleView,
    ClassificationLogListView,
    ClassificationStatsView,
)

app_name = 'classification'

urlpatterns = [
    # Classification rules management
    path('rules/', ClassificationRuleListCreateView.as_view(), name='rule_list_create'),
    path('rules/<int:pk>/', ClassificationRuleDetailView.as_view(), name='rule_detail'),
    path('rules/<int:pk>/test/', TestClassificationRuleView.as_view(), name='rule_test'),
    path('rules/<int:pk>/reclassify/', ReclassifyForRuleView.as_view(), name='rule_reclassify'),

    # Classification actions
    path('bulk-classify/', BulkClassifyDocumentsView.as_view(), name='bulk_classify'),

    # Classification logs
    path('logs/', ClassificationLogListView.as_view(), name='log_list'),

    # Statistics
    path('stats/', ClassificationStatsView.as_view(), name='stats'),
]
