/**
 * Audit Log Service
 *
 * API service for fetching and managing audit logs.
 * Supports filtering, pagination, statistics, and compliance reports.
 */

import apiClient from './apiClient'

// ============================================================================
// TYPES
// ============================================================================

export type AuditAction =
  | 'CREATE'
  | 'VIEW'
  | 'EDIT'
  | 'DELETE'
  | 'DOWNLOAD'
  | 'SHARE'
  | 'MOVE'
  | 'COPY'
  | 'LOGIN'
  | 'LOGOUT'
  | 'FAILED_LOGIN'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'PASSWORD_RESET'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'PERMISSION_CHANGED'
  | 'RESTORE'
  | 'ARCHIVE'
  | 'UNARCHIVE'

export type AuditResourceType =
  | 'DOCUMENT'
  | 'FOLDER'
  | 'USER'
  | 'TAG'
  | 'PERMISSION'
  | 'SHARE'
  | 'RETENTION_POLICY'
  | 'LEGAL_HOLD'

export type AuditOutcome = 'SUCCESS' | 'FAILURE'

export interface UserBrief {
  id: string
  email: string
  full_name: string
}

export interface AuditLog {
  id: string
  user: string | null
  user_details: UserBrief | null
  action: AuditAction
  action_display: string
  resource_type: AuditResourceType
  resource_type_display: string
  resource_id: string | null
  resource_name: string
  timestamp: string
  ip_address: string
  user_agent: string
  outcome: AuditOutcome
  outcome_display: string
  error_message: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  changed_fields: string[] | null
  metadata: Record<string, unknown>
}

export interface AuditLogListItem {
  id: string
  user: string | null
  user_details: UserBrief | null
  action: AuditAction
  action_display: string
  resource_type: AuditResourceType
  resource_type_display: string
  resource_id: string | null
  resource_name: string
  timestamp: string
  ip_address: string
  outcome: AuditOutcome
  changed_fields: string[] | null
}

export interface AuditLogListResponse {
  count: number
  next: string | null
  previous: string | null
  results: AuditLogListItem[]
}

export interface AuditLogFilters {
  action?: AuditAction
  resource_type?: AuditResourceType
  resource_id?: string
  user_id?: string
  outcome?: AuditOutcome
  start_date?: string
  end_date?: string
  days?: number
  search?: string
  ordering?: string
  page?: number
  page_size?: number
}

export interface AuditLogStats {
  total_actions: number
  actions_by_type: Record<string, number>
  actions_by_user: Record<string, number>
  actions_by_resource_type: Record<string, number>
  recent_actions: AuditLogListItem[]
  success_rate: number
  date_range: {
    start: string | null
    end: string | null
  }
}

export type ComplianceReportType = 'access' | 'changes' | 'user_activity' | 'retention_compliance'

export interface ComplianceReportRequest {
  report_type: ComplianceReportType
  start_date: string
  end_date: string
  resource_type?: AuditResourceType
  user_id?: string
}

export interface ComplianceReport {
  report_type: ComplianceReportType
  start_date: string
  end_date: string
  total_entries: number
  entries: AuditLog[]
  summary: {
    total_entries: number
    unique_users: number
    unique_resources: number
    actions_breakdown: Record<string, number>
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACTION_OPTIONS: { value: AuditAction; label: string }[] = [
  { value: 'CREATE', label: 'Create' },
  { value: 'VIEW', label: 'View' },
  { value: 'EDIT', label: 'Edit' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'DOWNLOAD', label: 'Download' },
  { value: 'SHARE', label: 'Share' },
  { value: 'MOVE', label: 'Move' },
  { value: 'COPY', label: 'Copy' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'FAILED_LOGIN', label: 'Failed Login' },
  { value: 'ACCOUNT_LOCKED', label: 'Account Locked' },
  { value: 'ACCOUNT_UNLOCKED', label: 'Account Unlocked' },
  { value: 'PASSWORD_RESET', label: 'Password Reset' },
  { value: 'MFA_ENABLED', label: 'MFA Enabled' },
  { value: 'MFA_DISABLED', label: 'MFA Disabled' },
  { value: 'PERMISSION_CHANGED', label: 'Permission Changed' },
  { value: 'RESTORE', label: 'Restore' },
  { value: 'ARCHIVE', label: 'Archive' },
  { value: 'UNARCHIVE', label: 'Unarchive' },
]

export const RESOURCE_TYPE_OPTIONS: { value: AuditResourceType; label: string }[] = [
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'FOLDER', label: 'Folder' },
  { value: 'USER', label: 'User' },
  { value: 'TAG', label: 'Tag' },
  { value: 'PERMISSION', label: 'Permission' },
  { value: 'SHARE', label: 'Share' },
  { value: 'RETENTION_POLICY', label: 'Retention Policy' },
  { value: 'LEGAL_HOLD', label: 'Legal Hold' },
]

export const OUTCOME_OPTIONS: { value: AuditOutcome; label: string }[] = [
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILURE', label: 'Failure' },
]

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get paginated list of audit logs with optional filters
 */
export async function getAuditLogs(filters?: AuditLogFilters): Promise<AuditLogListResponse> {
  const params: Record<string, string | number | undefined> = {}

  if (filters) {
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (filters.resource_id) params.resource_id = filters.resource_id
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.outcome) params.outcome = filters.outcome
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    if (filters.days) params.days = filters.days
    if (filters.search) params.search = filters.search
    if (filters.ordering) params.ordering = filters.ordering
    if (filters.page) params.page = filters.page
    if (filters.page_size) params.page_size = filters.page_size
  }

  const response = await apiClient.get<AuditLogListResponse>('/audit/logs/', { params })
  return response.data
}

/**
 * Get a single audit log by ID
 */
export async function getAuditLog(id: string): Promise<AuditLog> {
  const response = await apiClient.get<AuditLog>(`/audit/logs/${id}/`)
  return response.data
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filters?: AuditLogFilters): Promise<AuditLogStats> {
  const params: Record<string, string | number | undefined> = {}

  if (filters) {
    if (filters.action) params.action = filters.action
    if (filters.resource_type) params.resource_type = filters.resource_type
    if (filters.user_id) params.user_id = filters.user_id
    if (filters.outcome) params.outcome = filters.outcome
    if (filters.start_date) params.start_date = filters.start_date
    if (filters.end_date) params.end_date = filters.end_date
    if (filters.days) params.days = filters.days
  }

  const response = await apiClient.get<AuditLogStats>('/audit/logs/stats/', { params })
  return response.data
}

/**
 * Get audit logs for a specific resource
 */
export async function getResourceAuditLogs(
  resourceType: AuditResourceType,
  resourceId: string,
  page?: number
): Promise<AuditLogListResponse> {
  const params: Record<string, number | undefined> = {}
  if (page) params.page = page

  const response = await apiClient.get<AuditLogListResponse>(
    `/audit/logs/resource/${resourceType}/${resourceId}/`,
    { params }
  )
  return response.data
}

/**
 * Get current user's activity logs
 */
export async function getMyActivity(page?: number): Promise<AuditLogListResponse> {
  const params: Record<string, number | undefined> = {}
  if (page) params.page = page

  const response = await apiClient.get<AuditLogListResponse>('/audit/logs/my_activity/', { params })
  return response.data
}

/**
 * Get failed actions
 */
export async function getFailedActions(page?: number): Promise<AuditLogListResponse> {
  const params: Record<string, number | undefined> = {}
  if (page) params.page = page

  const response = await apiClient.get<AuditLogListResponse>('/audit/logs/failed_actions/', {
    params,
  })
  return response.data
}

/**
 * Generate a compliance report
 */
export async function generateComplianceReport(
  request: ComplianceReportRequest
): Promise<ComplianceReport> {
  const response = await apiClient.post<ComplianceReport>('/audit/logs/compliance_report/', request)
  return response.data
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get icon name for action type
 */
export function getActionIcon(action: AuditAction): string {
  const icons: Record<AuditAction, string> = {
    CREATE: 'plus-circle',
    VIEW: 'eye',
    EDIT: 'edit',
    DELETE: 'trash-2',
    DOWNLOAD: 'download',
    SHARE: 'share-2',
    MOVE: 'move',
    COPY: 'copy',
    LOGIN: 'log-in',
    LOGOUT: 'log-out',
    FAILED_LOGIN: 'x-circle',
    ACCOUNT_LOCKED: 'lock',
    ACCOUNT_UNLOCKED: 'unlock',
    PASSWORD_RESET: 'key',
    MFA_ENABLED: 'shield',
    MFA_DISABLED: 'shield-off',
    PERMISSION_CHANGED: 'users',
    RESTORE: 'rotate-ccw',
    ARCHIVE: 'archive',
    UNARCHIVE: 'archive-restore',
  }
  return icons[action] || 'activity'
}

/**
 * Get color classes for action type
 */
export function getActionColorClasses(action: AuditAction | string): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<
    string,
    {
      bg: string
      text: string
      border: string
    }
  > = {
    CREATE: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-300 dark:border-green-600',
    },
    VIEW: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    EDIT: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-300 dark:border-yellow-600',
    },
    DELETE: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    DOWNLOAD: {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      text: 'text-indigo-700 dark:text-indigo-400',
      border: 'border-indigo-300 dark:border-indigo-600',
    },
    SHARE: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-300 dark:border-purple-600',
    },
    MOVE: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    COPY: {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      text: 'text-teal-700 dark:text-teal-400',
      border: 'border-teal-300 dark:border-teal-600',
    },
    LOGIN: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-600',
    },
    LOGOUT: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    FAILED_LOGIN: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    ACCOUNT_LOCKED: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    ACCOUNT_UNLOCKED: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-300 dark:border-green-600',
    },
    PASSWORD_RESET: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-600',
    },
    MFA_ENABLED: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-600',
    },
    MFA_DISABLED: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    // Additional MFA-related actions
    MFA_VERIFICATION_SUCCESS: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-600',
    },
    MFA_CONFIRM_FAILED: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    MFA_SETUP_INITIATED: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    MFA_SETUP_PASSWORD_FAILED: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    MFA_DISABLED_EMAIL_FAILED: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    ALL_TRUSTED_DEVICES_REVOKED: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    TRUSTED_DEVICE_ADDED: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-300 dark:border-emerald-600',
    },
    TRUSTED_DEVICE_REVOKED: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-700 dark:text-orange-400',
      border: 'border-orange-300 dark:border-orange-600',
    },
    BACKUP_CODES_GENERATED: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    BACKUP_CODES_USED: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-300 dark:border-amber-600',
    },
    MFA_BACKUP_CODES_REGENERATED: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-600',
    },
    MFA_BACKUP_CODES_REGENERATE_FAILED: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-600',
    },
    PERMISSION_CHANGED: {
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      text: 'text-violet-700 dark:text-violet-400',
      border: 'border-violet-300 dark:border-violet-600',
    },
    RESTORE: {
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      text: 'text-cyan-700 dark:text-cyan-400',
      border: 'border-cyan-300 dark:border-cyan-600',
    },
    ARCHIVE: {
      bg: 'bg-slate-100 dark:bg-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-600',
    },
    UNARCHIVE: {
      bg: 'bg-slate-100 dark:bg-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-600',
    },
  }

  // Normalize action to uppercase for lookup
  const normalizedAction = String(action).toUpperCase()

  return (
    colors[normalizedAction] || {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    }
  )
}

/**
 * Get icon name for resource type
 */
export function getResourceTypeIcon(resourceType: AuditResourceType): string {
  const icons: Record<AuditResourceType, string> = {
    DOCUMENT: 'file-text',
    FOLDER: 'folder',
    USER: 'user',
    TAG: 'tag',
    PERMISSION: 'shield',
    SHARE: 'share-2',
    RETENTION_POLICY: 'clock',
    LEGAL_HOLD: 'gavel',
  }
  return icons[resourceType] || 'file'
}

/**
 * Get outcome badge classes
 */
export function getOutcomeClasses(outcome: AuditOutcome | string): {
  bg: string
  text: string
} {
  // Normalize outcome to uppercase for comparison
  const normalizedOutcome = String(outcome).toUpperCase()

  if (normalizedOutcome === 'SUCCESS') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
    }
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
  }
}

/**
 * Check if outcome is success (case-insensitive)
 */
export function isSuccessOutcome(outcome: AuditOutcome | string): boolean {
  return String(outcome).toUpperCase() === 'SUCCESS'
}

/**
 * Format timestamp for display
 */
export function formatAuditTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

export default {
  getAuditLogs,
  getAuditLog,
  getAuditLogStats,
  getResourceAuditLogs,
  getMyActivity,
  getFailedActions,
  generateComplianceReport,
  getActionIcon,
  getActionColorClasses,
  getResourceTypeIcon,
  getOutcomeClasses,
  formatAuditTimestamp,
  formatRelativeTime,
  ACTION_OPTIONS,
  RESOURCE_TYPE_OPTIONS,
  OUTCOME_OPTIONS,
}
