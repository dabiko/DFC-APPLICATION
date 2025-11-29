"""
URL configuration for Document Intelligence API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ExtractedEntityViewSet,
    ExtractedTableViewSet,
    DocumentSummaryViewSet,
    ExtractedKeyValueViewSet,
    IntelligenceJobViewSet,
    DocumentIntelligenceView,
    BatchProcessView,
    IntelligenceStatsView,
    IntelligenceSettingsView,
)

router = DefaultRouter()
router.register(r'entities', ExtractedEntityViewSet, basename='entity')
router.register(r'tables', ExtractedTableViewSet, basename='table')
router.register(r'summaries', DocumentSummaryViewSet, basename='summary')
router.register(r'key-values', ExtractedKeyValueViewSet, basename='keyvalue')
router.register(r'jobs', IntelligenceJobViewSet, basename='job')

urlpatterns = [
    path('', include(router.urls)),

    # Document-specific intelligence
    path(
        'document/<uuid:doc_id>/',
        DocumentIntelligenceView.as_view(),
        name='document-intelligence'
    ),
    path(
        'document/<uuid:doc_id>/process/',
        DocumentIntelligenceView.as_view(),
        name='document-process'
    ),

    # Batch processing
    path('batch/', BatchProcessView.as_view(), name='batch-process'),

    # Statistics
    path('stats/', IntelligenceStatsView.as_view(), name='intelligence-stats'),

    # Settings
    path('settings/', IntelligenceSettingsView.as_view(), name='intelligence-settings'),
]
