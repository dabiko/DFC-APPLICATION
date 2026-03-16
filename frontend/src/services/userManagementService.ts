/**
 * User Management Service
 *
 * API service for managing users, roles, departments, invitations, and security settings.
 * Supports enterprise user administration features.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES - Users
// ============================================================================

export type UserStatus = 'active' | 'inactive' | 'locked' | 'pending'

export type OrganizationRole = 'owner' | 'admin' | 'manager' | 'member' | 'viewer' | (string & {})

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  parent: number | null
  parent_id?: string
  parent_name?: string
  icon?: string
  color?: string
  display_order?: number
  is_active?: boolean
  default_confidentiality?: string
  storage_quota_gb: number
  storage_used_bytes?: number
  storage_used_gb?: number
  storage_percentage?: number
  member_count?: number
  root_path?: string
  head?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  children?: Department[]
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  domain: string
  subscription_plan: string
  subscription_status: string
  max_users: number
  current_user_count?: number
}

export interface UserBasic {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  full_name?: string
}

export interface User extends UserBasic {
  employee_id: string
  phone_number: string
  job_title: string
  avatar: string | null
  department: number | null
  department_name?: string
  organization: string | null
  organization_name?: string
  role?: OrganizationRole
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
  mfa_enabled: boolean
  failed_login_attempts: number
  account_locked_until: string | null
  last_login: string | null
  last_login_ip: string | null
  date_joined: string
  created_at: string
  updated_at: string
  // Computed fields
  status?: UserStatus
  is_locked?: boolean
}

export interface UserListResponse {
  count: number
  next: string | null
  previous: string | null
  results: User[]
}

export interface UserFilters {
  search?: string
  status?: UserStatus
  role?: OrganizationRole
  department?: number
  mfa_enabled?: boolean
  is_active?: boolean
  is_staff?: boolean
  last_login_after?: string
  last_login_before?: string
  date_joined_after?: string
  date_joined_before?: string
  failed_attempts_gte?: number
  ordering?: string
  page?: number
  page_size?: number
}

export interface CreateUserRequest {
  email: string
  first_name: string
  last_name: string
  password?: string
  department?: number
  job_title?: string
  phone_number?: string
  role?: OrganizationRole
  is_active?: boolean
  is_staff?: boolean
  send_invitation?: boolean
}

export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  email?: string
  department?: number
  job_title?: string
  phone_number?: string
  role?: OrganizationRole
  is_active?: boolean
  is_staff?: boolean
  mfa_enabled?: boolean
}

// ============================================================================
// TYPES - Roles & Permissions
// ============================================================================

export interface Permission {
  id: number
  codename: string
  name: string
  content_type: string
  category?: string
}

export interface Role {
  id: string
  name: string
  display_name: string
  description: string
  user_count: number
  permissions: string[]
  permissions_list?: string[]
  is_system: boolean
  is_custom?: boolean
  created_at?: string
  updated_at?: string
}

export interface CustomRole {
  id: string
  name: string
  display_name: string
  description: string
  permissions: string[]
  user_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateCustomRoleRequest {
  name: string
  display_name: string
  description: string
  permissions: string[]
}

// ============================================================================
// TYPES - Invitations
// ============================================================================

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export interface Invitation {
  id: string
  email: string
  role: OrganizationRole
  department?: number
  department_name?: string
  status: InvitationStatus
  invited_by: string
  invited_by_name?: string
  token: string
  message?: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  declined_at: string | null
  revoked_at: string | null
}

export interface InvitationListResponse {
  count: number
  next: string | null
  previous: string | null
  results: Invitation[]
}

export interface InvitationFilters {
  status?: InvitationStatus
  role?: OrganizationRole
  department?: number
  invited_by?: string
  date_after?: string
  date_before?: string
  search?: string
  page?: number
  page_size?: number
}

export interface CreateInvitationRequest {
  email: string
  role: OrganizationRole
  department?: number
  message?: string
}

export interface BulkInviteRequest {
  invitations: CreateInvitationRequest[]
}

// ============================================================================
// TYPES - Security
// ============================================================================

export interface SecurityStats {
  total_users: number
  active_users: number
  inactive_users: number
  locked_accounts: number
  mfa_enabled_count: number
  mfa_enabled_percentage: number
  mfa_adoption_rate: number // alias for mfa_enabled_percentage
  pending_invitations: number
  failed_logins_today: number
  failed_logins_24h: number // alias for failed_logins_today
  users_with_failed_attempts: number
  active_sessions: number
}

export interface LockedAccount {
  id: string
  email: string
  full_name: string
  failed_login_attempts: number
  last_failed_login: string
  account_locked_until: string
  locked_by_failed_attempts: boolean
}

export interface LoginActivity {
  id: string
  user_id: string
  user_email: string
  user_name: string
  action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN'
  ip_address: string
  user_agent: string
  timestamp: string
  outcome: 'SUCCESS' | 'FAILURE'
}

export interface ActiveSession {
  id: string
  user_id: string
  user_email: string
  user_name: string
  ip_address: string
  user_agent: string
  last_activity: string
  created_at: string
}

// ============================================================================
// TYPES - Dashboard Stats
// ============================================================================

export interface UserManagementStats {
  total_users: number
  active_users: number
  new_users_this_month: number
  pending_invitations: number
  locked_accounts: number
  mfa_adoption_rate: number
  total_departments: number
  users_by_role: Record<OrganizationRole, number>
  users_by_department: { department: string; count: number }[]
  recent_activity: {
    new_users: number
    deactivated: number
    role_changes: number
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ROLE_OPTIONS: { value: OrganizationRole; label: string; description: string }[] = [
  {
    value: 'owner',
    label: 'Owner',
    description: 'Full control including billing and organization deletion',
  },
  {
    value: 'admin',
    label: 'Administrator',
    description: 'Manage users, settings, and view audit logs',
  },
  {
    value: 'manager',
    label: 'Manager',
    description: 'Invite users, manage content, and view reports',
  },
  {
    value: 'member',
    label: 'Member',
    description: 'Standard access to create and edit own documents',
  },
  {
    value: 'viewer',
    label: 'Viewer',
    description: 'Read-only access to shared documents',
  },
]

export const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'locked', label: 'Locked' },
  { value: 'pending', label: 'Pending' },
]

export const INVITATION_STATUS_OPTIONS: { value: InvitationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'expired', label: 'Expired' },
  { value: 'revoked', label: 'Revoked' },
]

// Default permissions for each role
export const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  owner: [
    'manage_organization',
    'manage_billing',
    'delete_organization',
    'manage_users',
    'manage_roles',
    'view_audit_logs',
    'manage_departments',
    'manage_settings',
    'invite_users',
    'manage_documents',
    'view_documents',
    'share_documents',
    'delete_documents',
    'manage_folders',
    'view_folders',
    // Procedures
    'create_procedure',
    'edit_procedure',
    'delete_procedure',
    'publish_procedure',
    'review_procedure',
    'view_all_procedures',
    // Workflows
    'create_workflow_template',
    'delete_workflow_template',
    'start_workflow',
    'cancel_workflow',
    'manage_auto_triggers',
    'view_workflow_analytics',
    // Training
    'manage_assignments',
    'view_training_dashboard',
    'view_trainee_details',
    'view_training_evidence',
    'audit_training',
  ],
  admin: [
    'manage_users',
    'manage_roles',
    'view_audit_logs',
    'manage_departments',
    'manage_settings',
    'invite_users',
    'manage_documents',
    'view_documents',
    'share_documents',
    'delete_documents',
    'manage_folders',
    'view_folders',
    // Procedures
    'create_procedure',
    'edit_procedure',
    'delete_procedure',
    'publish_procedure',
    'review_procedure',
    'view_all_procedures',
    // Workflows
    'create_workflow_template',
    'delete_workflow_template',
    'start_workflow',
    'cancel_workflow',
    'manage_auto_triggers',
    'view_workflow_analytics',
    // Training
    'manage_assignments',
    'view_training_dashboard',
    'view_trainee_details',
    'view_training_evidence',
    'audit_training',
  ],
  manager: [
    'invite_users',
    'view_users',
    'manage_documents',
    'view_documents',
    'share_documents',
    'manage_folders',
    'view_folders',
    'view_reports',
    // Procedures
    'create_procedure',
    'edit_procedure',
    'delete_procedure',
    'publish_procedure',
    'review_procedure',
    'view_all_procedures',
    // Workflows
    'create_workflow_template',
    'start_workflow',
    'cancel_workflow',
    'view_workflow_analytics',
    // Training
    'manage_assignments',
    'view_training_dashboard',
    'view_trainee_details',
    'view_training_evidence',
  ],
  member: [
    'view_users',
    'create_documents',
    'edit_own_documents',
    'view_documents',
    'share_documents',
    'create_folders',
    'view_folders',
    // Procedures
    'create_procedure',
    'edit_procedure',
    'review_procedure',
    // Workflows
    'start_workflow',
  ],
  viewer: ['view_users', 'view_documents', 'view_folders'],
}

// ============================================================================
// API FUNCTIONS - Users
// ============================================================================

/**
 * Get paginated list of users with filters
 */
export async function getUsers(filters?: UserFilters): Promise<UserListResponse> {
  const params: Record<string, string | number | boolean | undefined> = {}

  if (filters) {
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.role) params.role = filters.role
    if (filters.department) params.department = filters.department
    if (filters.mfa_enabled !== undefined) params.mfa_enabled = filters.mfa_enabled
    if (filters.is_active !== undefined) params.is_active = filters.is_active
    if (filters.is_staff !== undefined) params.is_staff = filters.is_staff
    if (filters.last_login_after) params.last_login_after = filters.last_login_after
    if (filters.last_login_before) params.last_login_before = filters.last_login_before
    if (filters.date_joined_after) params.date_joined_after = filters.date_joined_after
    if (filters.date_joined_before) params.date_joined_before = filters.date_joined_before
    if (filters.failed_attempts_gte) params.failed_attempts_gte = filters.failed_attempts_gte
    if (filters.ordering) params.ordering = filters.ordering
    if (filters.page) params.page = filters.page
    if (filters.page_size) params.page_size = filters.page_size
  }

  const response = await apiClient.get<UserListResponse>('/auth/users/', { params })
  return response.data
}

/**
 * Get a single user by ID
 */
export async function getUser(id: string): Promise<User> {
  const response = await apiClient.get<User>(`/auth/users/${id}/`)
  return response.data
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me/')
  return response.data
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const response = await apiClient.post<User>('/auth/users/', data)
  return response.data
}

/**
 * Update a user
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const response = await apiClient.patch<User>(`/auth/users/${id}/`, data)
  return response.data
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/auth/users/${id}/`)
}

/**
 * Activate a user
 */
export async function activateUser(id: string): Promise<User> {
  const response = await apiClient.post<User>(`/auth/users/${id}/activate/`)
  return response.data
}

/**
 * Deactivate a user
 */
export async function deactivateUser(id: string): Promise<User> {
  const response = await apiClient.post<User>(`/auth/users/${id}/deactivate/`)
  return response.data
}

/**
 * Unlock a user account
 */
export async function unlockUser(id: string): Promise<User> {
  const response = await apiClient.post<User>(`/auth/users/${id}/unlock/`)
  return response.data
}

/**
 * Reset user password (send reset email)
 */
export async function resetUserPassword(id: string): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(`/auth/users/${id}/reset-password/`)
  return response.data
}

/**
 * Change user role
 */
export async function changeUserRole(id: string, role: OrganizationRole): Promise<User> {
  const response = await apiClient.post<User>(`/auth/users/${id}/change-role/`, { role })
  return response.data
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(
  userIds: string[],
  data: Partial<UpdateUserRequest>
): Promise<{ updated: number }> {
  const response = await apiClient.post<{ updated: number }>('/auth/users/bulk-update/', {
    user_ids: userIds,
    ...data,
  })
  return response.data
}

/**
 * Export users to CSV
 */
export async function exportUsers(filters?: UserFilters): Promise<Blob> {
  const params: Record<string, string | number | boolean | undefined> = {}

  if (filters) {
    if (filters.search) params.search = filters.search
    if (filters.status) params.status = filters.status
    if (filters.role) params.role = filters.role
    if (filters.department) params.department = filters.department
  }

  const response = await apiClient.get('/auth/users/export/', {
    params,
    responseType: 'blob',
  })
  return response.data
}

// ============================================================================
// API FUNCTIONS - Departments
// ============================================================================

/**
 * Get all departments
 */
export async function getDepartments(): Promise<Department[]> {
  const response = await apiClient.get<{ results: Department[] } | Department[]>(
    '/auth/departments/'
  )
  // Handle both paginated and non-paginated responses
  if (Array.isArray(response.data)) {
    return response.data
  }
  return response.data.results
}

/**
 * Get a single department
 */
export async function getDepartment(id: number): Promise<Department> {
  const response = await apiClient.get<Department>(`/auth/departments/${id}/`)
  return response.data
}

/**
 * Create a department
 */
export async function createDepartment(data: {
  name: string
  code: string
  parent?: number
  storage_quota_gb?: number
}): Promise<Department> {
  const response = await apiClient.post<Department>('/auth/departments/', data)
  return response.data
}

/**
 * Update a department
 */
export async function updateDepartment(
  id: number,
  data: Partial<{
    name: string
    code: string
    parent: number | null
    storage_quota_gb: number
  }>
): Promise<Department> {
  const response = await apiClient.patch<Department>(`/auth/departments/${id}/`, data)
  return response.data
}

/**
 * Delete a department
 */
export async function deleteDepartment(id: string | number): Promise<void> {
  await apiClient.delete(`/auth/departments/${id}/`)
}

// ============================================================================
// API FUNCTIONS - Roles
// ============================================================================

/**
 * Get all roles with user counts
 */
export async function getRoles(): Promise<Role[]> {
  try {
    const response = await apiClient.get<Role[] | { results: Role[] }>('/permissions/roles/')
    const data = Array.isArray(response.data) ? response.data : response.data.results
    return data.map((role) => ({
      ...role,
      permissions: role.permissions_list || ROLE_PERMISSIONS[role.name as OrganizationRole] || [],
    }))
  } catch {
    // Fallback: construct from static definitions
    return ROLE_OPTIONS.map((role) => ({
      id: role.value,
      name: role.value,
      display_name: role.label,
      description: role.description,
      user_count: 0,
      permissions: ROLE_PERMISSIONS[role.value],
      is_system: true,
    }))
  }
}

/**
 * Get custom roles (non-system roles)
 */
export async function getCustomRoles(): Promise<CustomRole[]> {
  try {
    const response = await apiClient.get<CustomRole[] | { results: CustomRole[] }>(
      '/permissions/roles/',
      { params: { is_system: 'false' } }
    )
    const data = Array.isArray(response.data) ? response.data : response.data.results
    return data
  } catch {
    return []
  }
}

/**
 * Create a custom role
 */
export async function createCustomRole(data: CreateCustomRoleRequest): Promise<CustomRole> {
  const response = await apiClient.post<CustomRole>('/permissions/roles/', data)
  return response.data
}

/**
 * Update a custom role
 */
export async function updateCustomRole(
  id: string,
  data: Partial<CreateCustomRoleRequest>
): Promise<CustomRole> {
  const response = await apiClient.patch<CustomRole>(`/permissions/roles/${id}/`, data)
  return response.data
}

/**
 * Delete a custom role
 */
export async function deleteCustomRole(id: string): Promise<void> {
  await apiClient.delete(`/permissions/roles/${id}/`)
}

/**
 * Get all available permissions
 */
export async function getPermissions(): Promise<Permission[]> {
  try {
    const response = await apiClient.get<Permission[]>('/auth/permissions/')
    return response.data
  } catch {
    // Return default permissions if endpoint doesn't exist
    return [
      {
        id: 1,
        codename: 'manage_organization',
        name: 'Manage Organization',
        content_type: 'organization',
        category: 'Organization',
      },
      {
        id: 2,
        codename: 'manage_billing',
        name: 'Manage Billing',
        content_type: 'organization',
        category: 'Organization',
      },
      {
        id: 3,
        codename: 'delete_organization',
        name: 'Delete Organization',
        content_type: 'organization',
        category: 'Organization',
      },
      {
        id: 4,
        codename: 'manage_users',
        name: 'Manage Users',
        content_type: 'user',
        category: 'Users',
      },
      {
        id: 5,
        codename: 'view_users',
        name: 'View Users',
        content_type: 'user',
        category: 'Users',
      },
      {
        id: 6,
        codename: 'invite_users',
        name: 'Invite Users',
        content_type: 'user',
        category: 'Users',
      },
      {
        id: 7,
        codename: 'manage_roles',
        name: 'Manage Roles',
        content_type: 'role',
        category: 'Roles',
      },
      {
        id: 8,
        codename: 'manage_departments',
        name: 'Manage Departments',
        content_type: 'department',
        category: 'Departments',
      },
      {
        id: 9,
        codename: 'view_audit_logs',
        name: 'View Audit Logs',
        content_type: 'audit',
        category: 'Audit',
      },
      {
        id: 10,
        codename: 'manage_settings',
        name: 'Manage Settings',
        content_type: 'settings',
        category: 'Settings',
      },
      {
        id: 11,
        codename: 'manage_documents',
        name: 'Manage Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 12,
        codename: 'create_documents',
        name: 'Create Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 13,
        codename: 'edit_own_documents',
        name: 'Edit Own Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 14,
        codename: 'view_documents',
        name: 'View Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 15,
        codename: 'share_documents',
        name: 'Share Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 16,
        codename: 'delete_documents',
        name: 'Delete Documents',
        content_type: 'document',
        category: 'Documents',
      },
      {
        id: 17,
        codename: 'manage_folders',
        name: 'Manage Folders',
        content_type: 'folder',
        category: 'Folders',
      },
      {
        id: 18,
        codename: 'create_folders',
        name: 'Create Folders',
        content_type: 'folder',
        category: 'Folders',
      },
      {
        id: 19,
        codename: 'view_folders',
        name: 'View Folders',
        content_type: 'folder',
        category: 'Folders',
      },
      {
        id: 20,
        codename: 'view_reports',
        name: 'View Reports',
        content_type: 'report',
        category: 'Reports',
      },
    ]
  }
}

// ============================================================================
// API FUNCTIONS - Invitations
// ============================================================================

/**
 * Get invitations with filters
 */
export async function getInvitations(filters?: InvitationFilters): Promise<InvitationListResponse> {
  const params: Record<string, string | number | undefined> = {}

  if (filters) {
    if (filters.status) params.status = filters.status
    if (filters.role) params.role = filters.role
    if (filters.department) params.department = filters.department
    if (filters.invited_by) params.invited_by = filters.invited_by
    if (filters.date_after) params.date_after = filters.date_after
    if (filters.date_before) params.date_before = filters.date_before
    if (filters.search) params.search = filters.search
    if (filters.page) params.page = filters.page
    if (filters.page_size) params.page_size = filters.page_size
  }

  try {
    const response = await apiClient.get<InvitationListResponse>('/organizations/invitations/', {
      params,
    })
    return response.data
  } catch {
    // Return empty response if endpoint doesn't exist
    return { count: 0, next: null, previous: null, results: [] }
  }
}

/**
 * Create an invitation
 */
export async function createInvitation(data: CreateInvitationRequest): Promise<Invitation> {
  const response = await apiClient.post<{
    success: boolean
    message: string
    invitation: Invitation
  }>('/organizations/invitations/create/', data)
  return response.data.invitation
}

/**
 * Bulk create invitations
 */
export async function bulkCreateInvitations(
  data: BulkInviteRequest
): Promise<{ created: number; failed: string[] }> {
  const response = await apiClient.post<{ created: number; failed: string[] }>(
    '/organizations/invitations/bulk/',
    data
  )
  return response.data
}

/**
 * Resend an invitation
 */
export async function resendInvitation(id: string): Promise<Invitation> {
  const response = await apiClient.post<Invitation>(`/organizations/invitations/${id}/resend/`)
  return response.data
}

/**
 * Revoke an invitation
 */
export async function revokeInvitation(id: string): Promise<Invitation> {
  const response = await apiClient.post<Invitation>(`/organizations/invitations/${id}/revoke/`)
  return response.data
}

// ============================================================================
// API FUNCTIONS - Security
// ============================================================================

/**
 * Get security statistics
 */
export async function getSecurityStats(): Promise<SecurityStats> {
  try {
    const response = await apiClient.get<SecurityStats>('/auth/security/stats/')
    return response.data
  } catch {
    // Calculate from users if endpoint doesn't exist
    const users = await getUsers({ page_size: 1000 })
    const allUsers = users.results

    const locked = allUsers.filter(
      (u) => u.account_locked_until && new Date(u.account_locked_until) > new Date()
    )
    const mfaEnabled = allUsers.filter((u) => u.mfa_enabled)
    const active = allUsers.filter((u) => u.is_active)
    const withFailedAttempts = allUsers.filter((u) => u.failed_login_attempts > 0)

    return {
      total_users: allUsers.length,
      active_users: active.length,
      inactive_users: allUsers.length - active.length,
      locked_accounts: locked.length,
      mfa_enabled_count: mfaEnabled.length,
      mfa_enabled_percentage:
        allUsers.length > 0 ? Math.round((mfaEnabled.length / allUsers.length) * 100) : 0,
      pending_invitations: 0,
      failed_logins_today: 0,
      users_with_failed_attempts: withFailedAttempts.length,
    }
  }
}

/**
 * Get locked accounts
 */
export async function getLockedAccounts(): Promise<LockedAccount[]> {
  try {
    const response = await apiClient.get<LockedAccount[]>('/auth/security/locked-accounts/')
    return response.data
  } catch {
    // Filter from users if endpoint doesn't exist
    const users = await getUsers({ page_size: 1000 })
    return users.results
      .filter((u) => u.account_locked_until && new Date(u.account_locked_until) > new Date())
      .map((u) => ({
        id: u.id,
        email: u.email,
        full_name: `${u.first_name} ${u.last_name}`.trim(),
        failed_login_attempts: u.failed_login_attempts,
        last_failed_login: u.updated_at,
        account_locked_until: u.account_locked_until!,
        locked_by_failed_attempts: true,
      }))
  }
}

/**
 * Get recent login activity
 */
export async function getLoginActivity(limit: number = 50): Promise<LoginActivity[]> {
  try {
    const response = await apiClient.get<LoginActivity[]>('/auth/security/login-activity/', {
      params: { limit },
    })
    return response.data
  } catch {
    return []
  }
}

/**
 * Get active sessions
 */
export async function getActiveSessions(): Promise<ActiveSession[]> {
  try {
    const response = await apiClient.get<ActiveSession[]>('/auth/security/active-sessions/')
    return response.data
  } catch {
    return []
  }
}

/**
 * Terminate a session
 */
export async function terminateSession(sessionId: string): Promise<void> {
  await apiClient.delete(`/auth/security/sessions/${sessionId}/`)
}

/**
 * Enforce MFA for all users
 */
export async function enforceMFA(enforce: boolean): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/auth/security/enforce-mfa/', {
    enforce,
  })
  return response.data
}

// ============================================================================
// API FUNCTIONS - Dashboard Stats
// ============================================================================

/**
 * Get user management dashboard statistics
 * All data is fetched from the backend database
 */
export async function getUserManagementStats(): Promise<UserManagementStats> {
  const response = await apiClient.get<UserManagementStats>('/auth/stats/')
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get user status from user object
 */
export function getUserStatus(user: User): UserStatus {
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    return 'locked'
  }
  if (!user.is_active) {
    return 'inactive'
  }
  return 'active'
}

/**
 * Get status badge color classes
 */
export function getStatusColorClasses(status: UserStatus): { bg: string; text: string } {
  const colors: Record<UserStatus, { bg: string; text: string }> = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    inactive: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-400',
    },
    locked: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
    },
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
  }
  return colors[status]
}

/**
 * Get role badge color classes
 */
export function getRoleColorClasses(role: OrganizationRole): { bg: string; text: string } {
  const colors: Record<string, { bg: string; text: string }> = {
    owner: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
    },
    admin: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
    },
    administrator: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
    },
    manager: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-400',
    },
    editor: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-700 dark:text-teal-400',
    },
    member: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    viewer: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-400',
    },
  }
  // Fallback for custom roles (e.g. "god mode", "compliance_auditor")
  return (
    colors[role.toLowerCase()] || {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
    }
  )
}

/**
 * Get invitation status badge color classes
 */
export function getInvitationStatusColorClasses(status: InvitationStatus): {
  bg: string
  text: string
} {
  const colors: Record<InvitationStatus, { bg: string; text: string }> = {
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
    },
    accepted: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    },
    declined: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
    },
    expired: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-400',
    },
    revoked: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
    },
  }
  return colors[status]
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Never'

  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return date.toLocaleDateString()
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

/**
 * Get user initials
 */
export function getUserInitials(user: User | UserBasic): string {
  const first = user.first_name?.charAt(0) || ''
  const last = user.last_name?.charAt(0) || ''
  return (first + last).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

export default {
  // Users
  getUsers,
  getUser,
  getCurrentUser,
  createUser,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
  unlockUser,
  resetUserPassword,
  changeUserRole,
  bulkUpdateUsers,
  exportUsers,
  // Departments
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  // Roles
  getRoles,
  getCustomRoles,
  createCustomRole,
  updateCustomRole,
  deleteCustomRole,
  getPermissions,
  // Invitations
  getInvitations,
  createInvitation,
  bulkCreateInvitations,
  resendInvitation,
  revokeInvitation,
  // Security
  getSecurityStats,
  getLockedAccounts,
  getLoginActivity,
  getActiveSessions,
  terminateSession,
  enforceMFA,
  // Stats
  getUserManagementStats,
  // Utils
  getUserStatus,
  getStatusColorClasses,
  getRoleColorClasses,
  getInvitationStatusColorClasses,
  formatRelativeTime,
  getUserInitials,
  downloadBlob,
  // Constants
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  INVITATION_STATUS_OPTIONS,
  ROLE_PERMISSIONS,
}
