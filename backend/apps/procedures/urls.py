"""
URL configuration for the Procedures app.
Covers Phase B (core), Phase C (quiz), Phase D (versioning),
Phase F (assignment & training), and Phase G (evidence & export) routes.
"""

from django.urls import path, include
from rest_framework_nested import routers
from rest_framework.routers import DefaultRouter
from . import views

# Main router
router = routers.DefaultRouter()
router.register(r'procedures', views.ProcedureViewSet, basename='procedure')

# Nested under /procedures/{procedure_pk}/
procedures_router = routers.NestedDefaultRouter(router, r'procedures', lookup='procedure')
procedures_router.register(r'steps', views.ProcedureStepViewSet, basename='procedure-steps')
procedures_router.register(r'step-comments', views.ProcedureStepCommentViewSet, basename='procedure-step-comments')
procedures_router.register(r'quizzes', views.QuizViewSet, basename='procedure-quizzes')
procedures_router.register(r'versions', views.ProcedureVersionViewSet, basename='procedure-versions')

# Nested under /procedures/{procedure_pk}/steps/{step_pk}/
steps_router = routers.NestedDefaultRouter(procedures_router, r'steps', lookup='step')
steps_router.register(r'attachments', views.StepAttachmentViewSet, basename='step-attachments')

# Nested under /procedures/{procedure_pk}/quizzes/{quiz_pk}/
quizzes_router = routers.NestedDefaultRouter(procedures_router, r'quizzes', lookup='quiz')
quizzes_router.register(r'questions', views.QuestionViewSet, basename='quiz-questions')

# Phase F: Assignment & Training — top-level routes
assignment_router = DefaultRouter()
assignment_router.register(r'assignments', views.ProcedureAssignmentViewSet, basename='assignment')
assignment_router.register(r'training', views.TrainingViewSet, basename='training')

# Phase G: Evidence & Export + Audit Log
assignment_router.register(r'evidence', views.EvidenceViewSet, basename='evidence')
assignment_router.register(r'audit-log', views.ProcedureAuditLogViewSet, basename='audit-log')

app_name = 'procedures'

urlpatterns = [
    path('', include(router.urls)),
    path('', include(procedures_router.urls)),
    path('', include(steps_router.urls)),
    path('', include(quizzes_router.urls)),
    path('procedures/', include(assignment_router.urls)),
]
