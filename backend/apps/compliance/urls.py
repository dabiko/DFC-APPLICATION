"""
Compliance Management URL Configuration

API routes for the Compliance Center:
- Regulations CRUD
- Controls CRUD
- Findings CRUD
- Assessments CRUD
- Document compliance checks
- Compliance scores
- Alerts
- Dashboard
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegulationViewSet,
    ControlViewSet,
    ControlEvidenceViewSet,
    FindingViewSet,
    AssessmentViewSet,
    DocumentComplianceCheckViewSet,
    ComplianceScoreViewSet,
    ComplianceAlertViewSet,
    ComplianceDashboardViewSet,
)

router = DefaultRouter()
router.register(r'regulations', RegulationViewSet, basename='regulation')
router.register(r'controls', ControlViewSet, basename='control')
router.register(r'evidence', ControlEvidenceViewSet, basename='evidence')
router.register(r'findings', FindingViewSet, basename='finding')
router.register(r'assessments', AssessmentViewSet, basename='assessment')
router.register(r'document-checks', DocumentComplianceCheckViewSet, basename='document-check')
router.register(r'scores', ComplianceScoreViewSet, basename='score')
router.register(r'alerts', ComplianceAlertViewSet, basename='alert')
router.register(r'dashboard', ComplianceDashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
