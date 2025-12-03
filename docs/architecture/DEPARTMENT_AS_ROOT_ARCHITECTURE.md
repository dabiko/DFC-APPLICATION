# Department-as-Root Folder Architecture

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Date** | 2025-12-03 |
| **Status** | Proposed |
| **Authors** | Architecture Team |

---

## Executive Summary

This document outlines the architectural change to restructure the Digital Filing Cabinet (DFC) navigation model from a generic folder tree to a **department-centric hierarchy**. In this model, departments serve as the top-level organizational containers (root folders) in the sidebar, with all folders and documents nested within their respective departments.

This change directly aligns the file system structure with the organizational RBAC model, simplifying permission management and improving data isolation between departments.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Proposed Solution](#2-proposed-solution)
3. [Architecture Overview](#3-architecture-overview)
4. [Data Model Changes](#4-data-model-changes)
5. [Permission Model Changes](#5-permission-model-changes)
6. [API Changes](#6-api-changes)
7. [Frontend Changes](#7-frontend-changes)
8. [Migration Strategy](#8-migration-strategy)
9. [Implementation Phases](#9-implementation-phases)
10. [Security Considerations](#10-security-considerations)
11. [Performance Considerations](#11-performance-considerations)
12. [Rollback Strategy](#12-rollback-strategy)
13. [Testing Strategy](#13-testing-strategy)
14. [Appendices](#appendices)

---

## 1. Problem Statement

### Current State

The current DFC architecture treats folders as a generic hierarchical tree with optional department references:

```
Current Sidebar:
├── Root Folder A/
│   ├── Subfolder/
│   └── Documents...
├── Root Folder B/
├── Root Folder C/
└── ...
```

**Issues with Current Approach:**

1. **RBAC Complexity**: Permissions must be managed at individual folder levels, making it difficult to enforce department-wide access policies.

2. **Data Isolation Gaps**: Users may accidentally access or create folders outside their department scope.

3. **Audit Complexity**: Generating department-level compliance reports requires aggregating data across scattered folder structures.

4. **Navigation Confusion**: Users must navigate through generic folder trees to find department-specific content.

5. **Permission Inheritance Disconnect**: Department-level roles (`UserRole` with `scope=DEPARTMENT`) don't directly translate to folder permissions.

### Business Requirements

- Financial institutions require strict data segregation between departments (Engagements, Accounting, IT, Compliance, Risk, Audit)
- Regulatory compliance (KYC, AML, GDPR) mandates clear data ownership and access boundaries
- Audit trails must be scoped by department for compliance reporting

---

## 2. Proposed Solution

### Department-as-Root Model

Transform departments into the primary navigation and permission boundary:

```
Proposed Sidebar:
├── 📁 Engagements/              ← Department (RBAC Root)
│   ├── Client Records/          ← Folders within department
│   │   ├── Client A/
│   │   └── Client B/
│   └── Projects/
├── 📁 Accounting/
│   ├── Financial Reports/
│   └── Invoices/
├── 📁 Compliance/
│   ├── KYC Documents/
│   └── AML Reports/
├── 📁 Risk/
├── 📁 Audit/
├── 📁 IT/
└── 📁 Shared/                   ← Cross-department space (optional)
```

### Key Principles

1. **Departments ARE the Root Folders**: No folders exist outside department context
2. **Permission Inheritance Flows from Department**: Department access grants baseline folder access
3. **Natural RBAC Mapping**: User's department role directly controls folder visibility
4. **Explicit Cross-Department Access**: Accessing another department requires explicit permission grant

---

## 3. Architecture Overview

### Conceptual Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        Organization                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Department Layer                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────┐  │   │
│  │  │Engagements│ │Accounting│ │Compliance│ │    ...      │  │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └──────┬──────┘  │   │
│  └───────┼───────────┼───────────┼──────────────┼───────────┘   │
│          │           │           │              │                │
│  ┌───────┴───────────┴───────────┴──────────────┴───────────┐   │
│  │                     Folder Layer                          │   │
│  │  Folders nested within departments (parent-child tree)    │   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┴──────────────────────────────┐   │
│  │                    Document Layer                         │   │
│  │  Documents stored within folders                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Flow

```
┌──────────────────┐
│  Global Admin    │ ← Full access to all departments
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Department Role  │ ← UserRole with scope=DEPARTMENT
│ (ADMIN/MANAGER/  │   Grants baseline access to department
│  EDITOR/VIEWER)  │
└────────┬─────────┘
         │ Inherits ↓
         ▼
┌──────────────────┐
│ Folder Permission│ ← FolderPermission (can override/restrict)
│ (Inherited from  │
│  department or   │
│  explicitly set) │
└────────┬─────────┘
         │ Inherits ↓
         ▼
┌──────────────────┐
│Document Permission│ ← DocumentPermission (can override folder)
└──────────────────┘
```

---

## 4. Data Model Changes

### 4.1 Department Model Enhancement

**File**: `backend/apps/users/models.py`

```python
class Department(models.Model):
    """
    Department now serves as the root folder container.
    All folders must belong to exactly one department.
    """
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='departments'
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True, null=True)  # NEW
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_departments'
    )

    # Storage & Quota
    storage_quota_gb = models.IntegerField(default=100)
    storage_used_bytes = models.BigIntegerField(default=0)  # NEW

    # Display & Navigation
    icon = models.CharField(max_length=50, default='folder')  # NEW
    color = models.CharField(max_length=7, default='#3B82F6')  # NEW (hex color)
    display_order = models.IntegerField(default=0)  # NEW
    is_active = models.BooleanField(default=True)  # NEW

    # Default Confidentiality
    default_confidentiality = models.CharField(  # NEW
        max_length=20,
        choices=ConfidentialityLevel.choices,
        default=ConfidentialityLevel.INTERNAL
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['organization', 'code']]
        ordering = ['display_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def root_path(self):
        """Returns the department as the root path element."""
        return f"/{self.code}/"

    @property
    def storage_used_gb(self):
        """Returns storage used in GB."""
        return self.storage_used_bytes / (1024 ** 3)

    @property
    def storage_percentage(self):
        """Returns percentage of quota used."""
        if self.storage_quota_gb == 0:
            return 0
        return (self.storage_used_gb / self.storage_quota_gb) * 100
```

### 4.2 Folder Model Changes

**File**: `backend/apps/folders/models.py`

```python
class Folder(models.Model):
    """
    Folder model - now MUST belong to a department.
    Root folders (parent=null) are the top-level folders within a department.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)

    # Hierarchy
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )

    # CRITICAL: Department is now REQUIRED (not nullable)
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.PROTECT,  # Prevent department deletion if folders exist
        related_name='folders'
    )

    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='folders'
    )

    # Path includes department code as root
    path = models.TextField(db_index=True)  # e.g., "/ENGAGEMENTS/Clients/ClientA/"
    depth = models.IntegerField(default=0)  # 0 = direct child of department

    # Ownership
    owner = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='owned_folders'
    )
    created_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_folders'
    )

    # Properties
    description = models.TextField(blank=True, null=True)
    confidentiality_level = models.CharField(
        max_length=20,
        choices=ConfidentialityLevel.choices,
        default=ConfidentialityLevel.INTERNAL
    )
    is_locked = models.BooleanField(default=False)

    # Soft Delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deleted_folders'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Unique folder names within same parent AND same department
        unique_together = [['parent', 'name', 'department']]
        ordering = ['name']
        indexes = [
            models.Index(fields=['department', 'parent']),
            models.Index(fields=['department', 'is_deleted']),
            models.Index(fields=['path']),
        ]

    def save(self, *args, **kwargs):
        # Compute path with department prefix
        if self.parent:
            self.path = f"{self.parent.path}{self.name}/"
            self.depth = self.parent.depth + 1
            # Inherit department from parent (enforce consistency)
            if self.parent.department != self.department:
                raise ValidationError(
                    "Folder department must match parent folder department"
                )
        else:
            # Root folder within department
            self.path = f"/{self.department.code}/{self.name}/"
            self.depth = 0

        super().save(*args, **kwargs)

    def clean(self):
        """Validate department consistency in hierarchy."""
        if self.parent and self.parent.department != self.department:
            raise ValidationError({
                'department': 'Folder must belong to same department as parent folder.'
            })

    @property
    def full_path(self):
        """Returns full path including department name."""
        return f"/{self.department.name}{self.path.replace(f'/{self.department.code}', '')}"
```

### 4.3 Document Model Changes

**File**: `backend/apps/documents/models.py`

```python
class Document(models.Model):
    """
    Document model - department is derived from folder.
    """
    # ... existing fields ...

    # Department is derived from folder, but stored for query optimization
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.PROTECT,
        related_name='documents',
        editable=False  # Automatically set from folder
    )

    def save(self, *args, **kwargs):
        # Auto-populate department from folder
        if self.folder:
            self.department = self.folder.department
        super().save(*args, **kwargs)
```

### 4.4 New: DepartmentSettings Model

**File**: `backend/apps/users/models.py`

```python
class DepartmentSettings(models.Model):
    """
    Department-specific settings and defaults.
    """
    department = models.OneToOneField(
        Department,
        on_delete=models.CASCADE,
        related_name='settings'
    )

    # Default folder templates
    auto_create_structure = models.BooleanField(default=True)
    default_folder_template = models.ForeignKey(
        'folders.FolderTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Retention defaults
    default_retention_days = models.IntegerField(default=2555)  # ~7 years

    # Notification preferences
    notify_on_upload = models.BooleanField(default=False)
    notify_managers_on_delete = models.BooleanField(default=True)

    # Access defaults
    allow_external_sharing = models.BooleanField(default=False)
    require_approval_for_sharing = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Department Settings"
```

---

## 5. Permission Model Changes

### 5.1 Enhanced Permission Resolution

**File**: `backend/apps/permissions/utils.py`

```python
class DepartmentPermissionResolver:
    """
    Resolves effective permissions considering department-level access.

    Permission Resolution Order:
    1. Check if user has GLOBAL admin role
    2. Check user's department role (UserRole with scope=DEPARTMENT)
    3. Check explicit folder permissions (FolderPermission)
    4. Check explicit document permissions (DocumentPermission)
    """

    def __init__(self, user):
        self.user = user
        self._permission_cache = {}

    def can_access_department(self, department):
        """
        Check if user can access a department.

        Access is granted if:
        - User has global admin role
        - User belongs to the department
        - User has explicit department role grant
        """
        # Cache key
        cache_key = f"dept_{department.id}"
        if cache_key in self._permission_cache:
            return self._permission_cache[cache_key]

        # Global admin check
        if self._has_global_admin():
            self._permission_cache[cache_key] = True
            return True

        # Primary department check
        if self.user.department_id == department.id:
            self._permission_cache[cache_key] = True
            return True

        # Explicit department role check
        has_role = UserRole.objects.filter(
            user=self.user,
            scope='DEPARTMENT',
            department=department,
            is_active=True
        ).exists()

        self._permission_cache[cache_key] = has_role
        return has_role

    def get_department_role(self, department):
        """
        Get user's effective role in a department.
        Returns the highest permission level role.
        """
        roles = UserRole.objects.filter(
            user=self.user,
            is_active=True
        ).filter(
            models.Q(scope='GLOBAL') |
            models.Q(scope='DEPARTMENT', department=department)
        ).select_related('role').order_by('-role__permission_level')

        return roles.first()

    def resolve_folder_permission(self, folder, action):
        """
        Resolve effective permission for a folder action.

        Args:
            folder: Folder instance
            action: Permission action (view, edit, delete, download, share, manage)

        Returns:
            bool: Whether the action is permitted
        """
        # Step 1: Global admin check
        if self._has_global_admin():
            return True

        # Step 2: Department access check
        if not self.can_access_department(folder.department):
            return False

        # Step 3: Get department role
        dept_role = self.get_department_role(folder.department)
        if dept_role and self._role_permits_action(dept_role.role, action):
            # Check for explicit folder restriction
            restriction = FolderPermission.objects.filter(
                folder=folder,
                user=self.user,
                permission_level='NO_ACCESS'
            ).exists()
            if restriction:
                return False
            return True

        # Step 4: Check explicit folder permission
        folder_perm = self._get_folder_permission(folder)
        if folder_perm:
            return self._permission_level_permits(folder_perm.permission_level, action)

        # Step 5: Check inherited permissions (walk up the tree)
        if folder.parent:
            return self.resolve_folder_permission(folder.parent, action)

        # Default: no access
        return False

    def get_accessible_departments(self):
        """
        Get list of departments the user can access.
        Used for sidebar rendering.
        """
        # Global admin sees all
        if self._has_global_admin():
            return Department.objects.filter(
                organization=self.user.organization,
                is_active=True
            )

        # User's primary department
        accessible_ids = {self.user.department_id}

        # Additional department grants
        granted = UserRole.objects.filter(
            user=self.user,
            scope='DEPARTMENT',
            is_active=True
        ).values_list('department_id', flat=True)

        accessible_ids.update(granted)

        return Department.objects.filter(
            id__in=accessible_ids,
            is_active=True
        )

    def _has_global_admin(self):
        """Check for global admin role."""
        cache_key = "global_admin"
        if cache_key not in self._permission_cache:
            self._permission_cache[cache_key] = UserRole.objects.filter(
                user=self.user,
                scope='GLOBAL',
                role__role_type='ADMIN',
                is_active=True
            ).exists()
        return self._permission_cache[cache_key]

    def _role_permits_action(self, role, action):
        """Check if role permits the specified action."""
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

    def _permission_level_permits(self, level, action):
        """Check if permission level permits the action."""
        levels = {
            'NO_ACCESS': [],
            'VIEW_ONLY': ['view'],
            'VIEW_DOWNLOAD': ['view', 'download'],
            'CONTRIBUTE': ['view', 'download', 'upload'],
            'EDIT': ['view', 'download', 'upload', 'edit'],
            'FULL_CONTROL': ['view', 'download', 'upload', 'edit', 'delete', 'share', 'manage'],
        }
        return action in levels.get(level, [])

    def _get_folder_permission(self, folder):
        """Get explicit folder permission for user."""
        return FolderPermission.objects.filter(
            folder=folder,
            user=self.user
        ).first()
```

### 5.2 Department Permission Matrix

| Role | View | Download | Upload | Edit | Delete | Share | Manage |
|------|------|----------|--------|------|--------|-------|--------|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MANAGER** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **EDITOR** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **VIEWER** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 5.3 Cross-Department Access Model

```python
class CrossDepartmentAccess(models.Model):
    """
    Explicit grant for accessing another department.
    Used for auditors, managers, and cross-functional roles.
    """
    user = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.CASCADE,
        related_name='cross_department_access'
    )
    department = models.ForeignKey(
        'users.Department',
        on_delete=models.CASCADE,
        related_name='external_access_grants'
    )
    role = models.ForeignKey(
        'permissions.Role',
        on_delete=models.CASCADE
    )

    # Grant metadata
    granted_by = models.ForeignKey(
        'users.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='granted_cross_access'
    )
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()  # Required justification

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [['user', 'department']]
        verbose_name = "Cross-Department Access"
        verbose_name_plural = "Cross-Department Access Grants"
```

---

## 6. API Changes

### 6.1 New Department Endpoints

**File**: `backend/apps/users/urls.py`

```python
urlpatterns = [
    # Existing...

    # Department Navigation (Sidebar)
    path('departments/', DepartmentListView.as_view(), name='department-list'),
    path('departments/<int:pk>/', DepartmentDetailView.as_view(), name='department-detail'),
    path('departments/<int:pk>/folders/', DepartmentFoldersView.as_view(), name='department-folders'),
    path('departments/<int:pk>/tree/', DepartmentTreeView.as_view(), name='department-tree'),
    path('departments/<int:pk>/stats/', DepartmentStatsView.as_view(), name='department-stats'),

    # Cross-Department Access
    path('departments/<int:pk>/access/', DepartmentAccessView.as_view(), name='department-access'),
    path('departments/<int:pk>/access/grant/', GrantDepartmentAccessView.as_view(), name='grant-access'),
    path('departments/<int:pk>/access/revoke/', RevokeDepartmentAccessView.as_view(), name='revoke-access'),
]
```

### 6.2 Department List View (Sidebar Data)

**File**: `backend/apps/users/views.py`

```python
class DepartmentListView(APIView):
    """
    GET /api/v1/departments/

    Returns departments accessible by the current user.
    Used for sidebar navigation rendering.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resolver = DepartmentPermissionResolver(request.user)
        departments = resolver.get_accessible_departments()

        # Include folder counts and basic stats
        departments = departments.annotate(
            folder_count=Count('folders', filter=Q(folders__is_deleted=False)),
            document_count=Count('documents', filter=Q(documents__is_deleted=False))
        )

        serializer = DepartmentSidebarSerializer(departments, many=True)
        return Response(serializer.data)
```

### 6.3 Department Tree View

```python
class DepartmentTreeView(APIView):
    """
    GET /api/v1/departments/{id}/tree/

    Returns full folder tree for a department.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        department = get_object_or_404(Department, pk=pk)

        # Check department access
        resolver = DepartmentPermissionResolver(request.user)
        if not resolver.can_access_department(department):
            return Response(
                {"error": "Access denied to this department"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get root folders for this department
        root_folders = Folder.objects.filter(
            department=department,
            parent__isnull=True,
            is_deleted=False
        ).prefetch_related(
            Prefetch(
                'children',
                queryset=Folder.objects.filter(is_deleted=False)
            )
        )

        serializer = FolderTreeSerializer(root_folders, many=True)
        return Response({
            "department": DepartmentSerializer(department).data,
            "folders": serializer.data
        })
```

### 6.4 Modified Folder List View

**File**: `backend/apps/folders/views.py`

```python
class FolderListCreateView(generics.ListCreateAPIView):
    """
    GET /api/v1/folders/?department={id}
    POST /api/v1/folders/

    List folders (scoped by department) or create new folder.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = FolderSerializer

    def get_queryset(self):
        queryset = Folder.objects.filter(
            organization=self.request.user.organization,
            is_deleted=False
        )

        # REQUIRED: Filter by department
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        else:
            # Default: Show only user's accessible departments
            resolver = DepartmentPermissionResolver(self.request.user)
            accessible = resolver.get_accessible_departments()
            queryset = queryset.filter(department__in=accessible)

        # Optional: Filter by parent
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            queryset = queryset.filter(parent_id=parent_id)
        elif parent_id == '':
            # Root folders only
            queryset = queryset.filter(parent__isnull=True)

        return queryset.select_related('department', 'owner', 'parent')

    def perform_create(self, serializer):
        department_id = self.request.data.get('department')
        if not department_id:
            raise ValidationError({"department": "Department is required"})

        department = get_object_or_404(Department, pk=department_id)

        # Check permission to create in department
        resolver = DepartmentPermissionResolver(self.request.user)
        if not resolver.resolve_folder_permission_for_department(department, 'upload'):
            raise PermissionDenied("Cannot create folders in this department")

        serializer.save(
            department=department,
            organization=self.request.user.organization,
            owner=self.request.user,
            created_by=self.request.user
        )
```

### 6.5 API Response Schemas

#### Department List Response
```json
{
  "departments": [
    {
      "id": 1,
      "name": "Engagements",
      "code": "ENGAGEMENTS",
      "description": "Client engagement documents",
      "icon": "briefcase",
      "color": "#3B82F6",
      "folderCount": 45,
      "documentCount": 1250,
      "storageUsedGb": 15.7,
      "storageQuotaGb": 100,
      "isPrimary": true,
      "role": "EDITOR"
    },
    {
      "id": 2,
      "name": "Accounting",
      "code": "ACCOUNTING",
      "description": "Financial records and reports",
      "icon": "calculator",
      "color": "#10B981",
      "folderCount": 23,
      "documentCount": 890,
      "storageUsedGb": 8.2,
      "storageQuotaGb": 100,
      "isPrimary": false,
      "role": "VIEWER"
    }
  ]
}
```

#### Department Tree Response
```json
{
  "department": {
    "id": 1,
    "name": "Engagements",
    "code": "ENGAGEMENTS"
  },
  "folders": [
    {
      "id": "uuid-1",
      "name": "Client Records",
      "path": "/ENGAGEMENTS/Client Records/",
      "depth": 0,
      "hasChildren": true,
      "children": [
        {
          "id": "uuid-2",
          "name": "Client A",
          "path": "/ENGAGEMENTS/Client Records/Client A/",
          "depth": 1,
          "hasChildren": false,
          "children": []
        }
      ]
    }
  ]
}
```

---

## 7. Frontend Changes

### 7.1 New Type Definitions

**File**: `frontend/src/types/department.ts`

```typescript
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  icon: string;
  color: string;
  folderCount: number;
  documentCount: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  isPrimary: boolean;
  role: DepartmentRole;
  isExpanded?: boolean;
}

export type DepartmentRole = 'ADMIN' | 'MANAGER' | 'EDITOR' | 'VIEWER';

export interface DepartmentTree {
  department: Department;
  folders: Folder[];
}

export interface DepartmentAccessGrant {
  id: number;
  userId: string;
  userName: string;
  departmentId: number;
  departmentName: string;
  role: DepartmentRole;
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  reason: string;
  isActive: boolean;
}
```

### 7.2 Department Sidebar Component

**File**: `frontend/src/components/Sidebar/DepartmentSidebar.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronRight, ChevronDown, Folder, Plus, Settings } from 'lucide-react';
import { Department, DepartmentTree } from '@/types/department';
import { FolderTree } from '@/components/Folder/FolderTree';
import { departmentService } from '@/services/departmentService';
import { selectDepartments, setSelectedDepartment } from '@/store/departmentSlice';

interface DepartmentSidebarProps {
  onFolderSelect: (folderId: string) => void;
  onCreateFolder: (departmentId: number) => void;
}

export const DepartmentSidebar: React.FC<DepartmentSidebarProps> = ({
  onFolderSelect,
  onCreateFolder
}) => {
  const dispatch = useDispatch();
  const departments = useSelector(selectDepartments);
  const [expandedDepartments, setExpandedDepartments] = useState<Set<number>>(new Set());
  const [departmentTrees, setDepartmentTrees] = useState<Map<number, DepartmentTree>>(new Map());
  const [loading, setLoading] = useState<Set<number>>(new Set());

  // Auto-expand primary department on mount
  useEffect(() => {
    const primary = departments.find(d => d.isPrimary);
    if (primary) {
      toggleDepartment(primary.id);
    }
  }, [departments]);

  const toggleDepartment = async (departmentId: number) => {
    const newExpanded = new Set(expandedDepartments);

    if (newExpanded.has(departmentId)) {
      newExpanded.delete(departmentId);
    } else {
      newExpanded.add(departmentId);

      // Load folder tree if not cached
      if (!departmentTrees.has(departmentId)) {
        setLoading(prev => new Set(prev).add(departmentId));
        try {
          const tree = await departmentService.getDepartmentTree(departmentId);
          setDepartmentTrees(prev => new Map(prev).set(departmentId, tree));
        } finally {
          setLoading(prev => {
            const next = new Set(prev);
            next.delete(departmentId);
            return next;
          });
        }
      }
    }

    setExpandedDepartments(newExpanded);
  };

  const getDepartmentIcon = (icon: string) => {
    // Map icon names to Lucide icons
    const iconMap: Record<string, React.ReactNode> = {
      'briefcase': <Briefcase size={18} />,
      'calculator': <Calculator size={18} />,
      'shield': <Shield size={18} />,
      'alert-triangle': <AlertTriangle size={18} />,
      'clipboard-check': <ClipboardCheck size={18} />,
      'server': <Server size={18} />,
    };
    return iconMap[icon] || <Folder size={18} />;
  };

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <div className="p-4">
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-4">
          Departments
        </h2>

        <nav className="space-y-1">
          {departments.map(department => (
            <div key={department.id} className="select-none">
              {/* Department Header */}
              <div
                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer
                  hover:bg-gray-100 transition-colors
                  ${department.isPrimary ? 'bg-blue-50 border-l-4 border-blue-500' : ''}
                `}
                onClick={() => toggleDepartment(department.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedDepartments.has(department.id) ? (
                    <ChevronDown size={16} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-400" />
                  )}
                  <span style={{ color: department.color }}>
                    {getDepartmentIcon(department.icon)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {department.name}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {department.folderCount}
                  </span>
                  {canCreateInDepartment(department) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateFolder(department.id);
                      }}
                      className="p-1 rounded hover:bg-gray-200"
                      title="Create folder"
                    >
                      <Plus size={14} className="text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Folder Tree (Expanded) */}
              {expandedDepartments.has(department.id) && (
                <div className="ml-6 mt-1 border-l border-gray-200 pl-2">
                  {loading.has(department.id) ? (
                    <div className="py-2 text-sm text-gray-400">
                      Loading...
                    </div>
                  ) : departmentTrees.get(department.id)?.folders.length === 0 ? (
                    <div className="py-2 text-sm text-gray-400 italic">
                      No folders yet
                    </div>
                  ) : (
                    <FolderTree
                      folders={departmentTrees.get(department.id)?.folders || []}
                      onSelect={onFolderSelect}
                      departmentId={department.id}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Storage Summary */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t">
        <StorageSummary departments={departments} />
      </div>
    </aside>
  );
};

const canCreateInDepartment = (department: Department): boolean => {
  return ['ADMIN', 'MANAGER', 'EDITOR'].includes(department.role);
};

const StorageSummary: React.FC<{ departments: Department[] }> = ({ departments }) => {
  const totalUsed = departments.reduce((sum, d) => sum + d.storageUsedGb, 0);
  const totalQuota = departments.reduce((sum, d) => sum + d.storageQuotaGb, 0);
  const percentage = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;

  return (
    <div className="text-xs text-gray-500">
      <div className="flex justify-between mb-1">
        <span>Storage</span>
        <span>{totalUsed.toFixed(1)} / {totalQuota} GB</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${percentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};
```

### 7.3 Department Service

**File**: `frontend/src/services/departmentService.ts`

```typescript
import api from './api';
import { Department, DepartmentTree, DepartmentAccessGrant } from '@/types/department';

export const departmentService = {
  /**
   * Get all departments accessible by the current user.
   */
  async getDepartments(): Promise<Department[]> {
    const response = await api.get('/departments/');
    return response.data.departments;
  },

  /**
   * Get department details.
   */
  async getDepartment(id: number): Promise<Department> {
    const response = await api.get(`/departments/${id}/`);
    return response.data;
  },

  /**
   * Get folder tree for a department.
   */
  async getDepartmentTree(id: number): Promise<DepartmentTree> {
    const response = await api.get(`/departments/${id}/tree/`);
    return response.data;
  },

  /**
   * Get department statistics.
   */
  async getDepartmentStats(id: number): Promise<DepartmentStats> {
    const response = await api.get(`/departments/${id}/stats/`);
    return response.data;
  },

  /**
   * Get access grants for a department.
   */
  async getDepartmentAccess(id: number): Promise<DepartmentAccessGrant[]> {
    const response = await api.get(`/departments/${id}/access/`);
    return response.data;
  },

  /**
   * Grant access to a department.
   */
  async grantAccess(
    departmentId: number,
    userId: string,
    role: string,
    reason: string,
    expiresAt?: string
  ): Promise<DepartmentAccessGrant> {
    const response = await api.post(`/departments/${departmentId}/access/grant/`, {
      user_id: userId,
      role,
      reason,
      expires_at: expiresAt,
    });
    return response.data;
  },

  /**
   * Revoke department access.
   */
  async revokeAccess(departmentId: number, grantId: number): Promise<void> {
    await api.post(`/departments/${departmentId}/access/revoke/`, {
      grant_id: grantId,
    });
  },
};
```

### 7.4 Redux State Management

**File**: `frontend/src/store/departmentSlice.ts`

```typescript
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Department, DepartmentTree } from '@/types/department';
import { departmentService } from '@/services/departmentService';

interface DepartmentState {
  departments: Department[];
  selectedDepartment: number | null;
  departmentTrees: Record<number, DepartmentTree>;
  loading: boolean;
  error: string | null;
}

const initialState: DepartmentState = {
  departments: [],
  selectedDepartment: null,
  departmentTrees: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchDepartments = createAsyncThunk(
  'departments/fetchAll',
  async () => {
    return await departmentService.getDepartments();
  }
);

export const fetchDepartmentTree = createAsyncThunk(
  'departments/fetchTree',
  async (departmentId: number) => {
    const tree = await departmentService.getDepartmentTree(departmentId);
    return { departmentId, tree };
  }
);

// Slice
const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {
    setSelectedDepartment: (state, action: PayloadAction<number | null>) => {
      state.selectedDepartment = action.payload;
    },
    clearDepartmentTree: (state, action: PayloadAction<number>) => {
      delete state.departmentTrees[action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch departments
      .addCase(fetchDepartments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartments.fulfilled, (state, action) => {
        state.departments = action.payload;
        state.loading = false;
        // Auto-select primary department
        const primary = action.payload.find(d => d.isPrimary);
        if (primary && !state.selectedDepartment) {
          state.selectedDepartment = primary.id;
        }
      })
      .addCase(fetchDepartments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch departments';
      })
      // Fetch department tree
      .addCase(fetchDepartmentTree.fulfilled, (state, action) => {
        const { departmentId, tree } = action.payload;
        state.departmentTrees[departmentId] = tree;
      });
  },
});

// Selectors
export const selectDepartments = (state: RootState) => state.departments.departments;
export const selectSelectedDepartment = (state: RootState) => state.departments.selectedDepartment;
export const selectDepartmentTree = (departmentId: number) => (state: RootState) =>
  state.departments.departmentTrees[departmentId];
export const selectDepartmentLoading = (state: RootState) => state.departments.loading;

export const { setSelectedDepartment, clearDepartmentTree } = departmentSlice.actions;
export default departmentSlice.reducer;
```

### 7.5 Updated Breadcrumb Component

**File**: `frontend/src/components/Navigation/Breadcrumb.tsx`

```typescript
import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Department } from '@/types/department';
import { Folder } from '@/types/folder';

interface BreadcrumbProps {
  department: Department;
  folders: Folder[];
  onNavigate: (type: 'department' | 'folder', id: number | string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  department,
  folders,
  onNavigate
}) => {
  return (
    <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
      {/* Home */}
      <button
        onClick={() => onNavigate('department', department.id)}
        className="p-1 rounded hover:bg-gray-100"
        title="Go to department root"
      >
        <Home size={16} className="text-gray-500" />
      </button>

      <ChevronRight size={14} className="text-gray-400" />

      {/* Department */}
      <button
        onClick={() => onNavigate('department', department.id)}
        className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600 font-medium"
        style={{ color: department.color }}
      >
        {department.name}
      </button>

      {/* Folder Path */}
      {folders.map((folder, index) => (
        <React.Fragment key={folder.id}>
          <ChevronRight size={14} className="text-gray-400" />
          <button
            onClick={() => onNavigate('folder', folder.id)}
            className={`
              px-2 py-1 rounded hover:bg-gray-100
              ${index === folders.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-600'}
            `}
          >
            {folder.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};
```

---

## 8. Migration Strategy

### 8.1 Database Migration Plan

**Phase 1: Schema Preparation**

```python
# migration_0001_add_department_fields.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', 'previous_migration'),
        ('folders', 'previous_migration'),
    ]

    operations = [
        # Add new department fields
        migrations.AddField(
            model_name='department',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='department',
            name='icon',
            field=models.CharField(default='folder', max_length=50),
        ),
        migrations.AddField(
            model_name='department',
            name='color',
            field=models.CharField(default='#3B82F6', max_length=7),
        ),
        migrations.AddField(
            model_name='department',
            name='display_order',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='department',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='department',
            name='storage_used_bytes',
            field=models.BigIntegerField(default=0),
        ),

        # Add indexes
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(fields=['department', 'parent'], name='folder_dept_parent_idx'),
        ),
        migrations.AddIndex(
            model_name='folder',
            index=models.Index(fields=['department', 'is_deleted'], name='folder_dept_deleted_idx'),
        ),
    ]
```

**Phase 2: Data Migration**

```python
# migration_0002_assign_departments.py

from django.db import migrations

def assign_departments_to_folders(apps, schema_editor):
    """
    Assign departments to folders that don't have one.
    Strategy:
    1. Use folder owner's department
    2. If owner has no department, use organization's default department
    """
    Folder = apps.get_model('folders', 'Folder')
    Department = apps.get_model('users', 'Department')

    orphan_folders = Folder.objects.filter(department__isnull=True)

    for folder in orphan_folders:
        if folder.owner and folder.owner.department:
            folder.department = folder.owner.department
        elif folder.organization:
            # Get or create default department
            default_dept, _ = Department.objects.get_or_create(
                organization=folder.organization,
                code='DEFAULT',
                defaults={
                    'name': 'General',
                    'storage_quota_gb': 100,
                }
            )
            folder.department = default_dept
        folder.save()

def update_folder_paths(apps, schema_editor):
    """
    Update all folder paths to include department code prefix.
    """
    Folder = apps.get_model('folders', 'Folder')

    # Process root folders first
    root_folders = Folder.objects.filter(parent__isnull=True)
    for folder in root_folders:
        if folder.department:
            old_path = folder.path
            new_path = f"/{folder.department.code}/{folder.name}/"
            folder.path = new_path
            folder.save()

            # Update all children
            Folder.objects.filter(path__startswith=old_path).exclude(pk=folder.pk).update(
                path=models.functions.Replace(
                    models.F('path'),
                    models.Value(old_path),
                    models.Value(new_path)
                )
            )

class Migration(migrations.Migration):
    dependencies = [
        ('folders', 'migration_0001_add_department_fields'),
    ]

    operations = [
        migrations.RunPython(
            assign_departments_to_folders,
            reverse_code=migrations.RunPython.noop
        ),
        migrations.RunPython(
            update_folder_paths,
            reverse_code=migrations.RunPython.noop
        ),
    ]
```

**Phase 3: Enforce Constraints**

```python
# migration_0003_enforce_department_required.py

from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('folders', 'migration_0002_assign_departments'),
    ]

    operations = [
        # Make department non-nullable
        migrations.AlterField(
            model_name='folder',
            name='department',
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name='folders',
                to='users.department',
            ),
        ),

        # Update unique constraint
        migrations.AlterUniqueTogether(
            name='folder',
            unique_together={('parent', 'name', 'department')},
        ),
    ]
```

### 8.2 Rollback Procedures

```python
# rollback_migration.py

def rollback_department_as_root():
    """
    Rollback procedure if migration fails.
    """
    # 1. Restore original folder paths
    # 2. Make department nullable again
    # 3. Remove new department fields
    # 4. Remove indexes
    pass
```

---

## 9. Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)

**Tasks:**
- [ ] Add new Department model fields
- [ ] Create DepartmentSettings model
- [ ] Create CrossDepartmentAccess model
- [ ] Write database migrations
- [ ] Implement DepartmentPermissionResolver
- [ ] Update Folder model constraints
- [ ] Add department validation to folder save

**Deliverables:**
- Updated models with migrations
- Permission resolver utility
- Unit tests for permission logic

### Phase 2: API Layer (Week 2-3)

**Tasks:**
- [ ] Create Department API endpoints
- [ ] Update Folder API to require department
- [ ] Add department tree endpoint
- [ ] Implement department access management endpoints
- [ ] Update serializers
- [ ] Add API documentation (OpenAPI)

**Deliverables:**
- New API endpoints functional
- Updated API documentation
- Integration tests

### Phase 3: Data Migration (Week 3)

**Tasks:**
- [ ] Run migration on staging environment
- [ ] Verify data integrity
- [ ] Test folder hierarchy preservation
- [ ] Validate permission inheritance
- [ ] Performance testing

**Deliverables:**
- Migration scripts tested
- Data integrity verified
- Migration runbook

### Phase 4: Frontend Implementation (Week 4-5)

**Tasks:**
- [ ] Create DepartmentSidebar component
- [ ] Update Redux state management
- [ ] Implement department service
- [ ] Update folder creation workflow
- [ ] Update breadcrumb component
- [ ] Add department access management UI

**Deliverables:**
- New sidebar component
- Updated navigation flow
- Cross-department access UI

### Phase 5: Integration & Testing (Week 5-6)

**Tasks:**
- [ ] End-to-end testing
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation update

**Deliverables:**
- All tests passing
- Performance benchmarks met
- Security audit report

### Phase 6: Deployment (Week 6)

**Tasks:**
- [ ] Production database backup
- [ ] Run migrations in production
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor error rates
- [ ] User communication

**Deliverables:**
- Production deployment complete
- Monitoring dashboards active
- User documentation published

---

## 10. Security Considerations

### 10.1 Access Control

1. **Department Isolation**: Users cannot access departments they don't belong to without explicit grant
2. **Principle of Least Privilege**: Default to VIEW_ONLY for cross-department access
3. **Time-Limited Access**: Cross-department grants should have expiration dates
4. **Audit Trail**: All department access grants/revocations logged

### 10.2 Data Protection

1. **Path Traversal Prevention**: Validate department ownership on all folder operations
2. **IDOR Prevention**: Check department membership before returning folder data
3. **Search Filtering**: Elasticsearch queries filtered by accessible departments

### 10.3 API Security

```python
# Example: Department access check decorator
def require_department_access(view_func):
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        department_id = kwargs.get('department_id') or request.data.get('department')
        if department_id:
            resolver = DepartmentPermissionResolver(request.user)
            department = Department.objects.get(pk=department_id)
            if not resolver.can_access_department(department):
                raise PermissionDenied("Access denied to this department")
        return view_func(request, *args, **kwargs)
    return wrapper
```

---

## 11. Performance Considerations

### 11.1 Query Optimization

```python
# Efficient department tree loading
def get_department_tree(department_id):
    """
    Load folder tree with optimized queries.
    Uses prefetch_related to avoid N+1 queries.
    """
    return Folder.objects.filter(
        department_id=department_id,
        is_deleted=False
    ).select_related(
        'owner', 'created_by'
    ).prefetch_related(
        Prefetch(
            'children',
            queryset=Folder.objects.filter(is_deleted=False).only(
                'id', 'name', 'parent_id', 'path', 'depth'
            )
        )
    ).only(
        'id', 'name', 'parent_id', 'path', 'depth', 'is_locked',
        'confidentiality_level', 'owner_id'
    )
```

### 11.2 Caching Strategy

```python
# Cache department tree
CACHE_TIMEOUT = 300  # 5 minutes

def get_cached_department_tree(department_id, user_id):
    cache_key = f"dept_tree:{department_id}:{user_id}"
    tree = cache.get(cache_key)
    if tree is None:
        tree = build_department_tree(department_id, user_id)
        cache.set(cache_key, tree, CACHE_TIMEOUT)
    return tree

def invalidate_department_tree_cache(department_id):
    """Call this when folders are created/deleted/moved."""
    pattern = f"dept_tree:{department_id}:*"
    cache.delete_pattern(pattern)
```

### 11.3 Frontend Optimization

- **Lazy Loading**: Load folder tree only when department is expanded
- **Virtual Scrolling**: For departments with many folders
- **Debounced Search**: 300ms debounce on folder search
- **Memoization**: Cache permission checks per session

---

## 12. Rollback Strategy

### 12.1 Feature Flags

```python
# settings.py
FEATURE_FLAGS = {
    'DEPARTMENT_AS_ROOT': env.bool('FF_DEPARTMENT_AS_ROOT', default=False),
}

# Usage in views
if settings.FEATURE_FLAGS['DEPARTMENT_AS_ROOT']:
    # New department-based logic
else:
    # Legacy folder tree logic
```

### 12.2 Database Rollback

```sql
-- Rollback Script
-- Run if migration needs to be reversed

-- 1. Remove new constraints
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folder_dept_parent_idx;
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folder_dept_deleted_idx;

-- 2. Make department nullable again
ALTER TABLE folders ALTER COLUMN department_id DROP NOT NULL;

-- 3. Restore original unique constraint
ALTER TABLE folders DROP CONSTRAINT IF EXISTS folders_parent_name_department_key;
ALTER TABLE folders ADD CONSTRAINT folders_parent_name_key UNIQUE (parent_id, name);

-- 4. Remove department path prefix from folder paths
UPDATE folders SET path = regexp_replace(path, '^/[A-Z]+/', '/');
```

### 12.3 Rollback Checklist

- [ ] Disable feature flag
- [ ] Deploy rollback code
- [ ] Run database rollback script
- [ ] Clear caches
- [ ] Verify system functionality
- [ ] Notify stakeholders

---

## 13. Testing Strategy

### 13.1 Unit Tests

```python
# tests/test_department_permissions.py

class TestDepartmentPermissionResolver:

    def test_user_can_access_own_department(self):
        user = UserFactory(department=self.engineering_dept)
        resolver = DepartmentPermissionResolver(user)
        assert resolver.can_access_department(self.engineering_dept) is True

    def test_user_cannot_access_other_department_by_default(self):
        user = UserFactory(department=self.engineering_dept)
        resolver = DepartmentPermissionResolver(user)
        assert resolver.can_access_department(self.accounting_dept) is False

    def test_cross_department_grant_provides_access(self):
        user = UserFactory(department=self.engineering_dept)
        CrossDepartmentAccess.objects.create(
            user=user,
            department=self.accounting_dept,
            role=self.viewer_role,
            reason="Audit access"
        )
        resolver = DepartmentPermissionResolver(user)
        assert resolver.can_access_department(self.accounting_dept) is True

    def test_global_admin_can_access_all_departments(self):
        admin = UserFactory(department=self.engineering_dept)
        UserRole.objects.create(
            user=admin,
            role=self.admin_role,
            scope='GLOBAL'
        )
        resolver = DepartmentPermissionResolver(admin)
        assert resolver.can_access_department(self.accounting_dept) is True


class TestFolderDepartmentConstraint:

    def test_folder_requires_department(self):
        with pytest.raises(ValidationError):
            Folder.objects.create(
                name="Test",
                organization=self.org,
                # No department specified
            )

    def test_child_folder_must_match_parent_department(self):
        parent = FolderFactory(department=self.engineering_dept)
        with pytest.raises(ValidationError):
            Folder.objects.create(
                name="Child",
                parent=parent,
                department=self.accounting_dept,  # Different department
                organization=self.org
            )
```

### 13.2 Integration Tests

```python
# tests/test_department_api.py

class TestDepartmentAPI:

    def test_list_departments_returns_accessible_only(self):
        response = self.client.get('/api/v1/departments/')
        department_ids = [d['id'] for d in response.json()['departments']]

        assert self.user_department.id in department_ids
        assert self.other_department.id not in department_ids

    def test_department_tree_returns_folders(self):
        response = self.client.get(f'/api/v1/departments/{self.user_department.id}/tree/')

        assert response.status_code == 200
        assert 'folders' in response.json()

    def test_department_tree_denied_for_unauthorized(self):
        response = self.client.get(f'/api/v1/departments/{self.other_department.id}/tree/')

        assert response.status_code == 403
```

### 13.3 E2E Tests

```typescript
// cypress/e2e/department-navigation.cy.ts

describe('Department Navigation', () => {
  beforeEach(() => {
    cy.login('testuser@example.com', 'password');
  });

  it('displays user departments in sidebar', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="department-sidebar"]').should('be.visible');
    cy.contains('Engagements').should('be.visible');
  });

  it('expands department to show folders', () => {
    cy.visit('/dashboard');
    cy.contains('Engagements').click();
    cy.get('[data-testid="folder-tree"]').should('be.visible');
  });

  it('navigates to folder when clicked', () => {
    cy.visit('/dashboard');
    cy.contains('Engagements').click();
    cy.contains('Client Records').click();
    cy.url().should('include', 'folder=');
    cy.get('[data-testid="breadcrumb"]').should('contain', 'Client Records');
  });

  it('prevents access to unauthorized department', () => {
    cy.request({
      url: '/api/v1/departments/999/tree/',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(403);
    });
  });
});
```

---

## Appendices

### Appendix A: Standard Department Configuration

| Department | Code | Icon | Color | Default Confidentiality |
|------------|------|------|-------|------------------------|
| Engagements | ENGAGEMENTS | briefcase | #3B82F6 | Internal |
| Accounting | ACCOUNTING | calculator | #10B981 | Confidential |
| Compliance | COMPLIANCE | shield | #F59E0B | Highly Confidential |
| Risk | RISK | alert-triangle | #EF4444 | Confidential |
| Audit | AUDIT | clipboard-check | #8B5CF6 | Highly Confidential |
| IT | IT | server | #6B7280 | Internal |

### Appendix B: Permission Level Matrix

| Level | View | Download | Upload | Edit | Delete | Share | Manage |
|-------|------|----------|--------|------|--------|-------|--------|
| NO_ACCESS | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_ONLY | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| VIEW_DOWNLOAD | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| CONTRIBUTE | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| EDIT | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| FULL_CONTROL | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Appendix C: API Error Codes

| Code | Message | Description |
|------|---------|-------------|
| DEPT_001 | Department not found | Requested department does not exist |
| DEPT_002 | Access denied | User lacks permission to access department |
| DEPT_003 | Department required | Folder operation requires department specification |
| DEPT_004 | Department mismatch | Child folder department must match parent |
| DEPT_005 | Cross-access expired | Cross-department access grant has expired |

### Appendix D: Migration Checklist

**Pre-Migration:**
- [ ] Backup production database
- [ ] Notify stakeholders of maintenance window
- [ ] Verify staging migration successful
- [ ] Prepare rollback scripts
- [ ] Document current folder counts per organization

**Migration:**
- [ ] Enable maintenance mode
- [ ] Run Django migrations
- [ ] Verify data integrity
- [ ] Run sanity checks (folder counts, path validation)
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Disable maintenance mode

**Post-Migration:**
- [ ] Monitor error rates
- [ ] Verify user access
- [ ] Check audit logs
- [ ] Performance testing
- [ ] User acceptance testing

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-03 | Architecture Team | Initial document |

---

*This document is part of the DFC Technical Documentation suite.*
