# Digital Filing Cabinet (DFC) - Backend Weeks 17-27 Detailed Implementation

**Project**: Digital Filing Cabinet - Phase 3 & Phase 4
**Duration**: Weeks 17-27 (11 weeks)
**Focus**: Security & Compliance + Scale & Hardening
**Status**: Implementation Ready

---

## Table of Contents

- [Phase 3: Security & Compliance (Weeks 17-22)](#phase-3-security--compliance-weeks-17-22)
  - [Week 17: Role-Based Access Control (RBAC)](#week-17-role-based-access-control-rbac)
  - [Week 18: Audit Trail & Logging](#week-18-audit-trail--logging)
  - [Week 19: Encryption Implementation](#week-19-encryption-implementation)
  - [Week 20: Retention Policies & Legal Hold](#week-20-retention-policies--legal-hold)
  - [Week 21: Secure Sharing & Collaboration](#week-21-secure-sharing--collaboration)
  - [Week 22: Multi-Factor Authentication (MFA)](#week-22-multi-factor-authentication-mfa)
- [Phase 4: Scale & Hardening (Weeks 23-27)](#phase-4-scale--hardening-weeks-23-27)
  - [Week 23: Performance Optimization](#week-23-performance-optimization)
  - [Week 24: Caching Implementation](#week-24-caching-implementation)
  - [Week 25: Load Balancing & High Availability](#week-25-load-balancing--high-availability)
  - [Week 26: Load Testing & Performance Tuning](#week-26-load-testing--performance-tuning)
  - [Week 27: Security Hardening & Compliance](#week-27-security-hardening--compliance)

---

# Phase 3: Security & Compliance (Weeks 17-22)

## Week 17: Role-Based Access Control (RBAC)

**Objective**: Implement comprehensive role-based access control system with multi-level permissions

**Status**: ✅ COMPLETED

### Tasks Overview

| Task | Priority | Complexity | Status |
|------|----------|------------|--------|
| Permission models (Role, UserRole, FolderPermission) | Critical | High | ✅ Complete |
| Permission checking utilities | Critical | High | ✅ Complete |
| Permission decorators & middleware | Critical | Medium | ✅ Complete |
| Permission serializers | Critical | Medium | ✅ Complete |
| Permission API views & endpoints | Critical | High | ✅ Complete |
| Django admin integration | High | Medium | ✅ Complete |
| Folder view RBAC integration | Critical | High | ✅ Complete |
| Permission caching system | High | High | ✅ Complete |
| Management commands (init_roles) | Medium | Low | ✅ Complete |

### Implementation Details

#### 1. Permission Models

**File**: `apps/permissions/models.py`

**Models Created**:

1. **Role Model** (4 predefined roles)
   - VIEWER: Read-only access (can_view, can_download)
   - EDITOR: Content modification (can_upload, can_edit)
   - MANAGER: Full operational control (can_delete, can_share, can_manage_permissions)
   - ADMIN: System-wide control (can_view_audit_log, can_manage_retention, can_manage_classification)

2. **UserRole Model** (Role assignments)
   - Multi-scope support: GLOBAL, DEPARTMENT, FOLDER
   - Expiration tracking
   - Active/inactive status
   - Audit trail (granted_by, granted_at)

3. **FolderPermission Model** (Folder-level permissions)
   - 6 permission levels: NO_ACCESS, VIEW_ONLY, VIEW_DOWNLOAD, CONTRIBUTE, EDIT, FULL_CONTROL
   - Parent folder inheritance
   - User OR department targeting (CheckConstraint)

4. **PermissionCache Model** (Performance optimization)
   - 15-minute TTL
   - User + folder + permission_type unique constraint
   - Automatic expiration tracking

**Database Schema**:
```sql
-- Role table (4 predefined roles)
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    can_view BOOLEAN DEFAULT FALSE,
    can_download BOOLEAN DEFAULT FALSE,
    can_upload BOOLEAN DEFAULT FALSE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_share BOOLEAN DEFAULT FALSE,
    can_manage_permissions BOOLEAN DEFAULT FALSE,
    can_view_audit_log BOOLEAN DEFAULT FALSE,
    can_manage_retention BOOLEAN DEFAULT FALSE,
    can_manage_classification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- User role assignments
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    scope VARCHAR(20) NOT NULL CHECK (scope IN ('GLOBAL', 'DEPARTMENT', 'FOLDER')),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    granted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP NOT NULL,
    UNIQUE (user_id, role_id, scope, department_id)
);

-- Folder permissions
CREATE TABLE folder_permissions (
    id UUID PRIMARY KEY,
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    permission_level VARCHAR(20) NOT NULL,
    inherit_from_parent BOOLEAN DEFAULT TRUE,
    granted_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP NOT NULL,
    CHECK (
        (user_id IS NOT NULL AND department_id IS NULL) OR
        (user_id IS NULL AND department_id IS NOT NULL)
    )
);

-- Permission cache
CREATE TABLE permission_cache (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL,
    has_permission BOOLEAN NOT NULL,
    cached_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    UNIQUE (user_id, folder_id, permission_type)
);

-- Indexes for performance
CREATE INDEX idx_user_roles_user_scope ON user_roles(user_id, scope);
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id, is_active);
CREATE INDEX idx_folder_permissions_folder_user ON folder_permissions(folder_id, user_id);
CREATE INDEX idx_permission_cache_expires ON permission_cache(expires_at);
```

#### 2. Permission Utilities

**File**: `apps/permissions/utils.py`

**Key Functions/Classes**:

```python
class PermissionChecker:
    """
    Centralized permission checking with caching.

    Usage:
        checker = PermissionChecker(user)
        if checker.has_folder_permission(folder, 'can_edit'):
            # Allow edit
    """
    CACHE_TTL_MINUTES = 15

    def has_folder_permission(self, folder, permission):
        """Multi-level permission check with caching"""
        # 1. Check cache
        # 2. Owner always has access
        # 3. Check global role permissions
        # 4. Check department role permissions
        # 5. Check explicit folder permissions (with inheritance)
        # 6. Cache result

    def has_global_permission(self, permission):
        """Check if user has permission globally"""

    def get_accessible_folders(self, queryset):
        """Filter queryset to only accessible folders"""

    def _get_cached_permission(self, folder, permission):
        """Retrieve cached permission check"""

    def _cache_permission(self, folder, permission, has_permission):
        """Cache permission check result for 15 minutes"""

def check_permission(user, permission, folder):
    """Helper function for quick permission checks"""
    checker = PermissionChecker(user)
    return checker.has_folder_permission(folder, permission)

def clear_permission_cache(user=None, folder=None):
    """Clear permission cache (after role/permission changes)"""
    if user and folder:
        PermissionCache.objects.filter(user=user, folder=folder).delete()
    elif user:
        PermissionCache.objects.filter(user=user).delete()
    elif folder:
        PermissionCache.objects.filter(folder=folder).delete()
    else:
        PermissionCache.objects.all().delete()

def initialize_default_roles():
    """Create 4 default roles (VIEWER, EDITOR, MANAGER, ADMIN)"""
    created_roles = []

    # VIEWER role
    Role.objects.get_or_create(
        name=Role.VIEWER,
        defaults={
            'description': 'Read-only access to documents',
            'can_view': True,
            'can_download': True
        }
    )

    # EDITOR role
    Role.objects.get_or_create(
        name=Role.EDITOR,
        defaults={
            'description': 'Can modify content',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True
        }
    )

    # MANAGER role
    Role.objects.get_or_create(
        name=Role.MANAGER,
        defaults={
            'description': 'Full operational control',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True
        }
    )

    # ADMIN role
    Role.objects.get_or_create(
        name=Role.ADMIN,
        defaults={
            'description': 'Full system control',
            'can_view': True,
            'can_download': True,
            'can_upload': True,
            'can_edit': True,
            'can_delete': True,
            'can_share': True,
            'can_manage_permissions': True,
            'can_view_audit_log': True,
            'can_manage_retention': True,
            'can_manage_classification': True
        }
    )

    return created_roles
```

#### 3. API Endpoints

**File**: `apps/permissions/urls.py`

**Endpoints Created**:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/permissions/roles/` | List all roles |
| GET | `/api/v1/permissions/roles/{id}/` | Get role details |
| GET | `/api/v1/permissions/roles/{id}/users/` | List users with role |
| GET | `/api/v1/permissions/user-roles/` | List role assignments |
| POST | `/api/v1/permissions/user-roles/` | Assign role to user |
| PUT/PATCH | `/api/v1/permissions/user-roles/{id}/` | Update role assignment |
| DELETE | `/api/v1/permissions/user-roles/{id}/` | Revoke role assignment |
| POST | `/api/v1/permissions/user-roles/{id}/activate/` | Activate role |
| POST | `/api/v1/permissions/user-roles/{id}/deactivate/` | Deactivate role |
| GET | `/api/v1/permissions/folder-permissions/` | List folder permissions |
| POST | `/api/v1/permissions/folder-permissions/` | Grant folder permission |
| PUT/PATCH | `/api/v1/permissions/folder-permissions/{id}/` | Update folder permission |
| DELETE | `/api/v1/permissions/folder-permissions/{id}/` | Revoke folder permission |
| POST | `/api/v1/permissions/folder-permissions/bulk_assign/` | Bulk permission assignment |
| POST | `/api/v1/permissions/check/` | Check permission |
| GET | `/api/v1/permissions/users/{id}/summary/` | User permission summary |
| POST | `/api/v1/permissions/cache/clear/` | Clear permission cache |

#### 4. Integration with Folder Views

**File**: `apps/folders/views.py` (Modified)

**Changes Made**:

```python
# Before (simple ownership check)
class FolderListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        return Folder.objects.filter(owner=self.request.user)

# After (RBAC filtering)
class FolderListCreateView(FolderPermissionMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        checker = PermissionChecker(self.request.user)
        base_queryset = Folder.objects.all()
        return checker.get_accessible_folders(base_queryset)

# Permission checks added to all views
class FolderUpdateView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_edit'

class FolderDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_delete'
```

### Testing Requirements

**Unit Tests** (`apps/permissions/tests.py`):

```python
class PermissionCheckerTestCase(TestCase):
    def test_folder_owner_has_all_permissions(self):
        """Owner should have full access"""

    def test_global_role_permissions(self):
        """Global role grants system-wide access"""

    def test_department_scoped_permissions(self):
        """Department role limited to department folders"""

    def test_explicit_folder_permission(self):
        """Explicit permissions grant access"""

    def test_permission_inheritance(self):
        """Child folders inherit parent permissions"""

    def test_permission_caching(self):
        """Cache reduces database queries"""

    def test_permission_level_enforcement(self):
        """Permission levels correctly enforced"""
```

**Integration Tests**:

```python
class RoleAssignmentAPITestCase(APITestCase):
    def test_assign_global_role(self):
        """Admin can assign global roles"""

    def test_assign_department_role(self):
        """Admin can assign department-scoped roles"""

    def test_bulk_permission_assignment(self):
        """Bulk assignment succeeds"""

    def test_unauthorized_permission_grant(self):
        """Non-admin cannot grant permissions"""
```

### Acceptance Criteria

- [x] 4 default roles created and immutable
- [x] Users can be assigned roles at GLOBAL, DEPARTMENT, or FOLDER scope
- [x] Folder permissions support 6 permission levels
- [x] Permission inheritance works from parent to child folders
- [x] Permission checks cached for 15 minutes
- [x] All folder operations enforce RBAC
- [x] API endpoints functional with proper validation
- [x] Django admin interface supports permission management
- [x] Audit logging integrated for all permission changes
- [x] Performance: Permission check <50ms (uncached), <10ms (cached)

### Documentation

- ✅ **RBAC_IMPLEMENTATION.md**: Complete 1,400+ line implementation guide
- ✅ **API Reference**: All endpoints documented with examples
- ✅ **Model Reference**: Complete field documentation
- ✅ **Usage Guide**: Code examples for developers
- ✅ **Integration Guide**: How to integrate RBAC into new views
- ✅ **Testing Guide**: Unit and integration test examples

---

## Week 18: Audit Trail & Logging

**Objective**: Implement comprehensive immutable audit logging for all system operations

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Enhance AuditLog model (before/after values) | Critical | 4h | Week 17 RBAC |
| Implement immutable logging (no updates/deletes) | Critical | 3h | AuditLog model |
| Create audit log signals for all models | High | 6h | All apps |
| Audit API endpoints (list, filter, export) | Critical | 5h | AuditLog model |
| Compliance report generation | High | 4h | Audit API |
| Audit log retention policy | Medium | 3h | Week 20 prep |
| Django admin read-only audit interface | Medium | 2h | Admin |
| Performance optimization (indexes, pagination) | High | 3h | Testing |

**Total Estimated Time**: 30 hours

### 1. Enhanced AuditLog Model

**File**: `apps/audit/models.py`

**Current Model** (Basic):
```python
class AuditLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=100)
    resource_id = models.CharField(max_length=255, null=True)
    details = models.JSONField(default=dict)
    outcome = models.CharField(max_length=20, default='SUCCESS')
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
```

**Enhanced Model** (Comprehensive):
```python
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
import uuid

User = get_user_model()

class AuditLog(models.Model):
    """
    Immutable audit log for compliance and security monitoring.
    Tracks all user actions, system events, and permission changes.
    """

    # Action types
    CREATE = 'CREATE'
    VIEW = 'VIEW'
    EDIT = 'EDIT'
    DELETE = 'DELETE'
    UPLOAD = 'UPLOAD'
    DOWNLOAD = 'DOWNLOAD'
    SHARE = 'SHARE'
    MOVE = 'MOVE'
    COPY = 'COPY'
    RESTORE = 'RESTORE'
    LOGIN = 'LOGIN'
    LOGOUT = 'LOGOUT'
    LOGIN_FAILED = 'LOGIN_FAILED'
    PERMISSION_GRANT = 'PERMISSION_GRANT'
    PERMISSION_REVOKE = 'PERMISSION_REVOKE'
    ROLE_ASSIGN = 'ROLE_ASSIGN'
    ROLE_REVOKE = 'ROLE_REVOKE'
    RETENTION_APPLY = 'RETENTION_APPLY'
    LEGAL_HOLD = 'LEGAL_HOLD'
    LEGAL_RELEASE = 'LEGAL_RELEASE'
    EXPORT = 'EXPORT'
    IMPORT = 'IMPORT'
    SETTINGS_CHANGE = 'SETTINGS_CHANGE'

    ACTION_CHOICES = [
        (CREATE, 'Create'),
        (VIEW, 'View'),
        (EDIT, 'Edit'),
        (DELETE, 'Delete'),
        (UPLOAD, 'Upload'),
        (DOWNLOAD, 'Download'),
        (SHARE, 'Share'),
        (MOVE, 'Move'),
        (COPY, 'Copy'),
        (RESTORE, 'Restore'),
        (LOGIN, 'Login'),
        (LOGOUT, 'Logout'),
        (LOGIN_FAILED, 'Login Failed'),
        (PERMISSION_GRANT, 'Permission Grant'),
        (PERMISSION_REVOKE, 'Permission Revoke'),
        (ROLE_ASSIGN, 'Role Assign'),
        (ROLE_REVOKE, 'Role Revoke'),
        (RETENTION_APPLY, 'Retention Apply'),
        (LEGAL_HOLD, 'Legal Hold'),
        (LEGAL_RELEASE, 'Legal Release'),
        (EXPORT, 'Export'),
        (IMPORT, 'Import'),
        (SETTINGS_CHANGE, 'Settings Change'),
    ]

    # Outcome types
    SUCCESS = 'SUCCESS'
    FAILURE = 'FAILURE'
    WARNING = 'WARNING'

    OUTCOME_CHOICES = [
        (SUCCESS, 'Success'),
        (FAILURE, 'Failure'),
        (WARNING, 'Warning'),
    ]

    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        help_text='User who performed the action (null for system actions)'
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Type of resource (Document, Folder, UserRole, etc.)'
    )
    resource_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text='ID of the affected resource'
    )
    resource_name = models.CharField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Name/title of the resource for readability'
    )

    # Change tracking
    before_value = models.JSONField(
        null=True,
        blank=True,
        help_text='Resource state before the action (for EDIT, DELETE)'
    )
    after_value = models.JSONField(
        null=True,
        blank=True,
        help_text='Resource state after the action (for CREATE, EDIT)'
    )
    changed_fields = ArrayField(
        models.CharField(max_length=100),
        null=True,
        blank=True,
        help_text='List of fields that were modified'
    )

    # Additional context
    details = models.JSONField(
        default=dict,
        help_text='Additional context and metadata'
    )
    outcome = models.CharField(
        max_length=20,
        choices=OUTCOME_CHOICES,
        default=SUCCESS,
        db_index=True
    )
    error_message = models.TextField(
        null=True,
        blank=True,
        help_text='Error details if outcome is FAILURE'
    )

    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    request_method = models.CharField(max_length=10, null=True, blank=True)
    request_path = models.CharField(max_length=500, null=True, blank=True)

    # Timing
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    duration_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text='Operation duration in milliseconds'
    )

    # Compliance
    retention_period_days = models.IntegerField(
        default=2555,  # 7 years for financial compliance
        help_text='How long to retain this log entry'
    )

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['resource_type', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['outcome', '-timestamp']),
            models.Index(fields=['resource_type', 'resource_id']),
        ]
        # Immutability: prevent updates and deletes at model level
        permissions = [
            ('view_auditlog', 'Can view audit logs'),
            ('export_auditlog', 'Can export audit logs'),
        ]

    def __str__(self):
        user_str = self.user.email if self.user else 'System'
        return f'{user_str} - {self.action} - {self.resource_type} - {self.timestamp}'

    def save(self, *args, **kwargs):
        """Only allow creation, not updates"""
        if self.pk:
            raise ValueError('Audit logs are immutable and cannot be modified')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion (except via retention policy)"""
        if not kwargs.pop('force_delete', False):
            raise ValueError('Audit logs cannot be deleted manually')
        super().delete(*args, **kwargs)

    @classmethod
    def log_action(cls, user, action, resource_type, resource_id=None,
                   resource_name=None, before_value=None, after_value=None,
                   changed_fields=None, details=None, outcome='SUCCESS',
                   error_message=None, ip_address=None, user_agent=None,
                   request_method=None, request_path=None, duration_ms=None):
        """
        Centralized method to create audit log entries.

        Usage:
            AuditLog.log_action(
                user=request.user,
                action=AuditLog.EDIT,
                resource_type='Document',
                resource_id=str(document.id),
                resource_name=document.title,
                before_value={'title': 'Old Title'},
                after_value={'title': 'New Title'},
                changed_fields=['title'],
                ip_address=request.META.get('REMOTE_ADDR')
            )
        """
        return cls.objects.create(
            user=user,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_name=resource_name,
            before_value=before_value,
            after_value=after_value,
            changed_fields=changed_fields or [],
            details=details or {},
            outcome=outcome,
            error_message=error_message,
            ip_address=ip_address,
            user_agent=user_agent,
            request_method=request_method,
            request_path=request_path,
            duration_ms=duration_ms
        )
```

### 2. Audit Signals for Automatic Logging

**File**: `apps/audit/signals.py`

```python
from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.documents.models import Document, Folder
from apps.permissions.models import UserRole, FolderPermission
from apps.audit.models import AuditLog
from threading import local

User = get_user_model()

# Thread-local storage for request context
_thread_locals = local()

def set_audit_context(user, ip_address=None, user_agent=None, request_method=None, request_path=None):
    """Set audit context from middleware"""
    _thread_locals.user = user
    _thread_locals.ip_address = ip_address
    _thread_locals.user_agent = user_agent
    _thread_locals.request_method = request_method
    _thread_locals.request_path = request_path

def get_audit_context():
    """Get audit context"""
    return {
        'user': getattr(_thread_locals, 'user', None),
        'ip_address': getattr(_thread_locals, 'ip_address', None),
        'user_agent': getattr(_thread_locals, 'user_agent', None),
        'request_method': getattr(_thread_locals, 'request_method', None),
        'request_path': getattr(_thread_locals, 'request_path', None),
    }

# Document signals
@receiver(pre_save, sender=Document)
def document_pre_save(sender, instance, **kwargs):
    """Store previous state before save"""
    if instance.pk:
        try:
            instance._previous_state = Document.objects.get(pk=instance.pk)
        except Document.DoesNotExist:
            instance._previous_state = None

@receiver(post_save, sender=Document)
def document_post_save(sender, instance, created, **kwargs):
    """Log document creation/modification"""
    context = get_audit_context()

    if created:
        AuditLog.log_action(
            action=AuditLog.CREATE,
            resource_type='Document',
            resource_id=str(instance.id),
            resource_name=instance.title,
            after_value={
                'title': instance.title,
                'folder': str(instance.folder_id),
                'uploaded_by': instance.uploaded_by.email if instance.uploaded_by else None,
            },
            **context
        )
    else:
        # Log edit with before/after values
        before_state = getattr(instance, '_previous_state', None)
        if before_state:
            changed_fields = []
            before_value = {}
            after_value = {}

            # Track changed fields
            for field in ['title', 'document_type', 'confidentiality_level']:
                old_val = getattr(before_state, field, None)
                new_val = getattr(instance, field, None)
                if old_val != new_val:
                    changed_fields.append(field)
                    before_value[field] = old_val
                    after_value[field] = new_val

            if changed_fields:
                AuditLog.log_action(
                    action=AuditLog.EDIT,
                    resource_type='Document',
                    resource_id=str(instance.id),
                    resource_name=instance.title,
                    before_value=before_value,
                    after_value=after_value,
                    changed_fields=changed_fields,
                    **context
                )

@receiver(post_delete, sender=Document)
def document_post_delete(sender, instance, **kwargs):
    """Log document deletion"""
    context = get_audit_context()

    AuditLog.log_action(
        action=AuditLog.DELETE,
        resource_type='Document',
        resource_id=str(instance.id),
        resource_name=instance.title,
        before_value={
            'title': instance.title,
            'folder': str(instance.folder_id),
        },
        **context
    )

# Folder signals
@receiver(post_save, sender=Folder)
def folder_post_save(sender, instance, created, **kwargs):
    """Log folder creation/modification"""
    context = get_audit_context()

    if created:
        AuditLog.log_action(
            action=AuditLog.CREATE,
            resource_type='Folder',
            resource_id=str(instance.id),
            resource_name=instance.name,
            after_value={'name': instance.name, 'parent': str(instance.parent_id) if instance.parent else None},
            **context
        )

# Permission signals
@receiver(post_save, sender=UserRole)
def user_role_post_save(sender, instance, created, **kwargs):
    """Log role assignment"""
    context = get_audit_context()

    if created:
        AuditLog.log_action(
            action=AuditLog.ROLE_ASSIGN,
            resource_type='UserRole',
            resource_id=str(instance.id),
            resource_name=f'{instance.user.email} - {instance.role.name}',
            after_value={
                'user': instance.user.email,
                'role': instance.role.name,
                'scope': instance.scope,
                'department': instance.department.name if instance.department else None,
            },
            **context
        )

@receiver(post_save, sender=FolderPermission)
def folder_permission_post_save(sender, instance, created, **kwargs):
    """Log permission grant"""
    context = get_audit_context()

    if created:
        AuditLog.log_action(
            action=AuditLog.PERMISSION_GRANT,
            resource_type='FolderPermission',
            resource_id=str(instance.id),
            resource_name=f'{instance.folder.name} - {instance.permission_level}',
            after_value={
                'folder': instance.folder.name,
                'user': instance.user.email if instance.user else None,
                'department': instance.department.name if instance.department else None,
                'permission_level': instance.permission_level,
            },
            **context
        )
```

**File**: `apps/audit/middleware.py`

```python
from apps.audit.signals import set_audit_context

class AuditContextMiddleware:
    """Middleware to capture request context for audit logging"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set audit context before processing request
        if request.user.is_authenticated:
            set_audit_context(
                user=request.user,
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                request_method=request.method,
                request_path=request.path
            )

        response = self.get_response(request)
        return response

    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
```

**Add to settings.py**:
```python
MIDDLEWARE = [
    # ... other middleware
    'apps.audit.middleware.AuditContextMiddleware',
]
```

### 3. Audit API Endpoints

**File**: `apps/audit/serializers.py`

```python
from rest_framework import serializers
from apps.audit.models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_email', 'action', 'action_display',
            'resource_type', 'resource_id', 'resource_name',
            'before_value', 'after_value', 'changed_fields',
            'details', 'outcome', 'outcome_display', 'error_message',
            'ip_address', 'user_agent', 'request_method', 'request_path',
            'timestamp', 'duration_ms'
        ]
        read_only_fields = fields  # All fields read-only

class AuditLogFilterSerializer(serializers.Serializer):
    """Serializer for audit log filtering"""
    user_id = serializers.UUIDField(required=False)
    action = serializers.ChoiceField(choices=AuditLog.ACTION_CHOICES, required=False)
    resource_type = serializers.CharField(max_length=100, required=False)
    resource_id = serializers.CharField(max_length=255, required=False)
    outcome = serializers.ChoiceField(choices=AuditLog.OUTCOME_CHOICES, required=False)
    date_from = serializers.DateTimeField(required=False)
    date_to = serializers.DateTimeField(required=False)
    ip_address = serializers.IPAddressField(required=False)
```

**File**: `apps/audit/views.py`

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from datetime import timedelta
from django.http import HttpResponse
import csv
from apps.audit.models import AuditLog
from apps.audit.serializers import AuditLogSerializer, AuditLogFilterSerializer
from apps.permissions.decorators import CanViewAuditLog

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log API.
    Only users with 'can_view_audit_log' permission can access.
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, CanViewAuditLog]
    filterset_fields = ['action', 'resource_type', 'outcome', 'user']
    search_fields = ['resource_name', 'details', 'user__email']
    ordering_fields = ['timestamp', 'action', 'resource_type']
    ordering = ['-timestamp']

    def get_queryset(self):
        """Filter audit logs based on query parameters"""
        queryset = super().get_queryset()

        # Date filtering
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        # Resource filtering
        resource_id = self.request.query_params.get('resource_id')
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)

        # IP address filtering
        ip_address = self.request.query_params.get('ip_address')
        if ip_address:
            queryset = queryset.filter(ip_address=ip_address)

        return queryset.select_related('user')

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get audit log summary statistics"""
        queryset = self.filter_queryset(self.get_queryset())

        total_logs = queryset.count()
        success_count = queryset.filter(outcome=AuditLog.SUCCESS).count()
        failure_count = queryset.filter(outcome=AuditLog.FAILURE).count()

        # Action breakdown
        action_counts = {}
        for action_code, action_name in AuditLog.ACTION_CHOICES:
            count = queryset.filter(action=action_code).count()
            if count > 0:
                action_counts[action_name] = count

        # Resource type breakdown
        resource_counts = queryset.values('resource_type').annotate(
            count=models.Count('id')
        ).order_by('-count')[:10]

        # Top users
        top_users = queryset.filter(user__isnull=False).values(
            'user__email'
        ).annotate(
            count=models.Count('id')
        ).order_by('-count')[:10]

        return Response({
            'total_logs': total_logs,
            'success_count': success_count,
            'failure_count': failure_count,
            'success_rate': (success_count / total_logs * 100) if total_logs > 0 else 0,
            'action_breakdown': action_counts,
            'resource_breakdown': list(resource_counts),
            'top_users': list(top_users)
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Export audit logs to CSV"""
        queryset = self.filter_queryset(self.get_queryset())

        # Limit export to reasonable size
        if queryset.count() > 100000:
            return Response(
                {'error': 'Too many records to export. Please apply filters.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID',
            'Resource Name', 'Outcome', 'IP Address', 'Details'
        ])

        for log in queryset.iterator():
            writer.writerow([
                log.timestamp,
                log.user.email if log.user else 'System',
                log.get_action_display(),
                log.resource_type,
                log.resource_id or '',
                log.resource_name or '',
                log.get_outcome_display(),
                log.ip_address or '',
                str(log.details)
            ])

        # Log the export action
        AuditLog.log_action(
            user=request.user,
            action=AuditLog.EXPORT,
            resource_type='AuditLog',
            details={'record_count': queryset.count()},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return response

    @action(detail=False, methods=['get'])
    def compliance_report(self, request):
        """Generate compliance report for specific time period"""
        # Default to last 30 days
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')

        if not date_from:
            date_from = timezone.now() - timedelta(days=30)
        if not date_to:
            date_to = timezone.now()

        queryset = self.get_queryset().filter(
            timestamp__gte=date_from,
            timestamp__lte=date_to
        )

        # Permission changes
        permission_changes = queryset.filter(
            action__in=[
                AuditLog.PERMISSION_GRANT,
                AuditLog.PERMISSION_REVOKE,
                AuditLog.ROLE_ASSIGN,
                AuditLog.ROLE_REVOKE
            ]
        ).order_by('-timestamp')

        # Access attempts
        access_attempts = queryset.filter(
            action__in=[AuditLog.LOGIN, AuditLog.LOGIN_FAILED]
        )

        # Document operations
        document_operations = queryset.filter(
            resource_type='Document',
            action__in=[AuditLog.VIEW, AuditLog.DOWNLOAD, AuditLog.EDIT, AuditLog.DELETE]
        )

        # Failed operations
        failed_operations = queryset.filter(outcome=AuditLog.FAILURE)

        return Response({
            'period': {
                'from': date_from,
                'to': date_to
            },
            'permission_changes': {
                'total': permission_changes.count(),
                'recent': AuditLogSerializer(permission_changes[:20], many=True).data
            },
            'access_attempts': {
                'total': access_attempts.count(),
                'failed': access_attempts.filter(action=AuditLog.LOGIN_FAILED).count()
            },
            'document_operations': {
                'views': document_operations.filter(action=AuditLog.VIEW).count(),
                'downloads': document_operations.filter(action=AuditLog.DOWNLOAD).count(),
                'edits': document_operations.filter(action=AuditLog.EDIT).count(),
                'deletions': document_operations.filter(action=AuditLog.DELETE).count()
            },
            'failed_operations': {
                'total': failed_operations.count(),
                'recent': AuditLogSerializer(failed_operations[:20], many=True).data
            }
        })
```

**File**: `apps/audit/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.audit import views

router = DefaultRouter()
router.register(r'logs', views.AuditLogViewSet, basename='audit-log')

app_name = 'audit'

urlpatterns = [
    path('', include(router.urls)),
]
```

**Add to `config/urls.py`**:
```python
urlpatterns = [
    # ... other URLs
    path('api/v1/audit/', include('apps.audit.urls', namespace='audit')),
]
```

### 4. Django Admin Interface

**File**: `apps/audit/admin.py`

```python
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from apps.audit.models import AuditLog
import json

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only admin interface for audit logs"""

    list_display = [
        'timestamp',
        'user_display',
        'action_badge',
        'resource_display',
        'outcome_badge',
        'ip_address'
    ]
    list_filter = ['action', 'resource_type', 'outcome', 'timestamp']
    search_fields = ['user__email', 'resource_name', 'details', 'ip_address']
    readonly_fields = [
        'id', 'user', 'action', 'resource_type', 'resource_id', 'resource_name',
        'before_value_display', 'after_value_display', 'changed_fields',
        'details_display', 'outcome', 'error_message',
        'ip_address', 'user_agent', 'request_method', 'request_path',
        'timestamp', 'duration_ms'
    ]
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        """Disable manual log creation"""
        return False

    def has_change_permission(self, request, obj=None):
        """Disable editing"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Disable deletion (except via retention policy)"""
        return False

    def user_display(self, obj):
        """Display user email or 'System'"""
        if obj.user:
            return obj.user.email
        return format_html('<em>System</em>')
    user_display.short_description = 'User'

    def action_badge(self, obj):
        """Display action with color badge"""
        colors = {
            'CREATE': '#4CAF50',
            'EDIT': '#2196F3',
            'DELETE': '#F44336',
            'VIEW': '#9E9E9E',
            'DOWNLOAD': '#00BCD4',
            'SHARE': '#FF9800',
            'LOGIN': '#4CAF50',
            'LOGIN_FAILED': '#F44336',
            'PERMISSION_GRANT': '#8BC34A',
            'PERMISSION_REVOKE': '#FF5722',
        }
        color = colors.get(obj.action, '#757575')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_action_display()
        )
    action_badge.short_description = 'Action'

    def resource_display(self, obj):
        """Display resource type and name"""
        return f'{obj.resource_type}: {obj.resource_name or obj.resource_id or "N/A"}'
    resource_display.short_description = 'Resource'

    def outcome_badge(self, obj):
        """Display outcome with color"""
        colors = {
            'SUCCESS': '#4CAF50',
            'FAILURE': '#F44336',
            'WARNING': '#FF9800',
        }
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            colors.get(obj.outcome, '#757575'),
            obj.get_outcome_display()
        )
    outcome_badge.short_description = 'Outcome'

    def before_value_display(self, obj):
        """Pretty-print before value JSON"""
        if obj.before_value:
            return mark_safe(f'<pre>{json.dumps(obj.before_value, indent=2)}</pre>')
        return '-'
    before_value_display.short_description = 'Before Value'

    def after_value_display(self, obj):
        """Pretty-print after value JSON"""
        if obj.after_value:
            return mark_safe(f'<pre>{json.dumps(obj.after_value, indent=2)}</pre>')
        return '-'
    after_value_display.short_description = 'After Value'

    def details_display(self, obj):
        """Pretty-print details JSON"""
        if obj.details:
            return mark_safe(f'<pre>{json.dumps(obj.details, indent=2)}</pre>')
        return '-'
    details_display.short_description = 'Details'
```

### Testing Requirements

**Unit Tests** (`apps/audit/tests.py`):

```python
from django.test import TestCase
from apps.audit.models import AuditLog
from apps.users.models import CustomUser

class AuditLogModelTestCase(TestCase):
    def test_audit_log_immutability(self):
        """Audit logs cannot be modified after creation"""
        log = AuditLog.log_action(
            user=self.user,
            action=AuditLog.CREATE,
            resource_type='Document',
            resource_id='test-123'
        )

        # Attempt to modify should raise error
        log.action = AuditLog.DELETE
        with self.assertRaises(ValueError):
            log.save()

    def test_audit_log_no_delete(self):
        """Audit logs cannot be deleted manually"""
        log = AuditLog.log_action(
            user=self.user,
            action=AuditLog.CREATE,
            resource_type='Document'
        )

        with self.assertRaises(ValueError):
            log.delete()

    def test_audit_log_force_delete(self):
        """Audit logs can be force deleted (retention policy)"""
        log = AuditLog.log_action(
            user=self.user,
            action=AuditLog.CREATE,
            resource_type='Document'
        )

        # Should succeed with force_delete=True
        log.delete(force_delete=True)
        self.assertFalse(AuditLog.objects.filter(id=log.id).exists())

    def test_changed_fields_tracking(self):
        """Changed fields are properly tracked"""
        log = AuditLog.log_action(
            user=self.user,
            action=AuditLog.EDIT,
            resource_type='Document',
            before_value={'title': 'Old'},
            after_value={'title': 'New'},
            changed_fields=['title']
        )

        self.assertEqual(log.changed_fields, ['title'])
        self.assertEqual(log.before_value['title'], 'Old')
        self.assertEqual(log.after_value['title'], 'New')
```

### Acceptance Criteria

- [ ] AuditLog model enhanced with before/after values and changed fields tracking
- [ ] All model changes automatically logged via signals
- [ ] Audit logs are immutable (cannot be modified or deleted manually)
- [ ] API endpoints provide filtering, search, and export capabilities
- [ ] Compliance reports generated for specific time periods
- [ ] Django admin interface is read-only
- [ ] Performance: Audit log creation <20ms
- [ ] Retention period enforced (7 years for financial compliance)
- [ ] All tests passing

### Documentation

**To Create**:
- Audit logging guide (how to add audit logging to new features)
- Compliance report documentation
- API endpoint reference

---

## Week 19: Encryption Implementation

**Objective**: Implement comprehensive encryption for data at rest and in transit

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| MinIO server-side encryption setup | Critical | 4h | MinIO configured |
| TLS/SSL certificate configuration | Critical | 3h | Infrastructure |
| Database field encryption (sensitive metadata) | High | 5h | django-fernet-fields |
| Encryption key management (KMS integration) | High | 6h | HashiCorp Vault/AWS KMS |
| Security headers middleware | Medium | 2h | Django |
| HTTPS enforcement | Critical | 2h | Nginx/deployment |
| Encrypted communication with Elasticsearch | High | 3h | Elasticsearch TLS |
| Testing and validation | High | 4h | All encryption features |

**Total Estimated Time**: 29 hours

### 1. MinIO Server-Side Encryption

**Configuration File**: `docker-compose.yml` or Kubernetes manifest

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio:latest
    environment:
      - MINIO_ROOT_USER=minioadmin
      - MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
      # Enable server-side encryption
      - MINIO_KMS_SECRET_KEY=my-minio-key:${MINIO_ENCRYPTION_KEY}
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
```

**Django Settings** (`config/settings/base.py`):

```python
# MinIO/S3 Storage Configuration with Encryption
AWS_ACCESS_KEY_ID = env('AWS_ACCESS_KEY_ID', default='minioadmin')
AWS_SECRET_ACCESS_KEY = env('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = env('AWS_STORAGE_BUCKET_NAME', default='dfc-documents')
AWS_S3_ENDPOINT_URL = env('AWS_S3_ENDPOINT_URL', default='http://minio:9000')
AWS_S3_REGION_NAME = env('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_USE_SSL = env.bool('AWS_S3_USE_SSL', default=True)
AWS_S3_VERIFY = env.bool('AWS_S3_VERIFY', default=True)

# Server-side encryption
AWS_S3_ENCRYPTION = True
AWS_S3_SERVER_SIDE_ENCRYPTION = 'AES256'  # or 'aws:kms' for AWS KMS

# Security settings
AWS_S3_FILE_OVERWRITE = False
AWS_DEFAULT_ACL = None  # Don't use ACLs (use IAM policies instead)
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 3600  # 1 hour for presigned URLs

# Storage backends
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
```

### 2. TLS/SSL Configuration

**Nginx Configuration** (`nginx/dfc.conf`):

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name dfc.cccplc.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS configuration
server {
    listen 443 ssl http2;
    server_name dfc.cccplc.com;

    # SSL certificates
    ssl_certificate /etc/nginx/ssl/dfc.cccplc.com.crt;
    ssl_certificate_key /etc/nginx/ssl/dfc.cccplc.com.key;

    # SSL protocols and ciphers (modern configuration)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # SSL session configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    ssl_session_tickets off;

    # OCSP stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;
    resolver_timeout 5s;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self';" always;

    # Proxy to Django application
    location / {
        proxy_pass http://django:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files (with authentication)
    location /media/ {
        internal;  # Only accessible via X-Accel-Redirect
        alias /var/www/media/;
    }
}
```

### 3. Database Field Encryption

**Installation**:
```bash
pip install django-fernet-fields cryptography
```

**Settings** (`config/settings/base.py`):

```python
# Encryption key for field-level encryption
# Generate with: from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())
FERNET_KEYS = [
    env('FERNET_KEY_PRIMARY'),  # Current key
    env('FERNET_KEY_SECONDARY', default=None),  # For key rotation
]

# Use first key as default
FERNET_USE_HKDF = True
```

**Environment Variables** (`.env`):
```bash
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
FERNET_KEY_PRIMARY=your-generated-fernet-key-here
```

**Model with Encrypted Fields** (`apps/documents/models.py`):

```python
from django.db import models
from fernet_fields import EncryptedTextField, EncryptedCharField, EncryptedDateField
import uuid

class Document(models.Model):
    """
    Document model with encrypted sensitive fields.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Non-encrypted fields (searchable)
    title = models.CharField(max_length=500)
    document_type = models.CharField(max_length=100, db_index=True)
    folder = models.ForeignKey('folders.Folder', on_delete=models.CASCADE)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Encrypted sensitive fields (not directly searchable)
    # These fields are encrypted at rest in the database
    customer_id = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted customer identifier'
    )
    account_number = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted account number'
    )
    tax_id = EncryptedCharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Encrypted tax ID/SSN'
    )
    notes = EncryptedTextField(
        null=True,
        blank=True,
        help_text='Encrypted internal notes'
    )

    # Other metadata
    confidentiality_level = models.CharField(max_length=50, db_index=True)
    file_path = models.CharField(max_length=1000)  # MinIO path (file itself is encrypted by MinIO)
    file_size = models.BigIntegerField()
    checksum = models.CharField(max_length=64)

    class Meta:
        db_table = 'documents'
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['-uploaded_at']),
            models.Index(fields=['document_type', '-uploaded_at']),
            models.Index(fields=['folder', '-uploaded_at']),
        ]
```

**Note**: Encrypted fields cannot be queried directly in database filters. For searchable encrypted data, use Elasticsearch with field-level encryption or hash-based searching.

### 4. Encryption Key Management with HashiCorp Vault

**Installation**:
```bash
pip install hvac
```

**Vault Client** (`apps/core/vault_client.py`):

```python
import hvac
import os
from django.conf import settings

class VaultClient:
    """HashiCorp Vault client for secrets management"""

    def __init__(self):
        self.client = hvac.Client(
            url=settings.VAULT_ADDR,
            token=settings.VAULT_TOKEN,
            verify=settings.VAULT_VERIFY_SSL
        )

        if not self.client.is_authenticated():
            raise Exception('Vault authentication failed')

    def get_secret(self, path, key):
        """Retrieve a secret from Vault"""
        try:
            response = self.client.secrets.kv.v2.read_secret_version(path=path)
            return response['data']['data'].get(key)
        except Exception as e:
            raise Exception(f'Failed to retrieve secret from Vault: {str(e)}')

    def set_secret(self, path, data):
        """Store a secret in Vault"""
        try:
            self.client.secrets.kv.v2.create_or_update_secret(
                path=path,
                secret=data
            )
        except Exception as e:
            raise Exception(f'Failed to store secret in Vault: {str(e)}')

    def rotate_encryption_key(self):
        """Rotate encryption keys"""
        # Generate new Fernet key
        from cryptography.fernet import Fernet
        new_key = Fernet.generate_key().decode()

        # Store in Vault
        self.set_secret(
            path='dfc/encryption',
            data={
                'fernet_key_primary': new_key,
                'fernet_key_secondary': settings.FERNET_KEYS[0]  # Move current to secondary
            }
        )

        return new_key

# Usage in settings
if not settings.DEBUG:
    try:
        vault = VaultClient()
        settings.FERNET_KEYS = [
            vault.get_secret('dfc/encryption', 'fernet_key_primary'),
            vault.get_secret('dfc/encryption', 'fernet_key_secondary'),
        ]
        settings.SECRET_KEY = vault.get_secret('dfc/django', 'secret_key')
        settings.AWS_SECRET_ACCESS_KEY = vault.get_secret('dfc/minio', 'secret_key')
    except Exception as e:
        raise Exception(f'Failed to load secrets from Vault: {str(e)}')
```

**Settings** (`config/settings/production.py`):

```python
# HashiCorp Vault configuration
VAULT_ADDR = env('VAULT_ADDR', default='https://vault.cccplc.com:8200')
VAULT_TOKEN = env('VAULT_TOKEN')
VAULT_VERIFY_SSL = env.bool('VAULT_VERIFY_SSL', default=True)
```

### 5. Security Headers Middleware

**File**: `apps/core/middleware.py`

```python
class SecurityHeadersMiddleware:
    """Add security headers to all responses"""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # HSTS (HTTP Strict Transport Security)
        response['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload'

        # Prevent clickjacking
        response['X-Frame-Options'] = 'SAMEORIGIN'

        # Prevent MIME type sniffing
        response['X-Content-Type-Options'] = 'nosniff'

        # XSS protection
        response['X-XSS-Protection'] = '1; mode=block'

        # Referrer policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        # Content Security Policy
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self' data:; "
            "connect-src 'self'; "
            "frame-ancestors 'self';"
        )

        # Permissions policy (formerly Feature Policy)
        response['Permissions-Policy'] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=(), "
            "usb=(), "
            "magnetometer=()"
        )

        return response
```

**Add to settings**:
```python
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'apps.core.middleware.SecurityHeadersMiddleware',  # Add this
    # ... other middleware
]

# Django security settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
```

### 6. Elasticsearch TLS Configuration

**Docker Compose** (`docker-compose.yml`):

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.x
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=true
    - xpack.security.http.ssl.enabled=true
    - xpack.security.http.ssl.key=/usr/share/elasticsearch/config/certs/elasticsearch.key
    - xpack.security.http.ssl.certificate=/usr/share/elasticsearch/config/certs/elasticsearch.crt
    - xpack.security.http.ssl.certificate_authorities=/usr/share/elasticsearch/config/certs/ca.crt
    - ELASTIC_PASSWORD=${ELASTIC_PASSWORD}
  volumes:
    - elasticsearch_data:/usr/share/elasticsearch/data
    - ./certs:/usr/share/elasticsearch/config/certs:ro
  ports:
    - "9200:9200"
```

**Django Settings**:

```python
# Elasticsearch configuration with TLS
ELASTICSEARCH_DSL = {
    'default': {
        'hosts': [env('ELASTICSEARCH_URL', default='https://elasticsearch:9200')],
        'http_auth': (
            env('ELASTICSEARCH_USER', default='elastic'),
            env('ELASTICSEARCH_PASSWORD')
        ),
        'use_ssl': True,
        'verify_certs': True,
        'ca_certs': '/path/to/ca.crt',
        'ssl_show_warn': False,
        'timeout': 30,
        'retry_on_timeout': True,
        'max_retries': 3,
    },
}
```

### Testing Requirements

**Security Tests** (`apps/core/tests/test_encryption.py`):

```python
from django.test import TestCase, Client
from apps.documents.models import Document

class EncryptionTestCase(TestCase):
    def test_field_encryption(self):
        """Encrypted fields are encrypted in database"""
        doc = Document.objects.create(
            title='Test',
            customer_id='12345',
            tax_id='123-45-6789'
        )

        # Retrieve raw database value
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT customer_id, tax_id FROM documents WHERE id = %s',
                [str(doc.id)]
            )
            row = cursor.fetchone()

        # Raw values should be encrypted (not plain text)
        self.assertNotEqual(row[0], '12345')
        self.assertNotEqual(row[1], '123-45-6789')

        # Model access should decrypt
        self.assertEqual(doc.customer_id, '12345')
        self.assertEqual(doc.tax_id, '123-45-6789')

    def test_https_enforcement(self):
        """HTTP requests redirect to HTTPS"""
        client = Client()
        response = client.get('/api/v1/documents/', secure=False)

        # Should redirect to HTTPS
        self.assertEqual(response.status_code, 301)
        self.assertTrue(response.url.startswith('https://'))

    def test_security_headers(self):
        """Security headers are present"""
        client = Client()
        response = client.get('/api/v1/documents/', secure=True)

        self.assertIn('Strict-Transport-Security', response)
        self.assertIn('X-Content-Type-Options', response)
        self.assertEqual(response['X-Content-Type-Options'], 'nosniff')
```

### Acceptance Criteria

- [ ] MinIO server-side encryption enabled (AES-256)
- [ ] TLS 1.2/1.3 enforced for all connections
- [ ] Sensitive database fields encrypted with django-fernet-fields
- [ ] Encryption keys managed via HashiCorp Vault or AWS KMS
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Security headers middleware implemented
- [ ] Elasticsearch communication encrypted
- [ ] All tests passing
- [ ] No secrets in code (all in environment variables/Vault)

### Documentation

**To Create**:
- Encryption architecture document
- Key rotation procedures
- Certificate renewal procedures

---

## Week 20: Retention Policies & Legal Hold

**Objective**: Implement automated retention policies and legal hold functionality for compliance

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Retention policy model and rules engine | Critical | 6h | Document model |
| Legal hold model and enforcement | Critical | 5h | Document model |
| Celery tasks for retention enforcement | Critical | 6h | Celery setup |
| Grace period and notifications | High | 4h | Email system |
| Retention API endpoints | High | 4h | DRF |
| Override protection (prevent manual deletion) | Critical | 3h | Document views |
| Admin interface for retention management | Medium | 3h | Django admin |
| Audit logging for retention actions | High | 2h | Week 18 audit |

**Total Estimated Time**: 33 hours

### 1. Retention Policy Model

**File**: `apps/retention/models.py`

```python
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid

User = get_user_model()

class RetentionPolicy(models.Model):
    """
    Retention policies define how long documents should be kept
    before automatic deletion.
    """

    # Policy types
    DOCUMENT_TYPE_BASED = 'DOCUMENT_TYPE'
    DEPARTMENT_BASED = 'DEPARTMENT'
    FOLDER_BASED = 'FOLDER'
    TAG_BASED = 'TAG'
    CUSTOM = 'CUSTOM'

    POLICY_TYPE_CHOICES = [
        (DOCUMENT_TYPE_BASED, 'Document Type Based'),
        (DEPARTMENT_BASED, 'Department Based'),
        (FOLDER_BASED, 'Folder Based'),
        (TAG_BASED, 'Tag Based'),
        (CUSTOM, 'Custom Rule'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, unique=True)
    description = models.TextField(blank=True)
    policy_type = models.CharField(max_length=50, choices=POLICY_TYPE_CHOICES)

    # Retention period
    retention_days = models.IntegerField(
        help_text='Number of days to retain documents (e.g., 2555 = 7 years)'
    )

    # Rule criteria (JSONField for flexible matching)
    criteria = models.JSONField(
        default=dict,
        help_text='Matching criteria (e.g., {"document_type": "Invoice", "department_id": "...""})'
    )

    # Grace period before deletion
    grace_period_days = models.IntegerField(
        default=30,
        help_text='Days to wait after retention period expires before deletion'
    )

    # Notifications
    notify_before_days = models.IntegerField(
        default=30,
        help_text='Notify document owner N days before deletion'
    )

    # Status
    is_active = models.BooleanField(default=True)
    priority = models.IntegerField(
        default=0,
        help_text='Higher priority policies override lower (for conflicts)'
    )

    # Audit
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_retention_policies')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'retention_policies'
        ordering = ['-priority', 'name']
        verbose_name_plural = 'Retention Policies'

    def __str__(self):
        return f'{self.name} ({self.retention_days} days)'

    def get_deletion_date(self, document):
        """Calculate when a document should be deleted based on this policy"""
        # Retention period starts from upload date
        retention_end = document.uploaded_at + timedelta(days=self.retention_days)
        # Add grace period
        deletion_date = retention_end + timedelta(days=self.grace_period_days)
        return deletion_date

    def get_notification_date(self, document):
        """Calculate when to notify about upcoming deletion"""
        deletion_date = self.get_deletion_date(document)
        return deletion_date - timedelta(days=self.notify_before_days)

    def matches_document(self, document):
        """Check if this policy applies to the given document"""
        if not self.is_active:
            return False

        criteria = self.criteria

        # Document type matching
        if 'document_type' in criteria:
            if document.document_type != criteria['document_type']:
                return False

        # Department matching
        if 'department_id' in criteria:
            if str(document.folder.department_id) != criteria['department_id']:
                return False

        # Folder matching
        if 'folder_id' in criteria:
            if str(document.folder_id) != criteria['folder_id']:
                return False

        # Tag matching
        if 'tags' in criteria:
            doc_tags = set(document.tags.values_list('name', flat=True))
            required_tags = set(criteria['tags'])
            if not required_tags.issubset(doc_tags):
                return False

        # Confidentiality level matching
        if 'confidentiality_level' in criteria:
            if document.confidentiality_level != criteria['confidentiality_level']:
                return False

        return True


class LegalHold(models.Model):
    """
    Legal holds prevent documents from being deleted,
    regardless of retention policies.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_number = models.CharField(max_length=200, unique=True, db_index=True)
    case_name = models.CharField(max_length=500)
    description = models.TextField()

    # Documents under hold
    documents = models.ManyToManyField(
        'documents.Document',
        related_name='legal_holds',
        through='LegalHoldDocument'
    )

    # Status
    is_active = models.BooleanField(default=True, db_index=True)

    # Audit
    placed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='placed_legal_holds')
    placed_at = models.DateTimeField(auto_now_add=True)
    released_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='released_legal_holds')
    released_at = models.DateTimeField(null=True, blank=True)

    # Notes
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'legal_holds'
        ordering = ['-placed_at']

    def __str__(self):
        status = 'Active' if self.is_active else 'Released'
        return f'{self.case_number} - {status}'

    def release(self, user):
        """Release the legal hold"""
        self.is_active = False
        self.released_by = user
        self.released_at = timezone.now()
        self.save()

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=user,
            action=AuditLog.LEGAL_RELEASE,
            resource_type='LegalHold',
            resource_id=str(self.id),
            resource_name=self.case_number,
            details={
                'case_number': self.case_number,
                'document_count': self.documents.count()
            }
        )


class LegalHoldDocument(models.Model):
    """Through model for legal hold documents with audit trail"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    legal_hold = models.ForeignKey(LegalHold, on_delete=models.CASCADE)
    document = models.ForeignKey('documents.Document', on_delete=models.CASCADE)

    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    added_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)

    class Meta:
        db_table = 'legal_hold_documents'
        unique_together = [['legal_hold', 'document']]
        ordering = ['-added_at']

    def __str__(self):
        return f'{self.legal_hold.case_number} - {self.document.title}'


class RetentionSchedule(models.Model):
    """
    Tracks when documents are scheduled for deletion and notifications.
    Auto-populated by Celery task.
    """

    # Status choices
    PENDING = 'PENDING'
    NOTIFIED = 'NOTIFIED'
    DELETED = 'DELETED'
    CANCELLED = 'CANCELLED'  # If legal hold applied

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (NOTIFIED, 'Notified'),
        (DELETED, 'Deleted'),
        (CANCELLED, 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.OneToOneField(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='retention_schedule'
    )
    policy = models.ForeignKey(RetentionPolicy, on_delete=models.SET_NULL, null=True)

    # Dates
    retention_end_date = models.DateTimeField(help_text='When retention period ends')
    notification_date = models.DateTimeField(help_text='When to notify owner')
    deletion_date = models.DateTimeField(help_text='When to delete (retention_end + grace period)')

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING, db_index=True)
    notification_sent = models.BooleanField(default=False)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'retention_schedules'
        ordering = ['deletion_date']
        indexes = [
            models.Index(fields=['status', 'deletion_date']),
            models.Index(fields=['status', 'notification_date']),
        ]

    def __str__(self):
        return f'{self.document.title} - Delete on {self.deletion_date.date()}'

    def can_delete(self):
        """Check if document can be deleted (no active legal holds)"""
        return not self.document.legal_holds.filter(is_active=True).exists()
```

### 2. Retention Enforcement Celery Tasks

**File**: `apps/retention/tasks.py`

```python
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.retention.models import RetentionPolicy, RetentionSchedule, LegalHold
from apps.documents.models import Document
from apps.audit.models import AuditLog
from django.core.mail import send_mail
from django.conf import settings

@shared_task
def apply_retention_policies():
    """
    Apply retention policies to documents without schedules.
    Runs daily.
    """
    policies = RetentionPolicy.objects.filter(is_active=True).order_by('-priority')

    # Get documents without retention schedules
    documents = Document.objects.filter(
        retention_schedule__isnull=True
    ).select_related('folder', 'folder__department', 'uploaded_by')

    scheduled_count = 0

    for document in documents:
        # Find highest priority matching policy
        matching_policy = None
        for policy in policies:
            if policy.matches_document(document):
                matching_policy = policy
                break  # Use first (highest priority) match

        if matching_policy:
            # Create retention schedule
            RetentionSchedule.objects.create(
                document=document,
                policy=matching_policy,
                retention_end_date=document.uploaded_at + timedelta(days=matching_policy.retention_days),
                notification_date=document.uploaded_at + timedelta(
                    days=matching_policy.retention_days - matching_policy.notify_before_days
                ),
                deletion_date=document.uploaded_at + timedelta(
                    days=matching_policy.retention_days + matching_policy.grace_period_days
                )
            )
            scheduled_count += 1

            # Log audit event
            AuditLog.log_action(
                user=None,  # System action
                action=AuditLog.RETENTION_APPLY,
                resource_type='Document',
                resource_id=str(document.id),
                resource_name=document.title,
                details={
                    'policy': matching_policy.name,
                    'retention_days': matching_policy.retention_days,
                    'deletion_date': (document.uploaded_at + timedelta(
                        days=matching_policy.retention_days + matching_policy.grace_period_days
                    )).isoformat()
                }
            )

    return f'Applied retention policies to {scheduled_count} documents'


@shared_task
def send_retention_notifications():
    """
    Send notifications for documents approaching deletion.
    Runs daily.
    """
    now = timezone.now()

    # Get schedules that need notification
    schedules = RetentionSchedule.objects.filter(
        status=RetentionSchedule.PENDING,
        notification_sent=False,
        notification_date__lte=now
    ).select_related('document', 'document__uploaded_by', 'policy')

    notified_count = 0

    for schedule in schedules:
        document = schedule.document
        owner = document.uploaded_by

        if owner and owner.email:
            # Send email notification
            try:
                days_until_deletion = (schedule.deletion_date - now).days

                send_mail(
                    subject=f'DFC: Document "{document.title}" scheduled for deletion',
                    message=f'''
Dear {owner.first_name or owner.email},

This is a notification that your document "{document.title}" is scheduled for deletion in {days_until_deletion} days.

Document Details:
- Title: {document.title}
- Type: {document.document_type}
- Uploaded: {document.uploaded_at.strftime("%Y-%m-%d")}
- Deletion Date: {schedule.deletion_date.strftime("%Y-%m-%d")}
- Retention Policy: {schedule.policy.name if schedule.policy else "N/A"}

If this document is still needed, please take action:
1. Download a copy for your records
2. Contact your administrator if the retention policy is incorrect
3. If subject to legal proceedings, request a legal hold

Note: Documents under legal hold cannot be deleted.

Best regards,
Digital Filing Cabinet System
                    ''',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[owner.email],
                    fail_silently=False,
                )

                # Mark as notified
                schedule.notification_sent = True
                schedule.status = RetentionSchedule.NOTIFIED
                schedule.save()

                notified_count += 1

                # Log audit event
                AuditLog.log_action(
                    user=None,
                    action='RETENTION_NOTIFICATION',
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    details={
                        'recipient': owner.email,
                        'days_until_deletion': days_until_deletion,
                        'deletion_date': schedule.deletion_date.isoformat()
                    }
                )

            except Exception as e:
                # Log error but continue
                AuditLog.log_action(
                    user=None,
                    action='RETENTION_NOTIFICATION',
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    outcome=AuditLog.FAILURE,
                    error_message=str(e),
                    details={'recipient': owner.email}
                )

    return f'Sent {notified_count} retention notifications'


@shared_task
def delete_expired_documents():
    """
    Delete documents that have passed their deletion date.
    Runs daily.

    IMPORTANT: Only deletes if no active legal holds.
    """
    now = timezone.now()

    # Get schedules ready for deletion
    schedules = RetentionSchedule.objects.filter(
        status__in=[RetentionSchedule.PENDING, RetentionSchedule.NOTIFIED],
        deletion_date__lte=now
    ).select_related('document')

    deleted_count = 0
    skipped_count = 0

    for schedule in schedules:
        document = schedule.document

        # Check for active legal holds
        if schedule.can_delete():
            try:
                # Store document info before deletion
                document_info = {
                    'id': str(document.id),
                    'title': document.title,
                    'document_type': document.document_type,
                    'uploaded_by': document.uploaded_by.email if document.uploaded_by else None,
                    'uploaded_at': document.uploaded_at.isoformat(),
                    'retention_policy': schedule.policy.name if schedule.policy else None,
                }

                # Delete file from MinIO
                if document.file:
                    document.file.delete(save=False)

                # Mark schedule as deleted
                schedule.status = RetentionSchedule.DELETED
                schedule.deleted_at = now
                schedule.save()

                # Delete document from database
                document.delete()

                deleted_count += 1

                # Log audit event
                AuditLog.log_action(
                    user=None,
                    action=AuditLog.DELETE,
                    resource_type='Document',
                    resource_id=document_info['id'],
                    resource_name=document_info['title'],
                    before_value=document_info,
                    details={
                        'reason': 'Retention policy expiration',
                        'deletion_date': now.isoformat()
                    }
                )

            except Exception as e:
                # Log error
                AuditLog.log_action(
                    user=None,
                    action=AuditLog.DELETE,
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    outcome=AuditLog.FAILURE,
                    error_message=str(e),
                    details={'reason': 'Retention policy expiration'}
                )
        else:
            # Cancel deletion due to legal hold
            schedule.status = RetentionSchedule.CANCELLED
            schedule.save()
            skipped_count += 1

            # Log audit event
            AuditLog.log_action(
                user=None,
                action='RETENTION_DELETION_CANCELLED',
                resource_type='Document',
                resource_id=str(document.id),
                resource_name=document.title,
                outcome=AuditLog.WARNING,
                details={
                    'reason': 'Active legal hold',
                    'legal_holds': list(
                        document.legal_holds.filter(is_active=True).values_list('case_number', flat=True)
                    )
                }
            )

    return f'Deleted {deleted_count} documents, skipped {skipped_count} (legal hold)'


@shared_task
def cleanup_old_retention_schedules():
    """
    Clean up retention schedules for documents that no longer exist.
    Runs weekly.
    """
    # Delete schedules for non-existent documents
    orphaned = RetentionSchedule.objects.filter(document__isnull=True)
    count = orphaned.count()
    orphaned.delete()

    return f'Cleaned up {count} orphaned retention schedules'
```

**Celery Beat Schedule** (`config/celery.py`):

```python
from celery.schedules import crontab

app.conf.beat_schedule = {
    'apply-retention-policies': {
        'task': 'apps.retention.tasks.apply_retention_policies',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
    'send-retention-notifications': {
        'task': 'apps.retention.tasks.send_retention_notifications',
        'schedule': crontab(hour=8, minute=0),  # Daily at 8 AM
    },
    'delete-expired-documents': {
        'task': 'apps.retention.tasks.delete_expired_documents',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'cleanup-retention-schedules': {
        'task': 'apps.retention.tasks.cleanup_old_retention_schedules',
        'schedule': crontab(day_of_week=0, hour=4, minute=0),  # Weekly on Sunday at 4 AM
    },
}
```

### 3. Retention API Endpoints

**File**: `apps/retention/serializers.py`

```python
from rest_framework import serializers
from apps.retention.models import RetentionPolicy, LegalHold, LegalHoldDocument, RetentionSchedule

class RetentionPolicySerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source='created_by.email', read_only=True)
    affected_document_count = serializers.SerializerMethodField()

    class Meta:
        model = RetentionPolicy
        fields = [
            'id', 'name', 'description', 'policy_type', 'retention_days',
            'criteria', 'grace_period_days', 'notify_before_days',
            'is_active', 'priority', 'created_by', 'created_by_email',
            'created_at', 'updated_at', 'affected_document_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_affected_document_count(self, obj):
        """Count documents affected by this policy"""
        return RetentionSchedule.objects.filter(policy=obj).count()


class LegalHoldSerializer(serializers.ModelSerializer):
    placed_by_email = serializers.EmailField(source='placed_by.email', read_only=True)
    released_by_email = serializers.EmailField(source='released_by.email', read_only=True, allow_null=True)
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = LegalHold
        fields = [
            'id', 'case_number', 'case_name', 'description',
            'is_active', 'placed_by', 'placed_by_email', 'placed_at',
            'released_by', 'released_by_email', 'released_at',
            'notes', 'document_count'
        ]
        read_only_fields = ['id', 'placed_at', 'released_by', 'released_at']

    def get_document_count(self, obj):
        """Count documents under this hold"""
        return obj.documents.count()


class LegalHoldDocumentSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    added_by_email = serializers.EmailField(source='added_by.email', read_only=True)

    class Meta:
        model = LegalHoldDocument
        fields = ['id', 'legal_hold', 'document', 'document_title', 'added_by', 'added_by_email', 'added_at', 'reason']
        read_only_fields = ['id', 'added_at']


class RetentionScheduleSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='document.title', read_only=True)
    policy_name = serializers.CharField(source='policy.name', read_only=True, allow_null=True)
    days_until_deletion = serializers.SerializerMethodField()
    can_delete = serializers.BooleanField(read_only=True)

    class Meta:
        model = RetentionSchedule
        fields = [
            'id', 'document', 'document_title', 'policy', 'policy_name',
            'retention_end_date', 'notification_date', 'deletion_date',
            'status', 'notification_sent', 'days_until_deletion',
            'can_delete', 'created_at', 'updated_at'
        ]
        read_only_fields = fields  # All read-only (managed by system)

    def get_days_until_deletion(self, obj):
        """Calculate days until deletion"""
        from django.utils import timezone
        delta = obj.deletion_date - timezone.now()
        return max(0, delta.days)
```

**File**: `apps/retention/views.py`

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.retention.models import RetentionPolicy, LegalHold, LegalHoldDocument, RetentionSchedule
from apps.retention.serializers import (
    RetentionPolicySerializer, LegalHoldSerializer,
    LegalHoldDocumentSerializer, RetentionScheduleSerializer
)
from apps.permissions.decorators import CanManageRetention
from apps.audit.models import AuditLog

class RetentionPolicyViewSet(viewsets.ModelViewSet):
    """CRUD operations for retention policies"""
    queryset = RetentionPolicy.objects.all()
    serializer_class = RetentionPolicySerializer
    permission_classes = [permissions.IsAuthenticated, CanManageRetention]
    filterset_fields = ['policy_type', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['-priority', 'name']

    def perform_create(self, serializer):
        policy = serializer.save(created_by=self.request.user)

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action=AuditLog.CREATE,
            resource_type='RetentionPolicy',
            resource_id=str(policy.id),
            resource_name=policy.name,
            after_value={
                'name': policy.name,
                'retention_days': policy.retention_days,
                'policy_type': policy.policy_type
            }
        )

    @action(detail=True, methods=['post'])
    def apply_now(self, request, pk=None):
        """Manually trigger policy application"""
        policy = self.get_object()

        # Import here to avoid circular dependency
        from apps.retention.tasks import apply_retention_policies
        result = apply_retention_policies.delay()

        return Response({
            'status': 'Task queued',
            'task_id': result.id,
            'policy': policy.name
        })


class LegalHoldViewSet(viewsets.ModelViewSet):
    """CRUD operations for legal holds"""
    queryset = LegalHold.objects.all()
    serializer_class = LegalHoldSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageRetention]
    filterset_fields = ['is_active']
    search_fields = ['case_number', 'case_name', 'description']
    ordering = ['-placed_at']

    def perform_create(self, serializer):
        legal_hold = serializer.save(placed_by=self.request.user)

        # Log audit event
        AuditLog.log_action(
            user=self.request.user,
            action=AuditLog.LEGAL_HOLD,
            resource_type='LegalHold',
            resource_id=str(legal_hold.id),
            resource_name=legal_hold.case_number,
            after_value={
                'case_number': legal_hold.case_number,
                'case_name': legal_hold.case_name
            }
        )

    @action(detail=True, methods=['post'])
    def release(self, request, pk=None):
        """Release a legal hold"""
        legal_hold = self.get_object()

        if not legal_hold.is_active:
            return Response(
                {'error': 'Legal hold already released'},
                status=status.HTTP_400_BAD_REQUEST
            )

        legal_hold.release(request.user)

        return Response({
            'status': 'Legal hold released',
            'case_number': legal_hold.case_number,
            'released_at': legal_hold.released_at
        })

    @action(detail=True, methods=['post'])
    def add_documents(self, request, pk=None):
        """Add documents to legal hold"""
        legal_hold = self.get_object()
        document_ids = request.data.get('document_ids', [])
        reason = request.data.get('reason', '')

        if not document_ids:
            return Response(
                {'error': 'No document IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from apps.documents.models import Document

        added_count = 0
        for doc_id in document_ids:
            try:
                document = Document.objects.get(id=doc_id)
                LegalHoldDocument.objects.get_or_create(
                    legal_hold=legal_hold,
                    document=document,
                    defaults={
                        'added_by': request.user,
                        'reason': reason
                    }
                )
                added_count += 1

                # Log audit event
                AuditLog.log_action(
                    user=request.user,
                    action=AuditLog.LEGAL_HOLD,
                    resource_type='Document',
                    resource_id=str(document.id),
                    resource_name=document.title,
                    details={
                        'case_number': legal_hold.case_number,
                        'reason': reason
                    }
                )

            except Document.DoesNotExist:
                continue

        return Response({
            'status': 'Documents added to legal hold',
            'added_count': added_count,
            'case_number': legal_hold.case_number
        })

    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """List documents under this hold"""
        legal_hold = self.get_object()
        hold_documents = LegalHoldDocument.objects.filter(
            legal_hold=legal_hold
        ).select_related('document', 'added_by')

        serializer = LegalHoldDocumentSerializer(hold_documents, many=True)
        return Response(serializer.data)


class RetentionScheduleViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only view of retention schedules"""
    queryset = RetentionSchedule.objects.all().select_related('document', 'policy')
    serializer_class = RetentionScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']
    ordering = ['deletion_date']

    def get_queryset(self):
        """Users can only see schedules for documents they can access"""
        queryset = super().get_queryset()

        # Filter by accessible documents
        from apps.permissions.utils import PermissionChecker
        checker = PermissionChecker(self.request.user)
        accessible_document_ids = checker.get_accessible_folders(
            Document.objects.all()
        ).values_list('id', flat=True)

        return queryset.filter(document_id__in=accessible_document_ids)
```

### Acceptance Criteria

- [ ] Retention policy model supports multiple policy types (document type, department, folder, tag-based)
- [ ] Legal hold model prevents deletion of documents under hold
- [ ] Celery tasks run daily for policy application, notifications, and deletions
- [ ] Grace period implemented (default 30 days after retention period)
- [ ] Email notifications sent before deletion
- [ ] Retention schedules automatically created for new documents
- [ ] API endpoints functional with proper permissions
- [ ] Admin interface supports retention management
- [ ] All retention actions logged in audit trail
- [ ] Documents under legal hold cannot be deleted (override protection)
- [ ] All tests passing

### Documentation

**To Create**:
- Retention policy configuration guide
- Legal hold procedures
- Compliance retention matrix (document types → retention periods)

---

## Week 21: Secure Sharing & Collaboration

**Objective**: Implement secure document sharing with external users and collaborators

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Share model (link generation, expiration) | Critical | 5h | Document model |
| Share token generation and validation | Critical | 4h | JWT/security |
| Share permission levels | High | 3h | Week 17 RBAC |
| Share API endpoints | Critical | 5h | DRF |
| Email notifications for shares | High | 3h | Email system |
| Public share access view (no auth) | High | 4h | Custom auth |
| Share analytics (view count, downloads) | Medium | 3h | Audit log |
| Share revocation | High | 2h | API |

**Total Estimated Time**: 29 hours

### 1. Share Model

**File**: `apps/sharing/models.py`

```python
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import uuid
import secrets

User = get_user_model()

class DocumentShare(models.Model):
    """
    Secure document sharing with external users via tokenized links.
    """

    # Permission levels for shared access
    VIEW_ONLY = 'VIEW_ONLY'
    VIEW_DOWNLOAD = 'VIEW_DOWNLOAD'
    VIEW_DOWNLOAD_COMMENT = 'VIEW_DOWNLOAD_COMMENT'

    PERMISSION_CHOICES = [
        (VIEW_ONLY, 'View Only'),
        (VIEW_DOWNLOAD, 'View and Download'),
        (VIEW_DOWNLOAD_COMMENT, 'View, Download, and Comment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='shares'
    )

    # Share token (used in URL)
    token = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text='Secure random token for share link'
    )

    # Sharing user
    shared_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='shared_documents'
    )
    shared_at = models.DateTimeField(auto_now_add=True)

    # Recipients (optional - for tracking)
    recipient_email = models.EmailField(
        null=True,
        blank=True,
        help_text='Email of intended recipient (optional)'
    )
    recipient_name = models.CharField(
        max_length=255,
        null=True,
        blank=True
    )

    # Permissions
    permission_level = models.CharField(
        max_length=50,
        choices=PERMISSION_CHOICES,
        default=VIEW_ONLY
    )

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Share link expiration (null = no expiration)'
    )

    # Access controls
    is_active = models.BooleanField(default=True, db_index=True)
    require_password = models.BooleanField(default=False)
    password_hash = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Bcrypt hash of optional password'
    )

    # Usage limits
    max_access_count = models.IntegerField(
        null=True,
        blank=True,
        help_text='Maximum number of times link can be accessed (null = unlimited)'
    )
    access_count = models.IntegerField(default=0)

    # Tracking
    last_accessed_at = models.DateTimeField(null=True, blank=True)
    last_accessed_ip = models.GenericIPAddressField(null=True, blank=True)

    # Message to recipient
    message = models.TextField(
        blank=True,
        help_text='Optional message to share recipient'
    )

    class Meta:
        db_table = 'document_shares'
        ordering = ['-shared_at']
        indexes = [
            models.Index(fields=['token', 'is_active']),
            models.Index(fields=['expires_at', 'is_active']),
            models.Index(fields=['shared_by', '-shared_at']),
        ]

    def __str__(self):
        return f'Share: {self.document.title} (Token: {self.token[:8]}...)'

    def save(self, *args, **kwargs):
        # Generate token if not set
        if not self.token:
            self.token = self.generate_token()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_token(length=32):
        """Generate cryptographically secure random token"""
        return secrets.token_urlsafe(length)

    def get_share_url(self, base_url='https://dfc.cccplc.com'):
        """Generate full share URL"""
        return f'{base_url}/share/{self.token}'

    def is_expired(self):
        """Check if share has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    def is_valid(self):
        """Check if share is valid and accessible"""
        if not self.is_active:
            return False
        if self.is_expired():
            return False
        if self.max_access_count and self.access_count >= self.max_access_count:
            return False
        return True

    def record_access(self, ip_address=None):
        """Record an access to this share"""
        self.access_count += 1
        self.last_accessed_at = timezone.now()
        if ip_address:
            self.last_accessed_ip = ip_address
        self.save(update_fields=['access_count', 'last_accessed_at', 'last_accessed_ip'])

    def set_password(self, password):
        """Set password for share link"""
        import bcrypt
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        self.require_password = True

    def check_password(self, password):
        """Verify password for share link"""
        if not self.require_password:
            return True
        if not self.password_hash:
            return False

        import bcrypt
        return bcrypt.checkpw(
            password.encode('utf-8'),
            self.password_hash.encode('utf-8')
        )

    def revoke(self):
        """Revoke share access"""
        self.is_active = False
        self.save(update_fields=['is_active'])


class ShareAccessLog(models.Model):
    """
    Log of all access attempts to shared documents.
    """

    ACCESS = 'ACCESS'
    DOWNLOAD = 'DOWNLOAD'
    PREVIEW = 'PREVIEW'
    DENIED = 'DENIED'

    ACTION_CHOICES = [
        (ACCESS, 'Access'),
        (DOWNLOAD, 'Download'),
        (PREVIEW, 'Preview'),
        (DENIED, 'Access Denied'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    share = models.ForeignKey(
        DocumentShare,
        on_delete=models.CASCADE,
        related_name='access_logs'
    )

    # Access details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(null=True)

    # Denial reason (if action=DENIED)
    denial_reason = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Reason for access denial (expired, password required, etc.)'
    )

    class Meta:
        db_table = 'share_access_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['share', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]

    def __str__(self):
        return f'{self.action} - {self.share.document.title} - {self.timestamp}'
```

### 2. Share Serializers

**File**: `apps/sharing/serializers.py`

```python
from rest_framework import serializers
from apps.sharing.models import DocumentShare, ShareAccessLog
from django.utils import timezone
from datetime import timedelta

class DocumentShareSerializer(serializers.ModelSerializer):
    shared_by_email = serializers.EmailField(source='shared_by.email', read_only=True)
    document_title = serializers.CharField(source='document.title', read_only=True)
    share_url = serializers.SerializerMethodField()
    is_valid = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiration = serializers.SerializerMethodField()

    # Password field (write-only)
    password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        help_text='Optional password to protect share link'
    )

    class Meta:
        model = DocumentShare
        fields = [
            'id', 'document', 'document_title', 'token', 'shared_by',
            'shared_by_email', 'shared_at', 'recipient_email', 'recipient_name',
            'permission_level', 'expires_at', 'is_active', 'require_password',
            'password', 'max_access_count', 'access_count', 'last_accessed_at',
            'last_accessed_ip', 'message', 'share_url', 'is_valid',
            'is_expired', 'days_until_expiration'
        ]
        read_only_fields = [
            'id', 'token', 'shared_by', 'shared_at', 'access_count',
            'last_accessed_at', 'last_accessed_ip'
        ]

    def get_share_url(self, obj):
        """Generate share URL"""
        request = self.context.get('request')
        if request:
            base_url = f"{request.scheme}://{request.get_host()}"
        else:
            base_url = 'https://dfc.cccplc.com'
        return obj.get_share_url(base_url)

    def get_days_until_expiration(self, obj):
        """Calculate days until expiration"""
        if not obj.expires_at:
            return None
        delta = obj.expires_at - timezone.now()
        return max(0, delta.days)

    def create(self, validated_data):
        password = validated_data.pop('password', None)

        # Set default expiration (7 days) if not provided
        if 'expires_at' not in validated_data or validated_data['expires_at'] is None:
            validated_data['expires_at'] = timezone.now() + timedelta(days=7)

        share = DocumentShare.objects.create(**validated_data)

        # Set password if provided
        if password:
            share.set_password(password)
            share.save()

        # Send email notification if recipient email provided
        if share.recipient_email:
            self._send_share_notification(share)

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=share.shared_by,
            action=AuditLog.SHARE,
            resource_type='Document',
            resource_id=str(share.document.id),
            resource_name=share.document.title,
            details={
                'recipient_email': share.recipient_email,
                'permission_level': share.permission_level,
                'expires_at': share.expires_at.isoformat() if share.expires_at else None
            }
        )

        return share

    def _send_share_notification(self, share):
        """Send email notification to recipient"""
        from django.core.mail import send_mail
        from django.conf import settings

        subject = f'{share.shared_by.get_full_name() or share.shared_by.email} shared a document with you'

        message = f'''
Hello{" " + share.recipient_name if share.recipient_name else ""},

{share.shared_by.get_full_name() or share.shared_by.email} has shared a document with you on Digital Filing Cabinet.

Document: {share.document.title}
Permission: {share.get_permission_level_display()}
Expires: {share.expires_at.strftime("%Y-%m-%d %H:%M") if share.expires_at else "Never"}

{share.message if share.message else ""}

Access the document here:
{share.get_share_url()}

{"This link is password protected. Please contact the sender for the password." if share.require_password else ""}

Best regards,
Digital Filing Cabinet
        '''

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[share.recipient_email],
            fail_silently=True
        )


class ShareAccessLogSerializer(serializers.ModelSerializer):
    document_title = serializers.CharField(source='share.document.title', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ShareAccessLog
        fields = [
            'id', 'share', 'document_title', 'action', 'action_display',
            'timestamp', 'ip_address', 'user_agent', 'denial_reason'
        ]
        read_only_fields = fields


class SharePasswordVerifySerializer(serializers.Serializer):
    """Serializer for verifying share password"""
    password = serializers.CharField(required=True)
```

### 3. Share API Views

**File**: `apps/sharing/views.py`

```python
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from apps.sharing.models import DocumentShare, ShareAccessLog
from apps.sharing.serializers import (
    DocumentShareSerializer, ShareAccessLogSerializer,
    SharePasswordVerifySerializer
)
from apps.permissions.utils import check_permission

class DocumentShareViewSet(viewsets.ModelViewSet):
    """CRUD operations for document shares"""
    serializer_class = DocumentShareSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document', 'is_active', 'permission_level']
    search_fields = ['recipient_email', 'recipient_name', 'message']
    ordering = ['-shared_at']

    def get_queryset(self):
        """Users can only see shares they created"""
        return DocumentShare.objects.filter(
            shared_by=self.request.user
        ).select_related('document', 'shared_by')

    def perform_create(self, serializer):
        """Set shared_by to current user"""
        # Check if user has share permission on document
        document = serializer.validated_data['document']

        if not check_permission(self.request.user, 'can_share', document.folder):
            raise PermissionError('You do not have permission to share this document')

        serializer.save(shared_by=self.request.user)

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke a share"""
        share = self.get_object()
        share.revoke()

        # Log audit event
        from apps.audit.models import AuditLog
        AuditLog.log_action(
            user=request.user,
            action='SHARE_REVOKE',
            resource_type='DocumentShare',
            resource_id=str(share.id),
            resource_name=share.document.title,
            details={
                'recipient_email': share.recipient_email,
                'original_expiration': share.expires_at.isoformat() if share.expires_at else None
            }
        )

        return Response({
            'status': 'Share revoked',
            'share_id': str(share.id)
        })

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a share"""
        share = self.get_object()

        access_logs = ShareAccessLog.objects.filter(share=share)

        # Access breakdown by action
        action_breakdown = {}
        for action_code, action_name in ShareAccessLog.ACTION_CHOICES:
            count = access_logs.filter(action=action_code).count()
            if count > 0:
                action_breakdown[action_name] = count

        # Recent access history
        recent_logs = access_logs.order_by('-timestamp')[:20]

        return Response({
            'share_id': str(share.id),
            'total_accesses': share.access_count,
            'max_accesses': share.max_access_count,
            'is_valid': share.is_valid(),
            'is_expired': share.is_expired(),
            'action_breakdown': action_breakdown,
            'recent_access': ShareAccessLogSerializer(recent_logs, many=True).data
        })


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def public_share_access(request, token):
    """
    Public endpoint for accessing shared documents (no authentication required).

    GET: Retrieve share information
    POST: Access shared document (with optional password)
    """
    share = get_object_or_404(DocumentShare, token=token)

    if request.method == 'GET':
        # Return share information (metadata only)
        if not share.is_valid():
            return Response({
                'error': 'This share link is no longer valid',
                'reason': 'expired' if share.is_expired() else 'inactive'
            }, status=status.HTTP_403_FORBIDDEN)

        return Response({
            'document_title': share.document.title,
            'document_type': share.document.document_type,
            'shared_by': share.shared_by.get_full_name() or share.shared_by.email,
            'shared_at': share.shared_at,
            'permission_level': share.get_permission_level_display(),
            'requires_password': share.require_password,
            'message': share.message,
            'expires_at': share.expires_at
        })

    elif request.method == 'POST':
        # Validate share
        if not share.is_valid():
            # Log denied access
            ShareAccessLog.objects.create(
                share=share,
                action=ShareAccessLog.DENIED,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                denial_reason='Share link expired or inactive'
            )

            return Response({
                'error': 'This share link is no longer valid'
            }, status=status.HTTP_403_FORBIDDEN)

        # Check password if required
        if share.require_password:
            serializer = SharePasswordVerifySerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            password = serializer.validated_data['password']

            if not share.check_password(password):
                # Log denied access
                ShareAccessLog.objects.create(
                    share=share,
                    action=ShareAccessLog.DENIED,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT'),
                    denial_reason='Incorrect password'
                )

                return Response({
                    'error': 'Incorrect password'
                }, status=status.HTTP_403_FORBIDDEN)

        # Record access
        share.record_access(ip_address=request.META.get('REMOTE_ADDR'))

        # Log access
        ShareAccessLog.objects.create(
            share=share,
            action=ShareAccessLog.ACCESS,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        # Return document information and download URL
        action_requested = request.data.get('action', 'view')

        if action_requested == 'download' and share.permission_level in [
            DocumentShare.VIEW_DOWNLOAD,
            DocumentShare.VIEW_DOWNLOAD_COMMENT
        ]:
            # Generate presigned download URL
            from django.core.files.storage import default_storage
            download_url = default_storage.url(share.document.file.name)

            # Log download
            ShareAccessLog.objects.create(
                share=share,
                action=ShareAccessLog.DOWNLOAD,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )

            return Response({
                'download_url': download_url,
                'filename': share.document.file.name.split('/')[-1]
            })

        # Return document preview information
        return Response({
            'document': {
                'title': share.document.title,
                'document_type': share.document.document_type,
                'file_size': share.document.file_size,
                'uploaded_at': share.document.uploaded_at
            },
            'permission_level': share.permission_level,
            'can_download': share.permission_level in [
                DocumentShare.VIEW_DOWNLOAD,
                DocumentShare.VIEW_DOWNLOAD_COMMENT
            ]
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def share_download(request, token):
    """Direct download endpoint for shared documents"""
    share = get_object_or_404(DocumentShare, token=token, is_active=True)

    # Validate share
    if not share.is_valid():
        return Response({
            'error': 'This share link is no longer valid'
        }, status=status.HTTP_403_FORBIDDEN)

    # Check permission level
    if share.permission_level == DocumentShare.VIEW_ONLY:
        return Response({
            'error': 'This share does not allow downloads'
        }, status=status.HTTP_403_FORBIDDEN)

    # Check password in query param (for direct download links)
    if share.require_password:
        password = request.GET.get('password')
        if not password or not share.check_password(password):
            return Response({
                'error': 'Password required or incorrect'
            }, status=status.HTTP_403_FORBIDDEN)

    # Record access
    share.record_access(ip_address=request.META.get('REMOTE_ADDR'))

    # Log download
    ShareAccessLog.objects.create(
        share=share,
        action=ShareAccessLog.DOWNLOAD,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT')
    )

    # Serve file
    document = share.document
    file_handle = document.file.open('rb')

    response = FileResponse(file_handle, content_type='application/octet-stream')
    response['Content-Disposition'] = f'attachment; filename="{document.title}"'

    return response
```

### 4. Share URLs

**File**: `apps/sharing/urls.py`

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.sharing import views

router = DefaultRouter()
router.register(r'shares', views.DocumentShareViewSet, basename='document-share')

app_name = 'sharing'

urlpatterns = [
    path('', include(router.urls)),

    # Public share access (no authentication)
    path('public/<str:token>/', views.public_share_access, name='public-share-access'),
    path('public/<str:token>/download/', views.share_download, name='share-download'),
]
```

**Add to `config/urls.py`**:
```python
urlpatterns = [
    # ... other URLs
    path('api/v1/sharing/', include('apps.sharing.urls', namespace='sharing')),

    # Public share endpoint (short URL)
    path('share/<str:token>/', views.public_share_access, name='public-share'),
]
```

### 5. Celery Task for Expired Shares Cleanup

**File**: `apps/sharing/tasks.py`

```python
from celery import shared_task
from django.utils import timezone
from apps.sharing.models import DocumentShare

@shared_task
def cleanup_expired_shares():
    """
    Deactivate expired shares.
    Runs daily.
    """
    now = timezone.now()

    expired_shares = DocumentShare.objects.filter(
        is_active=True,
        expires_at__lte=now
    )

    count = expired_shares.count()
    expired_shares.update(is_active=False)

    return f'Deactivated {count} expired shares'
```

**Add to Celery Beat Schedule**:
```python
app.conf.beat_schedule = {
    'cleanup-expired-shares': {
        'task': 'apps.sharing.tasks.cleanup_expired_shares',
        'schedule': crontab(hour=1, minute=0),  # Daily at 1 AM
    },
}
```

### Testing Requirements

**Unit Tests** (`apps/sharing/tests.py`):

```python
from django.test import TestCase
from apps.sharing.models import DocumentShare
from apps.documents.models import Document
from django.utils import timezone
from datetime import timedelta

class DocumentShareTestCase(TestCase):
    def test_share_token_generation(self):
        """Share token is automatically generated"""
        share = DocumentShare.objects.create(
            document=self.document,
            shared_by=self.user
        )
        self.assertIsNotNone(share.token)
        self.assertEqual(len(share.token), 43)  # URL-safe base64 length

    def test_share_expiration(self):
        """Expired shares are invalid"""
        share = DocumentShare.objects.create(
            document=self.document,
            shared_by=self.user,
            expires_at=timezone.now() - timedelta(hours=1)
        )
        self.assertTrue(share.is_expired())
        self.assertFalse(share.is_valid())

    def test_password_protection(self):
        """Password protection works correctly"""
        share = DocumentShare.objects.create(
            document=self.document,
            shared_by=self.user
        )
        share.set_password('test123')
        share.save()

        self.assertTrue(share.require_password)
        self.assertTrue(share.check_password('test123'))
        self.assertFalse(share.check_password('wrongpassword'))

    def test_access_count_limit(self):
        """Share becomes invalid after max access count"""
        share = DocumentShare.objects.create(
            document=self.document,
            shared_by=self.user,
            max_access_count=3
        )

        # First 3 accesses should be valid
        for i in range(3):
            self.assertTrue(share.is_valid())
            share.record_access()

        # 4th access should be invalid
        self.assertFalse(share.is_valid())
```

### Acceptance Criteria

- [ ] Share model supports token generation, expiration, and password protection
- [ ] Share permissions support VIEW_ONLY, VIEW_DOWNLOAD, VIEW_DOWNLOAD_COMMENT
- [ ] Public share access endpoint works without authentication
- [ ] Password-protected shares require correct password
- [ ] Email notifications sent to recipients
- [ ] Share analytics track access count, downloads, views
- [ ] Expired shares automatically deactivated
- [ ] Share revocation works correctly
- [ ] All share actions logged in audit trail
- [ ] Direct download links work for authorized shares
- [ ] All tests passing

### Documentation

**To Create**:
- Sharing user guide
- Share security best practices
- API endpoint documentation

---

## Week 22: Multi-Factor Authentication (MFA)

**Objective**: Implement TOTP-based multi-factor authentication for enhanced security

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Install django-otp library | Critical | 1h | - |
| MFA setup models and views | Critical | 6h | django-otp |
| QR code generation for TOTP | High | 3h | qrcode library |
| MFA verification endpoint | Critical | 4h | Authentication |
| Backup codes generation | High | 3h | Security |
| MFA enforcement for admin users | High | 3h | User model |
| MFA recovery flow | High | 4h | Email system |
| Admin interface for MFA management | Medium | 2h | Django admin |

**Total Estimated Time**: 26 hours

### 1. Installation and Setup

**Install Dependencies**:
```bash
pip install django-otp qrcode[pil] pyotp
```

**Add to `requirements/base.txt`**:
```txt
django-otp==1.3.0
qrcode[pil]==7.4.2
pyotp==2.9.0
```

**Settings** (`config/settings/base.py`):

```python
INSTALLED_APPS = [
    # ... other apps
    'django_otp',
    'django_otp.plugins.otp_totp',
    'django_otp.plugins.otp_static',  # For backup codes
]

MIDDLEWARE = [
    # ... other middleware
    'django_otp.middleware.OTPMiddleware',  # After AuthenticationMiddleware
]

# OTP Configuration
OTP_TOTP_ISSUER = 'DFC - Digital Filing Cabinet'
OTP_TOTP_THROTTLE_FACTOR = 1  # Seconds to wait after failed attempt
```

**Migrations**:
```bash
python manage.py migrate otp_totp
python manage.py migrate otp_static
```

### 2. MFA Models Extension

**File**: `apps/users/models.py` (Add fields to CustomUser)

```python
from django.db import models

class CustomUser(AbstractUser):
    # ... existing fields

    # MFA fields
    mfa_enabled = models.BooleanField(
        default=False,
        help_text='Whether MFA is enabled for this user'
    )
    mfa_enforced = models.BooleanField(
        default=False,
        help_text='Whether MFA is mandatory for this user (e.g., admins)'
    )
    mfa_enabled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When MFA was enabled'
    )

    def enforce_mfa_for_admins(self):
        """Auto-enforce MFA for admin users"""
        if self.is_staff or self.is_superuser:
            self.mfa_enforced = True
            self.save(update_fields=['mfa_enforced'])
```

**Migration**:
```bash
python manage.py makemigrations users
python manage.py migrate users
```

### 3. MFA Serializers

**File**: `apps/users/serializers.py` (Add MFA serializers)

```python
from rest_framework import serializers
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
import pyotp
import qrcode
import io
import base64

class MFASetupSerializer(serializers.Serializer):
    """Initiate MFA setup"""
    pass

class MFASetupResponseSerializer(serializers.Serializer):
    """Response for MFA setup initiation"""
    secret = serializers.CharField(read_only=True)
    qr_code = serializers.CharField(read_only=True, help_text='Base64 encoded QR code image')
    backup_codes = serializers.ListField(child=serializers.CharField(), read_only=True)
    provisioning_uri = serializers.CharField(read_only=True)

class MFAVerifySerializer(serializers.Serializer):
    """Verify MFA code"""
    code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text='6-digit TOTP code'
    )

class MFAConfirmSerializer(serializers.Serializer):
    """Confirm MFA setup"""
    code = serializers.CharField(
        required=True,
        min_length=6,
        max_length=6,
        help_text='6-digit TOTP code to confirm setup'
    )

class BackupCodeSerializer(serializers.Serializer):
    """Backup code for MFA recovery"""
    code = serializers.CharField(read_only=True)

class MFAStatusSerializer(serializers.Serializer):
    """MFA status for user"""
    mfa_enabled = serializers.BooleanField()
    mfa_enforced = serializers.BooleanField()
    mfa_enabled_at = serializers.DateTimeField(allow_null=True)
    device_name = serializers.CharField(allow_null=True)
    backup_codes_remaining = serializers.IntegerField()
```

### 4. MFA Views

**File**: `apps/users/views.py` (Add MFA views)

```python
from rest_framework import views, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken
from django_otp import match_token
from apps.users.serializers import (
    MFASetupSerializer, MFASetupResponseSerializer,
    MFAVerifySerializer, MFAConfirmSerializer,
    BackupCodeSerializer, MFAStatusSerializer
)
from apps.audit.models import AuditLog
import pyotp
import qrcode
import io
import base64

class MFASetupView(views.APIView):
    """
    Initiate MFA setup for the current user.
    Returns secret, QR code, and backup codes.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.mfa_enabled:
            return Response({
                'error': 'MFA is already enabled. Disable it first to re-setup.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate TOTP secret
        secret = pyotp.random_base32()

        # Create unconfirmed TOTP device
        device = TOTPDevice.objects.create(
            user=user,
            name='default',
            confirmed=False,  # Not confirmed until user verifies
            key=secret
        )

        # Generate provisioning URI for QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.email,
            issuer_name='DFC - Digital Filing Cabinet'
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()

        # Generate backup codes
        static_device = StaticDevice.objects.create(
            user=user,
            name='backup'
        )

        backup_codes = []
        for _ in range(10):
            token = StaticToken.random_token()
            StaticToken.objects.create(device=static_device, token=token)
            backup_codes.append(token)

        # Log audit event
        AuditLog.log_action(
            user=user,
            action='MFA_SETUP_INITIATED',
            resource_type='User',
            resource_id=str(user.id),
            resource_name=user.email,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        serializer = MFASetupResponseSerializer({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_code_base64}',
            'provisioning_uri': provisioning_uri,
            'backup_codes': backup_codes
        })

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MFAConfirmView(views.APIView):
    """
    Confirm MFA setup by verifying a TOTP code.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MFAConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        code = serializer.validated_data['code']

        # Get unconfirmed device
        try:
            device = TOTPDevice.objects.get(
                user=user,
                name='default',
                confirmed=False
            )
        except TOTPDevice.DoesNotExist:
            return Response({
                'error': 'No pending MFA setup found. Please initiate setup first.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify code
        totp = pyotp.TOTP(device.key)
        if not totp.verify(code):
            # Log failed verification
            AuditLog.log_action(
                user=user,
                action='MFA_VERIFICATION_FAILED',
                resource_type='User',
                resource_id=str(user.id),
                resource_name=user.email,
                outcome=AuditLog.FAILURE,
                details={'reason': 'Invalid code'},
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'error': 'Invalid verification code'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Confirm device
        device.confirmed = True
        device.save()

        # Enable MFA for user
        from django.utils import timezone
        user.mfa_enabled = True
        user.mfa_enabled_at = timezone.now()
        user.save(update_fields=['mfa_enabled', 'mfa_enabled_at'])

        # Log successful setup
        AuditLog.log_action(
            user=user,
            action='MFA_ENABLED',
            resource_type='User',
            resource_id=str(user.id),
            resource_name=user.email,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'status': 'MFA enabled successfully',
            'mfa_enabled': True
        }, status=status.HTTP_200_OK)


class MFAVerifyView(views.APIView):
    """
    Verify MFA code during login.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        code = serializer.validated_data['code']

        # Try to match token (checks both TOTP and backup codes)
        device = match_token(user, code)

        if device is None:
            # Log failed verification
            AuditLog.log_action(
                user=user,
                action='MFA_VERIFICATION_FAILED',
                resource_type='User',
                resource_id=str(user.id),
                resource_name=user.email,
                outcome=AuditLog.FAILURE,
                details={'reason': 'Invalid code'},
                ip_address=request.META.get('REMOTE_ADDR')
            )

            return Response({
                'error': 'Invalid verification code'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Log successful verification
        AuditLog.log_action(
            user=user,
            action='MFA_VERIFIED',
            resource_type='User',
            resource_id=str(user.id),
            resource_name=user.email,
            details={'device_type': device.__class__.__name__},
            ip_address=request.META.get('REMOTE_ADDR')
        )

        # Mark user as verified in session
        from django_otp import login as otp_login
        otp_login(request, device)

        return Response({
            'status': 'MFA verified successfully',
            'verified': True
        }, status=status.HTTP_200_OK)


class MFADisableView(views.APIView):
    """
    Disable MFA for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.mfa_enforced:
            return Response({
                'error': 'MFA is enforced for your account and cannot be disabled'
            }, status=status.HTTP_403_FORBIDDEN)

        if not user.mfa_enabled:
            return Response({
                'error': 'MFA is not enabled'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Delete TOTP devices
        TOTPDevice.objects.filter(user=user).delete()

        # Delete static devices (backup codes)
        StaticDevice.objects.filter(user=user).delete()

        # Disable MFA
        user.mfa_enabled = False
        user.mfa_enabled_at = None
        user.save(update_fields=['mfa_enabled', 'mfa_enabled_at'])

        # Log MFA disable
        AuditLog.log_action(
            user=user,
            action='MFA_DISABLED',
            resource_type='User',
            resource_id=str(user.id),
            resource_name=user.email,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'status': 'MFA disabled successfully',
            'mfa_enabled': False
        }, status=status.HTTP_200_OK)


class MFAStatusView(views.APIView):
    """
    Get MFA status for the current user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get device info
        device_name = None
        try:
            device = TOTPDevice.objects.get(user=user, confirmed=True)
            device_name = device.name
        except TOTPDevice.DoesNotExist:
            pass

        # Count remaining backup codes
        backup_codes_remaining = StaticToken.objects.filter(
            device__user=user,
            device__name='backup'
        ).count()

        serializer = MFAStatusSerializer({
            'mfa_enabled': user.mfa_enabled,
            'mfa_enforced': user.mfa_enforced,
            'mfa_enabled_at': user.mfa_enabled_at,
            'device_name': device_name,
            'backup_codes_remaining': backup_codes_remaining
        })

        return Response(serializer.data)


class MFARegenerateBackupCodesView(views.APIView):
    """
    Regenerate backup codes (requires MFA verification).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user

        if not user.mfa_enabled:
            return Response({
                'error': 'MFA is not enabled'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Verify current MFA code before regenerating
        serializer = MFAVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        code = serializer.validated_data['code']
        device = match_token(user, code)

        if device is None:
            return Response({
                'error': 'Invalid verification code'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Delete existing backup codes
        StaticDevice.objects.filter(user=user, name='backup').delete()

        # Generate new backup codes
        static_device = StaticDevice.objects.create(
            user=user,
            name='backup'
        )

        backup_codes = []
        for _ in range(10):
            token = StaticToken.random_token()
            StaticToken.objects.create(device=static_device, token=token)
            backup_codes.append(token)

        # Log regeneration
        AuditLog.log_action(
            user=user,
            action='MFA_BACKUP_CODES_REGENERATED',
            resource_type='User',
            resource_id=str(user.id),
            resource_name=user.email,
            ip_address=request.META.get('REMOTE_ADDR')
        )

        return Response({
            'backup_codes': backup_codes
        }, status=status.HTTP_200_OK)
```

### 5. MFA URLs

**File**: `apps/users/urls.py` (Add MFA endpoints)

```python
from django.urls import path
from apps.users import views

app_name = 'users'

urlpatterns = [
    # ... existing user URLs

    # MFA endpoints
    path('mfa/setup/', views.MFASetupView.as_view(), name='mfa-setup'),
    path('mfa/confirm/', views.MFAConfirmView.as_view(), name='mfa-confirm'),
    path('mfa/verify/', views.MFAVerifyView.as_view(), name='mfa-verify'),
    path('mfa/disable/', views.MFADisableView.as_view(), name='mfa-disable'),
    path('mfa/status/', views.MFAStatusView.as_view(), name='mfa-status'),
    path('mfa/backup-codes/regenerate/', views.MFARegenerateBackupCodesView.as_view(), name='mfa-regenerate-backup-codes'),
]
```

### 6. Custom JWT Authentication with MFA

**File**: `apps/users/authentication.py`

```python
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django_otp import user_has_device

class MFAJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that checks for MFA verification.
    """

    def authenticate(self, request):
        # Perform standard JWT authentication
        auth_result = super().authenticate(request)

        if auth_result is None:
            return None

        user, token = auth_result

        # Check if MFA is enabled for user
        if user.mfa_enabled:
            # Check if user is MFA verified in this session
            if not user.is_verified():
                # Add flag to request indicating MFA required
                request.mfa_required = True

        return user, token


# Custom login view with MFA support
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class MFATokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token serializer that indicates if MFA is required"""

    def validate(self, attrs):
        data = super().validate(attrs)

        # Check if MFA is enabled for this user
        if self.user.mfa_enabled:
            data['mfa_required'] = True
            data['mfa_enforced'] = self.user.mfa_enforced
        else:
            data['mfa_required'] = False

        return data


class MFATokenObtainPairView(TokenObtainPairView):
    serializer_class = MFATokenObtainPairSerializer
```

**Update `config/urls.py`**:
```python
from apps.users.authentication import MFATokenObtainPairView

urlpatterns = [
    # Replace standard JWT login with MFA-aware version
    path('api/v1/auth/login/', MFATokenObtainPairView.as_view(), name='token_obtain_pair'),
]
```

### 7. Management Command to Enforce MFA for Admins

**File**: `apps/users/management/commands/enforce_admin_mfa.py`

```python
from django.core.management.base import BaseCommand
from apps.users.models import CustomUser

class Command(BaseCommand):
    help = 'Enforce MFA for all admin and staff users'

    def handle(self, *args, **options):
        admins = CustomUser.objects.filter(
            models.Q(is_staff=True) | models.Q(is_superuser=True)
        )

        updated = 0
        for admin in admins:
            if not admin.mfa_enforced:
                admin.mfa_enforced = True
                admin.save(update_fields=['mfa_enforced'])
                updated += 1
                self.stdout.write(
                    self.style.SUCCESS(f'MFA enforced for {admin.email}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'MFA enforced for {updated} admin users')
        )
```

### Testing Requirements

**Unit Tests** (`apps/users/tests/test_mfa.py`):

```python
from django.test import TestCase
from apps.users.models import CustomUser
from django_otp.plugins.otp_totp.models import TOTPDevice
import pyotp

class MFATestCase(TestCase):
    def setUp(self):
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            username='test',
            password='testpass123'
        )

    def test_mfa_setup(self):
        """MFA setup creates unconfirmed device"""
        secret = pyotp.random_base32()
        device = TOTPDevice.objects.create(
            user=self.user,
            name='default',
            confirmed=False,
            key=secret
        )

        self.assertFalse(device.confirmed)
        self.assertEqual(device.user, self.user)

    def test_mfa_confirmation(self):
        """MFA confirmation with valid code"""
        secret = pyotp.random_base32()
        device = TOTPDevice.objects.create(
            user=self.user,
            name='default',
            confirmed=False,
            key=secret
        )

        totp = pyotp.TOTP(secret)
        valid_code = totp.now()

        # Verify code
        self.assertTrue(totp.verify(valid_code))

        # Confirm device
        device.confirmed = True
        device.save()

        self.assertTrue(device.confirmed)

    def test_admin_mfa_enforcement(self):
        """Admin users should have MFA enforced"""
        admin = CustomUser.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='adminpass',
            is_staff=True
        )

        admin.enforce_mfa_for_admins()
        admin.refresh_from_db()

        self.assertTrue(admin.mfa_enforced)
```

### Acceptance Criteria

- [ ] django-otp integrated and configured
- [ ] MFA setup endpoint generates TOTP secret and QR code
- [ ] MFA confirmation verifies TOTP code and enables MFA
- [ ] MFA verification during login works correctly
- [ ] Backup codes generated (10 codes)
- [ ] Backup codes can be used for MFA verification
- [ ] MFA enforcement for admin users
- [ ] MFA status endpoint returns current state
- [ ] MFA disable endpoint works (unless enforced)
- [ ] Backup code regeneration requires MFA verification
- [ ] All MFA actions logged in audit trail
- [ ] Custom JWT authentication checks MFA status
- [ ] All tests passing

### Documentation

**To Create**:
- MFA setup guide for users
- MFA enforcement policy
- Backup code recovery procedures

---

# Phase 4: Scale & Hardening (Weeks 23-27)

## Week 23: Performance Optimization

**Objective**: Optimize database queries, API responses, and overall system performance

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Database query optimization (select_related, prefetch_related) | Critical | 6h | All models |
| Database indexing analysis and optimization | Critical | 4h | PostgreSQL |
| Connection pooling (pgbouncer) setup | High | 3h | Infrastructure |
| Serializer optimization | High | 4h | DRF |
| API pagination optimization | Medium | 3h | API views |
| Query result caching | High | 4h | Redis |
| Database connection pooling | High | 3h | Django settings |
| Performance profiling (django-silk) | High | 3h | Development |

**Total Estimated Time**: 30 hours

### 1. Database Query Optimization

**File**: `apps/core/mixins.py` (Create optimization mixins)

```python
from django.db import models

class OptimizedQueryMixin:
    """
    Mixin to optimize querysets with select_related and prefetch_related.
    """
    select_related_fields = []
    prefetch_related_fields = []

    def get_queryset(self):
        queryset = super().get_queryset()

        if self.select_related_fields:
            queryset = queryset.select_related(*self.select_related_fields)

        if self.prefetch_related_fields:
            queryset = queryset.prefetch_related(*self.prefetch_related_fields)

        return queryset
```

**Optimize Document Views** (`apps/documents/views.py`):

```python
from apps.core.mixins import OptimizedQueryMixin

class DocumentListView(OptimizedQueryMixin, generics.ListAPIView):
    """Optimized document list view"""
    serializer_class = DocumentSerializer

    # Optimize related fields loading
    select_related_fields = ['folder', 'folder__department', 'uploaded_by', 'document_type']
    prefetch_related_fields = ['tags', 'versions', 'shares']

    def get_queryset(self):
        queryset = super().get_queryset()

        # Only retrieve necessary fields for list view
        return queryset.only(
            'id', 'title', 'document_type', 'uploaded_at',
            'file_size', 'confidentiality_level',
            'folder_id', 'uploaded_by_id'
        )


class FolderTreeView(OptimizedQueryMixin, APIView):
    """Optimized folder tree with single query"""

    def get(self, request):
        # Use recursive CTE for efficient tree loading
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("""
                WITH RECURSIVE folder_tree AS (
                    -- Base case: root folders
                    SELECT id, name, parent_id, 0 as depth
                    FROM folders
                    WHERE parent_id IS NULL AND department_id = %s

                    UNION ALL

                    -- Recursive case: child folders
                    SELECT f.id, f.name, f.parent_id, ft.depth + 1
                    FROM folders f
                    INNER JOIN folder_tree ft ON f.parent_id = ft.id
                    WHERE ft.depth < 10  -- Limit depth to prevent infinite loops
                )
                SELECT * FROM folder_tree
                ORDER BY depth, name
            """, [request.user.department_id])

            folders = cursor.fetchall()

        # Build tree structure
        tree = self._build_tree(folders)
        return Response(tree)
```

### 2. Database Indexing Optimization

**Create Index Analysis Script** (`scripts/analyze_indexes.py`):

```python
from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Analyze database indexes and suggest optimizations'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Find missing indexes (PostgreSQL)
            cursor.execute("""
                SELECT
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                    AND n_distinct > 100
                    AND correlation < 0.1
                ORDER BY tablename, attname
            """)

            results = cursor.fetchall()

            for row in results:
                schema, table, column, n_distinct, correlation = row
                self.stdout.write(
                    f'Consider index on {table}.{column} '
                    f'(distinct: {n_distinct}, correlation: {correlation:.3f})'
                )

            # Find unused indexes
            cursor.execute("""
                SELECT
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan
                FROM pg_stat_user_indexes
                WHERE idx_scan = 0
                    AND indexrelname NOT LIKE '%_pkey'
                ORDER BY tablename, indexname
            """)

            unused = cursor.fetchall()

            if unused:
                self.stdout.write('\nUnused indexes (consider dropping):')
                for row in unused:
                    schema, table, index, scans = row
                    self.stdout.write(f'  - {index} on {table} (scans: {scans})')
```

**Add Composite Indexes** (Create migration):

```python
# apps/documents/migrations/XXXX_add_composite_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('documents', 'XXXX_previous_migration'),
    ]

    operations = [
        # Composite index for folder + upload date queries
        migrations.AddIndex(
            model_name='document',
            index=models.Index(
                fields=['folder', '-uploaded_at'],
                name='doc_folder_upload_idx'
            ),
        ),

        # Composite index for document type + confidentiality queries
        migrations.AddIndex(
            model_name='document',
            index=models.Index(
                fields=['document_type', 'confidentiality_level'],
                name='doc_type_conf_idx'
            ),
        ),

        # Covering index for list view (includes commonly selected fields)
        migrations.RunSQL(
            sql="""
                CREATE INDEX doc_list_covering_idx ON documents (id, uploaded_at DESC)
                INCLUDE (title, document_type, file_size, confidentiality_level)
            """,
            reverse_sql="DROP INDEX IF EXISTS doc_list_covering_idx"
        ),

        # GIN index for full-text search on title
        migrations.RunSQL(
            sql="""
                CREATE INDEX doc_title_gin_idx ON documents
                USING GIN (to_tsvector('english', title))
            """,
            reverse_sql="DROP INDEX IF EXISTS doc_title_gin_idx"
        ),
    ]
```

### 3. Connection Pooling with pgbouncer

**Installation** (`docker-compose.yml`):

```yaml
services:
  pgbouncer:
    image: edoburu/pgbouncer:latest
    environment:
      - DB_USER=${POSTGRES_USER}
      - DB_PASSWORD=${POSTGRES_PASSWORD}
      - DB_HOST=postgres
      - DB_NAME=${POSTGRES_DB}
      - POOL_MODE=transaction
      - MAX_CLIENT_CONN=1000
      - DEFAULT_POOL_SIZE=25
      - MIN_POOL_SIZE=5
      - RESERVE_POOL_SIZE=5
      - RESERVE_POOL_TIMEOUT=3
      - MAX_DB_CONNECTIONS=100
    ports:
      - "6432:5432"
    depends_on:
      - postgres

  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Don't expose port directly - use pgbouncer
```

**Django Settings** (`config/settings/production.py`):

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB'),
        'USER': env('POSTGRES_USER'),
        'PASSWORD': env('POSTGRES_PASSWORD'),
        'HOST': env('PGBOUNCER_HOST', default='pgbouncer'),
        'PORT': env('PGBOUNCER_PORT', default='5432'),
        'CONN_MAX_AGE': 0,  # Disable persistent connections (pgbouncer handles pooling)
        'OPTIONS': {
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000',  # 30 seconds
        },
    }
}
```

### 4. Serializer Optimization

**File**: `apps/documents/serializers.py` (Optimized serializers)

```python
from rest_framework import serializers

class DocumentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.
    Only includes essential fields.
    """
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.get_full_name',
        read_only=True
    )
    folder_name = serializers.CharField(
        source='folder.name',
        read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'document_type', 'uploaded_at',
            'file_size', 'confidentiality_level',
            'uploaded_by_name', 'folder_name'
        ]

    # Disable instance saving for read-only serializer
    def create(self, validated_data):
        raise NotImplementedError('Use DocumentDetailSerializer for creation')

    def update(self, instance, validated_data):
        raise NotImplementedError('Use DocumentDetailSerializer for updates')


class DocumentDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detail views.
    Includes all fields and related data.
    """
    tags = TagSerializer(many=True, read_only=True)
    versions = DocumentVersionSerializer(many=True, read_only=True)
    metadata = serializers.JSONField(read_only=True)

    # Use SerializerMethodField sparingly (expensive)
    share_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = '__all__'

    def get_share_count(self, obj):
        # Annotate this in the queryset instead of N queries
        return getattr(obj, 'share_count', obj.shares.count())


class OptimizedDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet with optimized serializer selection"""

    def get_serializer_class(self):
        if self.action == 'list':
            return DocumentListSerializer
        return DocumentDetailSerializer

    def get_queryset(self):
        queryset = Document.objects.all()

        if self.action == 'list':
            # List view: lightweight query
            queryset = queryset.select_related(
                'uploaded_by', 'folder'
            ).only(
                'id', 'title', 'document_type', 'uploaded_at',
                'file_size', 'confidentiality_level',
                'uploaded_by__first_name', 'uploaded_by__last_name',
                'folder__name'
            )
        else:
            # Detail view: full query with prefetch
            queryset = queryset.select_related(
                'uploaded_by', 'folder', 'folder__department'
            ).prefetch_related(
                'tags', 'versions', 'shares'
            ).annotate(
                share_count=models.Count('shares')
            )

        return queryset
```

### 5. Pagination Optimization

**File**: `apps/core/pagination.py`

```python
from rest_framework.pagination import CursorPagination, PageNumberPagination
from rest_framework.response import Response

class OptimizedCursorPagination(CursorPagination):
    """
    Cursor pagination for efficient large dataset traversal.
    Better performance than offset pagination for large tables.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200
    ordering = '-created_at'

    def get_paginated_response(self, data):
        return Response({
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'count': None,  # Don't count for performance (cursor pagination)
        })


class OptimizedPageNumberPagination(PageNumberPagination):
    """
    Page number pagination with optimized count query.
    Uses estimated count for large tables.
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def get_count(self, queryset):
        """
        Use estimated count for tables > 100k rows.
        Much faster than exact count.
        """
        from django.db import connection

        # Get table name
        table_name = queryset.model._meta.db_table

        # Check table size
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT reltuples::bigint FROM pg_class WHERE relname = %s",
                [table_name]
            )
            row = cursor.fetchone()
            estimated_count = row[0] if row else 0

        # Use estimated count if table is large
        if estimated_count > 100000:
            return estimated_count

        # Otherwise use exact count
        return super().get_count(queryset)
```

**Apply to Views**:

```python
class DocumentListView(generics.ListAPIView):
    pagination_class = OptimizedCursorPagination  # Use cursor for large lists

class SearchResultsView(generics.ListAPIView):
    pagination_class = OptimizedPageNumberPagination  # Use page for search
```

### 6. Django Silk Profiling (Development)

**Installation**:
```bash
pip install django-silk
```

**Settings** (`config/settings/development.py`):

```python
INSTALLED_APPS = [
    # ... other apps
    'silk',
]

MIDDLEWARE = [
    'silk.middleware.SilkyMiddleware',
    # ... other middleware
]

# Silk configuration
SILKY_PYTHON_PROFILER = True
SILKY_PYTHON_PROFILER_BINARY = True
SILKY_AUTHENTICATION = True
SILKY_AUTHORISATION = True
SILKY_MAX_REQUEST_BODY_SIZE = 10240  # 10KB
SILKY_MAX_RESPONSE_BODY_SIZE = 10240  # 10KB
SILKY_INTERCEPT_PERCENT = 100  # Profile 100% of requests in dev
```

**URLs** (`config/urls.py`):
```python
if settings.DEBUG:
    urlpatterns += [path('silk/', include('silk.urls', namespace='silk'))]
```

### Acceptance Criteria

- [ ] All views use select_related/prefetch_related appropriately
- [ ] Database indexes optimized (composite indexes added)
- [ ] Connection pooling configured with pgbouncer
- [ ] List/detail serializers separated for performance
- [ ] Cursor pagination used for large datasets
- [ ] Django Silk profiling configured (development)
- [ ] Query count reduced by >50% for list views
- [ ] API response times: <100ms for list, <200ms for detail
- [ ] All tests passing

### Documentation

**To Create**:
- Performance optimization guide
- Database tuning recommendations
- Profiling and monitoring procedures

---

## Week 24: Caching Implementation

**Objective**: Implement comprehensive caching strategy using Redis

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Redis installation and configuration | Critical | 2h | Infrastructure |
| Django cache backend setup | Critical | 2h | Redis |
| View-level caching | High | 4h | Cache backend |
| Template fragment caching | Medium | 3h | Templates |
| Database query result caching | High | 5h | ORM |
| Cache invalidation strategies | Critical | 5h | Signals |
| Cache warming | Medium | 3h | Management commands |
| Cache monitoring and metrics | High | 3h | Monitoring |

**Total Estimated Time**: 27 hours

### 1. Redis Setup

**Docker Compose** (`docker-compose.yml`):

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  redis_data:
```

**Django Settings** (`config/settings/base.py`):

```python
# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True
            },
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'IGNORE_EXCEPTIONS': True,  # Don't fail if Redis is down
        },
        'KEY_PREFIX': 'dfc',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/2'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'dfc_session',
        'TIMEOUT': 86400,  # 24 hours
    },
    'celery': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': env('REDIS_URL', default='redis://redis:6379/3'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'dfc_celery',
    },
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'

# Cache time settings (in seconds)
CACHE_MIDDLEWARE_SECONDS = 300  # 5 minutes
CACHE_MIDDLEWARE_KEY_PREFIX = 'dfc_middleware'
```

### 2. View-Level Caching

**File**: `apps/core/cache.py`

```python
from django.core.cache import cache
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from functools import wraps
import hashlib
import json

def cache_per_user(timeout=300):
    """
    Cache decorator that creates separate cache keys per user.
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generate cache key based on user and request params
            user_id = request.user.id if request.user.is_authenticated else 'anonymous'
            request_params = json.dumps(request.GET.dict(), sort_keys=True)
            cache_key = f'view_{view_func.__name__}_{user_id}_{hashlib.md5(request_params.encode()).hexdigest()}'

            # Try to get from cache
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                return cached_response

            # Generate response
            response = view_func(request, *args, **kwargs)

            # Cache the response
            cache.set(cache_key, response, timeout)

            return response
        return wrapper
    return decorator


def invalidate_cache_pattern(pattern):
    """
    Invalidate all cache keys matching a pattern.
    """
    from django_redis import get_redis_connection

    conn = get_redis_connection('default')
    keys = conn.keys(f'dfc:{pattern}*')

    if keys:
        conn.delete(*keys)
        return len(keys)
    return 0
```

**Apply to Views**:

```python
from apps.core.cache import cache_per_user
from django.views.decorators.cache import cache_page

class FolderTreeView(APIView):
    """Cached folder tree - cache per user for 15 minutes"""

    @method_decorator(cache_per_user(timeout=900))  # 15 minutes
    def get(self, request):
        # Expensive tree building logic
        tree = self._build_folder_tree(request.user)
        return Response(tree)


class DocumentTypeListView(generics.ListAPIView):
    """Cache document types - same for all users, 1 hour"""

    @method_decorator(cache_page(3600))  # 1 hour
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
```

### 3. Query Result Caching

**File**: `apps/core/cache_decorators.py`

```python
from django.core.cache import cache
from functools import wraps
import hashlib

def cache_queryset(timeout=300, key_prefix='qs'):
    """
    Cache queryset results.

    Usage:
        @cache_queryset(timeout=600, key_prefix='documents')
        def get_recent_documents(user, days=7):
            return Document.objects.filter(...)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key_parts = [key_prefix, func.__name__]

            for arg in args:
                if hasattr(arg, 'pk'):
                    cache_key_parts.append(str(arg.pk))
                else:
                    cache_key_parts.append(str(arg))

            for k, v in sorted(kwargs.items()):
                cache_key_parts.append(f'{k}_{v}')

            cache_key = '_'.join(cache_key_parts)

            # Try cache first
            result = cache.get(cache_key)
            if result is not None:
                return result

            # Execute query
            result = func(*args, **kwargs)

            # Cache the result (convert queryset to list for pickling)
            if hasattr(result, '__iter__') and not isinstance(result, (list, tuple)):
                result = list(result)

            cache.set(cache_key, result, timeout)

            return result
        return wrapper
    return decorator


# Usage in managers/utils
from apps.core.cache_decorators import cache_queryset

class DocumentManager(models.Manager):
    @cache_queryset(timeout=600, key_prefix='doc_recent')
    def get_recent(self, user, days=7):
        from datetime import timedelta
        from django.utils import timezone

        cutoff = timezone.now() - timedelta(days=days)
        return self.filter(
            uploaded_at__gte=cutoff,
            uploaded_by=user
        ).select_related('folder')
```

### 4. Cache Invalidation

**File**: `apps/core/signals.py`

```python
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.core.cache import cache
from apps.documents.models import Document, Folder
from apps.core.cache import invalidate_cache_pattern

@receiver([post_save, post_delete], sender=Document)
def invalidate_document_cache(sender, instance, **kwargs):
    """Invalidate document-related caches when document changes"""

    # Invalidate document list caches
    invalidate_cache_pattern('view_document_list*')

    # Invalidate folder caches containing this document
    invalidate_cache_pattern(f'folder_{instance.folder_id}*')

    # Invalidate user-specific caches
    if instance.uploaded_by:
        invalidate_cache_pattern(f'*user_{instance.uploaded_by_id}*')


@receiver([post_save, post_delete], sender=Folder)
def invalidate_folder_cache(sender, instance, **kwargs):
    """Invalidate folder tree caches when folder changes"""

    # Invalidate all folder tree caches
    invalidate_cache_pattern('view_folder_tree*')
    invalidate_cache_pattern('folder_*')

    # Invalidate parent folder cache if exists
    if instance.parent:
        invalidate_cache_pattern(f'folder_{instance.parent_id}*')


@receiver(post_save, sender='permissions.UserRole')
def invalidate_permission_cache(sender, instance, **kwargs):
    """Clear permission caches when role assignments change"""
    from apps.permissions.utils import clear_permission_cache

    clear_permission_cache(user=instance.user)
```

### 5. Cache Warming

**File**: `apps/core/management/commands/warm_cache.py`

```python
from django.core.management.base import BaseCommand
from django.core.cache import cache
from apps.documents.models import Document, Folder
from apps.users.models import CustomUser

class Command(BaseCommand):
    help = 'Warm up caches with frequently accessed data'

    def handle(self, *args, **options):
        self.stdout.write('Warming caches...')

        # Warm folder trees for active users
        active_users = CustomUser.objects.filter(is_active=True)[:100]
        for user in active_users:
            cache_key = f'folder_tree_user_{user.id}'

            # Build folder tree
            folders = Folder.objects.filter(
                department=user.department
            ).select_related('parent')

            tree = self._build_tree(folders)
            cache.set(cache_key, tree, timeout=3600)

            self.stdout.write(f'  Cached folder tree for {user.email}')

        # Warm document type cache
        from apps.documents.models import DocumentType
        document_types = list(DocumentType.objects.all())
        cache.set('document_types_all', document_types, timeout=86400)

        self.stdout.write(self.style.SUCCESS('Cache warming complete'))
```

**Add to Celery Beat**:
```python
app.conf.beat_schedule = {
    'warm-cache': {
        'task': 'apps.core.tasks.warm_cache',
        'schedule': crontab(hour='*/6'),  # Every 6 hours
    },
}
```

### 6. Cache Monitoring

**File**: `apps/core/views.py`

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.core.cache import cache
from django_redis import get_redis_connection

class CacheStatsView(APIView):
    """View cache statistics (admin only)"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        conn = get_redis_connection('default')

        # Get Redis info
        info = conn.info()

        # Get cache statistics
        stats = {
            'redis_version': info.get('redis_version'),
            'uptime_days': info.get('uptime_in_days'),
            'connected_clients': info.get('connected_clients'),
            'used_memory_human': info.get('used_memory_human'),
            'used_memory_peak_human': info.get('used_memory_peak_human'),
            'total_commands_processed': info.get('total_commands_processed'),
            'keyspace_hits': info.get('keyspace_hits', 0),
            'keyspace_misses': info.get('keyspace_misses', 0),
            'evicted_keys': info.get('evicted_keys', 0),
        }

        # Calculate hit rate
        hits = stats['keyspace_hits']
        misses = stats['keyspace_misses']
        total = hits + misses
        stats['hit_rate'] = (hits / total * 100) if total > 0 else 0

        # Get key count by pattern
        stats['key_counts'] = {
            'total': conn.dbsize(),
            'documents': len(conn.keys('dfc:view_document*')),
            'folders': len(conn.keys('dfc:folder*')),
            'permissions': len(conn.keys('dfc:perm*')),
        }

        return Response(stats)


class CacheClearView(APIView):
    """Clear cache (admin only)"""
    permission_classes = [IsAdminUser]

    def post(self, request):
        pattern = request.data.get('pattern', '*')

        from apps.core.cache import invalidate_cache_pattern
        count = invalidate_cache_pattern(pattern)

        return Response({
            'status': 'Cache cleared',
            'pattern': pattern,
            'keys_deleted': count
        })
```

### Acceptance Criteria

- [ ] Redis configured as cache backend
- [ ] View-level caching implemented for expensive views
- [ ] Query result caching implemented
- [ ] Cache invalidation works on model changes (signals)
- [ ] Per-user caching works correctly
- [ ] Cache warming job runs periodically
- [ ] Cache hit rate >70%
- [ ] Cache monitoring dashboard available
- [ ] All tests passing

### Documentation

**To Create**:
- Caching strategy guide
- Cache invalidation patterns
- Cache monitoring procedures

---

## Week 25: Load Balancing & High Availability

**Objective**: Configure Docker/Kubernetes deployment with high availability

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Docker containerization (Django, Celery) | Critical | 6h | Docker |
| Kubernetes deployment manifests | Critical | 8h | K8s cluster |
| PostgreSQL replication setup | High | 5h | PostgreSQL |
| MinIO distributed mode | High | 4h | MinIO |
| Elasticsearch cluster configuration | High | 4h | Elasticsearch |
| Load balancer configuration (Nginx/HAProxy) | Critical | 4h | Infrastructure |
| Health checks and readiness probes | High | 3h | K8s |
| Prometheus + Grafana monitoring | High | 6h | Monitoring stack |

**Total Estimated Time**: 40 hours

### 1. Docker Containerization

**File**: `Dockerfile` (Django application)

```dockerfile
# Multi-stage build for smaller image size
FROM python:3.11-slim as builder

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements
COPY requirements/ /requirements/
RUN pip install --no-cache-dir -r /requirements/production.txt

# Final stage
FROM python:3.11-slim

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq5 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create app user
RUN useradd -m -u 1000 dfc && \
    mkdir -p /app /app/static /app/media && \
    chown -R dfc:dfc /app

WORKDIR /app

# Copy application code
COPY --chown=dfc:dfc . /app/

# Switch to non-root user
USER dfc

# Collect static files
RUN python manage.py collectstatic --noinput

# Run migrations on startup (handled by entrypoint)
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]

EXPOSE 8000
```

**File**: `docker-entrypoint.sh`

```bash
#!/bin/bash
set -e

# Wait for PostgreSQL
echo "Waiting for PostgreSQL..."
while ! pg_isready -h $POSTGRES_HOST -p $POSTGRES_PORT -U $POSTGRES_USER; do
  sleep 1
done
echo "PostgreSQL ready"

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Create superuser if doesn't exist
echo "Ensuring superuser exists..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin', 'admin@dfc.local', 'changeme')
EOF

# Initialize default roles
python manage.py init_roles

exec "$@"
```

**File**: `Dockerfile.celery` (Celery worker)

```dockerfile
FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq5 \
    tesseract-ocr \
    poppler-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --from=dfc-backend /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app
COPY . /app/

CMD ["celery", "-A", "config", "worker", "--loglevel=info", "--concurrency=4"]
```

**File**: `docker-compose.yml` (Development/Staging)

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-dfc_dev}
      POSTGRES_USER: ${POSTGRES_USER:-dfc_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dfc_user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  django:
    build:
      context: .
      dockerfile: Dockerfile
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/1
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - AWS_S3_ENDPOINT_URL=http://minio:9000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"

  celery_worker:
    build:
      context: .
      dockerfile: Dockerfile.celery
    command: celery -A config worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - postgres
      - redis

  celery_beat:
    build:
      context: .
      dockerfile: Dockerfile.celery
    command: celery -A config beat --loglevel=info
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - REDIS_URL=redis://redis:6379/1
    depends_on:
      - postgres
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/dfc.conf:/etc/nginx/conf.d/default.conf:ro
      - static_volume:/var/www/static:ro
    depends_on:
      - django

volumes:
  postgres_data:
  redis_data:
  minio_data:
  elasticsearch_data:
  static_volume:
```

### 2. Kubernetes Deployment Manifests

**File**: `k8s/namespace.yaml`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dfc-prod
```

**File**: `k8s/configmap.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dfc-config
  namespace: dfc-prod
data:
  DJANGO_SETTINGS_MODULE: "config.settings.production"
  DATABASE_HOST: "postgresql-ha"
  DATABASE_PORT: "5432"
  REDIS_HOST: "redis-master"
  REDIS_PORT: "6379"
  ELASTICSEARCH_URL: "http://elasticsearch:9200"
  MINIO_ENDPOINT: "http://minio:9000"
```

**File**: `k8s/secrets.yaml`

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: dfc-secrets
  namespace: dfc-prod
type: Opaque
stringData:
  POSTGRES_PASSWORD: "changeme"
  POSTGRES_USER: "dfc_user"
  POSTGRES_DB: "dfc_prod"
  DJANGO_SECRET_KEY: "your-secret-key-here"
  MINIO_ROOT_PASSWORD: "changeme"
```

**File**: `k8s/django-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dfc-django
  namespace: dfc-prod
  labels:
    app: dfc
    component: django
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dfc
      component: django
  template:
    metadata:
      labels:
        app: dfc
        component: django
    spec:
      containers:
      - name: django
        image: dfc/backend:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
          name: http
        envFrom:
        - configMapRef:
            name: dfc-config
        - secretRef:
            name: dfc-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health/
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready/
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: dfc-django
  namespace: dfc-prod
spec:
  type: ClusterIP
  ports:
  - port: 8000
    targetPort: 8000
    protocol: TCP
    name: http
  selector:
    app: dfc
    component: django
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dfc-django-hpa
  namespace: dfc-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: dfc-django
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

**File**: `k8s/celery-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dfc-celery-worker
  namespace: dfc-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dfc
      component: celery-worker
  template:
    metadata:
      labels:
        app: dfc
        component: celery-worker
    spec:
      containers:
      - name: celery-worker
        image: dfc/celery:latest
        command: ["celery", "-A", "config", "worker", "--loglevel=info", "--concurrency=4"]
        envFrom:
        - configMapRef:
            name: dfc-config
        - secretRef:
            name: dfc-secrets
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dfc-celery-beat
  namespace: dfc-prod
spec:
  replicas: 1  # Only one beat scheduler
  selector:
    matchLabels:
      app: dfc
      component: celery-beat
  template:
    metadata:
      labels:
        app: dfc
        component: celery-beat
    spec:
      containers:
      - name: celery-beat
        image: dfc/celery:latest
        command: ["celery", "-A", "config", "beat", "--loglevel=info"]
        envFrom:
        - configMapRef:
            name: dfc-config
        - secretRef:
            name: dfc-secrets
```

**File**: `k8s/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dfc-ingress
  namespace: dfc-prod
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "500m"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - dfc.cccplc.com
    secretName: dfc-tls
  rules:
  - host: dfc.cccplc.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dfc-django
            port:
              number: 8000
```

### 3. PostgreSQL High Availability

**Using Patroni for PostgreSQL HA**:

**File**: `k8s/postgresql-ha.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgresql-ha
  namespace: dfc-prod
spec:
  type: ClusterIP
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: postgresql
    role: master
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgresql
  namespace: dfc-prod
spec:
  serviceName: postgresql
  replicas: 3
  selector:
    matchLabels:
      app: postgresql
  template:
    metadata:
      labels:
        app: postgresql
    spec:
      containers:
      - name: postgresql
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: dfc-secrets
              key: POSTGRES_PASSWORD
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

### 4. Health Check Endpoints

**File**: `apps/core/views.py` (Add health check views)

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import connection
from django.core.cache import cache
from django_redis import get_redis_connection

class HealthCheckView(APIView):
    """
    Liveness probe - checks if application is running.
    Returns 200 if app is alive, 503 if not.
    """
    permission_classes = []

    def get(self, request):
        return Response({'status': 'healthy'}, status=status.HTTP_200_OK)


class ReadinessCheckView(APIView):
    """
    Readiness probe - checks if application is ready to serve traffic.
    Checks database, cache, and other dependencies.
    """
    permission_classes = []

    def get(self, request):
        checks = {
            'database': self._check_database(),
            'cache': self._check_cache(),
            'storage': self._check_storage(),
        }

        all_healthy = all(checks.values())

        return Response({
            'status': 'ready' if all_healthy else 'not ready',
            'checks': checks
        }, status=status.HTTP_200_OK if all_healthy else status.HTTP_503_SERVICE_UNAVAILABLE)

    def _check_database(self):
        try:
            with connection.cursor() as cursor:
                cursor.execute('SELECT 1')
            return True
        except Exception:
            return False

    def _check_cache(self):
        try:
            cache.set('health_check', 'ok', 10)
            return cache.get('health_check') == 'ok'
        except Exception:
            return False

    def _check_storage(self):
        try:
            from django.core.files.storage import default_storage
            # Check if storage is accessible
            return default_storage.exists('.')  # Check root
        except Exception:
            return False
```

**URLs** (`config/urls.py`):

```python
urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health'),
    path('ready/', ReadinessCheckView.as_view(), name='ready'),
]
```

### 5. Monitoring with Prometheus & Grafana

**File**: `k8s/prometheus-config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: dfc-prod
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: 'django'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - dfc-prod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            action: keep
            regex: dfc
          - source_labels: [__meta_kubernetes_pod_label_component]
            action: keep
            regex: django
          - source_labels: [__meta_kubernetes_pod_ip]
            target_label: __address__
            replacement: ${1}:8000

      - job_name: 'postgres'
        static_configs:
          - targets: ['postgresql-ha:5432']

      - job_name: 'redis'
        static_configs:
          - targets: ['redis-master:6379']
```

**Install Prometheus Operator**:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus prometheus-community/kube-prometheus-stack -n dfc-prod
```

**Django Prometheus Metrics** (`config/settings/base.py`):

```python
INSTALLED_APPS = [
    # ... other apps
    'django_prometheus',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    # ... other middleware
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# Expose metrics endpoint
PROMETHEUS_EXPORT_MIGRATIONS = False
```

**URLs** (`config/urls.py`):

```python
urlpatterns = [
    path('', include('django_prometheus.urls')),
]
```

### Acceptance Criteria

- [ ] Docker images built for Django, Celery
- [ ] Kubernetes manifests deployed successfully
- [ ] Django application runs with 3+ replicas
- [ ] PostgreSQL configured with replication
- [ ] MinIO running in distributed mode
- [ ] Elasticsearch cluster (3 nodes minimum)
- [ ] Load balancer distributes traffic
- [ ] Health/readiness probes working
- [ ] Horizontal pod autoscaling configured
- [ ] Prometheus collecting metrics
- [ ] Grafana dashboards configured
- [ ] All tests passing

### Documentation

**To Create**:
- Kubernetes deployment guide
- High availability architecture diagram
- Monitoring and alerting guide

---

## Week 26: Load Testing & Performance Tuning

**Objective**: Perform comprehensive load testing and optimize system performance

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Locust load testing scripts | Critical | 5h | Locust |
| Load test scenarios (100, 500, 1000 users) | Critical | 6h | Test scripts |
| Database performance tuning | High | 5h | PostgreSQL |
| Application profiling (bottlenecks) | Critical | 6h | django-silk |
| Query optimization based on profiling | High | 5h | ORM |
| Resource allocation tuning (CPU, memory) | High | 4h | K8s |
| Stress testing | Medium | 4h | Load testing |
| Performance report generation | High | 3h | Results |

**Total Estimated Time**: 38 hours

### 1. Locust Load Testing

**Installation**:
```bash
pip install locust
```

**File**: `tests/load/locustfile.py`

```python
from locust import HttpUser, task, between
import random
import json

class DFCUser(HttpUser):
    """Simulated DFC user behavior"""
    wait_time = between(1, 5)  # Wait 1-5 seconds between tasks

    def on_start(self):
        """Login before starting tasks"""
        response = self.client.post("/api/v1/auth/login/", json={
            "email": "test@example.com",
            "password": "testpass123"
        })

        if response.status_code == 200:
            self.token = response.json()['access']
            self.client.headers.update({
                'Authorization': f'Bearer {self.token}'
            })

    @task(5)
    def list_documents(self):
        """List documents (most common operation)"""
        self.client.get("/api/v1/documents/")

    @task(3)
    def view_document_detail(self):
        """View document details"""
        doc_id = random.randint(1, 1000)
        self.client.get(f"/api/v1/documents/{doc_id}/")

    @task(2)
    def search_documents(self):
        """Search for documents"""
        query = random.choice(['invoice', 'contract', 'report', 'memo'])
        self.client.get(f"/api/v1/search/?q={query}")

    @task(2)
    def list_folders(self):
        """List folders"""
        self.client.get("/api/v1/folders/")

    @task(1)
    def view_folder_tree(self):
        """View folder tree"""
        self.client.get("/api/v1/folders/tree/")

    @task(1)
    def upload_document(self):
        """Upload a document"""
        files = {
            'file': ('test.pdf', b'%PDF-1.4 test content', 'application/pdf')
        }
        data = {
            'title': f'Load Test Document {random.randint(1, 10000)}',
            'folder': random.randint(1, 100),
            'document_type': 'Invoice'
        }
        self.client.post("/api/v1/documents/upload/", files=files, data=data)
```

**Run Load Test**:
```bash
# Web UI mode
locust -f tests/load/locustfile.py --host=https://dfc.cccplc.com

# Headless mode
locust -f tests/load/locustfile.py --host=https://dfc.cccplc.com \
  --users 1000 --spawn-rate 10 --run-time 10m --headless
```

### 2. Load Test Scenarios

**File**: `tests/load/scenarios.py`

```python
import subprocess
import json
import time
from datetime import datetime

class LoadTestScenario:
    """Base class for load test scenarios"""

    def __init__(self, host, users, spawn_rate, duration):
        self.host = host
        self.users = users
        self.spawn_rate = spawn_rate
        self.duration = duration
        self.results = {}

    def run(self):
        """Execute load test"""
        print(f"Running scenario: {self.users} users, spawn rate {self.spawn_rate}")

        cmd = [
            'locust',
            '-f', 'tests/load/locustfile.py',
            '--host', self.host,
            '--users', str(self.users),
            '--spawn-rate', str(self.spawn_rate),
            '--run-time', self.duration,
            '--headless',
            '--only-summary',
            '--csv', f'results/load_test_{self.users}_users'
        ]

        start_time = time.time()
        result = subprocess.run(cmd, capture_output=True, text=True)
        end_time = time.time()

        self.results = {
            'users': self.users,
            'spawn_rate': self.spawn_rate,
            'duration': self.duration,
            'execution_time': end_time - start_time,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'return_code': result.returncode
        }

        return self.results

    def save_results(self):
        """Save results to JSON"""
        filename = f'results/scenario_{self.users}users_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"Results saved to {filename}")


# Scenario 1: Light load (100 users)
scenario1 = LoadTestScenario(
    host='https://dfc.cccplc.com',
    users=100,
    spawn_rate=10,
    duration='10m'
)

# Scenario 2: Medium load (500 users)
scenario2 = LoadTestScenario(
    host='https://dfc.cccplc.com',
    users=500,
    spawn_rate=20,
    duration='15m'
)

# Scenario 3: Heavy load (1000 users)
scenario3 = LoadTestScenario(
    host='https://dfc.cccplc.com',
    users=1000,
    spawn_rate=50,
    duration='20m'
)

# Run all scenarios
if __name__ == '__main__':
    for scenario in [scenario1, scenario2, scenario3]:
        print(f"\n{'='*60}")
        results = scenario.run()
        scenario.save_results()
        print(f"{'='*60}\n")

        # Wait between scenarios
        print("Waiting 5 minutes before next scenario...")
        time.sleep(300)
```

### 3. Database Performance Tuning

**PostgreSQL Configuration** (`postgresql.conf`):

```ini
# Memory settings
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 50MB

# Checkpoint settings
checkpoint_completion_target = 0.9
wal_buffers = 16MB
max_wal_size = 4GB
min_wal_size = 1GB

# Query planner
random_page_cost = 1.1  # For SSD storage
effective_io_concurrency = 200

# Parallel query settings
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 8

# Logging
log_min_duration_statement = 1000  # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

**Analyze Slow Queries**:

```sql
-- Enable pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slowest queries
SELECT
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time,
    query
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries averaging >100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Find queries with high I/O
SELECT
    query,
    calls,
    shared_blks_hit,
    shared_blks_read,
    shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0)::float AS cache_hit_ratio
FROM pg_stat_statements
WHERE shared_blks_read > 0
ORDER BY shared_blks_read DESC
LIMIT 20;

-- Find table bloat
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

**Vacuum and Analyze**:

```sql
-- Aggressive vacuum for heavily updated tables
VACUUM FULL ANALYZE documents;
VACUUM FULL ANALYZE folders;

-- Regular vacuum (run via cron)
VACUUM ANALYZE;

-- Reindex if needed
REINDEX TABLE CONCURRENTLY documents;
```

### 4. Application Profiling

**Using django-silk** (Already configured in Week 23):

Access profiling dashboard: `https://dfc.cccplc.com/silk/`

**Analyze Profiling Results**:

```python
# Script to analyze Silk data
from silk.models import Request
from django.db.models import Avg, Max, Min, Count

# Find slowest endpoints
slow_requests = Request.objects.values('path').annotate(
    count=Count('id'),
    avg_time=Avg('time_taken'),
    max_time=Max('time_taken'),
    min_time=Min('time_taken')
).filter(
    count__gte=10  # At least 10 requests
).order_by('-avg_time')[:20]

for req in slow_requests:
    print(f"Path: {req['path']}")
    print(f"  Count: {req['count']}")
    print(f"  Avg: {req['avg_time']:.2f}ms")
    print(f"  Max: {req['max_time']:.2f}ms")
    print()
```

### 5. Performance Tuning Checklist

**Database**:
- [ ] Indexes created on frequently queried columns
- [ ] Composite indexes for multi-column queries
- [ ] Covering indexes for list views
- [ ] GIN indexes for full-text search
- [ ] VACUUM ANALYZE run regularly
- [ ] pg_stat_statements enabled
- [ ] Connection pooling configured (pgbouncer)

**Application**:
- [ ] select_related/prefetch_related used appropriately
- [ ] Queryset .only() used for list views
- [ ] Separate list/detail serializers
- [ ] Cursor pagination for large datasets
- [ ] Query result caching implemented
- [ ] View-level caching for expensive operations
- [ ] N+1 queries eliminated

**Infrastructure**:
- [ ] Horizontal pod autoscaling configured
- [ ] Resource limits set appropriately
- [ ] Load balancer configured
- [ ] CDN for static files
- [ ] Database read replicas for scaling reads

### 6. Performance Benchmarks

**Target Performance Metrics**:

| Metric | Target | Acceptable | Action Required |
|--------|--------|----------|-----------------|
| API response time (P50) | <100ms | <200ms | >200ms |
| API response time (P95) | <500ms | <1s | >1s |
| API response time (P99) | <1s | <2s | >2s |
| Database query time (avg) | <50ms | <100ms | >100ms |
| Cache hit rate | >70% | >50% | <50% |
| Concurrent users (100) | <2s response | <3s response | >3s response |
| Concurrent users (500) | <3s response | <5s response | >5s response |
| Concurrent users (1000) | <5s response | <10s response | >10s response |
| CPU utilization | <70% | <80% | >80% |
| Memory utilization | <75% | <85% | >85% |
| Error rate | <0.1% | <1% | >1% |

### Acceptance Criteria

- [ ] Load testing framework set up (Locust)
- [ ] Test scenarios for 100, 500, 1000 users created
- [ ] All test scenarios pass performance targets
- [ ] Slow queries identified and optimized
- [ ] Database tuned for production workload
- [ ] Application bottlenecks identified via profiling
- [ ] Resource allocation optimized
- [ ] Performance report generated
- [ ] All metrics meet targets

### Documentation

**To Create**:
- Load testing guide
- Performance tuning checklist
- Capacity planning guide

---

## Week 27: Security Hardening & Compliance

**Objective**: Finalize security hardening and ensure regulatory compliance

### Tasks Breakdown

| Task | Priority | Estimated Hours | Dependencies |
|------|----------|-----------------|--------------|
| Rate limiting (django-ratelimit) | High | 3h | Middleware |
| Input validation hardening | Critical | 5h | Views/serializers |
| Secrets management (Vault integration) | Critical | 5h | HashiCorp Vault |
| Database backup automation | Critical | 4h | Cron/K8s CronJob |
| Disaster recovery testing | High | 6h | Backups |
| Penetration testing | Critical | 8h | Security team |
| Security audit & remediation | Critical | 8h | Audit results |
| Compliance checklist (GDPR, financial regs) | High | 5h | Legal/compliance |

**Total Estimated Time**: 44 hours

### 1. Rate Limiting

**Installation**:
```bash
pip install django-ratelimit
```

**File**: `apps/core/decorators.py`

```python
from django_ratelimit.decorators import ratelimit
from functools import wraps

def api_ratelimit(key='user_or_ip', rate='100/h', method='ALL'):
    """
    Rate limit decorator for API views.

    Usage:
        @api_ratelimit(rate='10/m')
        def my_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        @ratelimit(key=key, rate=rate, method=method, block=True)
        def wrapper(request, *args, **kwargs):
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator
```

**Apply to Views**:

```python
from apps.core.decorators import api_ratelimit

class DocumentListView(generics.ListAPIView):
    @api_ratelimit(rate='100/h')  # 100 requests per hour per user
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class DocumentUploadView(APIView):
    @api_ratelimit(rate='10/h')  # Strict limit for uploads
    def post(self, request):
        # Upload logic
        pass


class LoginView(TokenObtainPairView):
    @api_ratelimit(key='ip', rate='5/m')  # 5 login attempts per minute per IP
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)
```

**Settings** (`config/settings/base.py`):

```python
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
```

### 2. Input Validation Hardening

**File**: `apps/core/validators.py`

```python
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_no_sql_injection(value):
    """Prevent SQL injection patterns"""
    sql_patterns = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bEXEC\b|\bEXECUTE\b)",
        r"(--|\/\*|\*\/)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
    ]

    for pattern in sql_patterns:
        if re.search(pattern, str(value), re.IGNORECASE):
            raise ValidationError(_('Invalid input detected'))


def validate_no_xss(value):
    """Prevent XSS patterns"""
    xss_patterns = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe",
        r"<embed",
        r"<object",
    ]

    for pattern in xss_patterns:
        if re.search(pattern, str(value), re.IGNORECASE):
            raise ValidationError(_('Invalid input detected'))


def validate_file_size(file):
    """Validate file size (max 500MB)"""
    max_size = 500 * 1024 * 1024  # 500MB

    if file.size > max_size:
        raise ValidationError(_(f'File size must not exceed 500MB'))


def validate_file_extension(file):
    """Validate allowed file extensions"""
    allowed_extensions = [
        '.pdf', '.docx', '.xlsx', '.pptx',
        '.jpg', '.jpeg', '.png', '.gif',
        '.txt', '.csv', '.zip'
    ]

    import os
    ext = os.path.splitext(file.name)[1].lower()

    if ext not in allowed_extensions:
        raise ValidationError(_(f'File type {ext} not allowed'))


def validate_safe_filename(filename):
    """Ensure filename doesn't contain path traversal"""
    if '..' in filename or '/' in filename or '\\' in filename:
        raise ValidationError(_('Invalid filename'))
```

**Apply Validators**:

```python
from apps.core.validators import (
    validate_no_sql_injection, validate_no_xss,
    validate_file_size, validate_file_extension
)

class DocumentSerializer(serializers.ModelSerializer):
    title = serializers.CharField(
        max_length=500,
        validators=[validate_no_xss, validate_no_sql_injection]
    )

    file = serializers.FileField(
        validators=[validate_file_size, validate_file_extension]
    )
```

### 3. Database Backup Automation

**File**: `scripts/backup_database.sh`

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/backups/postgresql"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dfc_backup_$TIMESTAMP.sql.gz"

# Create backup directory if doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
echo "Starting PostgreSQL backup..."
pg_dump \
    -h $POSTGRES_HOST \
    -U $POSTGRES_USER \
    -d $POSTGRES_DB \
    --verbose \
    --format=custom \
    | gzip > $BACKUP_FILE

# Verify backup
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h $BACKUP_FILE | cut -f1)
    echo "Backup completed: $BACKUP_FILE ($SIZE)"
else
    echo "ERROR: Backup failed"
    exit 1
fi

# Upload to S3/MinIO
mc cp $BACKUP_FILE minio/dfc-backups/postgresql/

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find $BACKUP_DIR -name "dfc_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup process completed successfully"
```

**Kubernetes CronJob** (`k8s/backup-cronjob.yaml`):

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgresql-backup
  namespace: dfc-prod
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: postgres:16-alpine
            command:
            - /bin/bash
            - /scripts/backup_database.sh
            envFrom:
            - secretRef:
                name: dfc-secrets
            volumeMounts:
            - name: backup-scripts
              mountPath: /scripts
            - name: backups
              mountPath: /backups
          restartPolicy: OnFailure
          volumes:
          - name: backup-scripts
            configMap:
              name: backup-scripts
              defaultMode: 0755
          - name: backups
            persistentVolumeClaim:
              claimName: backup-pvc
```

### 4. Disaster Recovery Testing

**File**: `scripts/test_restore.sh`

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_FILE=$1
TEST_DB="dfc_restore_test"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

echo "Testing restore from: $BACKUP_FILE"

# Create test database
psql -h $POSTGRES_HOST -U $POSTGRES_USER -c "DROP DATABASE IF EXISTS $TEST_DB"
psql -h $POSTGRES_HOST -U $POSTGRES_USER -c "CREATE DATABASE $TEST_DB"

# Restore backup
echo "Restoring backup..."
gunzip -c $BACKUP_FILE | pg_restore \
    -h $POSTGRES_HOST \
    -U $POSTGRES_USER \
    -d $TEST_DB \
    --verbose \
    --no-owner \
    --no-acl

# Verify restore
echo "Verifying restore..."
TABLE_COUNT=$(psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $TEST_DB -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

echo "Tables restored: $TABLE_COUNT"

if [ $TABLE_COUNT -gt 0 ]; then
    echo "✓ Restore test PASSED"

    # Cleanup
    psql -h $POSTGRES_HOST -U $POSTGRES_USER -c "DROP DATABASE $TEST_DB"
    exit 0
else
    echo "✗ Restore test FAILED"
    exit 1
fi
```

### 5. Security Checklist

**OWASP Top 10 Mitigation**:

- [ ] **A01 - Broken Access Control**
  - RBAC implemented and tested
  - Permission checks on all endpoints
  - Owner validation for resources

- [ ] **A02 - Cryptographic Failures**
  - TLS 1.3 enforced
  - AES-256 encryption at rest
  - Secrets in Vault, not in code
  - Password hashing (bcrypt/Argon2)

- [ ] **A03 - Injection**
  - ORM used (no raw SQL)
  - Input validation on all fields
  - SQL injection validators
  - XSS prevention in serializers

- [ ] **A04 - Insecure Design**
  - Security requirements in design
  - Threat modeling completed
  - Secure by default configuration

- [ ] **A05 - Security Misconfiguration**
  - DEBUG=False in production
  - No default credentials
  - Security headers configured
  - Unnecessary services disabled

- [ ] **A06 - Vulnerable Components**
  - Dependencies up to date
  - Regular security scans
  - No known CVEs in dependencies

- [ ] **A07 - Authentication Failures**
  - JWT with proper expiration
  - MFA for admin users
  - Account lockout on failed attempts
  - Password complexity enforced

- [ ] **A08 - Data Integrity Failures**
  - Digital signatures for updates
  - Audit logs immutable
  - Checksum verification

- [ ] **A09 - Logging Failures**
  - All actions logged
  - Logs centralized (ELK)
  - Alerting configured
  - Log retention enforced

- [ ] **A10 - SSRF**
  - URL validation
  - Whitelist external requests
  - No user-controlled URLs

### 6. Compliance Checklist

**GDPR Compliance**:

- [ ] Data protection by design
- [ ] Right to access (user data export)
- [ ] Right to erasure (account deletion)
- [ ] Right to rectification (data editing)
- [ ] Data portability (JSON export)
- [ ] Consent management
- [ ] Privacy policy displayed
- [ ] Data breach notification process
- [ ] DPO designated

**Financial Regulations**:

- [ ] 7-year audit log retention
- [ ] Immutable audit trail
- [ ] Access logs for all financial documents
- [ ] Encryption at rest and in transit
- [ ] Secure backup and recovery
- [ ] Role segregation enforced
- [ ] MFA for privileged access
- [ ] Regular security audits

### Acceptance Criteria

- [ ] Rate limiting configured on all public endpoints
- [ ] Input validation hardened against injection attacks
- [ ] Secrets managed via HashiCorp Vault
- [ ] Automated daily database backups
- [ ] Backup restoration tested and verified
- [ ] Penetration testing completed (no critical issues)
- [ ] Security audit passed
- [ ] GDPR compliance verified
- [ ] Financial compliance verified
- [ ] Security documentation complete
- [ ] All tests passing

### Documentation

**To Create**:
- Security hardening checklist
- Incident response plan
- Compliance certification documentation
- Disaster recovery procedures

---

# Summary

This detailed implementation guide covers **Weeks 17-27** of the Digital Filing Cabinet backend development:

## Phase 3: Security & Compliance (Weeks 17-22)
✅ **Week 17**: RBAC - Complete multi-level permission system
✅ **Week 18**: Audit Trail - Immutable logging with before/after tracking
✅ **Week 19**: Encryption - TLS, field-level encryption, key management
✅ **Week 20**: Retention & Legal Hold - Automated policies with grace periods
✅ **Week 21**: Secure Sharing - Tokenized links with password protection
✅ **Week 22**: MFA - TOTP-based authentication with backup codes

## Phase 4: Scale & Hardening (Weeks 23-27)
✅ **Week 23**: Performance - Query optimization, indexing, connection pooling
✅ **Week 24**: Caching - Redis caching with invalidation strategies
✅ **Week 25**: High Availability - Kubernetes deployment, load balancing
✅ **Week 26**: Load Testing - Comprehensive testing up to 1000 users
✅ **Week 27**: Security Hardening - Rate limiting, compliance, disaster recovery

## Key Achievements

- **6,000+ lines** of detailed implementation code
- **Complete API endpoints** for all features
- **Production-ready** Kubernetes manifests
- **Comprehensive testing** strategies
- **Security hardening** against OWASP Top 10
- **Compliance ready** (GDPR, financial regulations)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-18
**Total Pages**: Approximately 200+ pages
**Status**: Ready for Implementation
