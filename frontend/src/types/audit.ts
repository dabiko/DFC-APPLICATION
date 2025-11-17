/**
 * Audit Log Type Definitions
 * Complete type system for audit trails and compliance reporting
 */

// ============================================================================
// Action Types
// ============================================================================

export type AuditActionType =
  // Document actions
  | 'document_created'
  | 'document_viewed'
  | 'document_downloaded'
  | 'document_updated'
  | 'document_deleted'
  | 'document_restored'
  | 'document_shared'
  | 'document_unshared'
  | 'document_moved'
  | 'document_copied'
  | 'document_version_created'
  | 'document_version_restored'
  // Folder actions
  | 'folder_created'
  | 'folder_viewed'
  | 'folder_updated'
  | 'folder_deleted'
  | 'folder_moved'
  // Permission actions
  | 'permission_granted'
  | 'permission_revoked'
  | 'permission_modified'
  | 'role_assigned'
  | 'role_revoked'
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  // User actions
  | 'user_login'
  | 'user_logout'
  | 'user_login_failed'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_activated'
  | 'user_password_changed'
  | 'user_mfa_enabled'
  | 'user_mfa_disabled'
  // Compliance actions
  | 'legal_hold_applied'
  | 'legal_hold_released'
  | 'retention_policy_applied'
  | 'retention_policy_updated'
  | 'document_archived'
  | 'document_purged'
  // System actions
  | 'system_backup_started'
  | 'system_backup_completed'
  | 'system_backup_failed'
  | 'system_config_changed'

export type ResourceType =
  | 'document'
  | 'folder'
  | 'user'
  | 'role'
  | 'permission'
  | 'retention_policy'
  | 'legal_hold'
  | 'system'

export type AuditOutcome = 'success' | 'failure' | 'partial'

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical'

// ============================================================================
// Core Audit Log Types
// ============================================================================

export interface AuditLogEntry {
  id: string
  timestamp: string // ISO 8601 UTC timestamp
  userId: string
  userName: string
  userEmail: string
  userRole: string
  actionType: AuditActionType
  resourceType: ResourceType
  resourceId: string
  resourceName: string
  outcome: AuditOutcome
  severity: AuditSeverity
  ipAddress: string
  userAgent: string
  sessionId?: string
  location?: string // Geographic location if available
  details?: string // Human-readable description
  errorMessage?: string // If outcome is failure
  metadata?: Record<string, unknown> // Additional contextual data
  changes?: AuditChange[] // Before/after values for modifications
  relatedEntries?: string[] // IDs of related audit entries
}

export interface AuditChange {
  field: string
  fieldLabel: string
  oldValue: unknown
  newValue: unknown
  changeType: 'added' | 'modified' | 'removed'
}

// ============================================================================
// Filter and Query Types
// ============================================================================

export interface AuditLogFilters {
  // Time range
  dateFrom?: string
  dateTo?: string
  // User filters
  userId?: string
  userRole?: string
  userEmail?: string
  // Action filters
  actionTypes?: AuditActionType[]
  resourceTypes?: ResourceType[]
  outcomes?: AuditOutcome[]
  severities?: AuditSeverity[]
  // Resource filters
  resourceId?: string
  resourceName?: string
  // Network filters
  ipAddress?: string
  location?: string
  // Text search
  searchQuery?: string
}

export interface AuditLogQueryParams extends AuditLogFilters {
  // Pagination
  page?: number
  pageSize?: number
  // Sorting
  sortBy?: keyof AuditLogEntry
  sortOrder?: 'asc' | 'desc'
}

export interface AuditLogResponse {
  entries: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

// ============================================================================
// Activity Timeline Types
// ============================================================================

export interface TimelineEvent {
  id: string
  timestamp: string
  type: 'action' | 'milestone' | 'alert'
  title: string
  description: string
  icon?: string
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'gray'
  userId: string
  userName: string
  relatedEntries: AuditLogEntry[]
  metadata?: Record<string, unknown>
}

export interface TimelineGroup {
  date: string // YYYY-MM-DD
  events: TimelineEvent[]
}

// ============================================================================
// Compliance Report Types
// ============================================================================

export type ComplianceReportType =
  | 'access_report' // Who accessed what and when
  | 'change_history' // Document/folder modification history
  | 'user_activity' // User activity summary
  | 'permission_changes' // Permission grant/revoke history
  | 'retention_compliance' // Retention policy compliance
  | 'legal_hold_report' // Legal hold status and history
  | 'failed_access_attempts' // Failed login/access attempts
  | 'privileged_actions' // Admin/manager actions

export interface ComplianceReportParams {
  reportType: ComplianceReportType
  dateFrom: string
  dateTo: string
  // Optional filters based on report type
  userId?: string
  resourceId?: string
  departmentId?: string
  includeMetadata?: boolean
  format?: 'json' | 'csv' | 'pdf'
}

export interface ComplianceReport {
  id: string
  reportType: ComplianceReportType
  generatedAt: string
  generatedBy: string
  dateFrom: string
  dateTo: string
  summary: ComplianceReportSummary
  entries: AuditLogEntry[]
  metadata?: Record<string, unknown>
}

export interface ComplianceReportSummary {
  totalEntries: number
  byActionType: Record<AuditActionType, number>
  byResourceType: Record<ResourceType, number>
  byOutcome: Record<AuditOutcome, number>
  bySeverity: Record<AuditSeverity, number>
  uniqueUsers: number
  uniqueResources: number
  timeRange: {
    from: string
    to: string
  }
}

// ============================================================================
// Statistics and Analytics Types
// ============================================================================

export interface AuditStatistics {
  totalEvents: number
  successRate: number
  failureRate: number
  topUsers: Array<{ userId: string; userName: string; count: number }>
  topActions: Array<{ action: AuditActionType; count: number }>
  topResources: Array<{ resourceId: string; resourceName: string; count: number }>
  activityByHour: Array<{ hour: number; count: number }>
  activityByDay: Array<{ date: string; count: number }>
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface AuditLogViewerProps {
  entries: AuditLogEntry[]
  total: number
  currentPage: number
  pageSize: number
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
  onPageChange: (page: number) => void
  onEntryClick?: (entry: AuditLogEntry) => void
  onExport?: (format: 'csv' | 'json' | 'pdf') => void
  isLoading?: boolean
  className?: string
}

export interface ActivityTimelineProps {
  events: TimelineEvent[]
  groupBy?: 'day' | 'week' | 'month'
  onEventClick?: (event: TimelineEvent) => void
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
  className?: string
}

export interface AuditLogFiltersProps {
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
  onClearFilters: () => void
  availableUsers?: Array<{ id: string; name: string; email: string }>
  availableResources?: Array<{ id: string; name: string; type: ResourceType }>
  className?: string
}

export interface ComplianceReportGeneratorProps {
  onGenerateReport: (params: ComplianceReportParams) => void
  onDownloadReport: (reportId: string, format: 'csv' | 'pdf') => void
  recentReports?: ComplianceReport[]
  isGenerating?: boolean
  className?: string
}

export interface AuditLogEntryProps {
  entry: AuditLogEntry
  showDetails?: boolean
  onToggleDetails?: () => void
  onClick?: () => void
  className?: string
}

// ============================================================================
// Action Type Categories and Labels
// ============================================================================

export const ACTION_TYPE_CATEGORIES = {
  document: 'Document Actions',
  folder: 'Folder Actions',
  permission: 'Permission Actions',
  user: 'User Actions',
  compliance: 'Compliance Actions',
  system: 'System Actions',
} as const

export const ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  // Document
  document_created: 'Document Created',
  document_viewed: 'Document Viewed',
  document_downloaded: 'Document Downloaded',
  document_updated: 'Document Updated',
  document_deleted: 'Document Deleted',
  document_restored: 'Document Restored',
  document_shared: 'Document Shared',
  document_unshared: 'Document Unshared',
  document_moved: 'Document Moved',
  document_copied: 'Document Copied',
  document_version_created: 'Version Created',
  document_version_restored: 'Version Restored',
  // Folder
  folder_created: 'Folder Created',
  folder_viewed: 'Folder Viewed',
  folder_updated: 'Folder Updated',
  folder_deleted: 'Folder Deleted',
  folder_moved: 'Folder Moved',
  // Permission
  permission_granted: 'Permission Granted',
  permission_revoked: 'Permission Revoked',
  permission_modified: 'Permission Modified',
  role_assigned: 'Role Assigned',
  role_revoked: 'Role Revoked',
  role_created: 'Role Created',
  role_updated: 'Role Updated',
  role_deleted: 'Role Deleted',
  // User
  user_login: 'User Login',
  user_logout: 'User Logout',
  user_login_failed: 'Login Failed',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
  user_activated: 'User Activated',
  user_password_changed: 'Password Changed',
  user_mfa_enabled: 'MFA Enabled',
  user_mfa_disabled: 'MFA Disabled',
  // Compliance
  legal_hold_applied: 'Legal Hold Applied',
  legal_hold_released: 'Legal Hold Released',
  retention_policy_applied: 'Retention Policy Applied',
  retention_policy_updated: 'Retention Policy Updated',
  document_archived: 'Document Archived',
  document_purged: 'Document Purged',
  // System
  system_backup_started: 'Backup Started',
  system_backup_completed: 'Backup Completed',
  system_backup_failed: 'Backup Failed',
  system_config_changed: 'Configuration Changed',
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  document: 'Document',
  folder: 'Folder',
  user: 'User',
  role: 'Role',
  permission: 'Permission',
  retention_policy: 'Retention Policy',
  legal_hold: 'Legal Hold',
  system: 'System',
}

export const OUTCOME_LABELS: Record<AuditOutcome, string> = {
  success: 'Success',
  failure: 'Failure',
  partial: 'Partial Success',
}

export const SEVERITY_LABELS: Record<AuditSeverity, string> = {
  info: 'Info',
  warning: 'Warning',
  error: 'Error',
  critical: 'Critical',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get action type category
 */
export function getActionCategory(action: AuditActionType): keyof typeof ACTION_TYPE_CATEGORIES {
  if (action.startsWith('document_')) return 'document'
  if (action.startsWith('folder_')) return 'folder'
  if (action.startsWith('permission_') || action.startsWith('role_')) return 'permission'
  if (action.startsWith('user_')) return 'user'
  if (
    action.startsWith('legal_hold_') ||
    action.startsWith('retention_') ||
    action.includes('archived') ||
    action.includes('purged')
  )
    return 'compliance'
  return 'system'
}

/**
 * Get severity color for UI
 */
export function getSeverityColor(severity: AuditSeverity): string {
  switch (severity) {
    case 'info':
      return 'blue'
    case 'warning':
      return 'yellow'
    case 'error':
      return 'orange'
    case 'critical':
      return 'red'
  }
}

/**
 * Get outcome color for UI
 */
export function getOutcomeColor(outcome: AuditOutcome): string {
  switch (outcome) {
    case 'success':
      return 'green'
    case 'failure':
      return 'red'
    case 'partial':
      return 'yellow'
  }
}

/**
 * Format audit log entry for display
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  const action = ACTION_TYPE_LABELS[entry.actionType]
  const resource = entry.resourceName
  return `${entry.userName} ${action.toLowerCase()} ${resource}`
}

/**
 * Check if action is sensitive (requires special attention)
 */
export function isSensitiveAction(action: AuditActionType): boolean {
  const sensitiveActions: AuditActionType[] = [
    'document_deleted',
    'document_purged',
    'permission_granted',
    'permission_revoked',
    'role_assigned',
    'role_revoked',
    'user_deactivated',
    'legal_hold_applied',
    'legal_hold_released',
    'retention_policy_applied',
    'system_config_changed',
  ]
  return sensitiveActions.includes(action)
}

/**
 * Get default filters
 */
export function getDefaultFilters(): AuditLogFilters {
  return {
    dateFrom: undefined,
    dateTo: undefined,
    actionTypes: undefined,
    resourceTypes: undefined,
    outcomes: undefined,
    severities: undefined,
  }
}
