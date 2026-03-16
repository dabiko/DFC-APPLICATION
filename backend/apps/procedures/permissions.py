"""
Permissions for the Procedures app.

Uses the centralized RBAC permission flags from the permissions app
instead of hardcoded role name queries.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS
from django.contrib.contenttypes.models import ContentType
from apps.workflows.models import WorkflowTask
from apps.permissions.utils import PermissionChecker


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
    """User has admin-level procedure access (all procedure permissions)."""
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        checker = PermissionChecker(request.user)
        # Admin = has delete + publish + view_all (the highest-tier procedure perms)
        return (
            checker.has_global_permission('can_delete_procedure')
            and checker.has_global_permission('can_publish_procedure')
            and checker.has_global_permission('can_view_all_procedures')
        )


class IsProcedureManager(BasePermission):
    """User has manager-level procedure access (publish + view all)."""
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        checker = PermissionChecker(request.user)
        return (
            checker.has_global_permission('can_publish_procedure')
            and checker.has_global_permission('can_view_all_procedures')
        )


class CanCreateProcedure(BasePermission):
    """User can create procedures."""
    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_create_procedure')


class IsStepOwner(BasePermission):
    """Allows step owners to edit their assigned steps (draft procedures only)."""
    def has_object_permission(self, request, view, obj):
        # obj is a ProcedureStep
        if not hasattr(obj, 'step_owner_id'):
            return False
        return obj.step_owner_id == request.user.id and obj.procedure.state == 'draft'


class IsComplianceAuditor(BasePermission):
    """Read-only compliance auditor access via can_audit_training permission flag."""
    def has_permission(self, request, view):
        if request.method not in SAFE_METHODS:
            return False
        if request.user.is_superuser:
            return True
        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_audit_training')


class IsAssignedTrainee(BasePermission):
    def has_object_permission(self, request, view, obj):
        from .models import ProcedureAssignment
        return ProcedureAssignment.objects.filter(
            procedure_version=obj,
            assignee=request.user,
            status__in=['assigned', 'in_progress']
        ).exists()
