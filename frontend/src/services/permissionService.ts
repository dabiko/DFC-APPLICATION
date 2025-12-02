/**
 * Permission Service
 *
 * Provides API methods for RBAC permission management including:
 * - Role management
 * - User role assignments
 * - Folder permissions
 * - Document permissions
 * - Permission checking
 * - Audit logs
 */

import api from './apiClient'

// ============================================
// Types
// ============================================

export interface Role {
  id: string
  name: 'VIEWER' | 'EDITOR' | 'MANAGER' | 'ADMIN'
  display_name: string
  description: string
  can_view: boolean
  can_download: boolean
  can_upload: boolean
  can_edit: boolean
  can_delete: boolean
  can_share: boolean
  can_manage_permissions: boolean
  can_view_audit_log: boolean
  can_manage_retention: boolean
  can_manage_classification: boolean
  permissions_list: string[]
}

export interface UserRole {
  id: string
  user: string
  user_username: string
  user_email: string
  user_full_name: string
  role: string
  role_name: string
  scope: 'GLOBAL' | 'DEPARTMENT' | 'FOLDER'
  scope_display: string
  department?: string
  department_name?: string
  granted_by?: string
  granted_by_username?: string
  granted_at: string
  expires_at?: string
  is_expired: boolean
  is_active: boolean
}

export interface UserRoleCreate {
  user: string
  role: string
  scope: 'GLOBAL' | 'DEPARTMENT' | 'FOLDER'
  department?: string
  expires_at?: string
  is_active?: boolean
}

export type FolderPermissionLevel =
  | 'NO_ACCESS'
  | 'VIEW_ONLY'
  | 'VIEW_DOWNLOAD'
  | 'CONTRIBUTE'
  | 'EDIT'
  | 'FULL_CONTROL'

export interface FolderPermission {
  id: string
  folder: string
  folder_name: string
  folder_path: string
  user?: string
  user_username?: string
  user_email?: string
  department?: string
  department_name?: string
  permission_level: FolderPermissionLevel
  permission_level_display: string
  inherit_from_parent: boolean
  granted_by?: string
  granted_by_username?: string
  granted_at: string
  effective_permissions: EffectivePermissions
}

export interface FolderPermissionCreate {
  folder: string
  user?: string
  department?: string
  permission_level: FolderPermissionLevel
  inherit_from_parent?: boolean
}

export type DocumentPermissionLevel =
  | 'NO_ACCESS'
  | 'VIEW_ONLY'
  | 'VIEW_DOWNLOAD'
  | 'EDIT'
  | 'FULL_CONTROL'

export interface DocumentPermission {
  id: string
  document: string
  document_title: string
  document_file_name: string
  user?: string
  user_username?: string
  user_email?: string
  user_full_name?: string
  department?: string
  department_name?: string
  permission_level: DocumentPermissionLevel
  permission_level_display: string
  override_folder_permissions: boolean
  granted_by?: string
  granted_by_username?: string
  granted_at: string
  expires_at?: string
  reason?: string
  effective_permissions: EffectivePermissions
  is_expired: boolean
}

export interface DocumentPermissionCreate {
  document: string
  user?: string
  department?: string
  permission_level: DocumentPermissionLevel
  override_folder_permissions?: boolean
  expires_at?: string
  reason?: string
}

export interface EffectivePermissions {
  can_view: boolean
  can_download: boolean
  can_upload?: boolean
  can_edit: boolean
  can_delete: boolean
  can_share?: boolean
  can_manage_permissions: boolean
}

export interface PermissionCheckResult {
  has_permission: boolean
  reason: string
  source?: string
  folder?: string
  document?: string
  user: string
  permission: string
}

export interface UserPermissionSummary {
  user_id: string
  username: string
  email: string
  full_name: string
  is_superuser: boolean
  global_roles: UserRole[]
  department_roles: UserRole[]
  folder_permissions: FolderPermission[]
  all_permissions: string[]
  accessible_folder_count: number
  accessible_document_count: number
}

export interface PermissionAuditLog {
  id: string
  actor?: string
  actor_username?: string
  actor_full_name?: string
  action: 'GRANT' | 'REVOKE' | 'MODIFY' | 'EXPIRE' | 'DENY'
  action_display: string
  resource_type: 'FOLDER' | 'DOCUMENT' | 'ROLE' | 'DEPARTMENT'
  resource_type_display: string
  resource_id: string
  target_user?: string
  target_user_username?: string
  target_department?: string
  target_department_name?: string
  old_permission_level?: string
  new_permission_level?: string
  reason?: string
  ip_address?: string
  timestamp: string
}

export interface BulkPermissionAssignment {
  user_id?: string
  department_id?: string
  permission_level: FolderPermissionLevel | DocumentPermissionLevel
  inherit_from_parent?: boolean
  override_folder_permissions?: boolean
  expires_at?: string
  reason?: string
}

export interface AuditLogSummary {
  period_days: number
  total_events: number
  action_counts: Array<{ action: string; count: number }>
  resource_counts: Array<{ resource_type: string; count: number }>
  daily_activity: Array<{ date: string; count: number }>
  top_actors: Array<{ actor__id: string; actor__username: string; count: number }>
}

// ============================================
// Role API
// ============================================

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get('/permissions/roles/')
  return response.data
}

export const getRole = async (roleId: string): Promise<Role> => {
  const response = await api.get(`/permissions/roles/${roleId}/`)
  return response.data
}

export const getRoleUsers = async (roleId: string): Promise<UserRole[]> => {
  const response = await api.get(`/permissions/roles/${roleId}/users/`)
  return response.data
}

// ============================================
// User Role API
// ============================================

export const getUserRoles = async (params?: {
  user_id?: string
  role_id?: string
  scope?: string
  department_id?: string
  is_active?: boolean
  include_expired?: boolean
}): Promise<UserRole[]> => {
  const response = await api.get('/permissions/user-roles/', { params })
  return response.data
}

export const getUserRole = async (userRoleId: string): Promise<UserRole> => {
  const response = await api.get(`/permissions/user-roles/${userRoleId}/`)
  return response.data
}

export const createUserRole = async (data: UserRoleCreate): Promise<UserRole> => {
  const response = await api.post('/permissions/user-roles/', data)
  return response.data
}

export const updateUserRole = async (
  userRoleId: string,
  data: Partial<UserRoleCreate>
): Promise<UserRole> => {
  const response = await api.patch(`/permissions/user-roles/${userRoleId}/`, data)
  return response.data
}

export const deleteUserRole = async (userRoleId: string): Promise<void> => {
  await api.delete(`/permissions/user-roles/${userRoleId}/`)
}

export const deactivateUserRole = async (userRoleId: string): Promise<UserRole> => {
  const response = await api.post(`/permissions/user-roles/${userRoleId}/deactivate/`)
  return response.data
}

export const activateUserRole = async (userRoleId: string): Promise<UserRole> => {
  const response = await api.post(`/permissions/user-roles/${userRoleId}/activate/`)
  return response.data
}

// ============================================
// Folder Permission API
// ============================================

export const getFolderPermissions = async (params?: {
  folder_id?: string
  user_id?: string
  department_id?: string
  permission_level?: FolderPermissionLevel
}): Promise<FolderPermission[]> => {
  const response = await api.get('/permissions/folder-permissions/', { params })
  return response.data
}

export const getFolderPermission = async (permissionId: string): Promise<FolderPermission> => {
  const response = await api.get(`/permissions/folder-permissions/${permissionId}/`)
  return response.data
}

export const createFolderPermission = async (
  data: FolderPermissionCreate
): Promise<FolderPermission> => {
  const response = await api.post('/permissions/folder-permissions/', data)
  return response.data
}

export const updateFolderPermission = async (
  permissionId: string,
  data: Partial<FolderPermissionCreate>
): Promise<FolderPermission> => {
  const response = await api.patch(`/permissions/folder-permissions/${permissionId}/`, data)
  return response.data
}

export const deleteFolderPermission = async (permissionId: string): Promise<void> => {
  await api.delete(`/permissions/folder-permissions/${permissionId}/`)
}

export const bulkAssignFolderPermissions = async (
  folderId: string,
  assignments: BulkPermissionAssignment[]
): Promise<FolderPermission[]> => {
  const response = await api.post('/permissions/folder-permissions/bulk_assign/', {
    folder_id: folderId,
    assignments,
  })
  return response.data
}

// ============================================
// Document Permission API
// ============================================

export const getDocumentPermissions = async (params?: {
  document_id?: string
  user_id?: string
  department_id?: string
  permission_level?: DocumentPermissionLevel
  include_expired?: boolean
}): Promise<DocumentPermission[]> => {
  const response = await api.get('/permissions/document-permissions/', { params })
  return response.data
}

export const getDocumentPermission = async (permissionId: string): Promise<DocumentPermission> => {
  const response = await api.get(`/permissions/document-permissions/${permissionId}/`)
  return response.data
}

export const createDocumentPermission = async (
  data: DocumentPermissionCreate
): Promise<DocumentPermission> => {
  const response = await api.post('/permissions/document-permissions/', data)
  return response.data
}

export const updateDocumentPermission = async (
  permissionId: string,
  data: Partial<DocumentPermissionCreate>
): Promise<DocumentPermission> => {
  const response = await api.patch(`/permissions/document-permissions/${permissionId}/`, data)
  return response.data
}

export const deleteDocumentPermission = async (permissionId: string): Promise<void> => {
  await api.delete(`/permissions/document-permissions/${permissionId}/`)
}

export const bulkAssignDocumentPermissions = async (
  documentId: string,
  assignments: BulkPermissionAssignment[]
): Promise<DocumentPermission[]> => {
  const response = await api.post('/permissions/document-permissions/bulk_assign/', {
    document_id: documentId,
    assignments,
  })
  return response.data
}

// ============================================
// Permission Check API
// ============================================

export const checkFolderPermission = async (
  folderId: string,
  userId: string | number,
  permission: string
): Promise<PermissionCheckResult> => {
  // Convert userId to number, handle empty string or invalid values
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error('Invalid user ID for permission check')
  }

  const response = await api.post('/permissions/check/', {
    folder_id: folderId,
    user_id: numericUserId,
    permission,
  })
  return response.data
}

export const checkDocumentPermission = async (
  documentId: string,
  userId: string | number,
  permission: string
): Promise<PermissionCheckResult> => {
  // Convert userId to number, handle empty string or invalid values
  const numericUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId
  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error('Invalid user ID for permission check')
  }

  const response = await api.post('/permissions/documents/check/', {
    document_id: documentId,
    user_id: numericUserId,
    permission,
  })
  return response.data
}

// ============================================
// User Permission Summary API
// ============================================

export const getUserPermissionSummary = async (userId: string): Promise<UserPermissionSummary> => {
  const response = await api.get(`/permissions/users/${userId}/summary/`)
  return response.data
}

// ============================================
// Permission Cache API
// ============================================

export const clearPermissionCache = async (params?: {
  user_id?: string
  folder_id?: string
}): Promise<{ message: string }> => {
  const response = await api.post('/permissions/cache/clear/', params || {})
  return response.data
}

// ============================================
// Audit Log API
// ============================================

export const getPermissionAuditLogs = async (params?: {
  actor_id?: string
  target_user_id?: string
  target_department_id?: string
  action?: string
  resource_type?: string
  resource_id?: string
  from_date?: string
  to_date?: string
}): Promise<PermissionAuditLog[]> => {
  const response = await api.get('/permissions/audit-logs/', { params })
  return response.data
}

export const getPermissionAuditLog = async (logId: string): Promise<PermissionAuditLog> => {
  const response = await api.get(`/permissions/audit-logs/${logId}/`)
  return response.data
}

export const getPermissionAuditLogSummary = async (days?: number): Promise<AuditLogSummary> => {
  const response = await api.get('/permissions/audit-logs/summary/', {
    params: { days: days || 30 },
  })
  return response.data
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get permission level display name
 */
export const getPermissionLevelDisplay = (
  level: FolderPermissionLevel | DocumentPermissionLevel
): string => {
  const displays: Record<string, string> = {
    NO_ACCESS: 'No Access',
    VIEW_ONLY: 'View Only',
    VIEW_DOWNLOAD: 'View & Download',
    CONTRIBUTE: 'Contribute (Upload)',
    EDIT: 'Edit',
    FULL_CONTROL: 'Full Control',
  }
  return displays[level] || level
}

/**
 * Get permission level color for UI
 */
export const getPermissionLevelColor = (
  level: FolderPermissionLevel | DocumentPermissionLevel
): string => {
  const colors: Record<string, string> = {
    NO_ACCESS: 'red',
    VIEW_ONLY: 'gray',
    VIEW_DOWNLOAD: 'blue',
    CONTRIBUTE: 'green',
    EDIT: 'yellow',
    FULL_CONTROL: 'purple',
  }
  return colors[level] || 'gray'
}

/**
 * Check if user has a specific permission based on effective permissions
 */
export const hasEffectivePermission = (
  effectivePermissions: EffectivePermissions,
  permission: keyof EffectivePermissions
): boolean => {
  return effectivePermissions[permission] === true
}

/**
 * Get role display name
 */
export const getRoleDisplay = (role: 'VIEWER' | 'EDITOR' | 'MANAGER' | 'ADMIN'): string => {
  const displays: Record<string, string> = {
    VIEWER: 'Viewer',
    EDITOR: 'Editor',
    MANAGER: 'Manager',
    ADMIN: 'Administrator',
  }
  return displays[role] || role
}

/**
 * Get role color for UI
 */
export const getRoleColor = (role: 'VIEWER' | 'EDITOR' | 'MANAGER' | 'ADMIN'): string => {
  const colors: Record<string, string> = {
    VIEWER: 'gray',
    EDITOR: 'blue',
    MANAGER: 'green',
    ADMIN: 'purple',
  }
  return colors[role] || 'gray'
}

export default {
  // Roles
  getRoles,
  getRole,
  getRoleUsers,
  // User Roles
  getUserRoles,
  getUserRole,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  deactivateUserRole,
  activateUserRole,
  // Folder Permissions
  getFolderPermissions,
  getFolderPermission,
  createFolderPermission,
  updateFolderPermission,
  deleteFolderPermission,
  bulkAssignFolderPermissions,
  // Document Permissions
  getDocumentPermissions,
  getDocumentPermission,
  createDocumentPermission,
  updateDocumentPermission,
  deleteDocumentPermission,
  bulkAssignDocumentPermissions,
  // Permission Checks
  checkFolderPermission,
  checkDocumentPermission,
  // User Summary
  getUserPermissionSummary,
  // Cache
  clearPermissionCache,
  // Audit Logs
  getPermissionAuditLogs,
  getPermissionAuditLog,
  getPermissionAuditLogSummary,
  // Utilities
  getPermissionLevelDisplay,
  getPermissionLevelColor,
  hasEffectivePermission,
  getRoleDisplay,
  getRoleColor,
}
