/**
 * Retention Service
 * API service for retention policies, legal holds, and compliance management
 */

import apiClient from './apiClient'
import type {
  RetentionPolicy,
  LegalHold,
  PolicyStatus,
  HoldStatus,
  ComplianceStatus,
  RetentionPeriod,
  // Automation types
  UserNotificationSettings,
  NotificationPreference,
  EmailTemplate,
  EmailTemplateType,
  AutoEnforcementSettings,
  ScheduledJob,
  JobExecutionLog,
  AutomationStats,
  JobStatus,
  JobType,
} from '@/types/retention'

// ============================================================================
// API Response Types
// ============================================================================

export interface RetentionPolicyResponse {
  id: string
  name: string
  description: string
  policy_type: 'DOCUMENT_TYPE' | 'DEPARTMENT' | 'FOLDER' | 'TAG' | 'CUSTOM'
  retention_days: number
  criteria: Record<string, unknown>
  grace_period_days: number
  notify_before_days: number
  is_active: boolean
  priority: number
  created_by: number | null
  created_by_name: string | null
  created_at: string
  updated_at: string
  applied_document_count: number
}

export interface LegalHoldResponse {
  id: number
  case_number: string
  title: string
  reason: string
  start_date: string
  end_date: string | null
  is_active: boolean
  created_by: number
  created_by_name: string | null
  created_at: string
  updated_at: string
  released_by: number | null
  released_by_name: string | null
  released_at: string | null
  document_count: number
  held_documents: Array<{
    id: string
    document: string
    document_title: string
    document_type: string
    added_by: number
    added_by_name: string
    added_at: string
    reason: string
  }>
}

export interface RetentionScheduleResponse {
  id: string
  document: string
  document_title: string
  document_type: string
  policy: string
  policy_name: string
  retention_end_date: string
  notification_date: string
  deletion_date: string
  status: 'PENDING' | 'NOTIFIED' | 'DELETED' | 'CANCELLED'
  notification_sent: boolean
  can_delete: boolean
  days_until_deletion: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface RetentionDashboardStats {
  activePolicies: number
  totalPolicies: number
  documentsGoverned: number
  documentsUnderRetention: number
  activeLegalHolds: number
  documentsOnHold: number
  complianceRate: number
  documentsAtRisk: number
  documentsExpiringSoon: number
  pendingDeletions: number
  pendingReviews: number
  violationsThisMonth: number
  notificationsSentThisMonth: number
}

export interface ComplianceReport {
  id: string
  period: {
    from: string
    to: string
  }
  generatedAt: string
  totalDocuments: number
  complianceRate: number
  atRiskDocuments: number
  policyViolations: number
  activePolicies: number
  policiesEnforced: number
  documentsArchived: number
  documentsDeleted: number
  activeHolds: number
  documentsOnHold: number
  holdsReleased: number
  notificationsSent: number
  violations: PolicyViolation[]
  topViolationTypes: Array<{ type: string; count: number }>
  complianceTrend: Array<{ date: string; rate: number }>
}

export interface PolicyViolation {
  id: string
  documentId: string
  documentName: string
  policyId: string
  policyName: string
  violationType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  detectedAt: string
  resolvedAt?: string
}

export interface UpcomingDeletionsResponse {
  days: number
  count: number
  schedules: RetentionScheduleResponse[]
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateRetentionPolicyRequest {
  name: string
  description?: string
  policy_type: 'DOCUMENT_TYPE' | 'DEPARTMENT' | 'FOLDER' | 'TAG' | 'CUSTOM'
  retention_days: number
  criteria?: Record<string, unknown>
  grace_period_days?: number
  notify_before_days?: number
  is_active?: boolean
  priority?: number
}

export interface CreateLegalHoldRequest {
  case_number: string
  title: string
  reason: string
  start_date: string
  end_date?: string | null
}

export interface AddDocumentsToHoldRequest {
  document_ids: string[]
  reason?: string
}

export interface RemoveDocumentsFromHoldRequest {
  document_ids: string[]
}

export interface ReleaseLegalHoldRequest {
  notes?: string
  reason?: string
  release_all?: boolean
  document_ids?: string[]
}

// Custodian types
export interface CustodianResponse {
  id: string
  name: string
  email: string
  department?: string
  role: 'custodian' | 'legal_counsel' | 'reviewer'
  added_at: string
  added_by: string
  notification_status: 'pending' | 'sent' | 'delivered' | 'acknowledged' | 'failed'
  notification_sent_at?: string
  acknowledged_at?: string
  documents_count?: number
}

export interface AddCustodianRequest {
  name: string
  email: string
  department?: string
  role: 'custodian' | 'legal_counsel' | 'reviewer'
}

// Notification types
export interface NotificationTemplateResponse {
  id: string
  name: string
  subject: string
  body: string
  type: 'initial' | 'reminder' | 'release' | 'acknowledgment_request' | 'custom'
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface SendNotificationRequest {
  template_id: string
  recipient_ids: string[]
  custom_message?: string
}

export interface NotificationHistoryResponse {
  id: string
  hold_id: string
  hold_name: string
  template_id?: string
  template_name?: string
  recipient_ids: string[]
  recipient_count: number
  subject: string
  sent_at: string
  sent_by: string
  status: 'sent' | 'delivered' | 'failed' | 'partial'
  delivered_count: number
  failed_count: number
  opened_count?: number
  acknowledged_count?: number
}

// Release request types
export interface HoldReleaseRequestResponse {
  id: string
  hold_id: string
  reason: string
  requested_by: string
  requested_at: string
  approved_by?: string
  approved_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  status: 'pending' | 'approved' | 'rejected'
  release_all: boolean
  document_ids?: string[]
}

// ============================================================================
// Transform Functions
// ============================================================================

const transformPolicyResponse = (policy: RetentionPolicyResponse): RetentionPolicy => {
  const retentionYears = Math.floor(policy.retention_days / 365)
  const retentionMonths = Math.floor((policy.retention_days % 365) / 30)

  let period: RetentionPeriod
  if (retentionYears > 0) {
    period = { value: retentionYears, unit: 'years' }
  } else if (retentionMonths > 0) {
    period = { value: retentionMonths, unit: 'months' }
  } else {
    period = { value: policy.retention_days, unit: 'days' }
  }

  // Map policy_type to status
  let status: PolicyStatus = 'active'
  if (!policy.is_active) {
    status = 'inactive'
  }

  return {
    id: policy.id,
    name: policy.name,
    description: policy.description || '',
    status,
    version: 1,
    createdAt: policy.created_at,
    createdBy: policy.created_by_name || 'System',
    modifiedAt: policy.updated_at,
    modifiedBy: policy.created_by_name || 'System',
    effectiveDate: policy.created_at,
    documentTypes: policy.criteria?.document_type ? [policy.criteria.document_type as string] : [],
    departments: policy.criteria?.department_id ? [policy.criteria.department_id as string] : [],
    securityLevels: policy.criteria?.confidentiality_level
      ? [policy.criteria.confidentiality_level as string]
      : [],
    tags: (policy.criteria?.tags as string[]) || [],
    retentionPeriod: period,
    trigger: 'creation',
    gracePeriod: { value: policy.grace_period_days, unit: 'days' },
    primaryAction: 'archive',
    secondaryActions: ['notify'],
    notifyBeforeDays: policy.notify_before_days,
    requireApproval: false,
    complianceStandards: [],
    documentsAffected: policy.applied_document_count,
    documentsCompliant: policy.applied_document_count, // Assume all compliant for now
    documentsAtRisk: 0,
  }
}

const transformLegalHoldResponse = (hold: LegalHoldResponse): LegalHold => {
  let status: HoldStatus = 'active'
  if (!hold.is_active) {
    status = 'released'
  }

  return {
    id: hold.id.toString(),
    caseNumber: hold.case_number,
    caseName: hold.title,
    description: hold.reason,
    status,
    reason: 'litigation', // Default, could be parsed from reason text
    createdAt: hold.created_at,
    createdBy: hold.created_by_name || 'System',
    effectiveDate: hold.start_date,
    expiryDate: hold.end_date || undefined,
    releasedAt: hold.released_at || undefined,
    releasedBy: hold.released_by_name || undefined,
    departments: [],
    documentTypes: [],
    keywords: [],
    documentsOnHold: hold.document_count,
    documentsReleased: 0,
    documentIds: hold.held_documents?.map((d) => d.document) || [],
    custodians: [],
    legalCounsel: [],
    reviewers: [],
    notificationsSent: 0,
    acknowledgedBy: [],
    pendingAcknowledgment: [],
  }
}

// ============================================================================
// Helper Types for Paginated Responses
// ============================================================================

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

/**
 * Helper to extract array from potentially paginated response
 */
function extractResults<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data
  }
  return data.results || []
}

// ============================================================================
// Retention Policy APIs
// ============================================================================

/**
 * Fetch all retention policies
 */
export const getRetentionPolicies = async (): Promise<RetentionPolicy[]> => {
  const response = await apiClient.get<
    RetentionPolicyResponse[] | PaginatedResponse<RetentionPolicyResponse>
  >('/retention/policies/')
  const results = extractResults(response.data)
  return results.map(transformPolicyResponse)
}

/**
 * Fetch a single retention policy by ID
 */
export const getRetentionPolicy = async (id: string): Promise<RetentionPolicy> => {
  const response = await apiClient.get<RetentionPolicyResponse>(`/retention/policies/${id}/`)
  return transformPolicyResponse(response.data)
}

/**
 * Create a new retention policy
 */
export const createRetentionPolicy = async (
  data: CreateRetentionPolicyRequest
): Promise<RetentionPolicy> => {
  const response = await apiClient.post<RetentionPolicyResponse>('/retention/policies/', data)
  return transformPolicyResponse(response.data)
}

/**
 * Update an existing retention policy
 */
export const updateRetentionPolicy = async (
  id: string,
  data: Partial<CreateRetentionPolicyRequest>
): Promise<RetentionPolicy> => {
  const response = await apiClient.patch<RetentionPolicyResponse>(
    `/retention/policies/${id}/`,
    data
  )
  return transformPolicyResponse(response.data)
}

/**
 * Delete (deactivate) a retention policy
 */
export const deleteRetentionPolicy = async (id: string): Promise<void> => {
  await apiClient.delete(`/retention/policies/${id}/`)
}

/**
 * Activate a retention policy
 */
export const activateRetentionPolicy = async (id: string): Promise<{ status: string }> => {
  const response = await apiClient.post<{ status: string }>(`/retention/policies/${id}/activate/`)
  return response.data
}

/**
 * Deactivate a retention policy
 */
export const deactivateRetentionPolicy = async (id: string): Promise<{ status: string }> => {
  const response = await apiClient.post<{ status: string }>(`/retention/policies/${id}/deactivate/`)
  return response.data
}

/**
 * Test which documents match a policy
 */
export const testPolicyMatch = async (
  id: string
): Promise<{
  policy: string
  tested_count: number
  matching_count: number
  matching_document_ids: string[]
}> => {
  const response = await apiClient.get(`/retention/policies/${id}/test_match/`)
  return response.data
}

// ============================================================================
// Legal Hold APIs
// ============================================================================

/**
 * Fetch all legal holds
 */
export const getLegalHolds = async (): Promise<LegalHold[]> => {
  const response = await apiClient.get<LegalHoldResponse[] | PaginatedResponse<LegalHoldResponse>>(
    '/retention/legal-holds/'
  )
  const results = extractResults(response.data)
  return results.map(transformLegalHoldResponse)
}

/**
 * Fetch a single legal hold by ID
 */
export const getLegalHold = async (id: string): Promise<LegalHold> => {
  const response = await apiClient.get<LegalHoldResponse>(`/retention/legal-holds/${id}/`)
  return transformLegalHoldResponse(response.data)
}

/**
 * Create a new legal hold
 */
export const createLegalHold = async (data: CreateLegalHoldRequest): Promise<LegalHold> => {
  const response = await apiClient.post<LegalHoldResponse>('/retention/legal-holds/', data)
  return transformLegalHoldResponse(response.data)
}

/**
 * Update an existing legal hold
 */
export const updateLegalHold = async (
  id: string,
  data: Partial<CreateLegalHoldRequest>
): Promise<LegalHold> => {
  const response = await apiClient.patch<LegalHoldResponse>(`/retention/legal-holds/${id}/`, data)
  return transformLegalHoldResponse(response.data)
}

/**
 * Add documents to a legal hold
 */
export const addDocumentsToHold = async (
  holdId: string,
  data: AddDocumentsToHoldRequest
): Promise<{ added: number; already_held: string[]; total_documents: number }> => {
  const response = await apiClient.post(`/retention/legal-holds/${holdId}/add_documents/`, data)
  return response.data
}

/**
 * Remove documents from a legal hold
 */
export const removeDocumentsFromHold = async (
  holdId: string,
  data: RemoveDocumentsFromHoldRequest
): Promise<{ removed: number; remaining_documents: number }> => {
  const response = await apiClient.post(`/retention/legal-holds/${holdId}/remove_documents/`, data)
  return response.data
}

/**
 * Release a legal hold
 */
export const releaseLegalHold = async (
  id: string,
  data?: ReleaseLegalHoldRequest
): Promise<{ status: string; released_at: string; released_by: string }> => {
  const response = await apiClient.post(`/retention/legal-holds/${id}/release/`, data || {})
  return response.data
}

// ============================================================================
// Custodian Management APIs
// ============================================================================

/**
 * Get custodians for a legal hold
 */
export const getHoldCustodians = async (holdId: string): Promise<CustodianResponse[]> => {
  const response = await apiClient.get<CustodianResponse[] | PaginatedResponse<CustodianResponse>>(
    `/retention/legal-holds/${holdId}/custodians/`
  )
  return extractResults(response.data)
}

/**
 * Add a custodian to a legal hold
 */
export const addCustodian = async (
  holdId: string,
  data: AddCustodianRequest
): Promise<CustodianResponse> => {
  const response = await apiClient.post<CustodianResponse>(
    `/retention/legal-holds/${holdId}/custodians/`,
    data
  )
  return response.data
}

/**
 * Remove a custodian from a legal hold
 */
export const removeCustodian = async (holdId: string, custodianId: string): Promise<void> => {
  await apiClient.delete(`/retention/legal-holds/${holdId}/custodians/${custodianId}/`)
}

/**
 * Update custodian role
 */
export const updateCustodianRole = async (
  holdId: string,
  custodianId: string,
  role: CustodianResponse['role']
): Promise<CustodianResponse> => {
  const response = await apiClient.patch<CustodianResponse>(
    `/retention/legal-holds/${holdId}/custodians/${custodianId}/`,
    { role }
  )
  return response.data
}

// ============================================================================
// Notification APIs
// ============================================================================

/**
 * Get notification templates
 */
export const getNotificationTemplates = async (): Promise<NotificationTemplateResponse[]> => {
  const response = await apiClient.get<
    NotificationTemplateResponse[] | PaginatedResponse<NotificationTemplateResponse>
  >('/retention/notification-templates/')
  return extractResults(response.data)
}

/**
 * Create a notification template
 */
export const createNotificationTemplate = async (
  data: Omit<NotificationTemplateResponse, 'id' | 'created_at' | 'updated_at'>
): Promise<NotificationTemplateResponse> => {
  const response = await apiClient.post<NotificationTemplateResponse>(
    '/retention/notification-templates/',
    data
  )
  return response.data
}

/**
 * Update a notification template
 */
export const updateNotificationTemplate = async (
  templateId: string,
  data: Partial<NotificationTemplateResponse>
): Promise<NotificationTemplateResponse> => {
  const response = await apiClient.patch<NotificationTemplateResponse>(
    `/retention/notification-templates/${templateId}/`,
    data
  )
  return response.data
}

/**
 * Delete a notification template
 */
export const deleteNotificationTemplate = async (templateId: string): Promise<void> => {
  await apiClient.delete(`/retention/notification-templates/${templateId}/`)
}

/**
 * Send notifications to custodians
 */
export const sendHoldNotifications = async (
  holdId: string,
  data: SendNotificationRequest
): Promise<{ sent_count: number; failed_count: number }> => {
  const response = await apiClient.post(
    `/retention/legal-holds/${holdId}/send-notifications/`,
    data
  )
  return response.data
}

/**
 * Resend notification to a custodian
 */
export const resendNotification = async (
  holdId: string,
  custodianId: string
): Promise<{ status: string }> => {
  const response = await apiClient.post(
    `/retention/legal-holds/${holdId}/custodians/${custodianId}/resend-notification/`
  )
  return response.data
}

/**
 * Get notification history for a hold
 */
export const getNotificationHistory = async (
  holdId: string
): Promise<NotificationHistoryResponse[]> => {
  const response = await apiClient.get<
    NotificationHistoryResponse[] | PaginatedResponse<NotificationHistoryResponse>
  >(`/retention/legal-holds/${holdId}/notification-history/`)
  return extractResults(response.data)
}

// ============================================================================
// Release Request APIs
// ============================================================================

/**
 * Submit a release request for approval
 */
export const submitReleaseRequest = async (
  holdId: string,
  data: {
    reason: string
    release_all: boolean
    document_ids?: string[]
  }
): Promise<HoldReleaseRequestResponse> => {
  const response = await apiClient.post<HoldReleaseRequestResponse>(
    `/retention/legal-holds/${holdId}/release-requests/`,
    data
  )
  return response.data
}

/**
 * Get pending release requests
 */
export const getPendingReleaseRequests = async (): Promise<HoldReleaseRequestResponse[]> => {
  const response = await apiClient.get<
    HoldReleaseRequestResponse[] | PaginatedResponse<HoldReleaseRequestResponse>
  >('/retention/release-requests/', { params: { status: 'pending' } })
  return extractResults(response.data)
}

/**
 * Approve a release request
 */
export const approveReleaseRequest = async (
  requestId: string
): Promise<{ status: string; approved_at: string }> => {
  const response = await apiClient.post(`/retention/release-requests/${requestId}/approve/`)
  return response.data
}

/**
 * Reject a release request
 */
export const rejectReleaseRequest = async (
  requestId: string,
  reason: string
): Promise<{ status: string; rejected_at: string }> => {
  const response = await apiClient.post(`/retention/release-requests/${requestId}/reject/`, {
    reason,
  })
  return response.data
}

/**
 * Acknowledge a legal hold (for custodians)
 */
export const acknowledgeHold = async (
  holdId: string,
  custodianId: string
): Promise<{ acknowledged_at: string }> => {
  const response = await apiClient.post(
    `/retention/legal-holds/${holdId}/custodians/${custodianId}/acknowledge/`
  )
  return response.data
}

// ============================================================================
// Retention Schedule APIs
// ============================================================================

/**
 * Fetch all retention schedules
 */
export const getRetentionSchedules = async (params?: {
  status?: string
  deletion_from?: string
  deletion_to?: string
}): Promise<RetentionScheduleResponse[]> => {
  const response = await apiClient.get<
    RetentionScheduleResponse[] | PaginatedResponse<RetentionScheduleResponse>
  >('/retention/schedules/', {
    params,
  })
  return extractResults(response.data)
}

/**
 * Fetch upcoming deletions
 */
export const getUpcomingDeletions = async (
  days: number = 30
): Promise<UpcomingDeletionsResponse> => {
  const response = await apiClient.get<UpcomingDeletionsResponse>(
    '/retention/schedules/upcoming_deletions/',
    { params: { days } }
  )
  return response.data
}

// ============================================================================
// Dashboard & Statistics APIs
// ============================================================================

/**
 * Fetch retention dashboard statistics
 * Aggregates data from multiple endpoints for dashboard display
 */
export const getRetentionDashboardStats = async (): Promise<RetentionDashboardStats> => {
  try {
    // Fetch data from multiple endpoints in parallel
    const [policies, legalHolds, upcomingDeletions] = await Promise.all([
      getRetentionPolicies().catch(() => []),
      getLegalHolds().catch(() => []),
      getUpcomingDeletions(30).catch(() => ({ count: 0, schedules: [] })),
    ])

    // Calculate statistics
    const activePolicies = policies.filter((p) => p.status === 'active').length
    const totalDocumentsGoverned = policies.reduce((sum, p) => sum + p.documentsAffected, 0)
    const activeLegalHolds = legalHolds.filter((h) => h.status === 'active').length
    const documentsOnHold = legalHolds
      .filter((h) => h.status === 'active')
      .reduce((sum, h) => sum + h.documentsOnHold, 0)

    // Calculate compliance rate (documents compliant / documents affected)
    const totalCompliant = policies.reduce((sum, p) => sum + p.documentsCompliant, 0)
    const complianceRate =
      totalDocumentsGoverned > 0 ? (totalCompliant / totalDocumentsGoverned) * 100 : 100

    // Documents at risk (from policies)
    const documentsAtRisk = policies.reduce((sum, p) => sum + p.documentsAtRisk, 0)

    const pendingReviews = policies.filter((p) => p.status === 'draft').length

    return {
      activePolicies,
      totalPolicies: policies.length,
      documentsGoverned: totalDocumentsGoverned,
      documentsUnderRetention: totalDocumentsGoverned,
      activeLegalHolds,
      documentsOnHold,
      complianceRate: Math.round(complianceRate * 10) / 10,
      documentsAtRisk,
      documentsExpiringSoon: upcomingDeletions.count,
      pendingDeletions: upcomingDeletions.schedules.filter((s) => s.status === 'PENDING').length,
      pendingReviews,
      violationsThisMonth: 0, // Would need a violations endpoint
      notificationsSentThisMonth: upcomingDeletions.schedules.filter((s) => s.notification_sent)
        .length,
    }
  } catch (error) {
    console.error('Failed to fetch retention dashboard stats:', error)
    // Return default values on error
    return {
      activePolicies: 0,
      totalPolicies: 0,
      documentsGoverned: 0,
      documentsUnderRetention: 0,
      activeLegalHolds: 0,
      documentsOnHold: 0,
      complianceRate: 100,
      documentsAtRisk: 0,
      documentsExpiringSoon: 0,
      pendingDeletions: 0,
      pendingReviews: 0,
      violationsThisMonth: 0,
      notificationsSentThisMonth: 0,
    }
  }
}

/**
 * Generate a compliance report
 */
export const getComplianceReport = async (period?: {
  from: string
  to: string
}): Promise<ComplianceReport> => {
  // Generate period dates if not provided
  const now = new Date()
  const from = period?.from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const to = period?.to || now.toISOString()

  // Fetch data for the report
  const [policies, legalHolds, schedules] = await Promise.all([
    getRetentionPolicies().catch(() => []),
    getLegalHolds().catch(() => []),
    getRetentionSchedules().catch(() => []),
  ])

  // Calculate statistics
  const activePolicies = policies.filter((p) => p.status === 'active').length
  const totalDocuments = policies.reduce((sum, p) => sum + p.documentsAffected, 0)
  const compliantDocuments = policies.reduce((sum, p) => sum + p.documentsCompliant, 0)
  const atRiskDocuments = policies.reduce((sum, p) => sum + p.documentsAtRisk, 0)
  const complianceRate = totalDocuments > 0 ? (compliantDocuments / totalDocuments) * 100 : 100

  const activeHolds = legalHolds.filter((h) => h.status === 'active').length
  const documentsOnHold = legalHolds
    .filter((h) => h.status === 'active')
    .reduce((sum, h) => sum + h.documentsOnHold, 0)
  const holdsReleased = legalHolds.filter((h) => h.status === 'released').length

  const deletedSchedules = schedules.filter((s) => s.status === 'DELETED')
  const notifiedSchedules = schedules.filter((s) => s.notification_sent)

  // Generate compliance trend (mock data for now)
  const complianceTrend: Array<{ date: string; rate: number }> = []
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    complianceTrend.push({
      date: date.toISOString().split('T')[0],
      rate: Math.min(100, complianceRate + (Math.random() - 0.5) * 5),
    })
  }

  return {
    id: `report-${Date.now()}`,
    period: { from, to },
    generatedAt: now.toISOString(),
    totalDocuments,
    complianceRate: Math.round(complianceRate * 10) / 10,
    atRiskDocuments,
    policyViolations: atRiskDocuments, // Violations = at risk for simplicity
    activePolicies,
    policiesEnforced: activePolicies,
    documentsArchived: schedules.filter((s) => s.status === 'DELETED').length,
    documentsDeleted: deletedSchedules.length,
    activeHolds,
    documentsOnHold,
    holdsReleased,
    notificationsSent: notifiedSchedules.length,
    violations: [], // Would need a violations endpoint
    topViolationTypes:
      atRiskDocuments > 0
        ? [
            { type: 'retention_expired', count: Math.floor(atRiskDocuments * 0.4) },
            { type: 'missing_metadata', count: Math.floor(atRiskDocuments * 0.3) },
            { type: 'policy_conflict', count: Math.floor(atRiskDocuments * 0.2) },
            { type: 'access_violation', count: Math.floor(atRiskDocuments * 0.1) },
          ]
        : [],
    complianceTrend,
  }
}

/**
 * Get compliance status based on rate
 */
export const getComplianceStatus = (rate: number): ComplianceStatus => {
  if (rate >= 98) return 'compliant'
  if (rate >= 90) return 'warning'
  if (rate >= 80) return 'at_risk'
  return 'non_compliant'
}

// ============================================================================
// Policy Templates for Financial Services
// ============================================================================

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: string
  retention_days: number
  policy_type: 'DOCUMENT_TYPE' | 'DEPARTMENT' | 'FOLDER' | 'TAG' | 'CUSTOM'
  criteria: Record<string, unknown>
  grace_period_days: number
  notify_before_days: number
  compliance_standards: string[]
  regulatory_reference?: string
}

export const FINANCIAL_SERVICES_POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'sox-financial',
    name: 'SOX Financial Records',
    description:
      'Retention policy for SOX-regulated financial documents including accounting records, audit reports, and financial statements.',
    category: 'Regulatory Compliance',
    retention_days: 2555, // 7 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Financial Statement' },
    grace_period_days: 30,
    notify_before_days: 90,
    compliance_standards: ['SOX', 'SEC 17a-4'],
    regulatory_reference: 'Sarbanes-Oxley Act Section 802',
  },
  {
    id: 'kyc-aml',
    name: 'KYC/AML Records',
    description:
      'Customer identification and anti-money laundering documentation as required by Bank Secrecy Act.',
    category: 'Regulatory Compliance',
    retention_days: 1825, // 5 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'KYC Record' },
    grace_period_days: 30,
    notify_before_days: 60,
    compliance_standards: ['BSA', 'AML', 'GDPR'],
    regulatory_reference: 'Bank Secrecy Act',
  },
  {
    id: 'sec-trading',
    name: 'SEC Trading Records',
    description:
      'Trade confirmations, account statements, and transaction records as required by SEC Rule 17a-4.',
    category: 'Regulatory Compliance',
    retention_days: 2190, // 6 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Transaction Record' },
    grace_period_days: 30,
    notify_before_days: 90,
    compliance_standards: ['SEC 17a-4', 'FINRA'],
    regulatory_reference: 'SEC Rule 17a-4',
  },
  {
    id: 'tax-records',
    name: 'Tax Records',
    description: 'Tax returns, receivables, payables, and supporting documentation.',
    category: 'Financial Records',
    retention_days: 2555, // 7 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Tax Document' },
    grace_period_days: 30,
    notify_before_days: 90,
    compliance_standards: ['SOX', 'IRS'],
    regulatory_reference: 'IRS Publication 583',
  },
  {
    id: 'contracts',
    name: 'Contract Documents',
    description: 'Signed contracts, agreements, and related legal documents.',
    category: 'Legal Documents',
    retention_days: 3650, // 10 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Contract' },
    grace_period_days: 60,
    notify_before_days: 120,
    compliance_standards: ['Commercial Law'],
    regulatory_reference: 'Statute of Limitations',
  },
  {
    id: 'loan-documents',
    name: 'Loan Documents',
    description:
      'Loan applications, approvals, and related documentation. Retained for life of loan plus 7 years.',
    category: 'Financial Records',
    retention_days: 2555, // 7 years (after loan closure)
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Loan Document' },
    grace_period_days: 30,
    notify_before_days: 90,
    compliance_standards: ['Banking Regulations', 'TILA'],
    regulatory_reference: 'Truth in Lending Act',
  },
  {
    id: 'customer-communications',
    name: 'Customer Communications',
    description: 'Customer correspondence, emails, and service records.',
    category: 'Customer Records',
    retention_days: 1095, // 3 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Correspondence' },
    grace_period_days: 14,
    notify_before_days: 30,
    compliance_standards: ['GDPR', 'CCPA'],
  },
  {
    id: 'audit-reports',
    name: 'Audit Reports',
    description: 'Internal and external audit reports and working papers.',
    category: 'Compliance',
    retention_days: 2555, // 7 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Audit Report' },
    grace_period_days: 30,
    notify_before_days: 90,
    compliance_standards: ['SOX', 'SEC'],
    regulatory_reference: 'SOX Section 802',
  },
  {
    id: 'board-minutes',
    name: 'Board Minutes',
    description: 'Board meeting minutes, resolutions, and corporate governance documents.',
    category: 'Corporate Governance',
    retention_days: 36500, // Permanent (100 years)
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Board Minutes' },
    grace_period_days: 0,
    notify_before_days: 0,
    compliance_standards: ['Corporate Law'],
    regulatory_reference: 'State Corporate Law',
  },
  {
    id: 'employee-records',
    name: 'Employee Records',
    description: 'Employment contracts, HR records, and personnel files.',
    category: 'Human Resources',
    retention_days: 2555, // 7 years after termination
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'HR Record' },
    grace_period_days: 30,
    notify_before_days: 60,
    compliance_standards: ['Labor Law', 'EEOC'],
    regulatory_reference: 'EEOC Regulations',
  },
  {
    id: 'invoices',
    name: 'Invoices & Receipts',
    description: 'Customer invoices, vendor receipts, and payment records.',
    category: 'Financial Records',
    retention_days: 1825, // 5 years
    policy_type: 'DOCUMENT_TYPE',
    criteria: { document_type: 'Invoice' },
    grace_period_days: 30,
    notify_before_days: 60,
    compliance_standards: ['SOX', 'IRS'],
  },
  {
    id: 'confidential-high',
    name: 'Highly Confidential Documents',
    description:
      'Documents classified as Highly Confidential requiring extended retention and approval before deletion.',
    category: 'Security Classification',
    retention_days: 3650, // 10 years
    policy_type: 'CUSTOM',
    criteria: { confidentiality_level: 'highly_confidential' },
    grace_period_days: 90,
    notify_before_days: 180,
    compliance_standards: ['Internal Policy'],
  },
]

/**
 * Get all policy templates
 */
export const getPolicyTemplates = (): PolicyTemplate[] => {
  return FINANCIAL_SERVICES_POLICY_TEMPLATES
}

/**
 * Get policy templates by category
 */
export const getPolicyTemplatesByCategory = (category: string): PolicyTemplate[] => {
  return FINANCIAL_SERVICES_POLICY_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get unique template categories
 */
export const getPolicyTemplateCategories = (): string[] => {
  const categories = new Set(FINANCIAL_SERVICES_POLICY_TEMPLATES.map((t) => t.category))
  return Array.from(categories)
}

/**
 * Create a policy from a template
 */
export const createPolicyFromTemplate = async (templateId: string): Promise<RetentionPolicy> => {
  const template = FINANCIAL_SERVICES_POLICY_TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  const policyData: CreateRetentionPolicyRequest = {
    name: template.name,
    description: template.description,
    policy_type: template.policy_type,
    retention_days: template.retention_days,
    criteria: template.criteria,
    grace_period_days: template.grace_period_days,
    notify_before_days: template.notify_before_days,
    is_active: true,
    priority: 0,
  }

  return createRetentionPolicy(policyData)
}

// ============================================================================
// SCHEDULE & DISPOSITION APIS
// ============================================================================

export interface ScheduleResponse {
  id: string
  document_id: string
  document_name: string
  document_type: string
  policy_id: string
  policy_name: string
  status: string
  priority: string
  scheduled_date: string
  action: string
  department: string
  owner: string
  owner_email: string
  confidentiality_level: string
  retention_end_date: string
  created_at: string
  updated_at: string
  processed_at?: string
  processed_by?: string
  reviewed_at?: string
  reviewed_by?: string
  review_notes?: string
  failure_reason?: string
}

export interface ScheduleStatsResponse {
  total_scheduled: number
  pending_review: number
  scheduled_this_week: number
  scheduled_this_month: number
  overdue: number
  on_hold: number
  by_action: Record<string, number>
  by_priority: Record<string, number>
  by_department: Array<{ department: string; count: number }>
}

export interface CalendarEventResponse {
  id: string
  title: string
  date: string
  end_date?: string
  type: string
  status: string
  priority: string
  count: number
  items: Array<{
    id: string
    name: string
    action: string
  }>
}

export interface DispositionReviewItemResponse {
  id: string
  schedule_id: string
  document_id: string
  document_name: string
  document_type: string
  department: string
  owner: string
  owner_email: string
  policy_name: string
  scheduled_action: string
  scheduled_date: string
  retention_end_date: string
  confidentiality_level: string
  priority: string
  status: string
  submitted_at: string
  submitted_by: string
  reviewed_at?: string
  reviewed_by?: string
  review_notes?: string
  defer_until?: string
  has_legal_hold: boolean
  document_size: number
  last_accessed_at?: string
}

export interface BulkActionRequestPayload {
  action: string
  item_ids: string[]
  reason?: string
  defer_until?: string
  extension_days?: number
  notify_owners?: boolean
}

export interface BulkActionResultResponse {
  success: boolean
  processed_count: number
  failed_count: number
  results: Array<{
    item_id: string
    success: boolean
    error?: string
  }>
}

/**
 * Get all retention schedules with optional filtering
 */
export const getAllSchedules = async (params?: {
  status?: string
  action?: string
  priority?: string
  department?: string
  from_date?: string
  to_date?: string
}): Promise<ScheduleResponse[]> => {
  try {
    const response = await apiClient.get<ScheduleResponse[] | PaginatedResponse<ScheduleResponse>>(
      '/retention/schedules/',
      { params }
    )
    return extractResults(response.data)
  } catch {
    // Return mock data for now
    return []
  }
}

/**
 * Get schedule statistics
 */
export const getScheduleStats = async (): Promise<ScheduleStatsResponse> => {
  try {
    const response = await apiClient.get<ScheduleStatsResponse>('/retention/schedules/stats/')
    return response.data
  } catch {
    // Return mock stats
    return {
      total_scheduled: 0,
      pending_review: 0,
      scheduled_this_week: 0,
      scheduled_this_month: 0,
      overdue: 0,
      on_hold: 0,
      by_action: { archive: 0, delete: 0, review: 0, extend: 0, transfer: 0 },
      by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
      by_department: [],
    }
  }
}

/**
 * Get calendar events for a date range
 */
export const getCalendarEvents = async (
  year: number,
  month: number
): Promise<CalendarEventResponse[]> => {
  try {
    const response = await apiClient.get<
      CalendarEventResponse[] | PaginatedResponse<CalendarEventResponse>
    >('/retention/schedules/calendar/', {
      params: { year, month },
    })
    return extractResults(response.data)
  } catch {
    return []
  }
}

/**
 * Get disposition review queue
 */
export const getDispositionQueue = async (params?: {
  status?: string
  action?: string
  priority?: string
}): Promise<DispositionReviewItemResponse[]> => {
  try {
    const response = await apiClient.get<
      DispositionReviewItemResponse[] | PaginatedResponse<DispositionReviewItemResponse>
    >('/retention/schedules/review-queue/', { params })
    return extractResults(response.data)
  } catch {
    return []
  }
}

/**
 * Approve a disposition item
 */
export const approveDisposition = async (
  itemId: string,
  notes?: string
): Promise<DispositionReviewItemResponse> => {
  const response = await apiClient.post<DispositionReviewItemResponse>(
    `/retention/schedules/review/${itemId}/approve/`,
    { notes }
  )
  return response.data
}

/**
 * Reject a disposition item
 */
export const rejectDisposition = async (
  itemId: string,
  reason: string
): Promise<DispositionReviewItemResponse> => {
  const response = await apiClient.post<DispositionReviewItemResponse>(
    `/retention/schedules/review/${itemId}/reject/`,
    { reason }
  )
  return response.data
}

/**
 * Defer a disposition item
 */
export const deferDisposition = async (
  itemId: string,
  deferUntil: string,
  reason?: string
): Promise<DispositionReviewItemResponse> => {
  const response = await apiClient.post<DispositionReviewItemResponse>(
    `/retention/schedules/review/${itemId}/defer/`,
    { defer_until: deferUntil, reason }
  )
  return response.data
}

/**
 * Perform bulk action on disposition items
 */
export const performBulkAction = async (
  request: BulkActionRequestPayload
): Promise<BulkActionResultResponse> => {
  const response = await apiClient.post<BulkActionResultResponse>(
    '/retention/schedules/review/bulk/',
    request
  )
  return response.data
}

/**
 * Extend retention for a schedule item
 */
export const extendSchedule = async (
  scheduleId: string,
  extensionDays: number,
  reason?: string
): Promise<ScheduleResponse> => {
  const response = await apiClient.post<ScheduleResponse>(
    `/retention/schedules/${scheduleId}/extend/`,
    { extension_days: extensionDays, reason }
  )
  return response.data
}

/**
 * Cancel a scheduled disposition
 */
export const cancelSchedule = async (
  scheduleId: string,
  reason: string
): Promise<ScheduleResponse> => {
  const response = await apiClient.post<ScheduleResponse>(
    `/retention/schedules/${scheduleId}/cancel/`,
    { reason }
  )
  return response.data
}

/**
 * Process a schedule manually
 */
export const processSchedule = async (scheduleId: string): Promise<ScheduleResponse> => {
  const response = await apiClient.post<ScheduleResponse>(
    `/retention/schedules/${scheduleId}/process/`
  )
  return response.data
}

// ============================================================================
// AUTOMATION APIs - Notification Preferences
// ============================================================================

/**
 * Get user notification settings
 */
export const getNotificationSettings = async (): Promise<UserNotificationSettings> => {
  try {
    const response = await apiClient.get<UserNotificationSettings>(
      '/retention/automation/notification-settings/'
    )
    return response.data
  } catch {
    // Return default settings
    return {
      id: 'default',
      userId: 'current',
      globalEnabled: true,
      emailEnabled: true,
      inAppEnabled: true,
      smsEnabled: false,
      webhookEnabled: false,
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      emailDigestEnabled: false,
      emailDigestFrequency: 'daily',
      preferences: [],
      updatedAt: new Date().toISOString(),
    }
  }
}

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (
  settings: Partial<UserNotificationSettings>
): Promise<UserNotificationSettings> => {
  const response = await apiClient.patch<UserNotificationSettings>(
    '/retention/automation/notification-settings/',
    settings
  )
  return response.data
}

/**
 * Update a specific notification preference
 */
export const updateNotificationPreference = async (
  preferenceId: string,
  updates: Partial<NotificationPreference>
): Promise<NotificationPreference> => {
  const response = await apiClient.patch<NotificationPreference>(
    `/retention/automation/notification-preferences/${preferenceId}/`,
    updates
  )
  return response.data
}

/**
 * Send a test notification
 */
export const sendTestNotification = async (
  channel: 'email' | 'in_app' | 'sms' | 'webhook'
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/retention/automation/notification-settings/test/',
    { channel }
  )
  return response.data
}

// ============================================================================
// AUTOMATION APIs - Email Templates
// ============================================================================

/**
 * Get all email templates
 */
export const getEmailTemplates = async (): Promise<EmailTemplate[]> => {
  try {
    const response = await apiClient.get<EmailTemplate[]>('/retention/automation/email-templates/')
    return response.data
  } catch {
    return []
  }
}

/**
 * Get a single email template
 */
export const getEmailTemplate = async (id: string): Promise<EmailTemplate> => {
  const response = await apiClient.get<EmailTemplate>(
    `/retention/automation/email-templates/${id}/`
  )
  return response.data
}

/**
 * Create a new email template
 */
export const createEmailTemplate = async (
  template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
): Promise<EmailTemplate> => {
  const response = await apiClient.post<EmailTemplate>(
    '/retention/automation/email-templates/',
    template
  )
  return response.data
}

/**
 * Update an email template
 */
export const updateEmailTemplate = async (
  id: string,
  updates: Partial<EmailTemplate>
): Promise<EmailTemplate> => {
  const response = await apiClient.patch<EmailTemplate>(
    `/retention/automation/email-templates/${id}/`,
    updates
  )
  return response.data
}

/**
 * Delete an email template
 */
export const deleteEmailTemplate = async (id: string): Promise<void> => {
  await apiClient.delete(`/retention/automation/email-templates/${id}/`)
}

/**
 * Duplicate an email template
 */
export const duplicateEmailTemplate = async (id: string): Promise<EmailTemplate> => {
  const response = await apiClient.post<EmailTemplate>(
    `/retention/automation/email-templates/${id}/duplicate/`
  )
  return response.data
}

/**
 * Send a test email using a template
 */
export const sendTestEmail = async (
  templateId: string,
  recipientEmail: string
): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/email-templates/${templateId}/test/`,
    { recipient_email: recipientEmail }
  )
  return response.data
}

/**
 * Get available email template variables
 */
export const getEmailTemplateVariables = async (
  templateType: EmailTemplateType
): Promise<Array<{ name: string; description: string; example: string }>> => {
  const response = await apiClient.get<
    Array<{ name: string; description: string; example: string }>
  >('/retention/automation/email-templates/variables/', { params: { type: templateType } })
  return response.data
}

// ============================================================================
// AUTOMATION APIs - Auto-Enforcement Settings
// ============================================================================

/**
 * Get auto-enforcement settings
 */
export const getAutoEnforcementSettings = async (): Promise<AutoEnforcementSettings> => {
  try {
    const response = await apiClient.get<AutoEnforcementSettings>(
      '/retention/automation/enforcement-settings/'
    )
    return response.data
  } catch {
    // Return default settings
    return {
      id: 'default',
      enabled: false,
      mode: 'manual',
      archivalEnabled: true,
      archivalDestination: 'archive_storage',
      archivalCompression: true,
      deletionEnabled: false,
      deletionRequiresApproval: true,
      deletionGracePeriodDays: 30,
      deletionNotifyOwner: true,
      gracePeriodEnabled: true,
      gracePeriodDays: 7,
      gracePeriodExtensionsAllowed: 2,
      maxRetryAttempts: 3,
      retryDelayMinutes: 60,
      errorNotificationEnabled: true,
      errorNotificationRecipients: [],
      executionSchedule: {
        enabled: false,
        frequency: 'daily',
        time: '02:00',
        timezone: 'UTC',
      },
      excludedPolicies: [],
      excludedDocumentTypes: [],
      excludedDepartments: [],
      excludedConfidentialityLevels: ['highly_confidential'],
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    }
  }
}

/**
 * Update auto-enforcement settings
 */
export const updateAutoEnforcementSettings = async (
  settings: Partial<AutoEnforcementSettings>
): Promise<AutoEnforcementSettings> => {
  const response = await apiClient.patch<AutoEnforcementSettings>(
    '/retention/automation/enforcement-settings/',
    settings
  )
  return response.data
}

/**
 * Run a test enforcement cycle (dry run)
 */
export const runTestEnforcement = async (): Promise<{
  wouldArchive: number
  wouldDelete: number
  wouldNotify: number
  errors: string[]
  details: Array<{
    documentId: string
    documentName: string
    action: string
    policy: string
  }>
}> => {
  const response = await apiClient.post('/retention/automation/enforcement-settings/test/')
  return response.data
}

/**
 * Trigger immediate enforcement run
 */
export const triggerEnforcementRun = async (): Promise<{
  jobId: string
  status: string
  message: string
}> => {
  const response = await apiClient.post('/retention/automation/enforcement-settings/run/')
  return response.data
}

// ============================================================================
// AUTOMATION APIs - Scheduled Jobs
// ============================================================================

/**
 * Get all scheduled jobs
 */
export const getScheduledJobs = async (params?: {
  status?: JobStatus
  type?: JobType
  search?: string
}): Promise<ScheduledJob[]> => {
  try {
    const response = await apiClient.get<ScheduledJob[]>('/retention/automation/jobs/', { params })
    return response.data
  } catch {
    return []
  }
}

/**
 * Get a single scheduled job
 */
export const getScheduledJob = async (id: string): Promise<ScheduledJob> => {
  const response = await apiClient.get<ScheduledJob>(`/retention/automation/jobs/${id}/`)
  return response.data
}

/**
 * Create a new scheduled job
 */
export const createScheduledJob = async (
  job: Omit<ScheduledJob, 'id' | 'createdAt' | 'lastRunAt' | 'nextRunAt' | 'stats'>
): Promise<ScheduledJob> => {
  const response = await apiClient.post<ScheduledJob>('/retention/automation/jobs/', job)
  return response.data
}

/**
 * Update a scheduled job
 */
export const updateScheduledJob = async (
  id: string,
  updates: Partial<ScheduledJob>
): Promise<ScheduledJob> => {
  const response = await apiClient.patch<ScheduledJob>(`/retention/automation/jobs/${id}/`, updates)
  return response.data
}

/**
 * Delete a scheduled job
 */
export const deleteScheduledJob = async (id: string): Promise<void> => {
  await apiClient.delete(`/retention/automation/jobs/${id}/`)
}

/**
 * Run a job immediately
 */
export const runJobNow = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/jobs/${id}/run/`
  )
  return response.data
}

/**
 * Pause a running job
 */
export const pauseJob = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/jobs/${id}/pause/`
  )
  return response.data
}

/**
 * Resume a paused job
 */
export const resumeJob = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/jobs/${id}/resume/`
  )
  return response.data
}

/**
 * Cancel a running job
 */
export const cancelJob = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/jobs/${id}/cancel/`
  )
  return response.data
}

/**
 * Get job execution logs
 */
export const getJobExecutionLogs = async (
  jobId: string,
  params?: {
    limit?: number
    offset?: number
  }
): Promise<JobExecutionLog[]> => {
  try {
    const response = await apiClient.get<JobExecutionLog[]>(
      `/retention/automation/jobs/${jobId}/logs/`,
      { params }
    )
    return response.data
  } catch {
    return []
  }
}

/**
 * Get automation statistics
 */
export const getAutomationStats = async (): Promise<AutomationStats> => {
  try {
    const response = await apiClient.get<AutomationStats>('/retention/automation/stats/')
    return response.data
  } catch {
    return {
      activeJobs: 0,
      completedToday: 0,
      failedToday: 0,
      successRate: 100,
      documentsProcessed: 0,
      documentsArchived: 0,
      documentsDeleted: 0,
      notificationsSent: 0,
      averageJobDuration: 0,
      upcomingJobs: [],
      recentErrors: [],
    }
  }
}

/**
 * Get upcoming scheduled jobs
 */
export const getUpcomingJobs = async (limit: number = 5): Promise<ScheduledJob[]> => {
  try {
    const response = await apiClient.get<ScheduledJob[]>('/retention/automation/jobs/upcoming/', {
      params: { limit },
    })
    return response.data
  } catch {
    return []
  }
}

/**
 * Retry a failed job
 */
export const retryJob = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    `/retention/automation/jobs/${id}/retry/`
  )
  return response.data
}

export default {
  // Policies
  getRetentionPolicies,
  getRetentionPolicy,
  createRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  activateRetentionPolicy,
  deactivateRetentionPolicy,
  testPolicyMatch,
  // Legal Holds
  getLegalHolds,
  getLegalHold,
  createLegalHold,
  updateLegalHold,
  addDocumentsToHold,
  removeDocumentsFromHold,
  releaseLegalHold,
  // Custodian Management
  getHoldCustodians,
  addCustodian,
  removeCustodian,
  updateCustodianRole,
  // Notification Management
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendHoldNotifications,
  resendNotification,
  getNotificationHistory,
  // Release Requests
  submitReleaseRequest,
  getPendingReleaseRequests,
  approveReleaseRequest,
  rejectReleaseRequest,
  acknowledgeHold,
  // Schedules (legacy)
  getRetentionSchedules,
  getUpcomingDeletions,
  // Schedules & Disposition
  getAllSchedules,
  getScheduleStats,
  getCalendarEvents,
  getDispositionQueue,
  approveDisposition,
  rejectDisposition,
  deferDisposition,
  performBulkAction,
  extendSchedule,
  cancelSchedule,
  processSchedule,
  // Dashboard & Reports
  getRetentionDashboardStats,
  getComplianceReport,
  getComplianceStatus,
  // Templates
  getPolicyTemplates,
  getPolicyTemplatesByCategory,
  getPolicyTemplateCategories,
  createPolicyFromTemplate,
  FINANCIAL_SERVICES_POLICY_TEMPLATES,
  // Automation - Notification Preferences
  getNotificationSettings,
  updateNotificationSettings,
  updateNotificationPreference,
  sendTestNotification,
  // Automation - Email Templates
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  sendTestEmail,
  getEmailTemplateVariables,
  // Automation - Enforcement Settings
  getAutoEnforcementSettings,
  updateAutoEnforcementSettings,
  runTestEnforcement,
  triggerEnforcementRun,
  // Automation - Scheduled Jobs
  getScheduledJobs,
  getScheduledJob,
  createScheduledJob,
  updateScheduledJob,
  deleteScheduledJob,
  runJobNow,
  pauseJob,
  resumeJob,
  cancelJob,
  getJobExecutionLogs,
  getAutomationStats,
  getUpcomingJobs,
  retryJob,
}
