/**
 * RBAC (Role-Based Access Control) Types
 * Types for roles, permissions, users, and access control
 */

/**
 * System Roles
 */
export type SystemRole = 'viewer' | 'editor' | 'manager' | 'admin'

/**
 * Permission Types
 */
export type PermissionType =
  | 'view_document'
  | 'edit_document'
  | 'delete_document'
  | 'download_document'
  | 'share_document'
  | 'manage_folder'
  | 'view_audit_log'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_permissions'
  | 'manage_retention'
  | 'apply_legal_hold'
  | 'export_data'
  | 'manage_metadata'
  | 'restore_versions'

/**
 * Access Level
 */
export type AccessLevel = 'none' | 'read' | 'write' | 'admin'

/**
 * Permission
 */
export interface Permission {
  type: PermissionType
  label: string
  description: string
  category: 'document' | 'folder' | 'system' | 'compliance'
  requiresApproval?: boolean
  restrictedTo?: SystemRole[]
}

/**
 * Role Definition
 */
export interface Role {
  id: string
  name: SystemRole | string
  displayName: string
  description: string
  permissions: PermissionType[]
  isSystemRole: boolean
  isCustomRole: boolean
  color: string
  icon?: string
  level: number // Hierarchy level (1=lowest, 4=highest)
  createdAt?: string
  updatedAt?: string
  createdBy?: string
}

/**
 * User with Role
 */
export interface UserWithRole {
  id: string
  email: string
  name: string
  avatar?: string
  role: SystemRole | string
  department?: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
}

/**
 * Access Control Entry
 */
export interface AccessControlEntry {
  id: string
  resourceId: string // Document or folder ID
  resourceType: 'document' | 'folder'
  subjectType: 'user' | 'department' | 'role'
  subjectId: string
  subjectName: string
  accessLevel: AccessLevel
  permissions: PermissionType[]
  inherited: boolean
  inheritedFrom?: string // Parent folder ID if inherited
  expiresAt?: string
  grantedBy: string
  grantedAt: string
}

/**
 * Access Control List
 */
export interface AccessControlList {
  resourceId: string
  resourceType: 'document' | 'folder'
  resourceName: string
  entries: AccessControlEntry[]
  inheritanceEnabled: boolean
  parentFolderId?: string
  effectivePermissions: Map<string, PermissionType[]> // userId -> permissions
}

/**
 * Permission Grant Request
 */
export interface PermissionGrantRequest {
  resourceId: string
  resourceType: 'document' | 'folder'
  subjectType: 'user' | 'department' | 'role'
  subjectId: string
  accessLevel: AccessLevel
  permissions?: PermissionType[]
  expiresAt?: string
  reason?: string
}

/**
 * Permission Check Result
 */
export interface PermissionCheckResult {
  hasPermission: boolean
  permission: PermissionType
  source: 'direct' | 'inherited' | 'role' | 'department'
  grantedBy?: string
  expiresAt?: string
}

/**
 * Effective Permissions (computed from all sources)
 */
export interface EffectivePermissions {
  userId: string
  resourceId: string
  resourceType: 'document' | 'folder'
  permissions: PermissionType[]
  accessLevel: AccessLevel
  sources: Array<{
    type: 'direct' | 'inherited' | 'role' | 'department'
    permissions: PermissionType[]
    from?: string
  }>
  conflicts?: Array<{
    permission: PermissionType
    granted: boolean
    sources: string[]
  }>
}

/**
 * Permission Audit Log Entry
 */
export interface PermissionAuditEntry {
  id: string
  timestamp: string
  action: 'grant' | 'revoke' | 'modify'
  userId: string
  userName: string
  targetUserId: string
  targetUserName: string
  resourceId: string
  resourceType: 'document' | 'folder'
  resourceName: string
  permissions: PermissionType[]
  previousPermissions?: PermissionType[]
  reason?: string
  ipAddress?: string
}

/**
 * Role Assignment
 */
export interface RoleAssignment {
  id: string
  userId: string
  userName: string
  userEmail: string
  role: SystemRole | string
  previousRole?: string
  assignedBy: string
  assignedAt: string
  expiresAt?: string
  reason?: string
}

/**
 * Department Permissions
 */
export interface DepartmentPermissions {
  departmentId: string
  departmentName: string
  defaultRole: SystemRole
  defaultPermissions: PermissionType[]
  customPermissions?: Record<string, PermissionType[]> // resourceId -> permissions
}

/**
 * Permission Conflict
 */
export interface PermissionConflict {
  resourceId: string
  resourceName: string
  userId: string
  userName: string
  permission: PermissionType
  grantSources: Array<{
    source: 'direct' | 'inherited' | 'role' | 'department'
    grants: boolean
    from?: string
  }>
  resolution: 'most_permissive' | 'least_permissive' | 'explicit_deny'
  resolvedValue: boolean
}

/**
 * Component Props
 */

export interface UserRoleManagerProps {
  users: UserWithRole[]
  availableRoles: Role[]
  onRoleChange: (userId: string, newRole: string, reason?: string) => void
  onUserDeactivate?: (userId: string) => void
  onUserActivate?: (userId: string) => void
  canManageRoles: boolean
  className?: string
}

export interface RolePermissionsEditorProps {
  role: Role
  availablePermissions: Permission[]
  onPermissionsChange: (roleId: string, permissions: PermissionType[]) => void
  onRoleUpdate?: (role: Partial<Role>) => void
  canEditRole: boolean
  isSystemRole: boolean
  className?: string
}

export interface AccessControlListProps {
  acl: AccessControlList
  onEntryAdd: (request: PermissionGrantRequest) => void
  onEntryModify: (entryId: string, permissions: PermissionType[]) => void
  onEntryRemove: (entryId: string) => void
  onInheritanceToggle?: (enabled: boolean) => void
  canManagePermissions: boolean
  showInherited?: boolean
  className?: string
}

export interface PermissionBadgeProps {
  permission: PermissionType | AccessLevel
  variant?: 'permission' | 'access-level'
  size?: 'sm' | 'md' | 'lg'
  showTooltip?: boolean
  className?: string
}

export interface SharePermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  resourceId: string
  resourceType: 'document' | 'folder'
  resourceName: string
  currentACL: AccessControlList
  onShare: (request: PermissionGrantRequest) => void
  availableUsers: UserWithRole[]
  availableDepartments: Array<{ id: string; name: string }>
}

export interface UserPermissionsViewerProps {
  userId: string
  userName: string
  effectivePermissions: EffectivePermissions[]
  onRefresh?: () => void
  showConflicts?: boolean
  className?: string
}

export interface PermissionMatrixProps {
  users: UserWithRole[]
  resources: Array<{ id: string; name: string; type: 'document' | 'folder' }>
  permissions: Map<string, Map<string, PermissionType[]>> // userId -> resourceId -> permissions
  onPermissionToggle?: (userId: string, resourceId: string, permission: PermissionType) => void
  readOnly?: boolean
  className?: string
}

/**
 * Constants
 */

export const SYSTEM_ROLES: Role[] = [
  {
    id: 'viewer',
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Can view documents they have access to',
    permissions: ['view_document', 'download_document'],
    isSystemRole: true,
    isCustomRole: false,
    color: 'gray',
    icon: '👁️',
    level: 1,
  },
  {
    id: 'editor',
    name: 'editor',
    displayName: 'Editor',
    description: 'Can view and edit documents',
    permissions: [
      'view_document',
      'edit_document',
      'download_document',
      'manage_metadata',
      'restore_versions',
    ],
    isSystemRole: true,
    isCustomRole: false,
    color: 'blue',
    icon: '✏️',
    level: 2,
  },
  {
    id: 'manager',
    name: 'manager',
    displayName: 'Manager',
    description: 'Can manage documents and folders within their department',
    permissions: [
      'view_document',
      'edit_document',
      'delete_document',
      'download_document',
      'share_document',
      'manage_folder',
      'manage_metadata',
      'restore_versions',
      'view_audit_log',
    ],
    isSystemRole: true,
    isCustomRole: false,
    color: 'orange',
    icon: '👔',
    level: 3,
  },
  {
    id: 'admin',
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access and user management',
    permissions: [
      'view_document',
      'edit_document',
      'delete_document',
      'download_document',
      'share_document',
      'manage_folder',
      'view_audit_log',
      'manage_users',
      'manage_roles',
      'manage_permissions',
      'manage_retention',
      'apply_legal_hold',
      'export_data',
      'manage_metadata',
      'restore_versions',
    ],
    isSystemRole: true,
    isCustomRole: false,
    color: 'red',
    icon: '🔑',
    level: 4,
  },
]

export const PERMISSION_CATEGORIES: Record<
  Permission['category'],
  { label: string; icon: string; color: string }
> = {
  document: { label: 'Document Permissions', icon: '📄', color: 'blue' },
  folder: { label: 'Folder Permissions', icon: '📁', color: 'yellow' },
  system: { label: 'System Permissions', icon: '⚙️', color: 'gray' },
  compliance: { label: 'Compliance Permissions', icon: '🔒', color: 'red' },
}

export const ALL_PERMISSIONS: Permission[] = [
  {
    type: 'view_document',
    label: 'View Document',
    description: 'Can view document content and metadata',
    category: 'document',
  },
  {
    type: 'edit_document',
    label: 'Edit Document',
    description: 'Can modify document content and metadata',
    category: 'document',
  },
  {
    type: 'delete_document',
    label: 'Delete Document',
    description: 'Can delete documents',
    category: 'document',
    requiresApproval: true,
  },
  {
    type: 'download_document',
    label: 'Download Document',
    description: 'Can download documents',
    category: 'document',
  },
  {
    type: 'share_document',
    label: 'Share Document',
    description: 'Can share documents with others',
    category: 'document',
  },
  {
    type: 'manage_folder',
    label: 'Manage Folder',
    description: 'Can create, rename, move, and delete folders',
    category: 'folder',
  },
  {
    type: 'view_audit_log',
    label: 'View Audit Log',
    description: 'Can view audit trail and activity logs',
    category: 'system',
    restrictedTo: ['manager', 'admin'],
  },
  {
    type: 'manage_users',
    label: 'Manage Users',
    description: 'Can add, remove, and modify user accounts',
    category: 'system',
    restrictedTo: ['admin'],
    requiresApproval: true,
  },
  {
    type: 'manage_roles',
    label: 'Manage Roles',
    description: 'Can create and modify roles',
    category: 'system',
    restrictedTo: ['admin'],
  },
  {
    type: 'manage_permissions',
    label: 'Manage Permissions',
    description: 'Can grant and revoke permissions',
    category: 'system',
    restrictedTo: ['admin'],
  },
  {
    type: 'manage_retention',
    label: 'Manage Retention',
    description: 'Can set and modify retention policies',
    category: 'compliance',
    restrictedTo: ['admin'],
  },
  {
    type: 'apply_legal_hold',
    label: 'Apply Legal Hold',
    description: 'Can place documents on legal hold',
    category: 'compliance',
    restrictedTo: ['admin'],
    requiresApproval: true,
  },
  {
    type: 'export_data',
    label: 'Export Data',
    description: 'Can export bulk data from the system',
    category: 'system',
    restrictedTo: ['manager', 'admin'],
  },
  {
    type: 'manage_metadata',
    label: 'Manage Metadata',
    description: 'Can edit document metadata and tags',
    category: 'document',
  },
  {
    type: 'restore_versions',
    label: 'Restore Versions',
    description: 'Can restore previous document versions',
    category: 'document',
  },
]

export const ACCESS_LEVEL_COLORS = {
  none: 'gray',
  read: 'blue',
  write: 'green',
  admin: 'red',
} as const

export const ACCESS_LEVEL_LABELS = {
  none: 'No Access',
  read: 'Read Only',
  write: 'Read & Write',
  admin: 'Full Control',
} as const

/**
 * Helper Functions
 */

export const getPermissionLabel = (permission: PermissionType): string => {
  return ALL_PERMISSIONS.find((p) => p.type === permission)?.label || permission
}

export const getPermissionDescription = (permission: PermissionType): string => {
  return ALL_PERMISSIONS.find((p) => p.type === permission)?.description || ''
}

export const getRoleByName = (name: string): Role | undefined => {
  return SYSTEM_ROLES.find((r) => r.name === name)
}

export const getRolePermissions = (roleName: string): PermissionType[] => {
  return SYSTEM_ROLES.find((r) => r.name === roleName)?.permissions || []
}

export const hasPermission = (userRole: string, permission: PermissionType): boolean => {
  const role = getRoleByName(userRole)
  return role?.permissions.includes(permission) || false
}

export const canAccessResource = (
  userPermissions: PermissionType[],
  requiredPermission: PermissionType
): boolean => {
  return userPermissions.includes(requiredPermission)
}

export const getAccessLevelFromPermissions = (permissions: PermissionType[]): AccessLevel => {
  if (permissions.includes('manage_permissions')) return 'admin'
  if (permissions.includes('edit_document')) return 'write'
  if (permissions.includes('view_document')) return 'read'
  return 'none'
}

export const getPermissionsFromAccessLevel = (accessLevel: AccessLevel): PermissionType[] => {
  switch (accessLevel) {
    case 'admin':
      return [
        'view_document',
        'edit_document',
        'delete_document',
        'download_document',
        'share_document',
        'manage_metadata',
      ]
    case 'write':
      return ['view_document', 'edit_document', 'download_document', 'manage_metadata']
    case 'read':
      return ['view_document', 'download_document']
    case 'none':
    default:
      return []
  }
}
