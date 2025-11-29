/**
 * Retention Policy & Legal Hold Type Definitions
 * Week 20: Comprehensive type system for document lifecycle management
 */

// ============================================================================
// Core Enums and Types
// ============================================================================

export type RetentionPeriodUnit = 'days' | 'months' | 'years'

export type RetentionAction = 'archive' | 'delete' | 'review' | 'notify'

export type PolicyStatus = 'active' | 'inactive' | 'draft' | 'archived'

export type PolicyTrigger = 'creation' | 'modification' | 'closure' | 'custom'

export type DocumentLifecycleStage =
  | 'active'
  | 'inactive'
  | 'pending_archival'
  | 'archived'
  | 'pending_deletion'
  | 'on_hold'
  | 'expired'

export type HoldStatus = 'active' | 'released' | 'pending_review' | 'expired'

export type HoldReason =
  | 'litigation'
  | 'investigation'
  | 'audit'
  | 'regulatory'
  | 'compliance'
  | 'other'

export type ComplianceStatus = 'compliant' | 'non_compliant' | 'at_risk' | 'warning'

export type PolicyViolationType =
  | 'premature_deletion'
  | 'missed_archival'
  | 'unauthorized_access'
  | 'hold_violation'
  | 'retention_exceeded'

// ============================================================================
// Retention Policy Interfaces
// ============================================================================

export interface RetentionPeriod {
  value: number
  unit: RetentionPeriodUnit
  description?: string
}

export interface RetentionRule {
  id: string
  name: string
  description: string
  period: RetentionPeriod
  action: RetentionAction
  priority: number
  enabled: boolean
}

export interface RetentionPolicy {
  id: string
  name: string
  description: string
  status: PolicyStatus
  version: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy: string
  effectiveDate: string
  expiryDate?: string

  // Applicability
  documentTypes: string[]
  departments: string[]
  securityLevels: string[]
  tags?: string[]

  // Retention Rules
  retentionPeriod: RetentionPeriod
  trigger: PolicyTrigger
  customTriggerDate?: string
  gracePeriod?: RetentionPeriod

  // Actions
  primaryAction: RetentionAction
  secondaryActions: RetentionAction[]
  notifyBeforeDays: number
  requireApproval: boolean
  approvers?: string[]

  // Compliance
  complianceStandards: string[]
  legalBasis?: string
  regulatoryReference?: string

  // Statistics
  documentsAffected: number
  documentsCompliant: number
  documentsAtRisk: number
  lastEnforcedAt?: string
}

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  retentionPeriod: RetentionPeriod
  action: RetentionAction
  complianceStandards: string[]
  isPopular: boolean
}

// ============================================================================
// Legal Hold Interfaces
// ============================================================================

export interface LegalHold {
  id: string
  caseNumber: string
  caseName: string
  description: string
  status: HoldStatus
  reason: HoldReason

  // Dates
  createdAt: string
  createdBy: string
  effectiveDate: string
  expiryDate?: string
  releasedAt?: string
  releasedBy?: string

  // Scope
  departments: string[]
  documentTypes: string[]
  keywords: string[]
  dateRange?: {
    from: string
    to: string
  }

  // Documents
  documentsOnHold: number
  documentsReleased: number
  documentIds?: string[]

  // Stakeholders
  custodians: string[]
  legalCounsel: string[]
  reviewers: string[]

  // Compliance
  court?: string
  jurisdiction?: string
  relatedCases?: string[]
  notes?: string

  // Notifications
  notificationsSent: number
  acknowledgedBy: string[]
  pendingAcknowledgment: string[]
}

export interface HoldNotification {
  id: string
  holdId: string
  recipientId: string
  recipientEmail: string
  sentAt: string
  acknowledgedAt?: string
  method: 'email' | 'in_app' | 'both'
  status: 'sent' | 'delivered' | 'acknowledged' | 'failed'
}

export interface HoldAuditEvent {
  id: string
  holdId: string
  eventType:
    | 'created'
    | 'modified'
    | 'document_added'
    | 'document_removed'
    | 'released'
    | 'notification_sent'
  performedBy: string
  performedAt: string
  details: Record<string, unknown>
  ipAddress?: string
}

// ============================================================================
// Document Lifecycle Interfaces
// ============================================================================

export interface DocumentLifecycle {
  documentId: string
  documentName: string
  currentStage: DocumentLifecycleStage
  createdAt: string
  lastModifiedAt: string

  // Retention
  retentionPolicyId?: string
  retentionPolicyName?: string
  retentionStartDate: string
  retentionEndDate: string
  daysUntilExpiration: number

  // Legal Hold
  onLegalHold: boolean
  legalHolds?: LegalHold[]
  holdPriority?: 'high' | 'medium' | 'low'

  // Actions
  canDelete: boolean
  canArchive: boolean
  canModify: boolean
  deletePreventedReason?: string

  // Notifications
  expirationNotified: boolean
  notificationsSent: number
  lastNotificationAt?: string
}

export interface LifecycleEvent {
  id: string
  documentId: string
  eventType:
    | 'created'
    | 'modified'
    | 'archived'
    | 'deleted'
    | 'hold_applied'
    | 'hold_released'
    | 'policy_applied'
    | 'retention_expired'
  timestamp: string
  performedBy: string
  details?: Record<string, unknown>
}

export interface ExpirationWarning {
  documentId: string
  documentName: string
  retentionEndDate: string
  daysUntilExpiration: number
  action: RetentionAction
  policyName: string
  severity: 'info' | 'warning' | 'critical'
  notified: boolean
}

// ============================================================================
// Compliance Interfaces
// ============================================================================

export interface PolicyViolation {
  id: string
  documentId: string
  documentName: string
  policyId: string
  policyName: string
  violationType: PolicyViolationType
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: string
  details: string
  remediation?: string
  resolvedAt?: string
  resolvedBy?: string
}

export interface ComplianceReport {
  reportId: string
  generatedAt: string
  generatedBy: string
  period: {
    from: string
    to: string
  }

  // Summary
  totalDocuments: number
  compliantDocuments: number
  atRiskDocuments: number
  violatingDocuments: number
  complianceRate: number

  // Policies
  activePolicies: number
  policiesEnforced: number
  policyViolations: number

  // Legal Holds
  activeHolds: number
  documentsOnHold: number
  holdsReleased: number

  // Actions
  documentsArchived: number
  documentsDeleted: number
  notificationsSent: number

  // Violations
  violations: PolicyViolation[]
  topViolationTypes: { type: PolicyViolationType; count: number }[]

  // Trends
  complianceTrend: { date: string; rate: number }[]
}

export interface ComplianceDashboard {
  overview: {
    status: ComplianceStatus
    complianceRate: number
    documentsAtRisk: number
    activeViolations: number
    upcomingActions: number
  }

  policies: {
    total: number
    active: number
    documentsAffected: number
    averageRetentionPeriod: RetentionPeriod
  }

  legalHolds: {
    active: number
    documentsOnHold: number
    pendingReleases: number
    averageDuration: number
  }

  recentActivity: {
    policiesCreated: number
    holdsApplied: number
    documentsArchived: number
    documentsDeleted: number
    violationsDetected: number
  }

  upcomingExpirations: ExpirationWarning[]
  recentViolations: PolicyViolation[]
}

// ============================================================================
// Timeline Interfaces
// ============================================================================

export interface TimelineEvent {
  id: string
  date: string
  type:
    | 'creation'
    | 'modification'
    | 'policy_applied'
    | 'hold_applied'
    | 'hold_released'
    | 'archived'
    | 'deleted'
    | 'notification'
    | 'violation'
  title: string
  description: string
  performedBy?: string
  icon?: string
  color?: string
  metadata?: Record<string, unknown>
}

export interface RetentionTimeline {
  documentId: string
  documentName: string
  events: TimelineEvent[]
  currentStage: DocumentLifecycleStage
  milestones: {
    created: string
    retentionStart: string
    retentionEnd: string
    expectedArchival?: string
    expectedDeletion?: string
  }
}

// ============================================================================
// Action Interfaces
// ============================================================================

export interface BulkRetentionAction {
  action: RetentionAction
  documentIds: string[]
  policyId?: string
  reason?: string
  scheduledDate?: string
  requireApproval: boolean
}

export interface HoldReleaseRequest {
  holdId: string
  reason: string
  requestedBy: string
  requestedAt: string
  approvedBy?: string
  approvedAt?: string
  status: 'pending' | 'approved' | 'rejected'
  documentIds?: string[]
  releaseAll: boolean
}

export interface RetentionApproval {
  id: string
  action: RetentionAction
  documentIds: string[]
  requestedBy: string
  requestedAt: string
  approvers: string[]
  approvedBy?: string[]
  rejectedBy?: string[]
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  completedAt?: string
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

export interface RetentionPolicyListProps {
  policies: RetentionPolicy[]
  selectedPolicyId?: string
  onPolicySelect?: (policyId: string) => void
  onCreatePolicy?: () => void
  onEditPolicy?: (policyId: string) => void
  onDeletePolicy?: (policyId: string) => void
  onToggleStatus?: (policyId: string) => void
  loading?: boolean
  view?: 'grid' | 'list' | 'compact'
}

export interface RetentionPolicyEditorProps {
  policy?: RetentionPolicy
  templates?: PolicyTemplate[]
  onSave: (policy: Partial<RetentionPolicy>) => void
  onCancel: () => void
  saving?: boolean
  mode?: 'create' | 'edit' | 'view'
}

export interface RetentionTimelineProps {
  timeline: RetentionTimeline
  compact?: boolean
  showMilestones?: boolean
  interactive?: boolean
  onEventClick?: (event: TimelineEvent) => void
}

export interface PolicyComplianceReportProps {
  report: ComplianceReport
  loading?: boolean
  onGenerateReport?: (period: { from: string; to: string }) => void
  onExport?: (format: 'pdf' | 'csv' | 'excel') => void
  onViolationClick?: (violation: PolicyViolation) => void
}

export interface LegalHoldManagerProps {
  holds: LegalHold[]
  selectedHoldId?: string
  onHoldSelect?: (holdId: string) => void
  onCreateHold?: () => void
  onEditHold?: (holdId: string) => void
  onReleaseHold?: (holdId: string) => void
  onViewAudit?: (holdId: string) => void
  onManageCustodians?: (holdId: string) => void
  onManageNotifications?: (holdId: string) => void
  onInitiateRelease?: (holdId: string) => void
  loading?: boolean
}

export interface HoldStatusIndicatorProps {
  hold?: LegalHold
  holds?: LegalHold[]
  compact?: boolean
  showDetails?: boolean
  onClick?: () => void
}

export interface CaseManagementProps {
  hold: LegalHold
  onUpdate?: (updates: Partial<LegalHold>) => void
  onAddDocument?: (documentIds: string[]) => void
  onRemoveDocument?: (documentIds: string[]) => void
  onSendNotification?: (recipientIds: string[]) => void
  notifications?: HoldNotification[]
  auditEvents?: HoldAuditEvent[]
  readonly?: boolean
}

export interface HoldReleaseWorkflowProps {
  hold: LegalHold
  onSubmitRequest?: (request: HoldReleaseRequest) => void
  onApprove?: (requestId: string) => void
  onReject?: (requestId: string, reason: string) => void
  pendingRequests?: HoldReleaseRequest[]
  canApprove?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

export function calculateRetentionEndDate(startDate: string, period: RetentionPeriod): Date {
  const start = new Date(startDate)
  const end = new Date(start)

  switch (period.unit) {
    case 'days':
      end.setDate(end.getDate() + period.value)
      break
    case 'months':
      end.setMonth(end.getMonth() + period.value)
      break
    case 'years':
      end.setFullYear(end.getFullYear() + period.value)
      break
  }

  return end
}

export function getDaysUntilExpiration(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  const diff = end.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function formatRetentionPeriod(period: RetentionPeriod): string {
  const unit = period.value === 1 ? period.unit.slice(0, -1) : period.unit
  return `${period.value} ${unit}`
}

export function getLifecycleStageLabel(stage: DocumentLifecycleStage): string {
  const labels: Record<DocumentLifecycleStage, string> = {
    active: 'Active',
    inactive: 'Inactive',
    pending_archival: 'Pending Archival',
    archived: 'Archived',
    pending_deletion: 'Pending Deletion',
    on_hold: 'Legal Hold',
    expired: 'Expired',
  }
  return labels[stage]
}

export function getLifecycleStageColor(stage: DocumentLifecycleStage): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<DocumentLifecycleStage, { bg: string; text: string; border: string }> = {
    active: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    inactive: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    pending_archival: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
    },
    archived: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-700',
    },
    pending_deletion: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
    },
    on_hold: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    expired: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
  }
  return colors[stage]
}

export function getHoldStatusLabel(status: HoldStatus): string {
  const labels: Record<HoldStatus, string> = {
    active: 'Active',
    released: 'Released',
    pending_review: 'Pending Review',
    expired: 'Expired',
  }
  return labels[status]
}

export function getHoldStatusColor(status: HoldStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<HoldStatus, { bg: string; text: string; border: string }> = {
    active: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    released: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    pending_review: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    expired: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
  }
  return colors[status]
}

export function getComplianceStatusLabel(status: ComplianceStatus): string {
  const labels: Record<ComplianceStatus, string> = {
    compliant: 'Compliant',
    non_compliant: 'Non-Compliant',
    at_risk: 'At Risk',
    warning: 'Warning',
  }
  return labels[status]
}

export function getComplianceStatusColor(status: ComplianceStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<ComplianceStatus, { bg: string; text: string; border: string }> = {
    compliant: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    non_compliant: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    at_risk: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
  }
  return colors[status]
}

export function getViolationSeverityColor(severity: 'low' | 'medium' | 'high' | 'critical'): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<
    'low' | 'medium' | 'high' | 'critical',
    { bg: string; text: string; border: string }
  > = {
    low: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
    },
    medium: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
  }
  return colors[severity]
}

export function isDocumentExpiringSoon(daysUntilExpiration: number): boolean {
  return daysUntilExpiration > 0 && daysUntilExpiration <= 30
}

export function isDocumentExpired(daysUntilExpiration: number): boolean {
  return daysUntilExpiration <= 0
}

// ============================================================================
// Schedule & Disposition Types
// ============================================================================

export type ScheduleStatus =
  | 'scheduled'
  | 'pending_review'
  | 'approved'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'on_hold'

export type DispositionAction = 'archive' | 'delete' | 'extend' | 'review' | 'transfer'

export type SchedulePriority = 'low' | 'medium' | 'high' | 'critical'

export interface RetentionSchedule {
  id: string
  documentId: string
  documentName: string
  documentType: string
  policyId: string
  policyName: string
  status: ScheduleStatus
  priority: SchedulePriority
  scheduledDate: string
  action: DispositionAction
  department: string
  owner: string
  ownerEmail: string
  confidentialityLevel: string
  retentionEndDate: string
  createdAt: string
  updatedAt: string
  processedAt?: string
  processedBy?: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  failureReason?: string
  metadata?: Record<string, unknown>
}

export interface ScheduleCalendarEvent {
  id: string
  title: string
  date: string
  endDate?: string
  type: 'deletion' | 'archival' | 'review' | 'notification' | 'legal_hold'
  status: ScheduleStatus
  priority: SchedulePriority
  count: number
  items: Array<{
    id: string
    name: string
    action: DispositionAction
  }>
}

export interface DispositionReviewItem {
  id: string
  scheduleId: string
  documentId: string
  documentName: string
  documentType: string
  department: string
  owner: string
  ownerEmail: string
  policyName: string
  scheduledAction: DispositionAction
  scheduledDate: string
  retentionEndDate: string
  confidentialityLevel: string
  priority: SchedulePriority
  status: 'pending' | 'approved' | 'rejected' | 'deferred'
  submittedAt: string
  submittedBy: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  deferUntil?: string
  hasLegalHold: boolean
  documentSize: number
  lastAccessedAt?: string
}

export interface BulkActionRequest {
  action: 'approve' | 'reject' | 'defer' | 'extend' | 'cancel'
  itemIds: string[]
  reason?: string
  deferUntil?: string
  extensionDays?: number
  notifyOwners?: boolean
}

export interface BulkActionResult {
  success: boolean
  processedCount: number
  failedCount: number
  results: Array<{
    itemId: string
    success: boolean
    error?: string
  }>
}

export interface ScheduleStats {
  totalScheduled: number
  pendingReview: number
  scheduledThisWeek: number
  scheduledThisMonth: number
  overdue: number
  onHold: number
  byAction: Record<DispositionAction, number>
  byPriority: Record<SchedulePriority, number>
  byDepartment: Array<{ department: string; count: number }>
}

// ============================================================================
// Schedule Component Props
// ============================================================================

export interface RetentionScheduleOverviewProps {
  schedules: RetentionSchedule[]
  stats: ScheduleStats
  onScheduleSelect?: (scheduleId: string) => void
  onRefresh?: () => void
  onViewCalendar?: () => void
  onViewQueue?: () => void
  loading?: boolean
}

export interface RetentionCalendarViewProps {
  events: ScheduleCalendarEvent[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: ScheduleCalendarEvent) => void
  onMonthChange?: (year: number, month: number) => void
  loading?: boolean
}

export interface DispositionReviewQueueProps {
  items: DispositionReviewItem[]
  selectedItems?: string[]
  onItemSelect?: (itemId: string) => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onApprove?: (itemId: string, notes?: string) => void
  onReject?: (itemId: string, reason: string) => void
  onDefer?: (itemId: string, deferUntil: string, reason?: string) => void
  onBulkAction?: (action: BulkActionRequest) => Promise<BulkActionResult>
  onViewDocument?: (documentId: string) => void
  loading?: boolean
  canApprove?: boolean
}

export interface BulkActionPanelProps {
  selectedCount: number
  selectedItems: DispositionReviewItem[]
  onApproveAll?: (notes?: string) => void
  onRejectAll?: (reason: string) => void
  onDeferAll?: (deferUntil: string, reason?: string) => void
  onExtendAll?: (days: number, reason?: string) => void
  onCancelAll?: (reason: string) => void
  onClearSelection?: () => void
  processing?: boolean
  canApprove?: boolean
}

// ============================================================================
// Schedule Helper Functions
// ============================================================================

export function getScheduleStatusLabel(status: ScheduleStatus): string {
  const labels: Record<ScheduleStatus, string> = {
    scheduled: 'Scheduled',
    pending_review: 'Pending Review',
    approved: 'Approved',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    on_hold: 'On Hold',
  }
  return labels[status]
}

export function getScheduleStatusColor(status: ScheduleStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<ScheduleStatus, { bg: string; text: string; border: string }> = {
    scheduled: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
    },
    pending_review: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    approved: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    processing: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
      border: 'border-purple-300 dark:border-purple-700',
    },
    completed: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    failed: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    cancelled: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-500 dark:text-gray-400',
      border: 'border-gray-300 dark:border-gray-600',
    },
    on_hold: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
    },
  }
  return colors[status]
}

export function getDispositionActionLabel(action: DispositionAction): string {
  const labels: Record<DispositionAction, string> = {
    archive: 'Archive',
    delete: 'Delete',
    extend: 'Extend',
    review: 'Review',
    transfer: 'Transfer',
  }
  return labels[action]
}

export function getDispositionActionColor(action: DispositionAction): {
  bg: string
  text: string
  icon: string
} {
  const colors: Record<DispositionAction, { bg: string; text: string; icon: string }> = {
    archive: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-600',
    },
    delete: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-600',
    },
    extend: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      icon: 'text-green-600',
    },
    review: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-300',
      icon: 'text-yellow-600',
    },
    transfer: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-600',
    },
  }
  return colors[action]
}

export function getPriorityColor(priority: SchedulePriority): {
  bg: string
  text: string
  dot: string
} {
  const colors: Record<SchedulePriority, { bg: string; text: string; dot: string }> = {
    low: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
      dot: 'bg-gray-400',
    },
    medium: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      dot: 'bg-blue-500',
    },
    high: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      dot: 'bg-orange-500',
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
    },
  }
  return colors[priority]
}

export function canDeleteDocument(lifecycle: DocumentLifecycle): boolean {
  return !lifecycle.onLegalHold && lifecycle.canDelete
}

export function getDefaultRetentionPolicy(): Partial<RetentionPolicy> {
  return {
    name: '',
    description: '',
    status: 'draft',
    version: 1,
    documentTypes: [],
    departments: [],
    securityLevels: [],
    retentionPeriod: { value: 7, unit: 'years' },
    trigger: 'creation',
    primaryAction: 'archive',
    secondaryActions: [],
    notifyBeforeDays: 30,
    requireApproval: false,
    complianceStandards: [],
    documentsAffected: 0,
    documentsCompliant: 0,
    documentsAtRisk: 0,
  }
}

export function getDefaultLegalHold(): Partial<LegalHold> {
  return {
    caseNumber: '',
    caseName: '',
    description: '',
    status: 'active',
    reason: 'litigation',
    departments: [],
    documentTypes: [],
    keywords: [],
    documentsOnHold: 0,
    documentsReleased: 0,
    custodians: [],
    legalCounsel: [],
    reviewers: [],
    notificationsSent: 0,
    acknowledgedBy: [],
    pendingAcknowledgment: [],
  }
}

// ============================================================================
// PHASE 5: AUTOMATION & NOTIFICATIONS TYPES
// ============================================================================

// Notification Channel Types
export type NotificationChannel = 'email' | 'in_app' | 'sms' | 'webhook'

// Notification Event Types
export type NotificationEventType =
  | 'policy_created'
  | 'policy_updated'
  | 'policy_activated'
  | 'policy_deactivated'
  | 'disposition_scheduled'
  | 'disposition_reminder'
  | 'disposition_due'
  | 'disposition_overdue'
  | 'disposition_completed'
  | 'disposition_failed'
  | 'legal_hold_created'
  | 'legal_hold_released'
  | 'hold_acknowledgment_required'
  | 'hold_acknowledgment_received'
  | 'document_expiring'
  | 'document_archived'
  | 'document_deleted'
  | 'approval_required'
  | 'approval_granted'
  | 'approval_rejected'
  | 'job_started'
  | 'job_completed'
  | 'job_failed'

// Notification Frequency
export type NotificationFrequency = 'immediate' | 'hourly' | 'daily' | 'weekly' | 'monthly'

// Job Status
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused'

// Job Type
export type JobType =
  | 'retention_scan'
  | 'disposition_execution'
  | 'archival_batch'
  | 'deletion_batch'
  | 'notification_batch'
  | 'compliance_check'
  | 'index_rebuild'
  | 'backup'

// ============================================================================
// Notification Preferences
// ============================================================================

export interface NotificationPreference {
  id: string
  userId: string
  eventType: NotificationEventType
  channels: NotificationChannel[]
  enabled: boolean
  frequency: NotificationFrequency
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string
  emailDigest: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferencesGroup {
  category: string
  description: string
  events: {
    eventType: NotificationEventType
    label: string
    description: string
    defaultChannels: NotificationChannel[]
    required?: boolean
  }[]
}

export interface UserNotificationSettings {
  userId: string
  globalEnabled: boolean
  emailEnabled: boolean
  inAppEnabled: boolean
  smsEnabled: boolean
  webhookEnabled: boolean
  defaultFrequency: NotificationFrequency
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  emailDigestEnabled: boolean
  emailDigestFrequency: 'daily' | 'weekly'
  emailDigestTime: string // HH:mm format
  preferences: NotificationPreference[]
}

// ============================================================================
// Email Templates
// ============================================================================

export type EmailTemplateType =
  | 'disposition_reminder'
  | 'disposition_due'
  | 'disposition_overdue'
  | 'legal_hold_notice'
  | 'hold_acknowledgment'
  | 'hold_release'
  | 'approval_request'
  | 'approval_granted'
  | 'approval_rejected'
  | 'weekly_digest'
  | 'monthly_report'
  | 'custom'

export interface EmailTemplate {
  id: string
  name: string
  type: EmailTemplateType
  subject: string
  bodyHtml: string
  bodyText: string
  variables: EmailTemplateVariable[]
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  createdBy: string
  updatedBy?: string
  previewData?: Record<string, string>
}

export interface EmailTemplateVariable {
  name: string
  description: string
  example: string
  required: boolean
}

// ============================================================================
// Auto-Enforcement Settings
// ============================================================================

export type EnforcementMode = 'automatic' | 'manual' | 'approval_required'

export interface AutoEnforcementSettings {
  id: string
  policyId?: string // null for global settings
  enforcementMode: EnforcementMode
  enabled: boolean

  // Archival settings
  archivalEnabled: boolean
  archivalMode: EnforcementMode
  archivalDelayDays: number // Days after scheduled date to execute
  archivalNotifyBeforeDays: number

  // Deletion settings
  deletionEnabled: boolean
  deletionMode: EnforcementMode
  deletionDelayDays: number
  deletionNotifyBeforeDays: number
  deletionRequireApproval: boolean
  deletionApprovers: string[]

  // Grace period settings
  gracePeriodEnabled: boolean
  gracePeriodDays: number

  // Retry settings
  retryOnFailure: boolean
  maxRetries: number
  retryDelayMinutes: number

  // Exclusions
  excludeDepartments: string[]
  excludeDocumentTypes: string[]
  excludeConfidentialityLevels: string[]

  // Schedule
  executionSchedule: ExecutionSchedule

  createdAt: string
  updatedAt: string
}

export interface ExecutionSchedule {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-31 for monthly
  timeOfDay: string // HH:mm format
  timezone: string
  lastRun?: string
  nextRun?: string
}

// ============================================================================
// Scheduled Jobs
// ============================================================================

export interface ScheduledJob {
  id: string
  name: string
  type: JobType
  status: JobStatus
  priority: 'low' | 'normal' | 'high' | 'critical'

  // Schedule
  schedule: ExecutionSchedule
  isRecurring: boolean

  // Configuration
  config: Record<string, unknown>
  policyId?: string
  targetDocuments?: number
  batchSize: number

  // Execution details
  startedAt?: string
  completedAt?: string
  duration?: number // in seconds
  progress: number // 0-100
  currentStep?: string

  // Results
  processedCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  errorMessage?: string
  errors: JobError[]

  // Metadata
  createdAt: string
  createdBy: string
  updatedAt: string
  lastRunAt?: string
  nextRunAt?: string
}

export interface JobError {
  timestamp: string
  documentId?: string
  documentName?: string
  error: string
  details?: string
  retryable: boolean
}

export interface JobExecutionLog {
  id: string
  jobId: string
  status: JobStatus
  startedAt: string
  completedAt?: string
  duration?: number
  processedCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  errorMessage?: string
  logs: JobLogEntry[]
}

export interface JobLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  details?: Record<string, unknown>
}

// ============================================================================
// Automation Stats
// ============================================================================

export interface AutomationStats {
  // Jobs overview
  totalJobs: number
  activeJobs: number
  pendingJobs: number
  completedToday: number
  failedToday: number

  // Processing stats
  documentsProcessedToday: number
  documentsProcessedThisWeek: number
  documentsProcessedThisMonth: number

  // Success rates
  overallSuccessRate: number
  archivalSuccessRate: number
  deletionSuccessRate: number

  // Notifications
  notificationsSentToday: number
  notificationsPendingDelivery: number
  notificationFailureRate: number

  // Recent activity
  recentJobs: ScheduledJob[]
  upcomingJobs: ScheduledJob[]
}

// ============================================================================
// Automation Component Props
// ============================================================================

export interface NotificationPreferencesProps {
  settings: UserNotificationSettings
  groups: NotificationPreferencesGroup[]
  onUpdate: (settings: Partial<UserNotificationSettings>) => void
  onPreferenceChange: (
    eventType: NotificationEventType,
    updates: Partial<NotificationPreference>
  ) => void
  onTestNotification?: (channel: NotificationChannel) => void
  loading?: boolean
  saving?: boolean
}

export interface EmailTemplatesManagerProps {
  templates: EmailTemplate[]
  selectedTemplateId?: string
  onSelectTemplate: (templateId: string) => void
  onCreateTemplate: () => void
  onEditTemplate: (templateId: string) => void
  onDeleteTemplate: (templateId: string) => void
  onDuplicateTemplate: (templateId: string) => void
  onPreviewTemplate: (templateId: string, previewData?: Record<string, string>) => void
  onSendTestEmail: (templateId: string, recipientEmail: string) => void
  loading?: boolean
}

export interface AutoEnforcementSettingsProps {
  settings: AutoEnforcementSettings
  policies: RetentionPolicy[]
  onUpdate: (settings: Partial<AutoEnforcementSettings>) => void
  onSave: () => void
  onReset: () => void
  onTestRun?: (dryRun: boolean) => void
  loading?: boolean
  saving?: boolean
}

export interface ScheduledJobsDashboardProps {
  jobs: ScheduledJob[]
  stats: AutomationStats
  onViewJob: (jobId: string) => void
  onRunJob: (jobId: string) => void
  onPauseJob: (jobId: string) => void
  onResumeJob: (jobId: string) => void
  onCancelJob: (jobId: string) => void
  onDeleteJob: (jobId: string) => void
  onCreateJob: () => void
  onRefresh: () => void
  loading?: boolean
}

export interface JobDetailsPanelProps {
  job: ScheduledJob
  executionLogs: JobExecutionLog[]
  onClose: () => void
  onRunNow: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onEdit: () => void
  loading?: boolean
}

// ============================================================================
// Automation Helper Functions
// ============================================================================

export function getJobStatusLabel(status: JobStatus): string {
  const labels: Record<JobStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    paused: 'Paused',
  }
  return labels[status]
}

export function getJobStatusColor(status: JobStatus): {
  bg: string
  text: string
  border: string
} {
  const colors: Record<JobStatus, { bg: string; text: string; border: string }> = {
    pending: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-800 dark:text-yellow-300',
      border: 'border-yellow-300 dark:border-yellow-700',
    },
    running: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-300 dark:border-blue-700',
    },
    completed: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-800 dark:text-green-300',
      border: 'border-green-300 dark:border-green-700',
    },
    failed: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-800 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700',
    },
    cancelled: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-700 dark:text-gray-300',
      border: 'border-gray-300 dark:border-gray-600',
    },
    paused: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-800 dark:text-orange-300',
      border: 'border-orange-300 dark:border-orange-700',
    },
  }
  return colors[status]
}

export function getJobTypeLabel(type: JobType): string {
  const labels: Record<JobType, string> = {
    retention_scan: 'Retention Scan',
    disposition_execution: 'Disposition Execution',
    archival_batch: 'Archival Batch',
    deletion_batch: 'Deletion Batch',
    notification_batch: 'Notification Batch',
    compliance_check: 'Compliance Check',
    index_rebuild: 'Index Rebuild',
    backup: 'Backup',
  }
  return labels[type]
}

export function getJobTypeIcon(type: JobType): string {
  const icons: Record<JobType, string> = {
    retention_scan: 'search',
    disposition_execution: 'play',
    archival_batch: 'archive',
    deletion_batch: 'trash',
    notification_batch: 'bell',
    compliance_check: 'shield-check',
    index_rebuild: 'database',
    backup: 'hard-drive',
  }
  return icons[type]
}

export function getNotificationEventLabel(eventType: NotificationEventType): string {
  const labels: Record<NotificationEventType, string> = {
    policy_created: 'Policy Created',
    policy_updated: 'Policy Updated',
    policy_activated: 'Policy Activated',
    policy_deactivated: 'Policy Deactivated',
    disposition_scheduled: 'Disposition Scheduled',
    disposition_reminder: 'Disposition Reminder',
    disposition_due: 'Disposition Due',
    disposition_overdue: 'Disposition Overdue',
    disposition_completed: 'Disposition Completed',
    disposition_failed: 'Disposition Failed',
    legal_hold_created: 'Legal Hold Created',
    legal_hold_released: 'Legal Hold Released',
    hold_acknowledgment_required: 'Acknowledgment Required',
    hold_acknowledgment_received: 'Acknowledgment Received',
    document_expiring: 'Document Expiring',
    document_archived: 'Document Archived',
    document_deleted: 'Document Deleted',
    approval_required: 'Approval Required',
    approval_granted: 'Approval Granted',
    approval_rejected: 'Approval Rejected',
    job_started: 'Job Started',
    job_completed: 'Job Completed',
    job_failed: 'Job Failed',
  }
  return labels[eventType]
}

export function getNotificationChannelLabel(channel: NotificationChannel): string {
  const labels: Record<NotificationChannel, string> = {
    email: 'Email',
    in_app: 'In-App',
    sms: 'SMS',
    webhook: 'Webhook',
  }
  return labels[channel]
}

export function formatJobDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function getDefaultNotificationPreferences(): NotificationPreferencesGroup[] {
  return [
    {
      category: 'Retention Policies',
      description: 'Notifications about retention policy changes',
      events: [
        {
          eventType: 'policy_created',
          label: 'Policy Created',
          description: 'When a new retention policy is created',
          defaultChannels: ['email', 'in_app'],
        },
        {
          eventType: 'policy_activated',
          label: 'Policy Activated',
          description: 'When a policy is activated',
          defaultChannels: ['email', 'in_app'],
        },
      ],
    },
    {
      category: 'Dispositions',
      description: 'Notifications about document dispositions',
      events: [
        {
          eventType: 'disposition_reminder',
          label: 'Disposition Reminder',
          description: 'Reminder before scheduled disposition',
          defaultChannels: ['email'],
          required: true,
        },
        {
          eventType: 'disposition_due',
          label: 'Disposition Due',
          description: 'When disposition is due',
          defaultChannels: ['email', 'in_app'],
          required: true,
        },
        {
          eventType: 'disposition_overdue',
          label: 'Disposition Overdue',
          description: 'When disposition is overdue',
          defaultChannels: ['email', 'in_app'],
          required: true,
        },
        {
          eventType: 'disposition_completed',
          label: 'Disposition Completed',
          description: 'When disposition is completed',
          defaultChannels: ['in_app'],
        },
      ],
    },
    {
      category: 'Legal Holds',
      description: 'Notifications about legal holds',
      events: [
        {
          eventType: 'legal_hold_created',
          label: 'Legal Hold Created',
          description: 'When a new legal hold is created',
          defaultChannels: ['email', 'in_app'],
        },
        {
          eventType: 'hold_acknowledgment_required',
          label: 'Acknowledgment Required',
          description: 'When you need to acknowledge a legal hold',
          defaultChannels: ['email', 'in_app'],
          required: true,
        },
        {
          eventType: 'legal_hold_released',
          label: 'Legal Hold Released',
          description: 'When a legal hold is released',
          defaultChannels: ['email', 'in_app'],
        },
      ],
    },
    {
      category: 'Approvals',
      description: 'Notifications about approval requests',
      events: [
        {
          eventType: 'approval_required',
          label: 'Approval Required',
          description: 'When your approval is needed',
          defaultChannels: ['email', 'in_app'],
          required: true,
        },
        {
          eventType: 'approval_granted',
          label: 'Approval Granted',
          description: 'When your request is approved',
          defaultChannels: ['email', 'in_app'],
        },
        {
          eventType: 'approval_rejected',
          label: 'Approval Rejected',
          description: 'When your request is rejected',
          defaultChannels: ['email', 'in_app'],
        },
      ],
    },
    {
      category: 'System Jobs',
      description: 'Notifications about automated jobs',
      events: [
        {
          eventType: 'job_completed',
          label: 'Job Completed',
          description: 'When an automated job completes',
          defaultChannels: ['in_app'],
        },
        {
          eventType: 'job_failed',
          label: 'Job Failed',
          description: 'When an automated job fails',
          defaultChannels: ['email', 'in_app'],
          required: true,
        },
      ],
    },
  ]
}
