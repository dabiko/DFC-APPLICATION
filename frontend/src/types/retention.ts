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
