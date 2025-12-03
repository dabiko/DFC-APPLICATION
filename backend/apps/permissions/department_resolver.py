"""
Department Permission Resolver for Department-as-Root Architecture.

This module provides the core permission resolution logic for the department-based
RBAC system. It handles:
- Department access checking
- Permission inheritance from department to folder to document
- Cross-department access grants
- Caching for performance optimization

Permission Resolution Order:
1. Check if user has GLOBAL admin role
2. Check user's department membership (primary department)
3. Check cross-department access grants
4. Check department-level role assignments
5. Check explicit folder/document permissions
6. Apply permission inheritance from parent folders
"""

from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.core.cache import cache
from functools import wraps
import logging

logger = logging.getLogger(__name__)


class DepartmentPermissionResolver:
    """
    Resolves effective permissions considering department-level access.

    This resolver implements the Department-as-Root permission model where:
    - Departments are the primary RBAC boundary
    - Users have a primary department with baseline access
    - Cross-department access requires explicit grants
    - Permissions cascade: Department -> Folder -> Document
    """

    # Cache timeout in seconds (5 minutes)
    CACHE_TIMEOUT = 300

    # Permission action mapping
    PERMISSION_ACTIONS = [
        'view', 'download', 'upload', 'edit', 'delete', 'share', 'manage'
    ]

    def __init__(self, user):
        """
        Initialize resolver for a specific user.

        Args:
            user: CustomUser instance
        """
        self.user = user
        self._cache = {}  # In-memory cache for this request

    # =========================================================================
    # Department Access Methods
    # =========================================================================

    def can_access_department(self, department) -> bool:
        """
        Check if user can access a department.

        Access is granted if:
        - User has global admin role
        - User belongs to the department (primary membership)
        - User has an active cross-department access grant

        Args:
            department: Department instance or department_id

        Returns:
            bool: True if user can access the department
        """
        department_id = department.id if hasattr(department, 'id') else department

        # Check in-memory cache
        cache_key = f"dept_access_{department_id}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Global admin check
        if self._has_global_admin():
            self._cache[cache_key] = True
            return True

        # Primary department check
        if self.user.department_id == department_id:
            self._cache[cache_key] = True
            return True

        # Cross-department access check
        from apps.users.models_department import CrossDepartmentAccess
        has_grant = CrossDepartmentAccess.objects.filter(
            user=self.user,
            department_id=department_id,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).exists()

        self._cache[cache_key] = has_grant
        return has_grant

    def get_accessible_departments(self):
        """
        Get all departments the user can access.

        Returns:
            QuerySet of Department objects
        """
        from apps.users.models import Department
        from apps.users.models_department import CrossDepartmentAccess

        # Global admin sees all active departments in their organization
        if self._has_global_admin():
            return Department.objects.filter(
                organization=self.user.organization,
                is_active=True
            ).order_by('display_order', 'name')

        # Start with primary department
        accessible_ids = {self.user.department_id}

        # Add departments from cross-department grants
        granted_ids = CrossDepartmentAccess.objects.filter(
            user=self.user,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).values_list('department_id', flat=True)

        accessible_ids.update(granted_ids)

        return Department.objects.filter(
            id__in=accessible_ids,
            is_active=True
        ).order_by('display_order', 'name')

    def get_department_role(self, department):
        """
        Get user's effective role in a department.

        Returns the highest permission level role from:
        - Global role assignments
        - Department-level role assignments
        - Cross-department access grants

        Args:
            department: Department instance

        Returns:
            Role instance or None
        """
        from apps.permissions.models import UserRole, Role
        from apps.users.models_department import CrossDepartmentAccess

        department_id = department.id if hasattr(department, 'id') else department

        # Check for global role first
        global_role = UserRole.objects.filter(
            user=self.user,
            scope='GLOBAL',
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role').first()

        if global_role:
            return global_role.role

        # Check for department-specific role
        dept_role = UserRole.objects.filter(
            user=self.user,
            scope='DEPARTMENT',
            department_id=department_id,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role').first()

        if dept_role:
            return dept_role.role

        # Check cross-department access
        cross_access = CrossDepartmentAccess.objects.filter(
            user=self.user,
            department_id=department_id,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role').first()

        if cross_access:
            return cross_access.role

        # Primary department - assign default role based on membership
        if self.user.department_id == department_id:
            # Return the user's default role in their own department
            # This could be customized based on user's position
            default_role = Role.objects.filter(name='EDITOR').first()
            return default_role

        return None

    # =========================================================================
    # Folder Permission Methods
    # =========================================================================

    def can_access_folder(self, folder, action='view') -> bool:
        """
        Check if user can perform an action on a folder.

        Args:
            folder: Folder instance
            action: Permission action (view, download, upload, edit, delete, share, manage)

        Returns:
            bool: True if action is permitted
        """
        # First check department access
        if not self.can_access_department(folder.department_id):
            return False

        return self.resolve_folder_permission(folder, action)

    def resolve_folder_permission(self, folder, action) -> bool:
        """
        Resolve effective permission for a folder action.

        Resolution order:
        1. Global admin bypass
        2. Explicit folder restriction (NO_ACCESS)
        3. Department role permissions
        4. Explicit folder permissions
        5. Inherited parent folder permissions

        Args:
            folder: Folder instance
            action: Permission action

        Returns:
            bool: Whether the action is permitted
        """
        # Cache key
        cache_key = f"folder_perm_{folder.id}_{action}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Global admin bypass
        if self._has_global_admin():
            self._cache[cache_key] = True
            return True

        # Check department access first
        if not self.can_access_department(folder.department_id):
            self._cache[cache_key] = False
            return False

        # Check for explicit folder restriction
        from apps.permissions.models import FolderPermission
        explicit_restriction = FolderPermission.objects.filter(
            folder=folder,
            user=self.user,
            permission_level='NO_ACCESS'
        ).exists()

        if explicit_restriction:
            self._cache[cache_key] = False
            return False

        # Check department role
        dept_role = self.get_department_role(folder.department_id)
        if dept_role and self._role_permits_action(dept_role, action):
            self._cache[cache_key] = True
            return True

        # Check explicit folder permission for user
        user_perm = FolderPermission.objects.filter(
            folder=folder,
            user=self.user
        ).first()

        if user_perm:
            result = self._permission_level_permits(user_perm.permission_level, action)
            self._cache[cache_key] = result
            return result

        # Check folder permission for user's department
        dept_perm = FolderPermission.objects.filter(
            folder=folder,
            department=self.user.department
        ).first()

        if dept_perm:
            result = self._permission_level_permits(dept_perm.permission_level, action)
            self._cache[cache_key] = result
            return result

        # Check inherited permissions from parent
        if folder.parent:
            result = self.resolve_folder_permission(folder.parent, action)
            self._cache[cache_key] = result
            return result

        # Default: deny for actions beyond view/download in own department
        if self.user.department_id == folder.department_id:
            if action in ['view', 'download']:
                self._cache[cache_key] = True
                return True

        self._cache[cache_key] = False
        return False

    def get_folder_permissions(self, folder) -> dict:
        """
        Get all permissions for a folder.

        Returns:
            dict: Permission flags for all actions
        """
        return {
            'can_view': self.resolve_folder_permission(folder, 'view'),
            'can_download': self.resolve_folder_permission(folder, 'download'),
            'can_upload': self.resolve_folder_permission(folder, 'upload'),
            'can_edit': self.resolve_folder_permission(folder, 'edit'),
            'can_delete': self.resolve_folder_permission(folder, 'delete'),
            'can_share': self.resolve_folder_permission(folder, 'share'),
            'can_manage': self.resolve_folder_permission(folder, 'manage'),
        }

    # =========================================================================
    # Document Permission Methods
    # =========================================================================

    def can_access_document(self, document, action='view') -> bool:
        """
        Check if user can perform an action on a document.

        Args:
            document: Document instance
            action: Permission action

        Returns:
            bool: True if action is permitted
        """
        # First check department access
        if not self.can_access_department(document.department_id):
            return False

        return self.resolve_document_permission(document, action)

    def resolve_document_permission(self, document, action) -> bool:
        """
        Resolve effective permission for a document action.

        Resolution order:
        1. Global admin bypass
        2. Explicit document permission (if override_folder_permissions=True)
        3. Folder permissions (if no override)
        4. Department role permissions

        Args:
            document: Document instance
            action: Permission action

        Returns:
            bool: Whether the action is permitted
        """
        # Cache key
        cache_key = f"doc_perm_{document.id}_{action}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Global admin bypass
        if self._has_global_admin():
            self._cache[cache_key] = True
            return True

        # Check department access
        if not self.can_access_department(document.department_id):
            self._cache[cache_key] = False
            return False

        # Check explicit document permission
        from apps.permissions.models import DocumentPermission
        doc_perm = DocumentPermission.objects.filter(
            document=document,
            user=self.user
        ).first()

        if doc_perm and doc_perm.override_folder_permissions and not doc_perm.is_expired():
            result = self._permission_level_permits(doc_perm.permission_level, action)
            self._cache[cache_key] = result
            return result

        # Fall back to folder permissions
        if document.folder:
            result = self.resolve_folder_permission(document.folder, action)
            self._cache[cache_key] = result
            return result

        # No folder - check department role
        dept_role = self.get_department_role(document.department_id)
        if dept_role:
            result = self._role_permits_action(dept_role, action)
            self._cache[cache_key] = result
            return result

        self._cache[cache_key] = False
        return False

    def get_document_permissions(self, document) -> dict:
        """
        Get all permissions for a document.

        Returns:
            dict: Permission flags for all actions
        """
        return {
            'can_view': self.resolve_document_permission(document, 'view'),
            'can_download': self.resolve_document_permission(document, 'download'),
            'can_edit': self.resolve_document_permission(document, 'edit'),
            'can_delete': self.resolve_document_permission(document, 'delete'),
            'can_share': self.resolve_document_permission(document, 'share'),
            'can_manage': self.resolve_document_permission(document, 'manage'),
        }

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _has_global_admin(self) -> bool:
        """
        Check if user has global admin role.

        Returns True if:
        - User is a Django superuser (is_superuser=True)
        - User has an active UserRole with GLOBAL scope and ADMIN role
        """
        cache_key = "global_admin"
        if cache_key in self._cache:
            return self._cache[cache_key]

        # Django superusers always have global admin access
        if self.user.is_superuser:
            self._cache[cache_key] = True
            return True

        from apps.permissions.models import UserRole

        has_admin = UserRole.objects.filter(
            user=self.user,
            scope='GLOBAL',
            role__name='ADMIN',
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).exists()

        self._cache[cache_key] = has_admin
        return has_admin

    def _role_permits_action(self, role, action) -> bool:
        """
        Check if a role permits the specified action.

        Args:
            role: Role instance
            action: Permission action string

        Returns:
            bool: True if role permits the action
        """
        action_map = {
            'view': role.can_view,
            'download': role.can_download,
            'upload': role.can_upload,
            'edit': role.can_edit,
            'delete': role.can_delete,
            'share': role.can_share,
            'manage': role.can_manage_permissions,
        }
        return action_map.get(action, False)

    def _permission_level_permits(self, level, action) -> bool:
        """
        Check if a permission level permits the specified action.

        Args:
            level: Permission level string (NO_ACCESS, VIEW_ONLY, etc.)
            action: Permission action string

        Returns:
            bool: True if level permits the action
        """
        level_permissions = {
            'NO_ACCESS': [],
            'VIEW_ONLY': ['view'],
            'VIEW_DOWNLOAD': ['view', 'download'],
            'CONTRIBUTE': ['view', 'download', 'upload'],
            'EDIT': ['view', 'download', 'upload', 'edit'],
            'FULL_CONTROL': ['view', 'download', 'upload', 'edit', 'delete', 'share', 'manage'],
        }
        return action in level_permissions.get(level, [])

    def clear_cache(self):
        """Clear the in-memory permission cache."""
        self._cache.clear()


# =============================================================================
# Decorator for Permission Checking
# =============================================================================

def require_department_access(view_func):
    """
    Decorator to require department access for a view.

    Checks if the user can access the department specified in:
    - URL kwargs (department_id, department)
    - Request data (department, department_id)

    Raises PermissionDenied if access is not allowed.
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from django.core.exceptions import PermissionDenied
        from apps.users.models import Department

        # Get department ID from various sources
        department_id = (
            kwargs.get('department_id') or
            kwargs.get('department') or
            getattr(request, 'data', {}).get('department') or
            getattr(request, 'data', {}).get('department_id') or
            request.GET.get('department') or
            request.GET.get('department_id')
        )

        if department_id:
            resolver = DepartmentPermissionResolver(request.user)
            if not resolver.can_access_department(department_id):
                raise PermissionDenied("Access denied to this department")

        return view_func(request, *args, **kwargs)

    return wrapper


def require_folder_permission(action='view'):
    """
    Decorator to require folder permission for a view.

    Args:
        action: Required permission action

    Checks folder specified in URL kwargs (folder_id, pk for folder views).
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            from django.core.exceptions import PermissionDenied
            from apps.folders.models import Folder

            folder_id = kwargs.get('folder_id') or kwargs.get('pk')

            if folder_id:
                try:
                    folder = Folder.objects.get(pk=folder_id)
                    resolver = DepartmentPermissionResolver(request.user)
                    if not resolver.can_access_folder(folder, action):
                        raise PermissionDenied(
                            f"Permission denied: {action} on folder '{folder.name}'"
                        )
                except Folder.DoesNotExist:
                    pass  # Let the view handle 404

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


def require_document_permission(action='view'):
    """
    Decorator to require document permission for a view.

    Args:
        action: Required permission action

    Checks document specified in URL kwargs (document_id, pk for document views).
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            from django.core.exceptions import PermissionDenied
            from apps.documents.models import Document

            document_id = kwargs.get('document_id') or kwargs.get('pk')

            if document_id:
                try:
                    document = Document.objects.get(pk=document_id)
                    resolver = DepartmentPermissionResolver(request.user)
                    if not resolver.can_access_document(document, action):
                        raise PermissionDenied(
                            f"Permission denied: {action} on document '{document.title}'"
                        )
                except Document.DoesNotExist:
                    pass  # Let the view handle 404

            return view_func(request, *args, **kwargs)

        return wrapper
    return decorator


# =============================================================================
# Mixin for ViewSets
# =============================================================================

class DepartmentPermissionMixin:
    """
    Mixin for DRF ViewSets that adds department-based permission filtering.

    Usage:
        class FolderViewSet(DepartmentPermissionMixin, viewsets.ModelViewSet):
            queryset = Folder.objects.all()
            serializer_class = FolderSerializer

            def get_queryset(self):
                return self.filter_by_department(super().get_queryset())
    """

    def get_permission_resolver(self):
        """Get or create a permission resolver for the current request."""
        if not hasattr(self, '_permission_resolver'):
            self._permission_resolver = DepartmentPermissionResolver(self.request.user)
        return self._permission_resolver

    def filter_by_department(self, queryset):
        """
        Filter queryset to only include items from accessible departments.

        Assumes queryset model has a 'department' field.
        """
        resolver = self.get_permission_resolver()
        accessible_depts = resolver.get_accessible_departments()
        return queryset.filter(department__in=accessible_depts)

    def filter_by_department_id(self, queryset):
        """
        Filter queryset by department_id field instead of department FK.
        """
        resolver = self.get_permission_resolver()
        accessible_ids = list(resolver.get_accessible_departments().values_list('id', flat=True))
        return queryset.filter(department_id__in=accessible_ids)

    def check_department_access(self, obj):
        """
        Check if user can access the department of an object.

        Raises PermissionDenied if access is not allowed.
        """
        from django.core.exceptions import PermissionDenied

        department_id = getattr(obj, 'department_id', None)
        if department_id:
            resolver = self.get_permission_resolver()
            if not resolver.can_access_department(department_id):
                raise PermissionDenied("Access denied to this department")

    def check_folder_permission(self, folder, action='view'):
        """
        Check if user has permission on a folder.

        Raises PermissionDenied if access is not allowed.
        """
        from django.core.exceptions import PermissionDenied

        resolver = self.get_permission_resolver()
        if not resolver.can_access_folder(folder, action):
            raise PermissionDenied(f"Permission denied: {action} on folder")

    def check_document_permission(self, document, action='view'):
        """
        Check if user has permission on a document.

        Raises PermissionDenied if access is not allowed.
        """
        from django.core.exceptions import PermissionDenied

        resolver = self.get_permission_resolver()
        if not resolver.can_access_document(document, action):
            raise PermissionDenied(f"Permission denied: {action} on document")
