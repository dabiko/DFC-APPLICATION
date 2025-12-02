"""
Permission checking utilities for RBAC system.

Provides functions to check:
- User roles and permissions
- Folder-level access with inheritance
- Department-based permissions
- Cached permission lookups
"""

from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class PermissionChecker:
    """
    Centralized permission checking with caching support.
    """

    # Cache TTL: 15 minutes
    CACHE_TTL_MINUTES = 15

    def __init__(self, user):
        """Initialize with a user"""
        self.user = user

    def has_global_permission(self, permission):
        """
        Check if user has a global permission via their roles.

        Args:
            permission (str): Permission to check (e.g., 'can_view', 'can_edit')

        Returns:
            bool: True if user has permission
        """
        from apps.permissions.models import UserRole

        # Superusers have all permissions
        if self.user.is_superuser:
            return True

        # Check active global roles
        global_roles = UserRole.objects.filter(
            user=self.user,
            scope=UserRole.GLOBAL,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role')

        for user_role in global_roles:
            role = user_role.role
            if hasattr(role, permission) and getattr(role, permission):
                return True

        return False

    def has_department_permission(self, department, permission):
        """
        Check if user has permission in a specific department.

        Args:
            department: Department instance or ID
            permission (str): Permission to check

        Returns:
            bool: True if user has permission in department
        """
        from apps.permissions.models import UserRole

        if self.user.is_superuser:
            return True

        # Check global permissions first
        if self.has_global_permission(permission):
            return True

        # Get department ID
        dept_id = department.id if hasattr(department, 'id') else department

        # Check department-specific roles
        dept_roles = UserRole.objects.filter(
            user=self.user,
            scope=UserRole.DEPARTMENT,
            department_id=dept_id,
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).select_related('role')

        for user_role in dept_roles:
            role = user_role.role
            if hasattr(role, permission) and getattr(role, permission):
                return True

        return False

    def has_folder_permission(self, folder, permission):
        """
        Check if user has permission on a specific folder.

        Considers:
        1. Global roles
        2. Department roles (if folder belongs to user's department)
        3. Explicit folder permissions with inheritance
        4. Folder owner always has full control

        Args:
            folder: Folder instance
            permission (str): Permission to check

        Returns:
            bool: True if user has permission
        """
        from apps.permissions.models import FolderPermission, PermissionCache

        if self.user.is_superuser:
            return True

        # Folder owner has full control
        if folder.owner_id == self.user.id:
            return True

        # Check cache first
        cache_entry = self._get_cached_permission(folder, permission)
        if cache_entry is not None:
            return cache_entry

        # Check global permissions
        if self.has_global_permission(permission):
            self._cache_permission(folder, permission, True)
            return True

        # Check department permissions if folder is in user's department
        if folder.department_id and folder.department_id == self.user.department_id:
            if self.has_department_permission(folder.department, permission):
                self._cache_permission(folder, permission, True)
                return True

        # Check explicit folder permissions
        has_perm = self._check_folder_permissions(folder, permission)
        self._cache_permission(folder, permission, has_perm)
        return has_perm

    def _check_folder_permissions(self, folder, permission):
        """
        Check explicit folder permissions with inheritance.

        Args:
            folder: Folder instance
            permission (str): Permission to check

        Returns:
            bool: True if user has permission
        """
        from apps.permissions.models import FolderPermission

        # Get user-specific permission
        user_perm = FolderPermission.objects.filter(
            folder=folder,
            user=self.user
        ).first()

        if user_perm:
            effective_perms = user_perm.get_effective_permissions()
            if effective_perms.get(permission, False):
                return True
            # Explicit NO_ACCESS overrides inheritance
            if user_perm.permission_level == FolderPermission.NO_ACCESS:
                return False

        # Get department permission
        if self.user.department:
            dept_perm = FolderPermission.objects.filter(
                folder=folder,
                department=self.user.department
            ).first()

            if dept_perm:
                effective_perms = dept_perm.get_effective_permissions()
                if effective_perms.get(permission, False):
                    return True

        # Check parent folder if inheritance is enabled
        if folder.parent and (not user_perm or user_perm.inherit_from_parent):
            return self.has_folder_permission(folder.parent, permission)

        return False

    def _get_cached_permission(self, folder, permission):
        """
        Get permission from cache if available and not expired.

        Returns:
            bool or None: Cached permission value or None if not cached/expired
        """
        from apps.permissions.models import PermissionCache

        try:
            cache_entry = PermissionCache.objects.get(
                user=self.user,
                folder=folder,
                permission_type=permission,
                expires_at__gt=timezone.now()
            )
            logger.debug(f"Permission cache hit: {self.user.username} - {folder.name} - {permission}")
            return cache_entry.has_permission
        except PermissionCache.DoesNotExist:
            return None

    def _cache_permission(self, folder, permission, has_permission):
        """
        Cache a permission check result.

        Args:
            folder: Folder instance
            permission (str): Permission type
            has_permission (bool): Result to cache
        """
        from apps.permissions.models import PermissionCache

        expires_at = timezone.now() + timedelta(minutes=self.CACHE_TTL_MINUTES)

        PermissionCache.objects.update_or_create(
            user=self.user,
            folder=folder,
            permission_type=permission,
            defaults={
                'has_permission': has_permission,
                'expires_at': expires_at
            }
        )
        logger.debug(f"Cached permission: {self.user.username} - {folder.name} - {permission} = {has_permission}")

    def get_accessible_folders(self, base_queryset=None):
        """
        Get all folders user has access to.

        Args:
            base_queryset: Optional base queryset to filter

        Returns:
            QuerySet of accessible folders
        """
        from apps.folders.models import Folder
        from apps.permissions.models import FolderPermission

        if base_queryset is None:
            base_queryset = Folder.objects.filter(is_deleted=False)

        if self.user.is_superuser:
            return base_queryset

        # Get folders with explicit permissions
        accessible_folders = base_queryset.filter(
            Q(owner=self.user) |  # User is owner
            Q(department=self.user.department) |  # In user's department
            Q(permissions__user=self.user) |  # User-specific permission
            Q(permissions__department=self.user.department)  # Department permission
        ).distinct()

        return accessible_folders

    def get_accessible_documents(self, base_queryset=None):
        """
        Get all documents user has access to.

        Args:
            base_queryset: Optional base queryset to filter

        Returns:
            QuerySet of accessible documents
        """
        from apps.documents.models import Document
        from apps.permissions.models import DocumentPermission

        if base_queryset is None:
            base_queryset = Document.objects.filter(is_deleted=False)

        if self.user.is_superuser:
            return base_queryset

        # Get accessible folders
        accessible_folders = self.get_accessible_folders()

        # Get documents with explicit permissions for this user
        docs_with_explicit_access = DocumentPermission.objects.filter(
            Q(user=self.user) | Q(department=self.user.department),
            permission_level__in=[
                DocumentPermission.VIEW_ONLY,
                DocumentPermission.VIEW_DOWNLOAD,
                DocumentPermission.EDIT,
                DocumentPermission.FULL_CONTROL
            ]
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).values_list('document_id', flat=True)

        # Filter documents in accessible folders OR with explicit document permissions
        accessible_documents = base_queryset.filter(
            Q(owner=self.user) |
            Q(department=self.user.department) |
            Q(folder__in=accessible_folders) |
            Q(id__in=docs_with_explicit_access)
        ).distinct()

        return accessible_documents

    def has_document_permission(self, document, permission):
        """
        Check if user has permission on a specific document.

        Priority order:
        1. Document owner always has full control
        2. Superuser always has access
        3. Explicit document-level permission (overrides folder permissions)
        4. Folder-level permission (with inheritance)
        5. Global role permission

        Args:
            document: Document instance
            permission (str): Permission to check

        Returns:
            bool: True if user has permission
        """
        has_perm, _, _ = self.has_document_permission_with_reason(document, permission)
        return has_perm

    def has_document_permission_with_reason(self, document, permission):
        """
        Check if user has permission on a document and return reason.

        Args:
            document: Document instance
            permission (str): Permission to check

        Returns:
            tuple: (has_permission: bool, reason: str, source: str)
        """
        from apps.permissions.models import DocumentPermission

        # Superuser always has permission
        if self.user.is_superuser:
            return True, "User is superuser", "SUPERUSER"

        # Document owner always has full control
        if document.owner_id == self.user.id:
            return True, "User is document owner", "OWNER"

        # Check explicit document-level permission first
        doc_perm = self._get_document_permission(document)
        if doc_perm:
            if doc_perm.override_folder_permissions:
                # Document permission overrides folder
                effective_perms = doc_perm.get_effective_permissions()
                if effective_perms.get(permission, False):
                    return True, "User has explicit document permission", "DOCUMENT_PERMISSION"
                elif doc_perm.permission_level == DocumentPermission.NO_ACCESS:
                    return False, "Access explicitly denied at document level", "DOCUMENT_DENIED"
                else:
                    return False, "Document permission does not grant required access", "INSUFFICIENT_DOCUMENT_PERMISSION"
            else:
                # Document permission adds to folder permission
                effective_perms = doc_perm.get_effective_permissions()
                if effective_perms.get(permission, False):
                    return True, "User has explicit document permission", "DOCUMENT_PERMISSION"
                # Fall through to check folder permission

        # Check folder-level permission
        if document.folder:
            has_folder_perm = self.has_folder_permission(document.folder, permission)
            if has_folder_perm:
                # Determine more specific reason
                if self.has_global_permission(permission):
                    return True, "User has global permission via role", "GLOBAL_ROLE"
                if document.folder.department_id and document.folder.department_id == self.user.department_id:
                    if self.has_department_permission(document.folder.department, permission):
                        return True, "User has department-level permission", "DEPARTMENT"
                return True, "User has folder-level permission", "FOLDER_PERMISSION"

        # Check global permission as fallback
        if self.has_global_permission(permission):
            return True, "User has global permission via role", "GLOBAL_ROLE"

        return False, "User does not have required permission", "NO_PERMISSION"

    def _get_document_permission(self, document):
        """
        Get the effective document permission for this user.

        Checks user-specific permission first, then department permission.

        Args:
            document: Document instance

        Returns:
            DocumentPermission or None
        """
        from apps.permissions.models import DocumentPermission

        # Check user-specific permission first
        user_perm = DocumentPermission.objects.filter(
            document=document,
            user=self.user
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        ).first()

        if user_perm:
            return user_perm

        # Check department permission
        if self.user.department:
            dept_perm = DocumentPermission.objects.filter(
                document=document,
                department=self.user.department
            ).filter(
                Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
            ).first()

            if dept_perm:
                return dept_perm

        return None


def check_permission(user, permission, obj=None, context=None):
    """
    Convenience function to check permissions.

    Args:
        user: User instance
        permission (str): Permission to check
        obj: Optional folder/document instance
        context (dict): Optional context for permission checks (e.g., action type)

    Returns:
        bool: True if user has permission
    """
    checker = PermissionChecker(user)

    if obj is None:
        return checker.has_global_permission(permission)

    # Check based on object type
    if hasattr(obj, 'parent') and not hasattr(obj, 'folder'):  # It's a folder
        return checker.has_folder_permission(obj, permission)
    elif hasattr(obj, 'folder'):  # It's a document
        return checker.has_document_permission(obj, permission)

    return False


def check_permission_with_reason(user, permission, obj=None):
    """
    Check permission and return reason for decision.

    Args:
        user: User instance
        permission (str): Permission to check
        obj: Optional folder/document instance

    Returns:
        tuple: (has_permission: bool, reason: str, source: str)
    """
    checker = PermissionChecker(user)

    # Superuser always has permission
    if user.is_superuser:
        return True, "User is superuser", "SUPERUSER"

    if obj is None:
        has_perm = checker.has_global_permission(permission)
        if has_perm:
            return True, "User has global permission via role", "GLOBAL_ROLE"
        return False, "User does not have required global permission", "NO_PERMISSION"

    # Check based on object type
    if hasattr(obj, 'parent') and not hasattr(obj, 'folder'):  # It's a folder
        # Folder owner always has permission
        if hasattr(obj, 'owner_id') and obj.owner_id == user.id:
            return True, "User is folder owner", "OWNER"

        has_perm = checker.has_folder_permission(obj, permission)
        if has_perm:
            # Determine source
            if checker.has_global_permission(permission):
                return True, "User has global permission via role", "GLOBAL_ROLE"
            if obj.department_id and obj.department_id == user.department_id:
                return True, "User has department-level permission", "DEPARTMENT"
            return True, "User has explicit folder permission", "FOLDER_PERMISSION"
        return False, "User does not have required folder permission", "NO_PERMISSION"

    elif hasattr(obj, 'folder'):  # It's a document
        # Document owner always has permission
        if obj.owner_id == user.id:
            return True, "User is document owner", "OWNER"

        has_perm, reason, source = checker.has_document_permission_with_reason(obj, permission)
        return has_perm, reason, source

    return False, "Unknown object type", "UNKNOWN"


def clear_permission_cache(user=None, folder=None):
    """
    Clear permission cache.

    Args:
        user: Optional user to clear cache for
        folder: Optional folder to clear cache for
    """
    from apps.permissions.models import PermissionCache

    if user:
        PermissionCache.invalidate_user_cache(user)
    if folder:
        PermissionCache.invalidate_folder_cache(folder)
    if not user and not folder:
        # Clear expired cache entries
        PermissionCache.objects.filter(expires_at__lt=timezone.now()).delete()


def initialize_default_roles():
    """
    Create default roles if they don't exist.
    Should be run during initial setup or migrations.
    """
    from apps.permissions.models import Role

    roles_config = {
        Role.VIEWER: {
            'description': 'Can view and download documents',
            'can_view': True,
            'can_download': True,
            'can_upload': False,
            'can_edit': False,
            'can_delete': False,
            'can_share': False,
            'can_manage_permissions': False,
            'can_view_audit_log': False,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        Role.EDITOR: {
            'description': 'Can view, download, upload, and edit documents',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': False,
            'can_share': False,
            'can_manage_permissions': False,
            'can_view_audit_log': False,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        Role.MANAGER: {
            'description': 'Can manage documents, share, and control folder permissions',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True,
            'can_view_audit_log': True,
            'can_manage_retention': False,
            'can_manage_classification': False,
        },
        Role.ADMIN: {
            'description': 'Full system access including retention and classification management',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True,
            'can_view_audit_log': True,
            'can_manage_retention': True,
            'can_manage_classification': True,
        },
    }

    created_roles = []
    for role_name, config in roles_config.items():
        role, created = Role.objects.get_or_create(
            name=role_name,
            defaults=config
        )
        if created:
            created_roles.append(role_name)
            logger.info(f"Created default role: {role_name}")

    return created_roles
