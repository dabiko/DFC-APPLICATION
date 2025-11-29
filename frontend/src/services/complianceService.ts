/**
 * Compliance Service
 * API service for Compliance Center - regulations, controls, findings, assessments, and compliance management
 */

import apiClient from './apiClient'

// ============================================================================
// Type Definitions
// ============================================================================

// User minimal type for nested representations
export interface UserMinimal {
  id: string
  email: string
  full_name: string
}

// ============================================================================
// Regulation Types
// ============================================================================

export interface Regulation {
  id: string
  name: string
  short_name: string
  description: string
  jurisdiction: string
  effective_date: string
  status: 'active' | 'inactive' | 'draft' | 'archived'
  compliance_score: number
  last_assessment_date: string | null
  next_assessment_date: string | null
  control_count: number
  compliant_control_count: number
  finding_count: number
  assessment_count?: number
  created_by?: UserMinimal
  created_at: string
  updated_at: string
}

export interface CreateRegulationRequest {
  name: string
  short_name: string
  description?: string
  jurisdiction?: string
  effective_date?: string
  status?: 'active' | 'inactive' | 'draft' | 'archived'
  next_assessment_date?: string
}

// ============================================================================
// Control Types
// ============================================================================

export type ControlType = 'preventive' | 'detective' | 'corrective' | 'directive' | 'compensating'
export type ControlStatus =
  | 'compliant'
  | 'non_compliant'
  | 'partial'
  | 'not_assessed'
  | 'not_applicable'
export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type TestFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand'

export interface Control {
  id: string
  control_id: string
  name: string
  description: string
  control_type: ControlType
  status: ControlStatus
  regulation: string
  regulation_name?: string
  owner: string | null
  owner_name?: string
  department: string
  evidence_required: boolean
  test_frequency: TestFrequency
  last_tested_date: string | null
  next_test_date: string | null
  implementation_notes?: string
  remediation_plan?: string
  priority: Priority
  evidence_count: number
  finding_count?: number
  created_at: string
  updated_at: string
}

export interface CreateControlRequest {
  regulation: string
  control_id: string
  name: string
  description?: string
  control_type?: ControlType
  status?: ControlStatus
  owner?: string
  department?: string
  evidence_required?: boolean
  test_frequency?: TestFrequency
  next_test_date?: string
  implementation_notes?: string
  remediation_plan?: string
  priority?: Priority
}

// ============================================================================
// Control Evidence Types
// ============================================================================

export type EvidenceType =
  | 'document'
  | 'screenshot'
  | 'report'
  | 'log'
  | 'certificate'
  | 'test_result'
  | 'other'

export interface ControlEvidence {
  id: string
  control: string
  title: string
  description?: string
  evidence_type: EvidenceType
  document_id?: string
  file_path?: string
  external_url?: string
  collected_date: string
  valid_until?: string
  uploaded_by?: UserMinimal
  created_at: string
}

export interface CreateEvidenceRequest {
  control: string
  title: string
  description?: string
  evidence_type: EvidenceType
  document_id?: string
  file_path?: string
  external_url?: string
  collected_date?: string
  valid_until?: string
}

// ============================================================================
// Finding Types
// ============================================================================

export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FindingStatus =
  | 'open'
  | 'in_progress'
  | 'remediated'
  | 'closed'
  | 'accepted'
  | 'deferred'
export type RiskRating = 'low' | 'medium' | 'high' | 'critical'

export interface Finding {
  id: string
  finding_id: string
  title: string
  description?: string
  severity: FindingSeverity
  status: FindingStatus
  regulation: string
  regulation_name?: string
  control?: string
  control_name?: string
  assessment?: string
  impact_description?: string
  risk_rating: RiskRating
  remediation_plan?: string
  remediation_due_date?: string
  remediation_completed_date?: string
  owner?: string
  owner_name?: string
  department?: string
  identified_date: string
  identified_by?: UserMinimal
  is_overdue: boolean
  created_at: string
  updated_at: string
}

export interface CreateFindingRequest {
  finding_id?: string
  title: string
  description?: string
  severity: FindingSeverity
  status?: FindingStatus
  regulation: string
  control?: string
  assessment?: string
  impact_description?: string
  risk_rating?: RiskRating
  remediation_plan?: string
  remediation_due_date?: string
  remediation_completed_date?: string
  owner?: string
  department?: string
}

// ============================================================================
// Assessment Types
// ============================================================================

export type AssessmentType =
  | 'internal'
  | 'external'
  | 'self_assessment'
  | 'certification'
  | 'gap_analysis'
export type AssessmentStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface Assessment {
  id: string
  name: string
  description?: string
  regulation: string
  regulation_name?: string
  assessment_type: AssessmentType
  status: AssessmentStatus
  scheduled_date: string
  start_date?: string
  end_date?: string
  overall_score?: number
  summary?: string
  lead_assessor?: string
  lead_assessor_name?: string
  assessor_organization?: string
  finding_count: number
  created_at: string
  updated_at: string
}

export interface CreateAssessmentRequest {
  name: string
  description?: string
  regulation: string
  assessment_type: AssessmentType
  status?: AssessmentStatus
  scheduled_date: string
  start_date?: string
  end_date?: string
  overall_score?: number
  summary?: string
  lead_assessor?: string
  assessor_organization?: string
}

// ============================================================================
// Document Compliance Types
// ============================================================================

export type CheckType = 'metadata' | 'naming' | 'classification' | 'retention' | 'access'
export type CheckStatus = 'compliant' | 'non_compliant' | 'warning' | 'pending'

export interface DocumentComplianceCheck {
  id: string
  document_id: string
  document_name: string
  folder_path?: string
  check_type: CheckType
  check_type_display: string
  status: CheckStatus
  status_display: string
  issues: Record<string, unknown>[]
  issue_count: number
  can_auto_fix: boolean
  auto_fix_applied: boolean
  last_checked: string
  checked_by?: string
  created_at: string
}

export interface DocumentComplianceStats {
  total_documents: number
  compliant_documents: number
  non_compliant_documents: number
  compliance_rate: number
  issues_by_type: Record<string, number>
  auto_fixable_count: number
}

// ============================================================================
// Compliance Score Types
// ============================================================================

export type ScoreScope = 'organization' | 'department' | 'regulation' | 'control_type'

export interface ComplianceScore {
  id: string
  scope: ScoreScope
  scope_identifier: string
  score: number
  breakdown: Record<string, number>
  total_controls: number
  compliant_controls: number
  open_findings: number
  documents_at_risk: number
  recorded_at: string
}

// ============================================================================
// Compliance Alert Types
// ============================================================================

export type AlertType =
  | 'control_due'
  | 'finding_overdue'
  | 'assessment_due'
  | 'score_drop'
  | 'policy_violation'
  | 'document_risk'
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface ComplianceAlert {
  id: string
  alert_type: AlertType
  alert_type_display: string
  severity: AlertSeverity
  severity_display: string
  title: string
  message: string
  related_object_type?: string
  related_object_id?: string
  is_read: boolean
  is_dismissed: boolean
  created_at: string
  read_at?: string
  dismissed_at?: string
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface ComplianceDashboard {
  overall_score: number
  score_trend: number

  // Framework breakdown
  framework_scores: Array<{
    id: string
    name: string
    short_name: string
    score: number
    status: string
    controls: number
    compliant_controls: number
    findings: number
  }>

  // Key metrics
  total_regulations: number
  active_regulations: number
  total_controls: number
  compliant_controls: number
  non_compliant_controls: number

  // Findings
  open_findings: number
  critical_findings: number
  overdue_findings: number

  // Documents
  total_documents: number
  compliant_documents: number
  documents_at_risk: number

  // Assessments
  upcoming_assessments: number
  overdue_assessments: number

  // Alerts
  unread_alerts: number
  critical_alerts: number

  // Recent activity
  recent_activity: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user?: string
  }>
}

export interface RiskMatrix {
  matrix: Array<
    Array<{
      likelihood: string
      impact: string
      count: number
      findings: string[]
    }>
  >
  total_risks: number
  critical_risks: number
  high_risks: number
}

export interface QuickStats {
  compliance_score: number
  score_change: number
  open_findings: number
  findings_change: number
  upcoming_assessments: number
  documents_at_risk: number
}

// ============================================================================
// Helper Types
// ============================================================================

interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

function extractResults<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data
  }
  return data.results || []
}

// ============================================================================
// Regulation APIs
// ============================================================================

export const getRegulations = async (params?: {
  status?: string
  search?: string
}): Promise<Regulation[]> => {
  const response = await apiClient.get<Regulation[] | PaginatedResponse<Regulation>>(
    '/compliance/regulations/',
    { params }
  )
  return extractResults(response.data)
}

export const getRegulation = async (id: string): Promise<Regulation> => {
  const response = await apiClient.get<Regulation>(`/compliance/regulations/${id}/`)
  return response.data
}

export const createRegulation = async (data: CreateRegulationRequest): Promise<Regulation> => {
  const response = await apiClient.post<Regulation>('/compliance/regulations/', data)
  return response.data
}

export const updateRegulation = async (
  id: string,
  data: Partial<CreateRegulationRequest>
): Promise<Regulation> => {
  const response = await apiClient.patch<Regulation>(`/compliance/regulations/${id}/`, data)
  return response.data
}

export const deleteRegulation = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/regulations/${id}/`)
}

export const getRegulationControls = async (regulationId: string): Promise<Control[]> => {
  const response = await apiClient.get<Control[] | PaginatedResponse<Control>>(
    `/compliance/regulations/${regulationId}/controls/`
  )
  return extractResults(response.data)
}

export const getRegulationFindings = async (regulationId: string): Promise<Finding[]> => {
  const response = await apiClient.get<Finding[] | PaginatedResponse<Finding>>(
    `/compliance/regulations/${regulationId}/findings/`
  )
  return extractResults(response.data)
}

export const getRegulationAssessments = async (regulationId: string): Promise<Assessment[]> => {
  const response = await apiClient.get<Assessment[] | PaginatedResponse<Assessment>>(
    `/compliance/regulations/${regulationId}/assessments/`
  )
  return extractResults(response.data)
}

export const recalculateRegulationScore = async (
  regulationId: string
): Promise<{ score: number; status: string }> => {
  const response = await apiClient.post<{ score: number; status: string }>(
    `/compliance/regulations/${regulationId}/recalculate_score/`
  )
  return response.data
}

// ============================================================================
// Control APIs
// ============================================================================

export const getControls = async (params?: {
  regulation?: string
  status?: string
  control_type?: string
  department?: string
  search?: string
}): Promise<Control[]> => {
  const response = await apiClient.get<Control[] | PaginatedResponse<Control>>(
    '/compliance/controls/',
    { params }
  )
  return extractResults(response.data)
}

export const getControl = async (id: string): Promise<Control> => {
  const response = await apiClient.get<Control>(`/compliance/controls/${id}/`)
  return response.data
}

export const createControl = async (data: CreateControlRequest): Promise<Control> => {
  const response = await apiClient.post<Control>('/compliance/controls/', data)
  return response.data
}

export const updateControl = async (
  id: string,
  data: Partial<CreateControlRequest>
): Promise<Control> => {
  const response = await apiClient.patch<Control>(`/compliance/controls/${id}/`, data)
  return response.data
}

export const deleteControl = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/controls/${id}/`)
}

export const getControlEvidence = async (controlId: string): Promise<ControlEvidence[]> => {
  const response = await apiClient.get<ControlEvidence[] | PaginatedResponse<ControlEvidence>>(
    `/compliance/controls/${controlId}/evidence/`
  )
  return extractResults(response.data)
}

export const addControlEvidence = async (
  controlId: string,
  data: Omit<CreateEvidenceRequest, 'control'>
): Promise<ControlEvidence> => {
  const response = await apiClient.post<ControlEvidence>(
    `/compliance/controls/${controlId}/add_evidence/`,
    data
  )
  return response.data
}

export const recordControlTest = async (
  controlId: string,
  data: { status: ControlStatus; notes?: string }
): Promise<Control> => {
  const response = await apiClient.post<Control>(
    `/compliance/controls/${controlId}/record_test/`,
    data
  )
  return response.data
}

// ============================================================================
// Evidence APIs
// ============================================================================

export const getEvidence = async (params?: {
  control?: string
  evidence_type?: string
}): Promise<ControlEvidence[]> => {
  const response = await apiClient.get<ControlEvidence[] | PaginatedResponse<ControlEvidence>>(
    '/compliance/evidence/',
    { params }
  )
  return extractResults(response.data)
}

export const createEvidence = async (data: CreateEvidenceRequest): Promise<ControlEvidence> => {
  const response = await apiClient.post<ControlEvidence>('/compliance/evidence/', data)
  return response.data
}

export const updateEvidence = async (
  id: string,
  data: Partial<CreateEvidenceRequest>
): Promise<ControlEvidence> => {
  const response = await apiClient.patch<ControlEvidence>(`/compliance/evidence/${id}/`, data)
  return response.data
}

export const deleteEvidence = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/evidence/${id}/`)
}

// ============================================================================
// Finding APIs
// ============================================================================

export const getFindings = async (params?: {
  regulation?: string
  control?: string
  status?: string
  severity?: string
  is_overdue?: boolean
  search?: string
}): Promise<Finding[]> => {
  const response = await apiClient.get<Finding[] | PaginatedResponse<Finding>>(
    '/compliance/findings/',
    { params }
  )
  return extractResults(response.data)
}

export const getFinding = async (id: string): Promise<Finding> => {
  const response = await apiClient.get<Finding>(`/compliance/findings/${id}/`)
  return response.data
}

export const createFinding = async (data: CreateFindingRequest): Promise<Finding> => {
  const response = await apiClient.post<Finding>('/compliance/findings/', data)
  return response.data
}

export const updateFinding = async (
  id: string,
  data: Partial<CreateFindingRequest>
): Promise<Finding> => {
  const response = await apiClient.patch<Finding>(`/compliance/findings/${id}/`, data)
  return response.data
}

export const deleteFinding = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/findings/${id}/`)
}

export const updateFindingStatus = async (
  id: string,
  status: FindingStatus,
  notes?: string
): Promise<Finding> => {
  const response = await apiClient.post<Finding>(`/compliance/findings/${id}/update_status/`, {
    status,
    notes,
  })
  return response.data
}

// ============================================================================
// Assessment APIs
// ============================================================================

export const getAssessments = async (params?: {
  regulation?: string
  status?: string
  assessment_type?: string
  search?: string
}): Promise<Assessment[]> => {
  const response = await apiClient.get<Assessment[] | PaginatedResponse<Assessment>>(
    '/compliance/assessments/',
    { params }
  )
  return extractResults(response.data)
}

export const getAssessment = async (id: string): Promise<Assessment> => {
  const response = await apiClient.get<Assessment>(`/compliance/assessments/${id}/`)
  return response.data
}

export const createAssessment = async (data: CreateAssessmentRequest): Promise<Assessment> => {
  const response = await apiClient.post<Assessment>('/compliance/assessments/', data)
  return response.data
}

export const updateAssessment = async (
  id: string,
  data: Partial<CreateAssessmentRequest>
): Promise<Assessment> => {
  const response = await apiClient.patch<Assessment>(`/compliance/assessments/${id}/`, data)
  return response.data
}

export const deleteAssessment = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/assessments/${id}/`)
}

export const startAssessment = async (id: string): Promise<Assessment> => {
  const response = await apiClient.post<Assessment>(`/compliance/assessments/${id}/start/`)
  return response.data
}

export const completeAssessment = async (
  id: string,
  data: { overall_score?: number; summary?: string }
): Promise<Assessment> => {
  const response = await apiClient.post<Assessment>(`/compliance/assessments/${id}/complete/`, data)
  return response.data
}

// ============================================================================
// Document Compliance Check APIs
// ============================================================================

export const getDocumentComplianceChecks = async (params?: {
  status?: string
  check_type?: string
  document_id?: string
}): Promise<DocumentComplianceCheck[]> => {
  const response = await apiClient.get<
    DocumentComplianceCheck[] | PaginatedResponse<DocumentComplianceCheck>
  >('/compliance/document-checks/', { params })
  return extractResults(response.data)
}

export const getDocumentComplianceStats = async (): Promise<DocumentComplianceStats> => {
  const response = await apiClient.get<DocumentComplianceStats>(
    '/compliance/document-checks/stats/'
  )
  return response.data
}

export const getDocumentComplianceIssues = async (): Promise<DocumentComplianceCheck[]> => {
  const response = await apiClient.get<
    DocumentComplianceCheck[] | PaginatedResponse<DocumentComplianceCheck>
  >('/compliance/document-checks/issues/')
  return extractResults(response.data)
}

export const runDocumentComplianceCheck = async (
  documentId: string
): Promise<DocumentComplianceCheck[]> => {
  const response = await apiClient.post<DocumentComplianceCheck[]>(
    '/compliance/document-checks/check/',
    { document_id: documentId }
  )
  return response.data
}

export const autoFixDocumentIssues = async (checkId: string): Promise<DocumentComplianceCheck> => {
  const response = await apiClient.post<DocumentComplianceCheck>(
    `/compliance/document-checks/${checkId}/auto_fix/`
  )
  return response.data
}

// ============================================================================
// Compliance Score APIs
// ============================================================================

export const getComplianceScores = async (params?: {
  scope?: ScoreScope
  scope_identifier?: string
}): Promise<ComplianceScore[]> => {
  const response = await apiClient.get<ComplianceScore[] | PaginatedResponse<ComplianceScore>>(
    '/compliance/scores/',
    { params }
  )
  return extractResults(response.data)
}

export const getComplianceScoreTrend = async (params?: {
  scope?: ScoreScope
  scope_identifier?: string
  days?: number
}): Promise<Array<{ date: string; score: number }>> => {
  const response = await apiClient.get<Array<{ date: string; score: number }>>(
    '/compliance/scores/trend/',
    { params }
  )
  return response.data
}

// ============================================================================
// Compliance Alert APIs
// ============================================================================

export const getComplianceAlerts = async (params?: {
  severity?: string
  alert_type?: string
  is_read?: boolean
  is_dismissed?: boolean
}): Promise<ComplianceAlert[]> => {
  const response = await apiClient.get<ComplianceAlert[] | PaginatedResponse<ComplianceAlert>>(
    '/compliance/alerts/',
    { params }
  )
  return extractResults(response.data)
}

export const markAlertRead = async (id: string): Promise<ComplianceAlert> => {
  const response = await apiClient.post<ComplianceAlert>(`/compliance/alerts/${id}/mark_read/`)
  return response.data
}

export const dismissAlert = async (id: string): Promise<ComplianceAlert> => {
  const response = await apiClient.post<ComplianceAlert>(`/compliance/alerts/${id}/dismiss/`)
  return response.data
}

export const markAllAlertsRead = async (): Promise<{ updated: number }> => {
  const response = await apiClient.post<{ updated: number }>('/compliance/alerts/mark_all_read/')
  return response.data
}

// ============================================================================
// Report Types
// ============================================================================

export type ReportType =
  | 'compliance_summary'
  | 'control_status'
  | 'finding_analysis'
  | 'risk_assessment'
  | 'audit_trail'
  | 'policy_acknowledgment'
  | 'dsar_status'
  | 'custom'

export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json'
export type ScheduleFrequency =
  | 'daily'
  | 'weekly'
  | 'bi_weekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
export type ScheduleStatus = 'active' | 'paused' | 'failed' | 'completed'
export type DeliveryMethod = 'email' | 'sftp' | 'sharepoint' | 'dashboard'

export interface ReportFilter {
  id: string
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: string | string[] | number | [number, number]
}

export interface ReportVisualization {
  id: string
  type: 'bar' | 'line' | 'pie' | 'donut' | 'table' | 'metric' | 'heatmap'
  title: string
  dataField: string
  groupBy?: string
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
}

export interface ReportConfig {
  id: string
  name: string
  description: string
  type: ReportType
  dataSources: string[]
  filters: ReportFilter[]
  columns: Array<{
    id: string
    field: string
    label: string
    visible: boolean
    sortable: boolean
    width?: number
  }>
  visualizations: ReportVisualization[]
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateRange?: {
    start: string
    end: string
  }
}

export interface SavedReport {
  id: string
  name: string
  description: string
  config: ReportConfig
  created_by: string
  created_at: string
  updated_at: string
  is_template: boolean
  is_favorite: boolean
}

export interface ReportTemplate {
  id: string
  name: string
  description: string
  category: 'compliance' | 'risk' | 'audit' | 'privacy' | 'executive' | 'operational'
  frequency: ScheduleFrequency | 'on_demand'
  data_sources: string[]
  visualizations: string[]
  is_featured: boolean
  use_count: number
  last_generated?: string
  created_by: string
  tags: string[]
}

export interface ScheduleRecipient {
  id: string
  name: string
  email: string
  type: 'user' | 'group' | 'external'
}

export interface ScheduleExecution {
  id: string
  executed_at: string
  status: 'success' | 'failed' | 'partial'
  duration_seconds: number
  records_processed: number
  file_size_kb: number
  error_message?: string
}

export interface ScheduledReport {
  id: string
  name: string
  description: string
  report_template_id?: string
  report_template_name?: string
  report_config?: ReportConfig
  frequency: ScheduleFrequency
  status: ScheduleStatus
  next_run: string
  last_run?: string
  last_run_status?: 'success' | 'failed' | 'partial'
  export_format: ReportFormat
  delivery_method: DeliveryMethod
  recipients: ScheduleRecipient[]
  time_of_day: string
  day_of_week?: number
  day_of_month?: number
  timezone: string
  include_empty: boolean
  notify_on_failure: boolean
  retry_on_failure: boolean
  execution_history: ScheduleExecution[]
  created_by: string
  created_at: string
  updated_at: string
}

export interface GeneratedReport {
  id: string
  name: string
  report_config_id?: string
  template_id?: string
  format: ReportFormat
  file_url: string
  file_size_kb: number
  records_count: number
  generated_at: string
  generated_by: string
  expires_at?: string
}

export interface ReportData {
  columns: Array<{ field: string; label: string; type: string }>
  rows: Array<Record<string, unknown>>
  summary?: Record<string, number | string>
  charts?: Array<{
    type: string
    title: string
    data: Array<{ label: string; value: number }>
  }>
  metadata: {
    total_records: number
    generated_at: string
    date_range?: { start: string; end: string }
    filters_applied: number
  }
}

// ============================================================================
// Dashboard APIs
// ============================================================================

export const getDashboardOverview = async (): Promise<ComplianceDashboard> => {
  const response = await apiClient.get<ComplianceDashboard>('/compliance/dashboard/overview/')
  return response.data
}

export const getRiskMatrix = async (): Promise<RiskMatrix> => {
  const response = await apiClient.get<RiskMatrix>('/compliance/dashboard/risk_matrix/')
  return response.data
}

export const getQuickStats = async (): Promise<QuickStats> => {
  const response = await apiClient.get<QuickStats>('/compliance/dashboard/quick_stats/')
  return response.data
}

// ============================================================================
// Report APIs
// ============================================================================

// Saved Reports (Custom Reports)
export const getSavedReports = async (params?: {
  is_template?: boolean
  is_favorite?: boolean
  search?: string
}): Promise<SavedReport[]> => {
  const response = await apiClient.get<SavedReport[] | PaginatedResponse<SavedReport>>(
    '/compliance/reports/',
    { params }
  )
  return extractResults(response.data)
}

export const getSavedReport = async (id: string): Promise<SavedReport> => {
  const response = await apiClient.get<SavedReport>(`/compliance/reports/${id}/`)
  return response.data
}

export const createSavedReport = async (data: {
  name: string
  description?: string
  config: Omit<ReportConfig, 'id'>
  is_template?: boolean
}): Promise<SavedReport> => {
  const response = await apiClient.post<SavedReport>('/compliance/reports/', data)
  return response.data
}

export const updateSavedReport = async (
  id: string,
  data: Partial<{
    name: string
    description: string
    config: Partial<ReportConfig>
    is_favorite: boolean
  }>
): Promise<SavedReport> => {
  const response = await apiClient.patch<SavedReport>(`/compliance/reports/${id}/`, data)
  return response.data
}

export const deleteSavedReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/reports/${id}/`)
}

export const toggleReportFavorite = async (id: string): Promise<SavedReport> => {
  const response = await apiClient.post<SavedReport>(`/compliance/reports/${id}/toggle_favorite/`)
  return response.data
}

// Report Templates
export const getReportTemplates = async (params?: {
  category?: string
  is_featured?: boolean
  search?: string
}): Promise<ReportTemplate[]> => {
  const response = await apiClient.get<ReportTemplate[] | PaginatedResponse<ReportTemplate>>(
    '/compliance/reports/templates/',
    { params }
  )
  return extractResults(response.data)
}

export const getReportTemplate = async (id: string): Promise<ReportTemplate> => {
  const response = await apiClient.get<ReportTemplate>(`/compliance/reports/templates/${id}/`)
  return response.data
}

// Report Generation
export const generateReport = async (data: {
  report_id?: string
  template_id?: string
  config?: ReportConfig
  format: ReportFormat
  date_range?: { start: string; end: string }
}): Promise<GeneratedReport> => {
  const response = await apiClient.post<GeneratedReport>('/compliance/reports/generate/', data)
  return response.data
}

export const getReportData = async (params: {
  report_id?: string
  template_id?: string
  config?: ReportConfig
  date_range?: { start: string; end: string }
}): Promise<ReportData> => {
  const response = await apiClient.post<ReportData>('/compliance/reports/data/', params)
  return response.data
}

export const downloadReport = async (reportId: string, format: ReportFormat): Promise<Blob> => {
  const response = await apiClient.get(`/compliance/reports/${reportId}/download/`, {
    params: { format },
    responseType: 'blob',
  })
  return response.data
}

export const getGeneratedReports = async (params?: {
  report_id?: string
  template_id?: string
  format?: ReportFormat
}): Promise<GeneratedReport[]> => {
  const response = await apiClient.get<GeneratedReport[] | PaginatedResponse<GeneratedReport>>(
    '/compliance/reports/generated/',
    { params }
  )
  return extractResults(response.data)
}

// Scheduled Reports
export const getScheduledReports = async (params?: {
  status?: ScheduleStatus
  frequency?: ScheduleFrequency
}): Promise<ScheduledReport[]> => {
  const response = await apiClient.get<ScheduledReport[] | PaginatedResponse<ScheduledReport>>(
    '/compliance/reports/scheduled/',
    { params }
  )
  return extractResults(response.data)
}

export const getScheduledReport = async (id: string): Promise<ScheduledReport> => {
  const response = await apiClient.get<ScheduledReport>(`/compliance/reports/scheduled/${id}/`)
  return response.data
}

export const createScheduledReport = async (data: {
  name: string
  description?: string
  report_template_id?: string
  report_config?: ReportConfig
  frequency: ScheduleFrequency
  export_format: ReportFormat
  delivery_method: DeliveryMethod
  recipients: Array<{ name: string; email: string; type: 'user' | 'group' | 'external' }>
  time_of_day: string
  day_of_week?: number
  day_of_month?: number
  timezone?: string
  include_empty?: boolean
  notify_on_failure?: boolean
  retry_on_failure?: boolean
}): Promise<ScheduledReport> => {
  const response = await apiClient.post<ScheduledReport>('/compliance/reports/scheduled/', data)
  return response.data
}

export const updateScheduledReport = async (
  id: string,
  data: Partial<{
    name: string
    description: string
    frequency: ScheduleFrequency
    export_format: ReportFormat
    delivery_method: DeliveryMethod
    recipients: Array<{ name: string; email: string; type: 'user' | 'group' | 'external' }>
    time_of_day: string
    day_of_week: number
    day_of_month: number
    timezone: string
    include_empty: boolean
    notify_on_failure: boolean
    retry_on_failure: boolean
  }>
): Promise<ScheduledReport> => {
  const response = await apiClient.patch<ScheduledReport>(
    `/compliance/reports/scheduled/${id}/`,
    data
  )
  return response.data
}

export const deleteScheduledReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/reports/scheduled/${id}/`)
}

export const toggleScheduledReportStatus = async (id: string): Promise<ScheduledReport> => {
  const response = await apiClient.post<ScheduledReport>(
    `/compliance/reports/scheduled/${id}/toggle_status/`
  )
  return response.data
}

export const runScheduledReportNow = async (id: string): Promise<GeneratedReport> => {
  const response = await apiClient.post<GeneratedReport>(
    `/compliance/reports/scheduled/${id}/run_now/`
  )
  return response.data
}

export const getScheduledReportHistory = async (id: string): Promise<ScheduleExecution[]> => {
  const response = await apiClient.get<ScheduleExecution[]>(
    `/compliance/reports/scheduled/${id}/history/`
  )
  return response.data
}

// Executive Dashboard Export
export const exportExecutiveDashboard = async (
  format: ReportFormat,
  timeRange?: string
): Promise<Blob> => {
  const response = await apiClient.get('/compliance/dashboard/export/', {
    params: { format, time_range: timeRange },
    responseType: 'blob',
  })
  return response.data
}

// ============================================================================
// Access Compliance Types
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type CampaignType =
  | 'user_access'
  | 'role_access'
  | 'privileged_access'
  | 'application_access'
  | 'entitlement'
export type ReviewDecision = 'approved' | 'revoked' | 'modified' | 'pending'
export type MFAStatus = 'enabled' | 'disabled' | 'pending' | 'expired'
export type MFAMethod = 'totp' | 'sms' | 'email' | 'hardware_token' | 'push_notification'
export type AnomalyType =
  | 'unusual_access_time'
  | 'unusual_location'
  | 'excessive_downloads'
  | 'privilege_escalation'
  | 'dormant_account_activity'
  | 'bulk_data_access'
  | 'failed_authentication'
  | 'unusual_permission_change'
export type AlertStatus = 'new' | 'investigating' | 'resolved' | 'false_positive' | 'escalated'

export interface AccessReviewCampaign {
  id: string
  name: string
  description: string
  type: CampaignType
  status: CampaignStatus
  scope: {
    departments?: string[]
    roles?: string[]
    applications?: string[]
    risk_levels?: string[]
  }
  reviewers: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  schedule: {
    start_date: string
    end_date: string
    reminder_frequency: 'daily' | 'weekly' | 'none'
  }
  progress: {
    total_items: number
    reviewed_items: number
    approved: number
    revoked: number
    modified: number
    pending: number
  }
  created_by: string
  created_at: string
  updated_at: string
}

export interface ReviewItem {
  id: string
  campaign_id: string
  user_id: string
  user_name: string
  user_email: string
  resource_type: string
  resource_name: string
  permission_level: string
  last_used?: string
  risk_score: number
  decision: ReviewDecision
  reviewer_id?: string
  reviewer_name?: string
  reviewed_at?: string
  comments?: string
}

export interface MFAUser {
  id: string
  name: string
  email: string
  department: string
  role: string
  mfa_status: MFAStatus
  mfa_method?: MFAMethod
  mfa_enabled_at?: string
  last_mfa_verification?: string
  is_admin: boolean
  is_privileged: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

export interface AnomalyAlert {
  id: string
  type: AnomalyType
  title: string
  description: string
  user_id: string
  user_name: string
  user_email: string
  risk_level: 'critical' | 'high' | 'medium' | 'low'
  status: AlertStatus
  detected_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  details: Record<string, unknown>
}

// ============================================================================
// Access Review Campaign APIs
// ============================================================================

export const getAccessReviewCampaigns = async (params?: {
  status?: CampaignStatus
  type?: CampaignType
}): Promise<AccessReviewCampaign[]> => {
  const response = await apiClient.get<
    AccessReviewCampaign[] | PaginatedResponse<AccessReviewCampaign>
  >('/compliance/access/campaigns/', { params })
  return extractResults(response.data)
}

export const getAccessReviewCampaign = async (id: string): Promise<AccessReviewCampaign> => {
  const response = await apiClient.get<AccessReviewCampaign>(`/compliance/access/campaigns/${id}/`)
  return response.data
}

export const createAccessReviewCampaign = async (
  data: Omit<AccessReviewCampaign, 'id' | 'created_at' | 'updated_at' | 'progress'>
): Promise<AccessReviewCampaign> => {
  const response = await apiClient.post<AccessReviewCampaign>('/compliance/access/campaigns/', data)
  return response.data
}

export const updateAccessReviewCampaign = async (
  id: string,
  data: Partial<AccessReviewCampaign>
): Promise<AccessReviewCampaign> => {
  const response = await apiClient.patch<AccessReviewCampaign>(
    `/compliance/access/campaigns/${id}/`,
    data
  )
  return response.data
}

export const deleteAccessReviewCampaign = async (id: string): Promise<void> => {
  await apiClient.delete(`/compliance/access/campaigns/${id}/`)
}

export const startAccessReviewCampaign = async (id: string): Promise<AccessReviewCampaign> => {
  const response = await apiClient.post<AccessReviewCampaign>(
    `/compliance/access/campaigns/${id}/start/`
  )
  return response.data
}

export const getCampaignReviewItems = async (
  campaignId: string,
  params?: {
    decision?: ReviewDecision
  }
): Promise<ReviewItem[]> => {
  const response = await apiClient.get<ReviewItem[] | PaginatedResponse<ReviewItem>>(
    `/compliance/access/campaigns/${campaignId}/items/`,
    { params }
  )
  return extractResults(response.data)
}

export const submitReviewDecision = async (
  campaignId: string,
  itemId: string,
  data: { decision: ReviewDecision; comments?: string }
): Promise<ReviewItem> => {
  const response = await apiClient.post<ReviewItem>(
    `/compliance/access/campaigns/${campaignId}/items/${itemId}/decide/`,
    data
  )
  return response.data
}

export const bulkSubmitReviewDecisions = async (
  campaignId: string,
  decisions: Array<{ item_id: string; decision: ReviewDecision; comments?: string }>
): Promise<{ success: number; failed: number }> => {
  const response = await apiClient.post<{ success: number; failed: number }>(
    `/compliance/access/campaigns/${campaignId}/bulk_decide/`,
    { decisions }
  )
  return response.data
}

// ============================================================================
// MFA Compliance APIs
// ============================================================================

export const getMFAUsers = async (params?: {
  status?: MFAStatus
  department?: string
  risk_level?: string
}): Promise<MFAUser[]> => {
  const response = await apiClient.get<MFAUser[] | PaginatedResponse<MFAUser>>(
    '/compliance/access/mfa/users/',
    { params }
  )
  return extractResults(response.data)
}

export const getMFAStats = async (): Promise<{
  total_users: number
  mfa_enabled: number
  mfa_disabled: number
  mfa_pending: number
  compliance_rate: number
  admin_compliance_rate: number
  privileged_compliance_rate: number
}> => {
  const response = await apiClient.get('/compliance/access/mfa/stats/')
  return response.data
}

export const enableUserMFA = async (userId: string): Promise<MFAUser> => {
  const response = await apiClient.post<MFAUser>(`/compliance/access/mfa/users/${userId}/enable/`)
  return response.data
}

export const sendMFAReminder = async (userId: string): Promise<{ sent: boolean }> => {
  const response = await apiClient.post<{ sent: boolean }>(
    `/compliance/access/mfa/users/${userId}/remind/`
  )
  return response.data
}

export const sendBulkMFAReminder = async (
  userIds?: string[]
): Promise<{ sent: number; failed: number }> => {
  const response = await apiClient.post<{ sent: number; failed: number }>(
    '/compliance/access/mfa/bulk_remind/',
    { user_ids: userIds }
  )
  return response.data
}

// ============================================================================
// Permission Analysis APIs
// ============================================================================

export const getPermissionIssues = async (params?: {
  severity?: string
  category?: string
}): Promise<
  Array<{
    id: string
    category: string
    severity: string
    title: string
    description: string
    affected_users: number
    affected_resources: number
    recommendation: string
    auto_fixable: boolean
  }>
> => {
  const response = await apiClient.get('/compliance/access/permissions/issues/', { params })
  return extractResults(response.data)
}

export const getRoleAnalysis = async (): Promise<
  Array<{
    id: string
    role_name: string
    users_count: number
    permissions_count: number
    unused_permissions: number
    excessive_permissions: number
    risk_score: number
    similar_roles: string[]
  }>
> => {
  const response = await apiClient.get('/compliance/access/permissions/roles/')
  return extractResults(response.data)
}

export const runPermissionAnalysis = async (): Promise<{ job_id: string }> => {
  const response = await apiClient.post<{ job_id: string }>(
    '/compliance/access/permissions/analyze/'
  )
  return response.data
}

export const autoFixPermissionIssue = async (
  issueId: string
): Promise<{ fixed: boolean; message: string }> => {
  const response = await apiClient.post<{ fixed: boolean; message: string }>(
    `/compliance/access/permissions/issues/${issueId}/fix/`
  )
  return response.data
}

// ============================================================================
// Anomaly Detection APIs
// ============================================================================

export const getAnomalyAlerts = async (params?: {
  status?: AlertStatus
  risk_level?: string
  type?: AnomalyType
}): Promise<AnomalyAlert[]> => {
  const response = await apiClient.get<AnomalyAlert[] | PaginatedResponse<AnomalyAlert>>(
    '/compliance/access/anomalies/',
    { params }
  )
  return extractResults(response.data)
}

export const getAnomalyAlert = async (id: string): Promise<AnomalyAlert> => {
  const response = await apiClient.get<AnomalyAlert>(`/compliance/access/anomalies/${id}/`)
  return response.data
}

export const updateAnomalyAlertStatus = async (
  id: string,
  data: { status: AlertStatus; resolution_notes?: string }
): Promise<AnomalyAlert> => {
  const response = await apiClient.patch<AnomalyAlert>(`/compliance/access/anomalies/${id}/`, data)
  return response.data
}

export const getAnomalyRules = async (): Promise<
  Array<{
    id: string
    name: string
    description: string
    type: AnomalyType
    is_active: boolean
    threshold: number
    timeframe_hours: number
    alert_count_24h: number
  }>
> => {
  const response = await apiClient.get('/compliance/access/anomalies/rules/')
  return extractResults(response.data)
}

export const toggleAnomalyRule = async (ruleId: string): Promise<{ is_active: boolean }> => {
  const response = await apiClient.post<{ is_active: boolean }>(
    `/compliance/access/anomalies/rules/${ruleId}/toggle/`
  )
  return response.data
}

export const getAnomalyStats = async (): Promise<{
  total_alerts_24h: number
  critical_alerts: number
  high_alerts: number
  investigating: number
  resolved_today: number
  false_positive_rate: number
  avg_resolution_time_hours: number
}> => {
  const response = await apiClient.get('/compliance/access/anomalies/stats/')
  return response.data
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Regulations
  getRegulations,
  getRegulation,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  getRegulationControls,
  getRegulationFindings,
  getRegulationAssessments,
  recalculateRegulationScore,
  // Controls
  getControls,
  getControl,
  createControl,
  updateControl,
  deleteControl,
  getControlEvidence,
  addControlEvidence,
  recordControlTest,
  // Evidence
  getEvidence,
  createEvidence,
  updateEvidence,
  deleteEvidence,
  // Findings
  getFindings,
  getFinding,
  createFinding,
  updateFinding,
  deleteFinding,
  updateFindingStatus,
  // Assessments
  getAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  startAssessment,
  completeAssessment,
  // Document Compliance
  getDocumentComplianceChecks,
  getDocumentComplianceStats,
  getDocumentComplianceIssues,
  runDocumentComplianceCheck,
  autoFixDocumentIssues,
  // Compliance Scores
  getComplianceScores,
  getComplianceScoreTrend,
  // Alerts
  getComplianceAlerts,
  markAlertRead,
  dismissAlert,
  markAllAlertsRead,
  // Dashboard
  getDashboardOverview,
  getRiskMatrix,
  getQuickStats,
  // Reports
  getSavedReports,
  getSavedReport,
  createSavedReport,
  updateSavedReport,
  deleteSavedReport,
  toggleReportFavorite,
  getReportTemplates,
  getReportTemplate,
  generateReport,
  getReportData,
  downloadReport,
  getGeneratedReports,
  getScheduledReports,
  getScheduledReport,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  toggleScheduledReportStatus,
  runScheduledReportNow,
  getScheduledReportHistory,
  exportExecutiveDashboard,
  // Access Review Campaigns
  getAccessReviewCampaigns,
  getAccessReviewCampaign,
  createAccessReviewCampaign,
  updateAccessReviewCampaign,
  deleteAccessReviewCampaign,
  startAccessReviewCampaign,
  getCampaignReviewItems,
  submitReviewDecision,
  bulkSubmitReviewDecisions,
  // MFA Compliance
  getMFAUsers,
  getMFAStats,
  enableUserMFA,
  sendMFAReminder,
  sendBulkMFAReminder,
  // Permission Analysis
  getPermissionIssues,
  getRoleAnalysis,
  runPermissionAnalysis,
  autoFixPermissionIssue,
  // Anomaly Detection
  getAnomalyAlerts,
  getAnomalyAlert,
  updateAnomalyAlertStatus,
  getAnomalyRules,
  toggleAnomalyRule,
  getAnomalyStats,
}
