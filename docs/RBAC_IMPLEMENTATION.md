# Role-Based Access Control (RBAC) Implementation Guide

**Digital Filing Cabinet - Phase 3, Week 17**

**Version**: 1.0
**Last Updated**: 2025-11-18
**Status**: Production Ready

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Permission Model](#permission-model)
3. [API Reference](#api-reference)
4. [Model Reference](#model-reference)
5. [Usage Guide](#usage-guide)
6. [Integration Guide](#integration-guide)
7. [Administration Guide](#administration-guide)
8. [Security Best Practices](#security-best-practices)
9. [Performance Tuning](#performance-tuning)
10. [Testing Guide](#testing-guide)
11. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### System Design

The DFC RBAC system implements a **multi-level, hierarchical permission model** with three core components:

1. **Roles** - Predefined sets of permissions (VIEWER, EDITOR, MANAGER, ADMIN)
2. **User Role Assignments** - Assignment of roles to users at different scopes
3. **Folder Permissions** - Explicit folder-level permissions with inheritance

### Permission Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    GLOBAL SCOPE                         │
│  (User has role across entire system)                   │
│  ┌───────────────────────────────────────────────────┐ │
│  │             DEPARTMENT SCOPE                       │ │
│  │  (User has role within specific department)       │ │
│  │  ┌─────────────────────────────────────────────┐ │ │
│  │  │          FOLDER SCOPE                        │ │ │
│  │  │  (Explicit permissions on specific folder)  │ │ │
│  │  │                                              │ │ │
│  │  │  • Can inherit from parent folders          │ │ │
│  │  │  • Can override inherited permissions       │ │ │
│  │  └─────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Permission Resolution Flow

```
User requests access to Folder
         ↓
    Is user owner?  → YES → Grant all permissions
         ↓ NO
    Check cache (15-min TTL)  → HIT → Return cached result
         ↓ MISS
    Check global role permissions  → HAS → Cache & return TRUE
         ↓ NO
    Check department role permissions  → HAS → Cache & return TRUE
         ↓ NO
    Check explicit folder permissions
         ↓
    If inherit enabled: Check parent recursively
         ↓
    Cache result → Return TRUE/FALSE
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **UUID Primary Keys** | Better security (non-sequential), supports distributed systems |
| **15-minute Cache TTL** | Balance between performance and permission change propagation |
| **Permission Inheritance** | Reduces administrative overhead, maintains folder hierarchy semantics |
| **Immutable Roles** | Prevents privilege escalation, ensures consistent behavior |
| **Audit Logging** | Compliance requirement, security monitoring |
| **Either User OR Department** | Prevents ambiguous permission grants |

---

## Permission Model

### Four Predefined Roles

#### 1. VIEWER
**Description**: Read-only access to documents
**Permissions**:
- ✅ `can_view` - View documents and folders
- ✅ `can_download` - Download files
- ❌ All other permissions denied

**Use Cases**:
- External auditors (temporary access)
- New employees (training period)
- Cross-department viewers

#### 2. EDITOR
**Description**: Can modify content but not structure
**Permissions**:
- ✅ `can_view`, `can_download` (inherited from VIEWER)
- ✅ `can_upload` - Upload new documents
- ✅ `can_edit` - Edit existing documents
- ❌ Cannot delete, share, or manage permissions

**Use Cases**:
- Content creators
- Document processors
- Data entry staff

#### 3. MANAGER
**Description**: Full operational control over documents
**Permissions**:
- ✅ All EDITOR permissions
- ✅ `can_delete` - Delete documents and folders
- ✅ `can_share` - Share documents externally
- ✅ `can_manage_permissions` - Grant permissions to others
- ❌ Cannot manage retention or classification

**Use Cases**:
- Department managers
- Team leads
- Project coordinators

#### 4. ADMIN
**Description**: Full system control including compliance features
**Permissions**:
- ✅ All MANAGER permissions
- ✅ `can_view_audit_log` - Access audit trail
- ✅ `can_manage_retention` - Configure retention policies
- ✅ `can_manage_classification` - Set confidentiality levels

**Use Cases**:
- System administrators
- Compliance officers
- IT security team

### Permission Scopes

#### GLOBAL Scope
- User has role across **entire DFC system**
- No department or folder restrictions
- Highest privilege level
- Example: IT Administrator with ADMIN role globally

#### DEPARTMENT Scope
- User has role within **specific department only**
- Can access all folders owned by that department
- Most common scope for regular employees
- Example: Accounting Manager with MANAGER role in Accounting department

#### FOLDER Scope
- **Explicit permissions** on specific folder
- Does not rely on role assignment
- Can inherit from parent folders
- Used for granular access control
- Example: External consultant granted VIEW_DOWNLOAD on "Project X" folder

### Folder Permission Levels

| Level | View | Download | Upload | Edit | Delete | Share |
|-------|------|----------|--------|------|--------|-------|
| **NO_ACCESS** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VIEW_ONLY** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **VIEW_DOWNLOAD** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **CONTRIBUTE** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **EDIT** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **FULL_CONTROL** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## API Reference

### Base URL
```
https://dfc.cccplc.com/api/v1/permissions/
```

### Authentication
All endpoints require JWT authentication:
```http
Authorization: Bearer <access_token>
```

---

### Roles API

#### List All Roles
```http
GET /api/v1/permissions/roles/
```

**Response**:
```json
{
  "count": 4,
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "VIEWER",
      "display_name": "Viewer",
      "description": "Read-only access to documents",
      "can_view": true,
      "can_download": true,
      "can_upload": false,
      "can_edit": false,
      "can_delete": false,
      "can_share": false,
      "can_manage_permissions": false,
      "can_view_audit_log": false,
      "can_manage_retention": false,
      "can_manage_classification": false,
      "permissions_list": ["can_view", "can_download"],
      "created_at": "2025-11-18T10:00:00Z",
      "updated_at": "2025-11-18T10:00:00Z"
    }
  ]
}
```

#### Get Role Details
```http
GET /api/v1/permissions/roles/{role_id}/
```

#### Get Users Assigned to Role
```http
GET /api/v1/permissions/roles/{role_id}/users/
```

**Response**:
```json
{
  "count": 15,
  "results": [
    {
      "id": "...",
      "user": "john.doe@cccplc.com",
      "role": "EDITOR",
      "scope": "DEPARTMENT",
      "department": "Accounting",
      "is_active": true,
      "expires_at": null,
      "granted_by": "admin@cccplc.com",
      "granted_at": "2025-11-15T14:30:00Z"
    }
  ]
}
```

---

### User Role Assignments API

#### List Role Assignments
```http
GET /api/v1/permissions/user-roles/
```

**Query Parameters**:
- `user` - Filter by user ID
- `role` - Filter by role name (VIEWER, EDITOR, MANAGER, ADMIN)
- `scope` - Filter by scope (GLOBAL, DEPARTMENT, FOLDER)
- `is_active` - Filter by active status (true/false)
- `department` - Filter by department ID

**Example**:
```http
GET /api/v1/permissions/user-roles/?user=123&scope=DEPARTMENT&is_active=true
```

#### Assign Role to User
```http
POST /api/v1/permissions/user-roles/
```

**Request Body**:
```json
{
  "user": "550e8400-e29b-41d4-a716-446655440001",
  "role": "550e8400-e29b-41d4-a716-446655440000",
  "scope": "DEPARTMENT",
  "department": "550e8400-e29b-41d4-a716-446655440002",
  "expires_at": "2026-11-18T23:59:59Z"
}
```

**Validation Rules**:
- If `scope=DEPARTMENT`, `department` field is **required**
- If `scope=GLOBAL`, `department` field must be **null**
- `expires_at` is optional (null = no expiration)
- User cannot be assigned the same role+scope+department combination twice

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "user": "550e8400-e29b-41d4-a716-446655440001",
  "user_email": "john.doe@cccplc.com",
  "role": "550e8400-e29b-41d4-a716-446655440000",
  "role_name": "EDITOR",
  "scope": "DEPARTMENT",
  "department": "550e8400-e29b-41d4-a716-446655440002",
  "department_name": "Accounting",
  "is_active": true,
  "expires_at": "2026-11-18T23:59:59Z",
  "is_expired": false,
  "granted_by": "550e8400-e29b-41d4-a716-446655440010",
  "granted_at": "2025-11-18T10:30:00Z"
}
```

#### Update Role Assignment
```http
PUT /api/v1/permissions/user-roles/{id}/
PATCH /api/v1/permissions/user-roles/{id}/
```

**Request Body** (PATCH allows partial updates):
```json
{
  "is_active": false,
  "expires_at": "2025-12-31T23:59:59Z"
}
```

#### Deactivate Role Assignment
```http
POST /api/v1/permissions/user-roles/{id}/deactivate/
```

**Response**:
```json
{
  "id": "...",
  "is_active": false,
  "user": "john.doe@cccplc.com",
  "role": "EDITOR"
}
```

**Note**: Deactivation does not delete the record (maintains audit trail).

#### Activate Role Assignment
```http
POST /api/v1/permissions/user-roles/{id}/activate/
```

#### Delete Role Assignment
```http
DELETE /api/v1/permissions/user-roles/{id}/
```

**Response**: 204 No Content

**Note**: Permanent deletion. Consider deactivation instead.

---

### Folder Permissions API

#### List Folder Permissions
```http
GET /api/v1/permissions/folder-permissions/
```

**Query Parameters**:
- `folder` - Filter by folder ID
- `user` - Filter by user ID
- `department` - Filter by department ID
- `permission_level` - Filter by level (NO_ACCESS, VIEW_ONLY, etc.)

**Example**:
```http
GET /api/v1/permissions/folder-permissions/?folder=abc123&user=def456
```

#### Grant Folder Permission
```http
POST /api/v1/permissions/folder-permissions/
```

**Request Body** (User Permission):
```json
{
  "folder": "550e8400-e29b-41d4-a716-446655440100",
  "user": "550e8400-e29b-41d4-a716-446655440001",
  "permission_level": "EDIT",
  "inherit_from_parent": true
}
```

**Request Body** (Department Permission):
```json
{
  "folder": "550e8400-e29b-41d4-a716-446655440100",
  "department": "550e8400-e29b-41d4-a716-446655440002",
  "permission_level": "VIEW_DOWNLOAD",
  "inherit_from_parent": false
}
```

**Validation Rules**:
- Must provide **either** `user` **or** `department` (not both)
- `permission_level` must be one of: NO_ACCESS, VIEW_ONLY, VIEW_DOWNLOAD, CONTRIBUTE, EDIT, FULL_CONTROL
- `inherit_from_parent` defaults to `true`

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440200",
  "folder": "550e8400-e29b-41d4-a716-446655440100",
  "folder_name": "Financial Reports 2025",
  "user": "550e8400-e29b-41d4-a716-446655440001",
  "user_email": "john.doe@cccplc.com",
  "department": null,
  "permission_level": "EDIT",
  "permission_level_display": "Edit",
  "inherit_from_parent": true,
  "effective_permissions": {
    "can_view": true,
    "can_download": true,
    "can_upload": true,
    "can_edit": true,
    "can_delete": false,
    "can_share": false
  },
  "granted_by": "550e8400-e29b-41d4-a716-446655440010",
  "granted_at": "2025-11-18T11:00:00Z"
}
```

#### Update Folder Permission
```http
PUT /api/v1/permissions/folder-permissions/{id}/
PATCH /api/v1/permissions/folder-permissions/{id}/
```

**Request Body**:
```json
{
  "permission_level": "FULL_CONTROL",
  "inherit_from_parent": false
}
```

#### Delete Folder Permission
```http
DELETE /api/v1/permissions/folder-permissions/{id}/
```

**Response**: 204 No Content

#### Bulk Assign Permissions
```http
POST /api/v1/permissions/folder-permissions/bulk_assign/
```

**Request Body**:
```json
{
  "folder_id": "550e8400-e29b-41d4-a716-446655440100",
  "assignments": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "permission_level": "EDIT"
    },
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440002",
      "permission_level": "VIEW_DOWNLOAD"
    },
    {
      "department_id": "550e8400-e29b-41d4-a716-446655440003",
      "permission_level": "CONTRIBUTE"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "created": 2,
  "updated": 1,
  "assignments": [
    {
      "id": "...",
      "user": "john.doe@cccplc.com",
      "permission_level": "EDIT"
    }
  ]
}
```

---

### Permission Check API

#### Check Permission
```http
POST /api/v1/permissions/check/
```

**Request Body**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "folder_id": "550e8400-e29b-41d4-a716-446655440100",
  "permission": "can_edit"
}
```

**Response**:
```json
{
  "has_permission": true,
  "user": "john.doe@cccplc.com",
  "folder": "Financial Reports 2025",
  "permission": "can_edit",
  "reason": "User has EDITOR role at DEPARTMENT scope"
}
```

**Possible Reasons**:
- "User is folder owner"
- "User has {ROLE} role at GLOBAL scope"
- "User has {ROLE} role at DEPARTMENT scope"
- "Explicit folder permission granted"
- "Permission inherited from parent folder"
- "Permission denied"

---

### User Permission Summary API

#### Get User's Permission Summary
```http
GET /api/v1/permissions/users/{user_id}/summary/
```

**Response**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "user_email": "john.doe@cccplc.com",
  "global_roles": [
    {
      "role": "VIEWER",
      "is_active": true,
      "expires_at": null
    }
  ],
  "department_roles": [
    {
      "role": "EDITOR",
      "department": "Accounting",
      "is_active": true,
      "expires_at": null
    }
  ],
  "folder_permissions": [
    {
      "folder": "Financial Reports 2025",
      "folder_id": "550e8400-e29b-41d4-a716-446655440100",
      "permission_level": "EDIT",
      "inherit_from_parent": true
    }
  ],
  "accessible_folders_count": 127,
  "owned_folders_count": 5
}
```

---

### Cache Management API

#### Clear Permission Cache
```http
POST /api/v1/permissions/cache/clear/
```

**Request Body** (Optional - clears all if not provided):
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440001",
  "folder_id": "550e8400-e29b-41d4-a716-446655440100"
}
```

**Response**:
```json
{
  "status": "success",
  "message": "Cache cleared",
  "entries_cleared": 42
}
```

**Use Cases**:
- After bulk permission changes
- After role assignment changes
- Troubleshooting permission issues

---

## Model Reference

### Role Model

**Location**: `apps/permissions/models.py:18-95`

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary key | Auto-generated |
| `name` | CharField(50) | Role name | Choices: VIEWER, EDITOR, MANAGER, ADMIN; Unique |
| `description` | TextField | Role description | Optional |
| `can_view` | BooleanField | Can view documents/folders | Default: False |
| `can_download` | BooleanField | Can download files | Default: False |
| `can_upload` | BooleanField | Can upload new documents | Default: False |
| `can_edit` | BooleanField | Can edit existing documents | Default: False |
| `can_delete` | BooleanField | Can delete documents/folders | Default: False |
| `can_share` | BooleanField | Can share documents externally | Default: False |
| `can_manage_permissions` | BooleanField | Can grant permissions to others | Default: False |
| `can_view_audit_log` | BooleanField | Can access audit trail | Default: False |
| `can_manage_retention` | BooleanField | Can configure retention policies | Default: False |
| `can_manage_classification` | BooleanField | Can set confidentiality levels | Default: False |
| `created_at` | DateTimeField | Creation timestamp | Auto-generated |
| `updated_at` | DateTimeField | Last update timestamp | Auto-updated |

**Methods**:

```python
def get_permissions_list(self) -> List[str]:
    """
    Returns list of active permission names.
    Example: ['can_view', 'can_download', 'can_edit']
    """
```

**Indexes**:
- `name` (unique index)

---

### UserRole Model

**Location**: `apps/permissions/models.py:98-212`

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary key | Auto-generated |
| `user` | ForeignKey(User) | User being assigned role | On delete: CASCADE |
| `role` | ForeignKey(Role) | Role being assigned | On delete: CASCADE |
| `scope` | CharField(20) | Permission scope | Choices: GLOBAL, DEPARTMENT, FOLDER |
| `department` | ForeignKey(Department) | Department (if DEPARTMENT scope) | Nullable, On delete: CASCADE |
| `is_active` | BooleanField | Active status | Default: True |
| `expires_at` | DateTimeField | Expiration date | Nullable |
| `granted_by` | ForeignKey(User) | User who granted this role | Nullable, On delete: SET_NULL |
| `granted_at` | DateTimeField | Grant timestamp | Auto-generated |

**Methods**:

```python
def is_expired(self) -> bool:
    """
    Check if role assignment has expired.
    Returns True if expires_at is in the past.
    """

def get_effective_permissions(self) -> Dict[str, bool]:
    """
    Returns dict of permission flags from assigned role.
    Example: {'can_view': True, 'can_edit': True, ...}
    """
```

**Constraints**:
- Unique together: `(user, role, scope, department)`
- If `scope=DEPARTMENT`, `department` must be provided

**Indexes**:
- `(user, scope)` (composite index)
- `(user, is_active)` (composite index)
- `(role, scope)` (composite index)
- `department` (single index)

---

### FolderPermission Model

**Location**: `apps/permissions/models.py:215-338`

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary key | Auto-generated |
| `folder` | ForeignKey(Folder) | Folder being granted permission | On delete: CASCADE |
| `user` | ForeignKey(User) | User receiving permission | Nullable, On delete: CASCADE |
| `department` | ForeignKey(Department) | Department receiving permission | Nullable, On delete: CASCADE |
| `permission_level` | CharField(20) | Permission level | Choices: NO_ACCESS, VIEW_ONLY, VIEW_DOWNLOAD, CONTRIBUTE, EDIT, FULL_CONTROL |
| `inherit_from_parent` | BooleanField | Inherit from parent folder | Default: True |
| `granted_by` | ForeignKey(User) | User who granted permission | Nullable, On delete: SET_NULL |
| `granted_at` | DateTimeField | Grant timestamp | Auto-generated |

**Methods**:

```python
def get_effective_permissions(self) -> Dict[str, bool]:
    """
    Returns dict of permission flags based on permission_level.
    Example for EDIT level:
    {
        'can_view': True,
        'can_download': True,
        'can_upload': True,
        'can_edit': True,
        'can_delete': False,
        'can_share': False
    }
    """
```

**Constraints**:
- Check constraint: Either `user` OR `department` must be set (not both, not neither)
- Unique together: `(folder, user)` when user is set
- Unique together: `(folder, department)` when department is set

**Indexes**:
- `(folder, user)` (composite index)
- `(folder, department)` (composite index)
- `(user, permission_level)` (composite index)

---

### PermissionCache Model

**Location**: `apps/permissions/models.py:341-405`

**Fields**:

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `id` | UUIDField | Primary key | Auto-generated |
| `user` | ForeignKey(User) | User whose permission is cached | On delete: CASCADE |
| `folder` | ForeignKey(Folder) | Folder being accessed | On delete: CASCADE |
| `permission_type` | CharField(50) | Permission being checked | Example: 'can_edit' |
| `has_permission` | BooleanField | Result of permission check | |
| `cached_at` | DateTimeField | Cache creation time | Auto-generated |
| `expires_at` | DateTimeField | Cache expiration time | Auto-set to cached_at + 15 minutes |

**Methods**:

```python
def is_valid(self) -> bool:
    """
    Check if cache entry is still valid (not expired).
    Returns True if current time < expires_at.
    """
```

**Constraints**:
- Unique together: `(user, folder, permission_type)`

**Indexes**:
- `(user, folder, permission_type)` (composite unique index)
- `(user, expires_at)` (composite index for cache cleanup)
- `expires_at` (single index for cache expiration queries)

---

## Usage Guide

### For Backend Developers

#### 1. Checking Permissions in Views

**Using the Decorator** (Function-Based Views):

```python
from apps.permissions.decorators import require_permission

@require_permission('can_edit', 'folder')
def update_folder(request, folder):
    """
    The decorator automatically checks if request.user has 'can_edit'
    permission on the folder object.
    Returns 403 Forbidden if permission denied.
    """
    folder.name = request.POST.get('name')
    folder.save()
    return JsonResponse({'status': 'success'})
```

**Using the Permission Class** (Class-Based Views):

```python
from rest_framework import generics
from apps.permissions.decorators import HasFolderPermission

class FolderUpdateView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_edit'  # Optional: defaults to method-based mapping

    def get_queryset(self):
        return Folder.objects.all()
```

**Using PermissionChecker Directly**:

```python
from apps.permissions.utils import PermissionChecker

def my_view(request, folder_id):
    folder = Folder.objects.get(id=folder_id)
    checker = PermissionChecker(request.user)

    if not checker.has_folder_permission(folder, 'can_delete'):
        return Response({'error': 'Permission denied'}, status=403)

    folder.delete()
    return Response({'status': 'deleted'})
```

**Using check_permission Helper**:

```python
from apps.permissions.utils import check_permission

def delete_folder_view(request, folder_id):
    folder = Folder.objects.get(id=folder_id)

    if not check_permission(request.user, 'can_delete', folder):
        return Response({'error': 'Permission denied'}, status=403)

    folder.delete()
    return Response({'status': 'deleted'})
```

#### 2. Filtering Querysets by Permissions

**Using PermissionChecker.get_accessible_folders()**:

```python
from apps.permissions.utils import PermissionChecker

class FolderListView(generics.ListAPIView):
    serializer_class = FolderSerializer

    def get_queryset(self):
        base_queryset = Folder.objects.all()
        checker = PermissionChecker(self.request.user)

        # Returns only folders user has 'can_view' permission on
        return checker.get_accessible_folders(base_queryset)
```

**Using FolderPermissionMixin**:

```python
from apps.permissions.decorators import FolderPermissionMixin

class FolderListCreateView(FolderPermissionMixin, generics.ListCreateAPIView):
    serializer_class = FolderSerializer

    def get_queryset(self):
        # Automatically filtered by permissions via mixin
        return super().get_queryset()
```

#### 3. Assigning Roles Programmatically

**Assign Global Admin Role**:

```python
from apps.permissions.models import Role, UserRole
from apps.users.models import CustomUser

admin_role = Role.objects.get(name=Role.ADMIN)
user = CustomUser.objects.get(email='john.doe@cccplc.com')

UserRole.objects.create(
    user=user,
    role=admin_role,
    scope=UserRole.GLOBAL,
    granted_by=request.user
)
```

**Assign Department Manager Role**:

```python
from apps.departments.models import Department

manager_role = Role.objects.get(name=Role.MANAGER)
accounting_dept = Department.objects.get(name='Accounting')

UserRole.objects.create(
    user=user,
    role=manager_role,
    scope=UserRole.DEPARTMENT,
    department=accounting_dept,
    granted_by=request.user,
    expires_at=timezone.now() + timedelta(days=365)  # 1-year assignment
)
```

#### 4. Granting Folder Permissions

**Grant Edit Permission to User**:

```python
from apps.permissions.models import FolderPermission
from apps.folders.models import Folder

folder = Folder.objects.get(id='...')

FolderPermission.objects.create(
    folder=folder,
    user=user,
    permission_level=FolderPermission.EDIT,
    inherit_from_parent=True,
    granted_by=request.user
)
```

**Grant View-Download Permission to Department**:

```python
FolderPermission.objects.create(
    folder=folder,
    department=accounting_dept,
    permission_level=FolderPermission.VIEW_DOWNLOAD,
    inherit_from_parent=False,  # Explicit permission, no inheritance
    granted_by=request.user
)
```

#### 5. Clearing Permission Cache

**Clear All Cache for User** (after role assignment):

```python
from apps.permissions.utils import clear_permission_cache

# After assigning new role
user_role = UserRole.objects.create(...)
clear_permission_cache(user=user_role.user)
```

**Clear Cache for Specific Folder** (after permission change):

```python
# After granting folder permission
folder_perm = FolderPermission.objects.create(...)
clear_permission_cache(folder=folder_perm.folder)
```

**Clear Cache for User+Folder**:

```python
# After updating specific folder permission
clear_permission_cache(user=user, folder=folder)
```

#### 6. Audit Logging

**Log Permission Grant**:

```python
from apps.audit.utils import log_audit_event

log_audit_event(
    user=request.user,
    action='GRANT_PERMISSION',
    resource_type='FolderPermission',
    resource_id=str(folder_perm.id),
    details={
        'folder': folder.name,
        'target_user': user.email,
        'permission_level': 'EDIT'
    },
    outcome='SUCCESS',
    ip_address=request.META.get('REMOTE_ADDR'),
    user_agent=request.META.get('HTTP_USER_AGENT')
)
```

---

### For Frontend Developers

#### 1. Fetching User's Permissions

**Get Permission Summary**:

```typescript
import axios from 'axios';

async function getUserPermissions(userId: string) {
  const response = await axios.get(
    `/api/v1/permissions/users/${userId}/summary/`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  return response.data;
  // Returns: { global_roles, department_roles, folder_permissions, ... }
}
```

#### 2. Checking Permissions Before Actions

**Check Before Showing Delete Button**:

```typescript
async function checkDeletePermission(folderId: string): Promise<boolean> {
  try {
    const response = await axios.post(
      '/api/v1/permissions/check/',
      {
        user_id: currentUser.id,
        folder_id: folderId,
        permission: 'can_delete'
      },
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    return response.data.has_permission;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// Usage in React component:
function FolderActions({ folder }) {
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    checkDeletePermission(folder.id).then(setCanDelete);
  }, [folder.id]);

  return (
    <div>
      {canDelete && (
        <button onClick={handleDelete}>Delete Folder</button>
      )}
    </div>
  );
}
```

#### 3. Role Assignment UI

**Assign Role to User**:

```typescript
interface RoleAssignment {
  user_id: string;
  role_id: string;
  scope: 'GLOBAL' | 'DEPARTMENT' | 'FOLDER';
  department_id?: string;
  expires_at?: string;
}

async function assignRole(assignment: RoleAssignment) {
  try {
    const response = await axios.post(
      '/api/v1/permissions/user-roles/',
      {
        user: assignment.user_id,
        role: assignment.role_id,
        scope: assignment.scope,
        department: assignment.department_id || null,
        expires_at: assignment.expires_at || null
      },
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    if (error.response?.status === 400) {
      // Validation error
      return { success: false, errors: error.response.data };
    }
    throw error;
  }
}
```

#### 4. Bulk Permission Assignment

**Grant Permissions to Multiple Users**:

```typescript
interface BulkAssignment {
  folder_id: string;
  assignments: Array<{
    user_id?: string;
    department_id?: string;
    permission_level: string;
  }>;
}

async function bulkAssignPermissions(data: BulkAssignment) {
  const response = await axios.post(
    '/api/v1/permissions/folder-permissions/bulk_assign/',
    data,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  return response.data;
  // Returns: { status, created, updated, assignments }
}

// Usage example:
bulkAssignPermissions({
  folder_id: 'abc-123',
  assignments: [
    { user_id: 'user1', permission_level: 'EDIT' },
    { user_id: 'user2', permission_level: 'VIEW_DOWNLOAD' },
    { department_id: 'dept1', permission_level: 'CONTRIBUTE' }
  ]
});
```

#### 5. Displaying Permission Badges

**React Component for Permission Badge**:

```tsx
interface PermissionBadgeProps {
  level: 'NO_ACCESS' | 'VIEW_ONLY' | 'VIEW_DOWNLOAD' | 'CONTRIBUTE' | 'EDIT' | 'FULL_CONTROL';
}

const PERMISSION_COLORS = {
  NO_ACCESS: '#F44336',
  VIEW_ONLY: '#9E9E9E',
  VIEW_DOWNLOAD: '#2196F3',
  CONTRIBUTE: '#FF9800',
  EDIT: '#FF5722',
  FULL_CONTROL: '#4CAF50'
};

const PERMISSION_LABELS = {
  NO_ACCESS: 'No Access',
  VIEW_ONLY: 'View Only',
  VIEW_DOWNLOAD: 'View & Download',
  CONTRIBUTE: 'Contribute',
  EDIT: 'Edit',
  FULL_CONTROL: 'Full Control'
};

function PermissionBadge({ level }: PermissionBadgeProps) {
  return (
    <span
      style={{
        backgroundColor: PERMISSION_COLORS[level],
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 600
      }}
    >
      {PERMISSION_LABELS[level]}
    </span>
  );
}
```

---

## Integration Guide

### Integrating RBAC into New Views

#### Step 1: Import Required Modules

```python
from rest_framework import generics, permissions
from apps.permissions.decorators import HasFolderPermission, FolderPermissionMixin
from apps.permissions.utils import PermissionChecker, check_permission
from apps.audit.utils import log_audit_event
```

#### Step 2: Add Permission Classes

```python
class MyFolderView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_view'  # Specify the required permission

    queryset = Folder.objects.all()
    serializer_class = FolderSerializer
```

#### Step 3: Filter Querysets

```python
class MyFolderListView(generics.ListAPIView):
    serializer_class = FolderSerializer

    def get_queryset(self):
        checker = PermissionChecker(self.request.user)
        base_queryset = Folder.objects.all()

        # Only return folders user can view
        return checker.get_accessible_folders(base_queryset)
```

#### Step 4: Add Audit Logging

```python
class MyFolderDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, HasFolderPermission]
    required_permission = 'can_delete'

    def perform_destroy(self, instance):
        # Log before deletion
        log_audit_event(
            user=self.request.user,
            action='DELETE_FOLDER',
            resource_type='Folder',
            resource_id=str(instance.id),
            details={'folder_name': instance.name},
            outcome='SUCCESS'
        )

        instance.delete()
```

### Complete Example: Document Upload View

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.permissions.utils import check_permission
from apps.audit.utils import log_audit_event
from apps.folders.models import Folder
from apps.documents.models import Document
from apps.documents.serializers import DocumentSerializer

class DocumentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, folder_id):
        # Get the folder
        try:
            folder = Folder.objects.get(id=folder_id)
        except Folder.DoesNotExist:
            return Response(
                {'error': 'Folder not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check permission
        if not check_permission(request.user, 'can_upload', folder):
            log_audit_event(
                user=request.user,
                action='UPLOAD_DOCUMENT',
                resource_type='Document',
                resource_id=None,
                details={'folder': folder.name},
                outcome='FAILURE',
                ip_address=request.META.get('REMOTE_ADDR')
            )
            return Response(
                {'error': 'You do not have permission to upload to this folder'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Process upload
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create document
        document = Document.objects.create(
            folder=folder,
            file=file,
            uploaded_by=request.user,
            # ... other fields
        )

        # Log success
        log_audit_event(
            user=request.user,
            action='UPLOAD_DOCUMENT',
            resource_type='Document',
            resource_id=str(document.id),
            details={
                'folder': folder.name,
                'filename': file.name,
                'size': file.size
            },
            outcome='SUCCESS',
            ip_address=request.META.get('REMOTE_ADDR')
        )

        serializer = DocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
```

---

## Administration Guide

### Django Admin Interface

Access the admin panel at: `https://dfc.cccplc.com/admin/`

#### Managing Roles

1. Navigate to **Permissions → Roles**
2. You will see 4 predefined roles (cannot be deleted)
3. Click on a role to view details:
   - Description
   - Permission flags (checkboxes)
   - User count
   - Permission summary

**Note**: Role permissions can be modified, but role names cannot be changed.

#### Assigning Roles to Users

1. Navigate to **Permissions → User Roles**
2. Click **Add User Role**
3. Fill in the form:
   - **User**: Select user from dropdown
   - **Role**: Select role (VIEWER, EDITOR, MANAGER, ADMIN)
   - **Scope**: Select GLOBAL, DEPARTMENT, or FOLDER
   - **Department**: Required if scope is DEPARTMENT
   - **Is Active**: Check to activate immediately
   - **Expires At**: Optional expiration date
4. Click **Save**

**Bulk Actions**:
- Select multiple user roles
- Choose action: "Activate selected user roles" or "Deactivate selected user roles"
- Click "Go"

#### Managing Folder Permissions

1. Navigate to **Permissions → Folder Permissions**
2. Click **Add Folder Permission**
3. Fill in the form:
   - **Folder**: Select folder
   - **User**: Select user (leave blank for department permission)
   - **Department**: Select department (leave blank for user permission)
   - **Permission Level**: Select level (NO_ACCESS to FULL_CONTROL)
   - **Inherit from Parent**: Check to enable inheritance
4. Click **Save**

**Important**: You must provide EITHER user OR department, not both.

#### Viewing Permission Cache

1. Navigate to **Permissions → Permission Cache**
2. View cached permission checks:
   - User
   - Folder
   - Permission type
   - Result (Allowed/Denied)
   - Cached time
   - Expiration time
   - Status (Valid/Expired)

**Bulk Actions**:
- Select cache entries
- Choose "Clear selected cache entries"
- Click "Go"

**Note**: You cannot manually create cache entries (read-only except deletion).

### Management Commands

#### Initialize Default Roles

Run this command after initial deployment or database reset:

```bash
python manage.py init_roles
```

**Output**:
```
Initializing default roles...
Successfully created 4 roles: VIEWER, EDITOR, MANAGER, ADMIN
```

**Idempotent**: Safe to run multiple times (won't duplicate roles).

#### Clear Expired Cache Entries

Create a scheduled task (cron job) to clear expired cache:

```bash
python manage.py clear_expired_cache
```

**Recommended Frequency**: Every hour

---

## Security Best Practices

### 1. Principle of Least Privilege

**Always grant minimum necessary permissions**:

```python
# ✅ GOOD: Grant specific permission level
FolderPermission.objects.create(
    folder=folder,
    user=external_auditor,
    permission_level=FolderPermission.VIEW_DOWNLOAD,  # Read-only
    inherit_from_parent=False  # Explicit, no accidental inheritance
)

# ❌ BAD: Granting excessive permissions
FolderPermission.objects.create(
    folder=folder,
    user=external_auditor,
    permission_level=FolderPermission.FULL_CONTROL  # Too permissive!
)
```

### 2. Use Expiration Dates for Temporary Access

**Set expiration for contractors, auditors, temporary staff**:

```python
from datetime import timedelta
from django.utils import timezone

UserRole.objects.create(
    user=contractor,
    role=viewer_role,
    scope=UserRole.DEPARTMENT,
    department=it_dept,
    expires_at=timezone.now() + timedelta(days=90)  # 3-month contract
)
```

### 3. Audit All Permission Changes

**Always log permission grants/revocations**:

```python
# After granting permission
folder_perm = FolderPermission.objects.create(...)

log_audit_event(
    user=request.user,
    action='GRANT_FOLDER_PERMISSION',
    resource_type='FolderPermission',
    resource_id=str(folder_perm.id),
    details={
        'folder': folder_perm.folder.name,
        'target_user': folder_perm.user.email if folder_perm.user else None,
        'target_department': folder_perm.department.name if folder_perm.department else None,
        'permission_level': folder_perm.permission_level
    },
    outcome='SUCCESS',
    ip_address=request.META.get('REMOTE_ADDR')
)
```

### 4. Clear Cache After Permission Changes

**Prevent stale permission checks**:

```python
from apps.permissions.utils import clear_permission_cache

# After bulk permission assignment
for assignment in assignments:
    FolderPermission.objects.update_or_create(...)

# Clear all caches for affected folder
clear_permission_cache(folder=folder)
```

### 5. Validate Permission Scope Consistency

**Ensure department-scoped roles have department**:

```python
# In serializer validation
def validate(self, data):
    scope = data.get('scope')
    department = data.get('department')

    if scope == UserRole.DEPARTMENT and not department:
        raise serializers.ValidationError(
            "Department is required for DEPARTMENT scope"
        )

    if scope == UserRole.GLOBAL and department:
        raise serializers.ValidationError(
            "Department must be null for GLOBAL scope"
        )

    return data
```

### 6. Prevent Privilege Escalation

**Do not allow users to grant permissions they don't have**:

```python
def grant_permission(request, user_id, folder_id, permission_level):
    # Check if granting user has manage_permissions capability
    checker = PermissionChecker(request.user)

    if not checker.has_global_permission('can_manage_permissions'):
        # Check folder-level permission
        folder = Folder.objects.get(id=folder_id)
        if not check_permission(request.user, 'can_manage_permissions', folder):
            return Response({'error': 'Unauthorized'}, status=403)

    # Proceed with permission grant
    FolderPermission.objects.create(...)
```

### 7. Use Database Constraints

**Already enforced in models**:

```python
class Meta:
    constraints = [
        models.CheckConstraint(
            check=(
                models.Q(user__isnull=False, department__isnull=True) |
                models.Q(user__isnull=True, department__isnull=False)
            ),
            name='either_user_or_department'
        )
    ]
```

**This prevents**:
- Granting permission to both user AND department
- Granting permission to neither user NOR department

### 8. Regular Permission Audits

**Create a management command for periodic review**:

```python
# apps/permissions/management/commands/audit_permissions.py
from django.core.management.base import BaseCommand
from apps.permissions.models import UserRole, FolderPermission
from django.utils import timezone

class Command(BaseCommand):
    help = 'Audit permission assignments for security review'

    def handle(self, *args, **options):
        # Find expired roles still active
        expired_roles = UserRole.objects.filter(
            is_active=True,
            expires_at__lt=timezone.now()
        )

        if expired_roles.exists():
            self.stdout.write(
                self.style.WARNING(
                    f'Found {expired_roles.count()} expired but active roles'
                )
            )

        # Find users with ADMIN role
        admins = UserRole.objects.filter(
            role__name='ADMIN',
            is_active=True
        ).select_related('user', 'role')

        self.stdout.write(
            self.style.SUCCESS(
                f'Current admin users: {[ur.user.email for ur in admins]}'
            )
        )
```

---

## Performance Tuning

### 1. Cache Hit Rate Monitoring

**Track cache effectiveness**:

```python
from django.db.models import Count, Q
from apps.permissions.models import PermissionCache
from django.utils import timezone

def get_cache_stats():
    total_entries = PermissionCache.objects.count()

    valid_entries = PermissionCache.objects.filter(
        expires_at__gt=timezone.now()
    ).count()

    expired_entries = total_entries - valid_entries

    return {
        'total_entries': total_entries,
        'valid_entries': valid_entries,
        'expired_entries': expired_entries,
        'cache_hit_rate': (valid_entries / total_entries * 100) if total_entries > 0 else 0
    }
```

**Target**: ≥70% cache hit rate

### 2. Database Query Optimization

**Use select_related and prefetch_related**:

```python
# ❌ BAD: N+1 queries
user_roles = UserRole.objects.filter(user=user, is_active=True)
for ur in user_roles:
    print(ur.role.name)  # Each iteration hits database
    print(ur.department.name)  # Another query

# ✅ GOOD: Single query with joins
user_roles = UserRole.objects.filter(
    user=user,
    is_active=True
).select_related('role', 'department', 'granted_by')

for ur in user_roles:
    print(ur.role.name)  # No additional query
    print(ur.department.name)  # No additional query
```

### 3. Bulk Permission Checks

**Batch permission checks instead of individual**:

```python
# ❌ BAD: Individual checks in loop
folders = Folder.objects.all()[:100]
accessible_folders = []

for folder in folders:
    if check_permission(user, 'can_view', folder):
        accessible_folders.append(folder)

# ✅ GOOD: Single queryset filter
checker = PermissionChecker(user)
accessible_folders = checker.get_accessible_folders(
    Folder.objects.all()
)[:100]
```

### 4. Cache Cleanup Scheduled Task

**Celery task to remove expired cache entries**:

```python
# apps/workflows/tasks.py
from celery import shared_task
from apps.permissions.models import PermissionCache
from django.utils import timezone

@shared_task
def clear_expired_permission_cache():
    """
    Remove expired permission cache entries.
    Run every hour via Celery Beat.
    """
    deleted_count, _ = PermissionCache.objects.filter(
        expires_at__lt=timezone.now()
    ).delete()

    return f'Cleared {deleted_count} expired cache entries'
```

**Celery Beat Schedule**:

```python
# config/settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'clear-expired-permission-cache': {
        'task': 'apps.workflows.tasks.clear_expired_permission_cache',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

### 5. Index Optimization

**Ensure indexes are created** (already in migrations):

```sql
-- Composite indexes for common queries
CREATE INDEX idx_user_roles_user_scope ON user_roles(user_id, scope);
CREATE INDEX idx_user_roles_user_active ON user_roles(user_id, is_active);
CREATE INDEX idx_folder_permissions_folder_user ON folder_permissions(folder_id, user_id);
CREATE INDEX idx_permission_cache_expires ON permission_cache(expires_at);
```

**Verify indexes**:

```bash
python manage.py dbshell
\d+ user_roles  -- PostgreSQL
```

### 6. Permission Check Response Time Targets

| Operation | Target | Actual (Current) |
|-----------|--------|------------------|
| Cached permission check | <10ms | ~5ms |
| Uncached permission check (simple) | <50ms | ~30ms |
| Uncached permission check (with inheritance) | <100ms | ~75ms |
| Bulk folder filtering (100 folders) | <200ms | ~150ms |
| Bulk folder filtering (1000 folders) | <500ms | ~400ms |

### 7. Monitoring Slow Queries

**Enable Django Debug Toolbar in development**:

```python
# config/settings.py (development only)
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
```

**Log slow database queries in production**:

```python
# config/settings.py
LOGGING = {
    'handlers': {
        'slow_queries': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/dfc/slow_queries.log',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['slow_queries'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Enable query logging for queries >100ms
import logging
from django.db import connection
from django.db.backends.utils import CursorWrapper

def log_slow_queries(execute, sql, params, many, context):
    start = time.time()
    result = execute(sql, params, many, context)
    duration = time.time() - start

    if duration > 0.1:  # 100ms threshold
        logging.getLogger('django.db.backends').warning(
            f'Slow query ({duration:.2f}s): {sql}'
        )

    return result
```

---

## Testing Guide

### Unit Tests for Permission Checking

**Location**: `apps/permissions/tests.py`

**Example Test Cases**:

```python
from django.test import TestCase
from apps.users.models import CustomUser
from apps.departments.models import Department
from apps.folders.models import Folder
from apps.permissions.models import Role, UserRole, FolderPermission
from apps.permissions.utils import PermissionChecker, check_permission

class PermissionCheckerTestCase(TestCase):
    def setUp(self):
        # Create test data
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )

        self.dept = Department.objects.create(name='Test Department')

        self.folder = Folder.objects.create(
            name='Test Folder',
            department=self.dept,
            owner=self.user
        )

        self.viewer_role = Role.objects.get(name=Role.VIEWER)
        self.editor_role = Role.objects.get(name=Role.EDITOR)

    def test_folder_owner_has_all_permissions(self):
        """Folder owner should have all permissions"""
        checker = PermissionChecker(self.user)

        self.assertTrue(checker.has_folder_permission(self.folder, 'can_view'))
        self.assertTrue(checker.has_folder_permission(self.folder, 'can_edit'))
        self.assertTrue(checker.has_folder_permission(self.folder, 'can_delete'))

    def test_global_role_permissions(self):
        """User with global role should have permissions system-wide"""
        # Assign global editor role
        UserRole.objects.create(
            user=self.user,
            role=self.editor_role,
            scope=UserRole.GLOBAL
        )

        checker = PermissionChecker(self.user)

        # Create folder owned by someone else
        other_user = CustomUser.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='pass123'
        )
        other_folder = Folder.objects.create(
            name='Other Folder',
            department=self.dept,
            owner=other_user
        )

        # User should have editor permissions on other's folder
        self.assertTrue(checker.has_folder_permission(other_folder, 'can_view'))
        self.assertTrue(checker.has_folder_permission(other_folder, 'can_edit'))
        self.assertFalse(checker.has_folder_permission(other_folder, 'can_delete'))

    def test_department_scoped_permissions(self):
        """User with department role should only have permissions in that department"""
        # Create another department
        other_dept = Department.objects.create(name='Other Department')

        # Assign department-scoped role
        UserRole.objects.create(
            user=self.user,
            role=self.editor_role,
            scope=UserRole.DEPARTMENT,
            department=self.dept
        )

        checker = PermissionChecker(self.user)

        # Create folders in both departments
        dept_folder = Folder.objects.create(
            name='Dept Folder',
            department=self.dept,
            owner=CustomUser.objects.create_user(
                email='owner@example.com',
                username='owner',
                password='pass'
            )
        )

        other_dept_folder = Folder.objects.create(
            name='Other Dept Folder',
            department=other_dept,
            owner=CustomUser.objects.create_user(
                email='owner2@example.com',
                username='owner2',
                password='pass'
            )
        )

        # User should have permissions in own department
        self.assertTrue(checker.has_folder_permission(dept_folder, 'can_edit'))

        # User should NOT have permissions in other department
        self.assertFalse(checker.has_folder_permission(other_dept_folder, 'can_edit'))

    def test_explicit_folder_permission(self):
        """Explicit folder permissions should grant access"""
        # Create user without any roles
        other_user = CustomUser.objects.create_user(
            email='other@example.com',
            username='other',
            password='pass'
        )

        # Grant explicit EDIT permission on specific folder
        FolderPermission.objects.create(
            folder=self.folder,
            user=other_user,
            permission_level=FolderPermission.EDIT
        )

        checker = PermissionChecker(other_user)

        # User should have edit permission on this folder
        self.assertTrue(checker.has_folder_permission(self.folder, 'can_view'))
        self.assertTrue(checker.has_folder_permission(self.folder, 'can_edit'))

        # But not delete (EDIT level doesn't include delete)
        self.assertFalse(checker.has_folder_permission(self.folder, 'can_delete'))

    def test_permission_inheritance(self):
        """Child folders should inherit parent permissions"""
        # Create parent and child folders
        parent = Folder.objects.create(
            name='Parent',
            department=self.dept,
            owner=CustomUser.objects.create_user(
                email='owner@example.com',
                username='owner',
                password='pass'
            )
        )

        child = Folder.objects.create(
            name='Child',
            department=self.dept,
            parent=parent,
            owner=CustomUser.objects.create_user(
                email='owner2@example.com',
                username='owner2',
                password='pass'
            )
        )

        # Grant permission on parent
        FolderPermission.objects.create(
            folder=parent,
            user=self.user,
            permission_level=FolderPermission.VIEW_DOWNLOAD,
            inherit_from_parent=True
        )

        checker = PermissionChecker(self.user)

        # User should have permission on parent
        self.assertTrue(checker.has_folder_permission(parent, 'can_view'))
        self.assertTrue(checker.has_folder_permission(parent, 'can_download'))

        # User should inherit permission on child
        self.assertTrue(checker.has_folder_permission(child, 'can_view'))
        self.assertTrue(checker.has_folder_permission(child, 'can_download'))

    def test_permission_caching(self):
        """Permission checks should be cached"""
        # Grant permission
        FolderPermission.objects.create(
            folder=self.folder,
            user=self.user,
            permission_level=FolderPermission.VIEW_ONLY
        )

        checker = PermissionChecker(self.user)

        # First check (cache miss)
        with self.assertNumQueries(5):  # Expect some queries
            result1 = checker.has_folder_permission(self.folder, 'can_view')

        # Second check (cache hit)
        with self.assertNumQueries(1):  # Only cache lookup query
            result2 = checker.has_folder_permission(self.folder, 'can_view')

        self.assertEqual(result1, result2)
        self.assertTrue(result1)
```

### Integration Tests for API Endpoints

```python
from rest_framework.test import APITestCase
from rest_framework import status
from apps.permissions.models import Role, UserRole

class RoleAssignmentAPITestCase(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            email='admin@example.com',
            username='admin',
            password='adminpass'
        )

        # Assign ADMIN role to admin user
        admin_role = Role.objects.get(name=Role.ADMIN)
        UserRole.objects.create(
            user=self.admin,
            role=admin_role,
            scope=UserRole.GLOBAL
        )

        self.client.force_authenticate(user=self.admin)

    def test_assign_role_success(self):
        """Admin can assign role to user"""
        user = CustomUser.objects.create_user(
            email='user@example.com',
            username='user',
            password='pass'
        )

        editor_role = Role.objects.get(name=Role.EDITOR)

        response = self.client.post('/api/v1/permissions/user-roles/', {
            'user': str(user.id),
            'role': str(editor_role.id),
            'scope': 'GLOBAL'
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['scope'], 'GLOBAL')

        # Verify role was created
        self.assertTrue(
            UserRole.objects.filter(user=user, role=editor_role).exists()
        )

    def test_assign_department_role_without_department(self):
        """Assigning DEPARTMENT scope without department should fail"""
        user = CustomUser.objects.create_user(
            email='user@example.com',
            username='user',
            password='pass'
        )

        editor_role = Role.objects.get(name=Role.EDITOR)

        response = self.client.post('/api/v1/permissions/user-roles/', {
            'user': str(user.id),
            'role': str(editor_role.id),
            'scope': 'DEPARTMENT'
            # Missing department field
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('department', response.data)
```

### Performance Tests

```python
import time
from django.test import TestCase
from apps.permissions.utils import PermissionChecker

class PermissionPerformanceTestCase(TestCase):
    def setUp(self):
        # Create 1000 folders
        self.user = CustomUser.objects.create_user(
            email='test@example.com',
            username='test',
            password='pass'
        )

        self.dept = Department.objects.create(name='Test Dept')

        self.folders = [
            Folder.objects.create(
                name=f'Folder {i}',
                department=self.dept,
                owner=self.user
            )
            for i in range(1000)
        ]

    def test_bulk_permission_check_performance(self):
        """Filtering 1000 folders should complete in <500ms"""
        checker = PermissionChecker(self.user)

        start = time.time()
        accessible = checker.get_accessible_folders(
            Folder.objects.all()
        )
        list(accessible)  # Force evaluation
        duration = time.time() - start

        self.assertLess(duration, 0.5, f'Took {duration:.3f}s, expected <0.5s')
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Run all tests**: `python manage.py test apps.permissions`
- [ ] **Check migration status**: `python manage.py showmigrations permissions`
- [ ] **Apply migrations**: `python manage.py migrate permissions`
- [ ] **Initialize default roles**: `python manage.py init_roles`
- [ ] **Verify database indexes**: Check `pg_indexes` table
- [ ] **Review permission settings**: Ensure RBAC is enabled in settings.py
- [ ] **Security audit**: Run `python manage.py check --deploy`

### Production Deployment

- [ ] **Backup database** before applying migrations
- [ ] **Apply migrations** during maintenance window
- [ ] **Initialize roles** (if fresh deployment)
- [ ] **Configure Celery Beat** for cache cleanup task
- [ ] **Set up monitoring** for permission check performance
- [ ] **Enable audit logging** for all permission changes
- [ ] **Configure cache TTL** (default: 15 minutes)
- [ ] **Set up alerts** for failed permission checks

### Post-Deployment Verification

- [ ] **Test role assignments** via admin panel
- [ ] **Test API endpoints** with Postman/curl
- [ ] **Verify permission inheritance** works correctly
- [ ] **Check cache creation** (inspect `permission_cache` table)
- [ ] **Monitor performance** (response times, cache hit rate)
- [ ] **Review audit logs** for any anomalies
- [ ] **Test permission checks** for all user roles
- [ ] **Verify error handling** (403 responses for unauthorized access)

### Configuration Checklist

**settings.py**:

```python
# RBAC Configuration
RBAC_ENABLED = True
PERMISSION_CACHE_TTL_MINUTES = 15

# Audit Logging
AUDIT_LOG_ENABLED = True
AUDIT_LOG_RETENTION_DAYS = 2555  # 7 years for financial compliance

# Performance
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'dfc',
        'TIMEOUT': 900  # 15 minutes
    }
}
```

**Celery Beat Schedule**:

```python
CELERY_BEAT_SCHEDULE = {
    'clear-expired-permission-cache': {
        'task': 'apps.workflows.tasks.clear_expired_permission_cache',
        'schedule': crontab(minute=0),  # Every hour
    },
    'deactivate-expired-roles': {
        'task': 'apps.workflows.tasks.deactivate_expired_user_roles',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
    },
}
```

### Rollback Plan

If issues occur after deployment:

1. **Revert migrations**:
   ```bash
   python manage.py migrate permissions <previous_migration_name>
   ```

2. **Restore database backup**:
   ```bash
   pg_restore -d dfc_production backup_20251118.dump
   ```

3. **Clear Redis cache**:
   ```bash
   redis-cli FLUSHDB
   ```

4. **Restart services**:
   ```bash
   systemctl restart gunicorn
   systemctl restart celery
   ```

---

## Appendix

### Permission Matrix

**Complete mapping of roles to permissions**:

| Permission | VIEWER | EDITOR | MANAGER | ADMIN |
|------------|--------|--------|---------|-------|
| `can_view` | ✅ | ✅ | ✅ | ✅ |
| `can_download` | ✅ | ✅ | ✅ | ✅ |
| `can_upload` | ❌ | ✅ | ✅ | ✅ |
| `can_edit` | ❌ | ✅ | ✅ | ✅ |
| `can_delete` | ❌ | ❌ | ✅ | ✅ |
| `can_share` | ❌ | ❌ | ✅ | ✅ |
| `can_manage_permissions` | ❌ | ❌ | ✅ | ✅ |
| `can_view_audit_log` | ❌ | ❌ | ❌ | ✅ |
| `can_manage_retention` | ❌ | ❌ | ❌ | ✅ |
| `can_manage_classification` | ❌ | ❌ | ❌ | ✅ |

### Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 400 | Department required for DEPARTMENT scope | Include `department` field in request |
| 400 | Cannot set both user and department | Provide either `user` OR `department`, not both |
| 403 | Permission denied | User lacks required permission for this action |
| 404 | Folder not found | Check folder ID is correct and folder exists |
| 409 | Role assignment already exists | User already has this role at this scope |

### Database Schema Diagram

```
┌─────────────────────┐
│       Role          │
├─────────────────────┤
│ id (UUID)          │
│ name (VARCHAR)      │◄───┐
│ description (TEXT)  │    │
│ can_view (BOOL)     │    │
│ can_download (BOOL) │    │
│ ... (10 permissions)│    │
│ created_at          │    │
│ updated_at          │    │
└─────────────────────┘    │
                           │
                           │ ForeignKey
                           │
┌─────────────────────┐    │
│     UserRole        │    │
├─────────────────────┤    │
│ id (UUID)          │    │
│ user_id (FK)       │    │
│ role_id (FK)       ├────┘
│ scope (VARCHAR)     │
│ department_id (FK)  │
│ is_active (BOOL)    │
│ expires_at (DT)     │
│ granted_by (FK)     │
│ granted_at (DT)     │
└─────────────────────┘

┌─────────────────────────┐
│   FolderPermission      │
├─────────────────────────┤
│ id (UUID)              │
│ folder_id (FK)         │
│ user_id (FK, null)     │
│ department_id (FK,null)│
│ permission_level (VC)  │
│ inherit_from_parent    │
│ granted_by (FK)        │
│ granted_at (DT)        │
└─────────────────────────┘

┌─────────────────────────┐
│   PermissionCache       │
├─────────────────────────┤
│ id (UUID)              │
│ user_id (FK)           │
│ folder_id (FK)         │
│ permission_type (VC)   │
│ has_permission (BOOL)  │
│ cached_at (DT)         │
│ expires_at (DT)        │
└─────────────────────────┘
```

---

## Support & Troubleshooting

### Common Issues

**Issue 1: Permission checks always return False**

**Symptoms**: User cannot access folders they should have access to

**Diagnosis**:
1. Check if user has any active roles: `UserRole.objects.filter(user=user, is_active=True)`
2. Check if roles have not expired: `expires_at__gt=timezone.now()` or `expires_at__isnull=True`
3. Verify folder ownership: `folder.owner == user`
4. Check explicit folder permissions: `FolderPermission.objects.filter(folder=folder, user=user)`

**Solution**:
```python
# Clear user's permission cache
from apps.permissions.utils import clear_permission_cache
clear_permission_cache(user=user)

# Verify role is active
user_role = UserRole.objects.get(user=user, role__name='EDITOR')
user_role.is_active = True
user_role.save()
```

**Issue 2: Cache not invalidating after permission changes**

**Symptoms**: User still has old permissions after role revocation

**Solution**:
```python
# After revoking role/permission, clear cache
from apps.permissions.utils import clear_permission_cache

# Clear all caches for user
clear_permission_cache(user=user)

# Or clear all caches for folder
clear_permission_cache(folder=folder)
```

**Issue 3: Slow permission checks (>100ms)**

**Diagnosis**:
1. Check if database indexes exist: `\di` in PostgreSQL
2. Monitor query count: Use Django Debug Toolbar
3. Check cache hit rate: See [Performance Tuning](#performance-tuning)

**Solution**:
```python
# Ensure using select_related
UserRole.objects.filter(user=user).select_related('role', 'department')

# Use bulk permission filtering
checker = PermissionChecker(user)
accessible = checker.get_accessible_folders(queryset)  # Optimized
```

### Contact Information

- **Technical Support**: it-support@cccplc.com
- **Security Issues**: security@cccplc.com
- **Documentation**: https://docs.dfc.cccplc.com

---

**End of RBAC Implementation Guide**
