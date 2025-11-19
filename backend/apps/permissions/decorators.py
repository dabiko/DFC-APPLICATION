"""
Permission decorators and DRF permission classes for RBAC.

Provides:
- Function decorators for permission checks
- DRF permission classes for API views
- Permission mixins for class-based views
"""

from functools import wraps
from django.core.exceptions import PermissionDenied
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
from apps.permissions.utils import PermissionChecker, check_permission


def require_permission(permission, obj_param=None):
    """
    Decorator to require a specific permission.

    Args:
        permission (str): Permission to check (e.g., 'can_view')
        obj_param (str): Optional parameter name for object to check

    Usage:
        @require_permission('can_edit', 'folder')
        def edit_folder(request, folder):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            user = request.user

            if not user.is_authenticated:
                raise PermissionDenied("Authentication required")

            # Get object if parameter specified
            obj = kwargs.get(obj_param) if obj_param else None

            if not check_permission(user, permission, obj):
                raise PermissionDenied(f"You do not have {permission} permission")

            return view_func(request, *args, **kwargs)

        return wrapped_view
    return decorator


def require_role(role_name):
    """
    Decorator to require a specific role.

    Args:
        role_name (str): Role name (VIEWER, EDITOR, MANAGER, ADMIN)

    Usage:
        @require_role('MANAGER')
        def manage_permissions(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            from apps.permissions.models import UserRole, Role

            user = request.user

            if not user.is_authenticated:
                raise PermissionDenied("Authentication required")

            if user.is_superuser:
                return view_func(request, *args, **kwargs)

            # Check if user has the required role
            has_role = UserRole.objects.filter(
                user=user,
                role__name=role_name,
                is_active=True
            ).exists()

            if not has_role:
                raise PermissionDenied(f"Role '{role_name}' required")

            return view_func(request, *args, **kwargs)

        return wrapped_view
    return decorator


# ========================================
# DRF Permission Classes
# ========================================

class HasPermission(permissions.BasePermission):
    """
    DRF permission class to check if user has specific permission.

    Usage in views:
        permission_classes = [HasPermission]
        required_permission = 'can_view'
    """

    def has_permission(self, request, view):
        """Check if user has global permission"""
        if not request.user.is_authenticated:
            return False

        # Get required permission from view
        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            return True  # No specific permission required

        checker = PermissionChecker(request.user)
        return checker.has_global_permission(required_perm)

    def has_object_permission(self, request, view, obj):
        """Check if user has permission on specific object"""
        if not request.user.is_authenticated:
            return False

        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            return True

        return check_permission(request.user, required_perm, obj)


class HasFolderPermission(permissions.BasePermission):
    """
    DRF permission class for folder-specific permissions.

    Checks permissions based on HTTP method:
    - GET: can_view
    - POST: can_upload
    - PUT/PATCH: can_edit
    - DELETE: can_delete
    """

    permission_map = {
        'GET': 'can_view',
        'POST': 'can_upload',
        'PUT': 'can_edit',
        'PATCH': 'can_edit',
        'DELETE': 'can_delete',
    }

    def has_permission(self, request, view):
        """Check if user is authenticated"""
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user has permission on folder"""
        if not request.user.is_authenticated:
            return False

        # Determine permission based on method
        permission = self.permission_map.get(request.method, 'can_view')

        # For folders
        if hasattr(obj, 'parent'):
            checker = PermissionChecker(request.user)
            return checker.has_folder_permission(obj, permission)

        # For documents, check folder permission
        if hasattr(obj, 'folder'):
            if obj.owner_id == request.user.id:
                return True
            checker = PermissionChecker(request.user)
            return checker.has_folder_permission(obj.folder, permission)

        return False


class CanManagePermissions(permissions.BasePermission):
    """
    Permission class for managing permissions.
    Requires MANAGER or ADMIN role.
    """

    def has_permission(self, request, view):
        """Check if user can manage permissions"""
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_manage_permissions')

    def has_object_permission(self, request, view, obj):
        """Check if user can manage permissions for specific folder"""
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        # Folder owner can manage permissions
        if hasattr(obj, 'owner_id') and obj.owner_id == request.user.id:
            return True

        checker = PermissionChecker(request.user)
        return checker.has_folder_permission(obj, 'can_manage_permissions')


class IsOwnerOrHasPermission(permissions.BasePermission):
    """
    Object owner or user with permission can access.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user is owner or has permission"""
        if not request.user.is_authenticated:
            return False

        # Owner always has access
        if hasattr(obj, 'owner_id') and obj.owner_id == request.user.id:
            return True

        # Superuser has access
        if request.user.is_superuser:
            return True

        # Check permissions
        permission_map = {
            'GET': 'can_view',
            'POST': 'can_upload',
            'PUT': 'can_edit',
            'PATCH': 'can_edit',
            'DELETE': 'can_delete',
        }

        permission = permission_map.get(request.method, 'can_view')
        return check_permission(request.user, permission, obj)


class CanViewAuditLog(permissions.BasePermission):
    """
    Permission to view audit logs.
    Requires specific permission or MANAGER/ADMIN role.
    """

    def has_permission(self, request, view):
        """Check if user can view audit logs"""
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_view_audit_log')


class CanManageRetention(permissions.BasePermission):
    """
    Permission to manage retention policies.
    Requires ADMIN role.
    """

    def has_permission(self, request, view):
        """Check if user can manage retention"""
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_manage_retention')


class CanManageClassification(permissions.BasePermission):
    """
    Permission to manage classification rules.
    Requires ADMIN role.
    """

    def has_permission(self, request, view):
        """Check if user can manage classification"""
        if not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        checker = PermissionChecker(request.user)
        return checker.has_global_permission('can_manage_classification')


# ========================================
# View Mixins
# ========================================

class PermissionRequiredMixin:
    """
    Mixin for class-based views requiring specific permission.

    Usage:
        class MyView(PermissionRequiredMixin, View):
            required_permission = 'can_edit'
    """

    required_permission = None

    def dispatch(self, request, *args, **kwargs):
        """Check permission before dispatching"""
        if not request.user.is_authenticated:
            raise PermissionDenied("Authentication required")

        if self.required_permission:
            if not check_permission(request.user, self.required_permission):
                raise PermissionDenied(
                    f"Permission '{self.required_permission}' required"
                )

        return super().dispatch(request, *args, **kwargs)


class FolderPermissionMixin:
    """
    Mixin for views that operate on folders.
    Automatically checks folder permissions.
    """

    def get_queryset(self):
        """Filter queryset to only accessible folders"""
        queryset = super().get_queryset()
        checker = PermissionChecker(self.request.user)
        return checker.get_accessible_folders(queryset)


class DocumentPermissionMixin:
    """
    Mixin for views that operate on documents.
    Automatically checks document permissions.
    """

    def get_queryset(self):
        """Filter queryset to only accessible documents"""
        queryset = super().get_queryset()
        checker = PermissionChecker(self.request.user)
        return checker.get_accessible_documents(queryset)
