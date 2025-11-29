/**
 * Workflow Service
 *
 * API client for workflow management operations.
 * Handles templates, instances, tasks, and statistics.
 */

import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type WorkflowStepType = 'APPROVAL' | 'REVIEW' | 'SIGN_OFF' | 'NOTIFICATION' | 'PARALLEL'
export type WorkflowApprovalType = 'ALL' | 'ANY' | 'MAJORITY' | 'PERCENTAGE'
export type WorkflowInstanceStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
export type WorkflowTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'SKIPPED'
  | 'DELEGATED'
  | 'EXPIRED'

export interface UserMinimal {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
}

export interface WorkflowStep {
  id: string
  name: string
  description: string
  order: number
  step_type: WorkflowStepType
  approval_type: WorkflowApprovalType
  approval_percentage?: number
  assigned_users: number[]
  assigned_users_detail?: UserMinimal[]
  assigned_role: string
  assigned_department?: number
  department_name?: string
  sla_hours?: number
  escalation_hours?: number
  escalate_to?: number
  conditions: Record<string, unknown>
  auto_approve_if_same_user: boolean
  require_comment: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  is_active: boolean
  is_system: boolean
  default_priority: WorkflowPriority
  default_due_days: number
  applicable_document_types: string[]
  times_used: number
  avg_completion_days?: number
  step_count: number
  steps?: WorkflowStep[]
  created_by: number
  created_by_name: string
  created_at: string
  updated_at: string
}

export interface WorkflowTask {
  id: string
  workflow_id: string
  document_id: string
  document_title: string
  workflow_name: string
  step_order: number
  step_name: string
  step_type: WorkflowStepType
  assigned_to: number
  assigned_to_name: string
  delegated_from?: number
  delegated_from_name?: string
  status: WorkflowTaskStatus
  action_taken: string
  priority: WorkflowPriority
  due_date?: string
  assigned_at: string
  completed_at?: string
  is_escalated: boolean
  is_read: boolean
  is_overdue: boolean
  comment: string
}

export interface WorkflowInstance {
  id: string
  template?: string
  template_name: string
  document: string
  document_title: string
  status: WorkflowInstanceStatus
  priority: WorkflowPriority
  current_step: number
  current_step_name?: string
  current_assignee?: Array<{ id: number; name: string }>
  due_date?: string
  started_at?: string
  completed_at?: string
  is_overdue: boolean
  days_remaining?: number
  initiated_by: number
  initiated_by_name: string
  notes: string
  outcome_reason: string
  tasks?: WorkflowTask[]
  created_at: string
  updated_at: string
}

export interface WorkflowComment {
  id: string
  workflow: string
  task?: string
  author: number
  author_name: string
  content: string
  mentions: number[]
  is_edited: boolean
  created_at: string
  updated_at: string
}

export interface WorkflowStats {
  total_active: number
  pending_my_action: number
  overdue: number
  completed_this_week: number
  completed_this_month: number
  avg_completion_days: number
}

export interface TaskStats {
  total_pending: number
  total_in_progress: number
  total_overdue: number
  unread: number
  completed_today: number
  completed_this_week: number
}

export interface AutoTriggerRule {
  id: string
  name: string
  description: string
  is_active: boolean
  workflow_template: string
  workflow_template_name: string
  workflow_template_detail?: {
    id: string
    name: string
    category: string
    step_count: number
    is_active: boolean
  }
  document_types: string[]
  trigger_folders: string[]
  trigger_folders_detail?: Array<{ id: string; name: string; path: string }>
  include_subfolders: boolean
  trigger_departments: number[]
  trigger_departments_detail?: Array<{ id: number; name: string }>
  confidentiality_levels: string[]
  min_file_size?: number
  max_file_size?: number
  additional_conditions: Record<string, unknown>
  default_priority: WorkflowPriority
  due_days_override?: number
  auto_start: boolean
  priority: number
  stop_processing: boolean
  times_triggered: number
  last_triggered_at?: string
  created_by: number
  created_by_name?: string
  created_by_detail?: UserMinimal
  created_at: string
  updated_at: string
  // List-specific fields
  trigger_folder_count?: number
  trigger_department_count?: number
}

export interface AutoTriggerTestResult {
  rule_id: string
  rule_name: string
  document_id: string
  document_title: string
  matches: boolean
  workflow_template?: {
    id: string
    name: string
  }
  would_auto_start: boolean
}

export interface AutoTriggerTestAllResult {
  document_id: string
  document_title: string
  total_rules_evaluated: number
  matching_rules_count: number
  matching_rules: Array<{
    id: string
    name: string
    priority: number
    matches: boolean
    workflow_template: string
    stop_processing: boolean
  }>
  first_match?: {
    id: string
    name: string
    priority: number
    matches: boolean
    workflow_template: string
    stop_processing: boolean
  }
  would_trigger_workflow: boolean
}

// =============================================================================
// API Functions - Templates
// =============================================================================

/**
 * Helper to extract array from paginated or direct response
 */
function extractResults<T>(data: T[] | { results: T[] }): T[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && 'results' in data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

/**
 * List workflow templates
 */
export async function getWorkflowTemplates(params?: {
  category?: string
  is_active?: boolean
}): Promise<WorkflowTemplate[]> {
  const response = await apiClient.get('/workflows/templates/', { params })
  return extractResults(response.data)
}

/**
 * Get a single workflow template
 */
export async function getWorkflowTemplate(id: string): Promise<WorkflowTemplate> {
  const response = await apiClient.get(`/workflows/templates/${id}/`)
  return response.data
}

/**
 * Create a workflow template
 */
export async function createWorkflowTemplate(data: {
  name: string
  description?: string
  category?: string
  default_priority?: WorkflowPriority
  default_due_days?: number
  applicable_document_types?: string[]
  steps?: Partial<WorkflowStep>[]
}): Promise<WorkflowTemplate> {
  const response = await apiClient.post('/workflows/templates/', data)
  return response.data
}

/**
 * Update a workflow template
 */
export async function updateWorkflowTemplate(
  id: string,
  data: Partial<WorkflowTemplate>
): Promise<WorkflowTemplate> {
  const response = await apiClient.put(`/workflows/templates/${id}/`, data)
  return response.data
}

/**
 * Delete a workflow template
 */
export async function deleteWorkflowTemplate(id: string): Promise<void> {
  await apiClient.delete(`/workflows/templates/${id}/`)
}

/**
 * Get template categories
 */
export async function getTemplateCategories(): Promise<string[]> {
  const response = await apiClient.get('/workflows/templates/categories/')
  return response.data.categories
}

// =============================================================================
// API Functions - Instances
// =============================================================================

/**
 * List workflow instances
 */
export async function getWorkflowInstances(params?: {
  status?: WorkflowInstanceStatus
  my_initiated?: boolean
  document_id?: string
  overdue?: boolean
}): Promise<WorkflowInstance[]> {
  const response = await apiClient.get('/workflows/instances/', { params })
  return extractResults(response.data)
}

/**
 * Get a single workflow instance
 */
export async function getWorkflowInstance(id: string): Promise<WorkflowInstance> {
  const response = await apiClient.get(`/workflows/instances/${id}/`)
  return response.data
}

/**
 * Start a new workflow
 */
export async function startWorkflow(data: {
  template_id: string
  document_id: string
  priority?: WorkflowPriority
  due_date?: string
  notes?: string
}): Promise<WorkflowInstance> {
  const response = await apiClient.post('/workflows/instances/', data)
  return response.data
}

/**
 * Cancel a workflow
 */
export async function cancelWorkflow(id: string, reason?: string): Promise<WorkflowInstance> {
  const response = await apiClient.post(`/workflows/instances/${id}/cancel/`, { reason })
  return response.data
}

/**
 * Start workflow directly from a document
 * This is the recommended way to start a workflow from the document context menu
 */
export async function startWorkflowFromDocument(data: {
  document_id: string
  template_id?: string // Optional - will auto-select best template if not provided
  priority?: WorkflowPriority
  notes?: string
}): Promise<WorkflowInstance> {
  const response = await apiClient.post('/workflows/instances/start-from-document/', data)
  return response.data
}

/**
 * Get applicable templates for a document
 */
export async function getApplicableTemplates(documentId: string): Promise<WorkflowTemplate[]> {
  const response = await apiClient.get('/workflows/templates/', {
    params: { is_active: true, document_id: documentId },
  })
  return extractResults(response.data)
}

// =============================================================================
// API Functions - Tasks
// =============================================================================

/**
 * List tasks (My Tasks inbox)
 */
export async function getMyTasks(params?: {
  status?: WorkflowTaskStatus | 'ALL'
  unread?: boolean
  overdue?: boolean
}): Promise<WorkflowTask[]> {
  const queryParams = { ...params }
  // Remove status filter if 'ALL' to get default behavior
  if (queryParams.status === 'ALL') {
    delete queryParams.status
  }
  const response = await apiClient.get('/workflows/tasks/', { params: queryParams })
  return extractResults(response.data)
}

/**
 * Get a single task
 */
export async function getTask(id: string): Promise<WorkflowTask> {
  const response = await apiClient.get(`/workflows/tasks/${id}/`)
  return response.data
}

/**
 * Approve a task
 */
export async function approveTask(id: string, comment?: string): Promise<WorkflowTask> {
  const response = await apiClient.post(`/workflows/tasks/${id}/take-action/`, {
    action: 'approve',
    comment,
  })
  return response.data
}

/**
 * Reject a task
 */
export async function rejectTask(id: string, comment?: string): Promise<WorkflowTask> {
  const response = await apiClient.post(`/workflows/tasks/${id}/take-action/`, {
    action: 'reject',
    comment,
  })
  return response.data
}

/**
 * Delegate a task
 */
export async function delegateTask(
  id: string,
  delegateTo: number,
  comment?: string
): Promise<WorkflowTask> {
  const response = await apiClient.post(`/workflows/tasks/${id}/take-action/`, {
    action: 'delegate',
    delegate_to: delegateTo,
    comment,
  })
  return response.data
}

/**
 * Mark task as read
 */
export async function markTaskAsRead(id: string): Promise<void> {
  await apiClient.post(`/workflows/tasks/${id}/mark-read/`)
}

// =============================================================================
// API Functions - Comments
// =============================================================================

/**
 * Get comments for a workflow
 */
export async function getWorkflowComments(workflowId: string): Promise<WorkflowComment[]> {
  const response = await apiClient.get(`/workflows/instances/${workflowId}/comments/`)
  return extractResults(response.data)
}

/**
 * Add a comment to a workflow
 */
export async function addWorkflowComment(
  workflowId: string,
  data: {
    content: string
    task?: string
    mentions?: number[]
  }
): Promise<WorkflowComment> {
  const response = await apiClient.post(`/workflows/instances/${workflowId}/comments/`, data)
  return response.data
}

// =============================================================================
// API Functions - Statistics
// =============================================================================

/**
 * Get workflow statistics
 */
export async function getWorkflowStats(): Promise<WorkflowStats> {
  const response = await apiClient.get('/workflows/stats/')
  return response.data
}

/**
 * Get task statistics
 */
export async function getTaskStats(): Promise<TaskStats> {
  const response = await apiClient.get('/workflows/tasks/stats/')
  return response.data
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: WorkflowPriority): string {
  switch (priority) {
    case 'URGENT':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'HIGH':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'MEDIUM':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'LOW':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

/**
 * Get status badge color
 */
export function getStatusColor(status: WorkflowInstanceStatus | WorkflowTaskStatus): string {
  switch (status) {
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'APPROVED':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'REJECTED':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'CANCELLED':
    case 'SKIPPED':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'EXPIRED':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'DELEGATED':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'DRAFT':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

/**
 * Format status for display
 */
export function formatStatus(status: WorkflowInstanceStatus | WorkflowTaskStatus): string {
  return status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Format priority for display
 */
export function formatPriority(priority: WorkflowPriority): string {
  return priority.charAt(0) + priority.slice(1).toLowerCase()
}

// =============================================================================
// API Functions - Auto-Trigger Rules
// =============================================================================

/**
 * List auto-trigger rules
 */
export async function getAutoTriggerRules(params?: {
  is_active?: boolean
  template_id?: string
}): Promise<AutoTriggerRule[]> {
  const response = await apiClient.get('/workflows/auto-trigger-rules/', { params })
  return extractResults(response.data)
}

/**
 * Get a single auto-trigger rule
 */
export async function getAutoTriggerRule(id: string): Promise<AutoTriggerRule> {
  const response = await apiClient.get(`/workflows/auto-trigger-rules/${id}/`)
  return response.data
}

/**
 * Create an auto-trigger rule
 */
export async function createAutoTriggerRule(data: {
  name: string
  description?: string
  workflow_template: string
  document_types?: string[]
  trigger_folders?: string[]
  include_subfolders?: boolean
  trigger_departments?: number[]
  confidentiality_levels?: string[]
  min_file_size?: number
  max_file_size?: number
  additional_conditions?: Record<string, unknown>
  default_priority?: WorkflowPriority
  due_days_override?: number
  auto_start?: boolean
  priority?: number
  stop_processing?: boolean
  is_active?: boolean
}): Promise<AutoTriggerRule> {
  const response = await apiClient.post('/workflows/auto-trigger-rules/', data)
  return response.data
}

/**
 * Update an auto-trigger rule
 */
export async function updateAutoTriggerRule(
  id: string,
  data: Partial<AutoTriggerRule>
): Promise<AutoTriggerRule> {
  const response = await apiClient.put(`/workflows/auto-trigger-rules/${id}/`, data)
  return response.data
}

/**
 * Delete an auto-trigger rule
 */
export async function deleteAutoTriggerRule(id: string): Promise<void> {
  await apiClient.delete(`/workflows/auto-trigger-rules/${id}/`)
}

/**
 * Toggle auto-trigger rule active state
 */
export async function toggleAutoTriggerRule(id: string): Promise<{
  id: string
  name: string
  is_active: boolean
  message: string
}> {
  const response = await apiClient.post(`/workflows/auto-trigger-rules/${id}/toggle/`)
  return response.data
}

/**
 * Test an auto-trigger rule against a document
 */
export async function testAutoTriggerRule(
  ruleId: string,
  documentId: string
): Promise<AutoTriggerTestResult> {
  const response = await apiClient.post(`/workflows/auto-trigger-rules/${ruleId}/test/`, {
    document_id: documentId,
  })
  return response.data
}

/**
 * Manually trigger workflow using a rule
 */
export async function triggerWorkflowNow(
  ruleId: string,
  documentId: string
): Promise<{
  message: string
  workflow_instance: {
    id: string
    template_name: string
    status: string
    due_date: string
  }
}> {
  const response = await apiClient.post(`/workflows/auto-trigger-rules/${ruleId}/trigger-now/`, {
    document_id: documentId,
  })
  return response.data
}

/**
 * Test all auto-trigger rules against a document
 */
export async function testAllAutoTriggerRules(
  documentId: string
): Promise<AutoTriggerTestAllResult> {
  const response = await apiClient.post('/workflows/auto-trigger-rules/test-all/', {
    document_id: documentId,
  })
  return response.data
}
