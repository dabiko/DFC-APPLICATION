"""
Permission models for Role-Based Access Control (RBAC).

Implements:
- Role model with predefined roles (Viewer, Editor, Manager, Admin)
- Permission assignments to users
- Folder-level permissions with inheritance
- Department-based default access
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from apps.users.models import Department
from apps.folders.models import Folder
import uuid

User = get_user_model()


class Role(models.Model):
    """
    Predefined roles for RBAC system.

    Roles:
    - VIEWER: Can view and download documents
    - EDITOR: Can view, download, upload, and edit documents
    - MANAGER: Can view, edit, delete, share, and manage folder permissions
    - ADMIN: Full access to all operations including system configuration
    """

    # Role choices
    VIEWER = 'VIEWER'
    EDITOR = 'EDITOR'
    MANAGER = 'MANAGER'
    ADMIN = 'ADMIN'

    ROLE_CHOICES = [
        (VIEWER, 'Viewer'),
        (EDITOR, 'Editor'),
        (MANAGER, 'Manager'),
        (ADMIN, 'Administrator'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(
        max_length=50,
        choices=ROLE_CHOICES,
        unique=True,
        help_text="Role name (VIEWER, EDITOR, MANAGER, ADMIN)"
    )

    description = models.TextField(
        blank=True,
        help_text="Description of role permissions and capabilities"
    )

    # Permissions flags
    can_view = models.BooleanField(default=True)
    can_download = models.BooleanField(default=True)
    can_upload = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
    can_share = models.BooleanField(default=False)
    can_manage_permissions = models.BooleanField(default=False)
    can_view_audit_log = models.BooleanField(default=False)
    can_manage_retention = models.BooleanField(default=False)
    can_manage_classification = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'roles'
        ordering = ['name']
        verbose_name = 'Role'
        verbose_name_plural = 'Roles'

    def __str__(self):
        return self.get_name_display()

    def get_permissions_list(self):
        """Return list of permissions this role has"""
        permissions = []
        if self.can_view:
            permissions.append('view_document')
        if self.can_download:
            permissions.append('download_document')
        if self.can_upload:
            permissions.append('upload_document')
        if self.can_edit:
            permissions.append('edit_document')
        if self.can_delete:
            permissions.append('delete_document')
        if self.can_share:
            permissions.append('share_document')
        if self.can_manage_permissions:
            permissions.append('manage_permissions')
        if self.can_view_audit_log:
            permissions.append('view_audit_log')
        if self.can_manage_retention:
            permissions.append('manage_retention')
        if self.can_manage_classification:
            permissions.append('manage_classification')
        return permissions


class UserRole(models.Model):
    """
    Assigns roles to users at different scopes.

    Scopes:
    - GLOBAL: Role applies to entire system
    - DEPARTMENT: Role applies to specific department
    - FOLDER: Role applies to specific folder (see FolderPermission)
    """

    GLOBAL = 'GLOBAL'
    DEPARTMENT = 'DEPARTMENT'
    FOLDER = 'FOLDER'

    SCOPE_CHOICES = [
        (GLOBAL, 'Global'),
        (DEPARTMENT, 'Department'),
        (FOLDER, 'Folder'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_roles'
    )

    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='user_assignments'
    )

    scope = models.CharField(
        max_length=20,
        choices=SCOPE_CHOICES,
        default=GLOBAL,
        help_text="Scope where this role applies"
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='role_assignments',
        help_text="Department for DEPARTMENT scope"
    )

    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='roles_granted'
    )

    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration date for temporary roles"
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'user_roles'
        ordering = ['-granted_at']
        unique_together = [['user', 'role', 'scope', 'department']]
        verbose_name = 'User Role Assignment'
        verbose_name_plural = 'User Role Assignments'
        indexes = [
            models.Index(fields=['user', 'scope']),
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        scope_str = f" ({self.get_scope_display()})"
        if self.scope == self.DEPARTMENT and self.department:
            scope_str = f" (Dept: {self.department.name})"
        return f"{self.user.username} - {self.role} {scope_str}"

    def clean(self):
        """Validate role assignment"""
        if self.scope == self.DEPARTMENT and not self.department:
            raise ValidationError("Department is required for DEPARTMENT scope")
        if self.scope != self.DEPARTMENT and self.department:
            raise ValidationError("Department should only be set for DEPARTMENT scope")


class FolderPermission(models.Model):
    """
    Folder-level permissions with inheritance.

    Allows fine-grained control over who can access specific folders.
    Permissions can be inherited from parent folders or explicitly set.
    """

    # Permission levels
    NO_ACCESS = 'NO_ACCESS'
    VIEW_ONLY = 'VIEW_ONLY'
    VIEW_DOWNLOAD = 'VIEW_DOWNLOAD'
    CONTRIBUTE = 'CONTRIBUTE'
    EDIT = 'EDIT'
    FULL_CONTROL = 'FULL_CONTROL'

    PERMISSION_LEVEL_CHOICES = [
        (NO_ACCESS, 'No Access'),
        (VIEW_ONLY, 'View Only'),
        (VIEW_DOWNLOAD, 'View & Download'),
        (CONTRIBUTE, 'Contribute (Upload)'),
        (EDIT, 'Edit'),
        (FULL_CONTROL, 'Full Control'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        related_name='permissions'
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='folder_permissions',
        help_text="Specific user (leave null for department-wide permission)"
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='folder_permissions',
        help_text="Department-wide permission"
    )

    permission_level = models.CharField(
        max_length=20,
        choices=PERMISSION_LEVEL_CHOICES,
        default=VIEW_DOWNLOAD,
        help_text="Level of access granted"
    )

    inherit_from_parent = models.BooleanField(
        default=True,
        help_text="Whether to inherit permissions from parent folder"
    )

    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='folder_permissions_granted'
    )

    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'folder_permissions'
        ordering = ['folder', '-granted_at']
        verbose_name = 'Folder Permission'
        verbose_name_plural = 'Folder Permissions'
        indexes = [
            models.Index(fields=['folder', 'user']),
            models.Index(fields=['folder', 'department']),
            models.Index(fields=['user']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(user__isnull=False, department__isnull=True) |
                    models.Q(user__isnull=True, department__isnull=False)
                ),
                name='either_user_or_department'
            )
        ]

    def __str__(self):
        target = self.user.username if self.user else f"Dept: {self.department.name}"
        return f"{self.folder.name} - {target} ({self.get_permission_level_display()})"

    def clean(self):
        """Validate permission assignment"""
        if not self.user and not self.department:
            raise ValidationError("Either user or department must be specified")
        if self.user and self.department:
            raise ValidationError("Cannot assign permission to both user and department")

    def get_effective_permissions(self):
        """
        Get effective permissions considering inheritance.
        Returns dict of permission flags.
        """
        permissions = {
            'can_view': False,
            'can_download': False,
            'can_upload': False,
            'can_edit': False,
            'can_delete': False,
            'can_manage_permissions': False,
        }

        if self.permission_level == self.NO_ACCESS:
            return permissions

        if self.permission_level in [self.VIEW_ONLY, self.VIEW_DOWNLOAD,
                                      self.CONTRIBUTE, self.EDIT, self.FULL_CONTROL]:
            permissions['can_view'] = True

        if self.permission_level in [self.VIEW_DOWNLOAD, self.CONTRIBUTE,
                                      self.EDIT, self.FULL_CONTROL]:
            permissions['can_download'] = True

        if self.permission_level in [self.CONTRIBUTE, self.EDIT, self.FULL_CONTROL]:
            permissions['can_upload'] = True

        if self.permission_level in [self.EDIT, self.FULL_CONTROL]:
            permissions['can_edit'] = True
            permissions['can_delete'] = True

        if self.permission_level == self.FULL_CONTROL:
            permissions['can_manage_permissions'] = True

        return permissions


class PermissionCache(models.Model):
    """
    Cache for computed permissions to improve performance.

    Stores pre-computed permission checks to avoid repeated
    database queries and complex inheritance calculations.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='permission_cache'
    )

    folder = models.ForeignKey(
        Folder,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='permission_cache'
    )

    permission_type = models.CharField(
        max_length=50,
        help_text="Permission being checked (e.g., 'can_view', 'can_edit')"
    )

    has_permission = models.BooleanField(
        default=False,
        help_text="Whether user has this permission"
    )

    cached_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        help_text="When this cache entry expires"
    )

    class Meta:
        db_table = 'permission_cache'
        ordering = ['-cached_at']
        unique_together = [['user', 'folder', 'permission_type']]
        verbose_name = 'Permission Cache Entry'
        verbose_name_plural = 'Permission Cache Entries'
        indexes = [
            models.Index(fields=['user', 'folder', 'permission_type']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        folder_str = self.folder.name if self.folder else "Global"
        return f"{self.user.username} - {folder_str} - {self.permission_type}: {self.has_permission}"

    @classmethod
    def invalidate_user_cache(cls, user):
        """Invalidate all cache entries for a user"""
        cls.objects.filter(user=user).delete()

    @classmethod
    def invalidate_folder_cache(cls, folder):
        """Invalidate all cache entries for a folder"""
        cls.objects.filter(folder=folder).delete()
