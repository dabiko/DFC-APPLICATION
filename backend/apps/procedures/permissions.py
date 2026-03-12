"""
Permissions for the Procedures app.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.contrib.contenttypes.models import ContentType
from apps.workflows.models import WorkflowTask


class IsProcedureCreator(BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.created_by == request.user


class IsAssignedReviewer(BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import Procedure
        ct = ContentType.objects.get_for_model(Procedure)
        return WorkflowTask.objects.filter(
            workflow__target_content_type=ct,
            workflow__target_object_id=obj.id,
            workflow__status__in=['ACTIVE', 'PENDING'],
            assigned_to=request.user,
            status__in=['PENDING', 'IN_PROGRESS'],
        ).exists()


class IsProcedureAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__name__iexact='admin', is_active=True
        ).exists()


class IsProcedureManager(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__name__iregex=r'^(admin|manager)$', is_active=True
        ).exists()


class CanCreateProcedure(BasePermission):
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__name__iregex=r'^(admin|manager|editor)$', is_active=True
        ).exists()


class IsStepOwner(BasePermission):
    """Allows step owners to edit their assigned steps (draft procedures only)."""
    def has_object_permission(self, request, view, obj):
        # obj is a ProcedureStep
        if not hasattr(obj, 'step_owner_id'):
            return False
        return obj.step_owner_id == request.user.id and obj.procedure.state == 'draft'


class IsComplianceAuditor(BasePermission):
    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return False
        if request.user.is_superuser:
            return True
        from apps.permissions.models import UserRole
        return UserRole.objects.filter(
            user=request.user, role__name__iexact='compliance_auditor', is_active=True
        ).exists()


class IsAssignedTrainee(BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import ProcedureAssignment
        return ProcedureAssignment.objects.filter(
            procedure_version=obj,
            assignee=request.user,
            status__in=['assigned', 'in_progress']
        ).exists()
