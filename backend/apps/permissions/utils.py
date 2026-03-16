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

    Uses two layers of caching:
    1. In-memory dict (`_global_perm_cache`) — lives for the duration of this
       checker instance (typically one HTTP request via PermissionContextMiddleware).
       Avoids repeated DB hits when the same permission is checked multiple
       times within a single request (middleware + view + serializer).
    2. Database-backed `PermissionCache` model — 15-minute TTL, shared across
       requests.  Used for folder-level permission checks.
    """

    # Cache TTL: 15 minutes
    CACHE_TTL_MINUTES = 15

    def __init__(self, user):
        """Initialize with a user"""
        self.user = user
        # In-memory cache for global permission checks within one request
        self._global_perm_cache = {}
        # Cache the resolved roles queryset once per request
        self._resolved_roles = None

    def _get_active_global_roles(self):
        """Return the user's active global roles, cached per-instance."""
        if self._resolved_roles is None:
            from apps.permissions.models import UserRole
            self._resolved_roles = list(
                UserRole.objects.filter(
                    user=self.user,
                    scope=UserRole.GLOBAL,
                    is_active=True,
                ).filter(
                    Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
                ).select_related('role')
            )
        return self._resolved_roles

    def has_global_permission(self, permission):
        """
        Check if user has a global permission via their roles.

        Args:
            permission (str): Permission to check (e.g., 'can_view', 'can_edit')

        Returns:
            bool: True if user has permission
        """
        # Superusers have all permissions
        if self.user.is_superuser:
            return True

        # Check in-memory request-level cache
        if permission in self._global_perm_cache:
            return self._global_perm_cache[permission]

        # Query once, iterate cached roles
        result = False
        for user_role in self._get_active_global_roles():
            role = user_role.role
            if hasattr(role, permission) and getattr(role, permission):
                result = True
                break

        self._global_perm_cache[permission] = result
        return result

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
        3. Cross-department access grants
        4. Explicit folder permissions with inheritance
        5. Folder owner always has full control
        6. Department membership grants basic contribute permissions

        Args:
            folder: Folder instance
            permission (str): Permission to check

        Returns:
            bool: True if user has permission
        """
        from apps.permissions.models import FolderPermission, PermissionCache
        from apps.permissions.department_resolver import DepartmentPermissionResolver

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

        # Check department access (primary department or cross-department access)
        if folder.department_id:
            resolver = DepartmentPermissionResolver(self.user)

            # Check if user has any role in the folder's department
            dept_role = resolver.get_department_role(folder.department)
            if dept_role:
                # Map role permissions to the requested permission
                role_permissions = {
                    'can_view': dept_role.can_view,
                    'can_download': dept_role.can_download,
                    'can_upload': dept_role.can_upload,
                    'can_edit': dept_role.can_edit,
                    'can_delete': dept_role.can_delete,
                    'can_share': dept_role.can_share,
                    'can_manage_permissions': dept_role.can_manage_permissions,
                }
                if role_permissions.get(permission, False):
                    self._cache_permission(folder, permission, True)
                    return True

            # Primary department members get default contribute-level permissions
            if folder.department_id == self.user.department_id:
                contribute_permissions = ['can_view', 'can_download', 'can_upload', 'can_edit']
                if permission in contribute_permissions:
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

        Uses DepartmentPermissionResolver to include:
        - User's primary department
        - Departments with cross-department access

        Args:
            base_queryset: Optional base queryset to filter

        Returns:
            QuerySet of accessible folders
        """
        from apps.folders.models import Folder
        from apps.permissions.models import FolderPermission
        from apps.permissions.department_resolver import DepartmentPermissionResolver

        if base_queryset is None:
            base_queryset = Folder.objects.filter(is_deleted=False)

        if self.user.is_superuser:
            return base_queryset

        # Use DepartmentPermissionResolver to get all accessible departments
        resolver = DepartmentPermissionResolver(self.user)
        accessible_departments = resolver.get_accessible_departments()
        accessible_dept_ids = [d.id for d in accessible_departments]

        # Get folders with access via:
        # 1. User is owner
        # 2. Folder is in an accessible department
        # 3. User-specific explicit permission
        # 4. Department-based explicit permission (for any department user can access)
        accessible_folders = base_queryset.filter(
            Q(owner=self.user) |  # User is owner
            Q(department_id__in=accessible_dept_ids) |  # In accessible department
            Q(permissions__user=self.user) |  # User-specific permission
            Q(permissions__department_id__in=accessible_dept_ids)  # Department permission
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
                # Check if it's default department permissions or explicit role
                if checker.has_department_permission(obj.department, permission):
                    return True, "User has department-level role permission", "DEPARTMENT_ROLE"
                # Default contribute permissions for department members
                contribute_permissions = ['can_view', 'can_download', 'can_upload', 'can_edit']
                if permission in contribute_permissions:
                    return True, "User is department member with default access", "DEPARTMENT_MEMBER"
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
            'display_name': 'Viewer',
            'is_system': True,
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
            # Procedure
            'can_create_procedure': False,
            'can_edit_procedure': False,
            'can_delete_procedure': False,
            'can_publish_procedure': False,
            'can_review_procedure': False,
            'can_view_all_procedures': False,
            # Workflow
            'can_create_workflow_template': False,
            'can_delete_workflow_template': False,
            'can_start_workflow': False,
            'can_cancel_workflow': False,
            'can_manage_auto_triggers': False,
            'can_view_workflow_analytics': False,
            # Training
            'can_manage_assignments': False,
            'can_view_training_dashboard': False,
            'can_view_trainee_details': False,
            'can_view_training_evidence': False,
            'can_audit_training': False,
        },
        Role.EDITOR: {
            'display_name': 'Editor',
            'is_system': True,
            'description': 'Can view, download, upload, and edit documents; create and review procedures; start workflows',
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
            # Procedure
            'can_create_procedure': True,
            'can_edit_procedure': True,
            'can_delete_procedure': False,
            'can_publish_procedure': False,
            'can_review_procedure': True,
            'can_view_all_procedures': False,
            # Workflow
            'can_create_workflow_template': False,
            'can_delete_workflow_template': False,
            'can_start_workflow': True,
            'can_cancel_workflow': False,
            'can_manage_auto_triggers': False,
            'can_view_workflow_analytics': False,
            # Training
            'can_manage_assignments': False,
            'can_view_training_dashboard': False,
            'can_view_trainee_details': False,
            'can_view_training_evidence': False,
            'can_audit_training': False,
        },
        Role.MANAGER: {
            'display_name': 'Manager',
            'is_system': True,
            'description': 'Can manage documents, procedures, workflows, and training assignments',
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
            # Procedure
            'can_create_procedure': True,
            'can_edit_procedure': True,
            'can_delete_procedure': True,
            'can_publish_procedure': True,
            'can_review_procedure': True,
            'can_view_all_procedures': True,
            # Workflow
            'can_create_workflow_template': True,
            'can_delete_workflow_template': False,
            'can_start_workflow': True,
            'can_cancel_workflow': True,
            'can_manage_auto_triggers': False,
            'can_view_workflow_analytics': True,
            # Training
            'can_manage_assignments': True,
            'can_view_training_dashboard': True,
            'can_view_trainee_details': True,
            'can_view_training_evidence': True,
            'can_audit_training': False,
        },
        Role.ADMIN: {
            'display_name': 'Administrator',
            'is_system': True,
            'description': 'Full system access including all procedure, workflow, training, and compliance capabilities',
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
            # Procedure
            'can_create_procedure': True,
            'can_edit_procedure': True,
            'can_delete_procedure': True,
            'can_publish_procedure': True,
            'can_review_procedure': True,
            'can_view_all_procedures': True,
            # Workflow
            'can_create_workflow_template': True,
            'can_delete_workflow_template': True,
            'can_start_workflow': True,
            'can_cancel_workflow': True,
            'can_manage_auto_triggers': True,
            'can_view_workflow_analytics': True,
            # Training
            'can_manage_assignments': True,
            'can_view_training_dashboard': True,
            'can_view_trainee_details': True,
            'can_view_training_evidence': True,
            'can_audit_training': True,
        },
    }

    created_roles = []
    for role_name, config in roles_config.items():
        role, created = Role.objects.update_or_create(
            name=role_name,
            defaults=config
        )
        if created:
            created_roles.append(role_name)
            logger.info(f"Created default role: {role_name}")
        else:
            logger.info(f"Updated default role: {role_name}")

    return created_roles
