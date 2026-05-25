/**
 * Dashboard Service
 *
 * Aggregates data from multiple API endpoints to power the enterprise dashboard.
 * Provides a single interface for all dashboard data needs.
 */

import { getWorkflowStats, getTaskStats, getMyTasks, getWorkflowInstances } from './workflowService'
import type { WorkflowStats, TaskStats, WorkflowTask, WorkflowInstance } from './workflowService'
import { getAssignmentDashboard } from './assignmentService'
import type { AssignmentDashboard } from './assignmentService'
import { getAuditLogs, getAuditLogStats } from './auditService'
import type { AuditLogListItem, AuditLogStats } from './auditService'
import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface DashboardData {
  // Workflow & Tasks
  workflowStats: WorkflowStats | null
  taskStats: TaskStats | null
  pendingTasks: WorkflowTask[]
  recentWorkflows: WorkflowInstance[]

  // Training & Assignments
  assignmentDashboard: AssignmentDashboard | null

  // Audit / Activity
  recentActivity: AuditLogListItem[]
  auditStats: AuditLogStats | null

  // Document stats
  documentStats: DocumentStats | null
}

export interface DocumentStats {
  total_documents: number
  total_folders: number
  storage_used_bytes: number
  storage_limit_bytes: number
  documents_by_department: Array<{ name: string; count: number }>
  documents_by_type: Array<{ type: string; count: number }>
  recent_uploads_count: number
  total_original_size_bytes: number
  total_compressed_size_bytes: number
  storage_saved_bytes: number
  storage_saved_percent: number
}

export type DateRange = '1d' | '7d' | '30d' | '90d' | 'custom'

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch document statistics from the backend.
 * Falls back to reasonable defaults if the endpoint doesn't exist yet.
 */
export async function getDocumentStats(): Promise<DocumentStats> {
  try {
    const response = await apiClient.get('/documents/stats/')
    return response.data
  } catch {
    // Endpoint may not exist yet — return fallback
    return {
      total_documents: 0,
      total_folders: 0,
      storage_used_bytes: 0,
      storage_limit_bytes: 0,
      documents_by_department: [],
      documents_by_type: [],
      recent_uploads_count: 0,
      total_original_size_bytes: 0,
      total_compressed_size_bytes: 0,
      storage_saved_bytes: 0,
      storage_saved_percent: 0,
    }
  }
}

/**
 * Fetch all dashboard data in parallel.
 * Each section is independent — failures in one don't block others.
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const [
    workflowStats,
    taskStats,
    pendingTasks,
    recentWorkflows,
    assignmentDashboard,
    auditResponse,
    auditStats,
    documentStats,
  ] = await Promise.allSettled([
    getWorkflowStats(),
    getTaskStats(),
    getMyTasks({ status: 'PENDING' }),
    getWorkflowInstances({ status: 'ACTIVE' }),
    getAssignmentDashboard(),
    getAuditLogs({ page_size: 10, ordering: '-timestamp' }),
    getAuditLogStats({ days: 30 }),
    getDocumentStats(),
  ])

  return {
    workflowStats: workflowStats.status === 'fulfilled' ? workflowStats.value : null,
    taskStats: taskStats.status === 'fulfilled' ? taskStats.value : null,
    pendingTasks: pendingTasks.status === 'fulfilled' ? pendingTasks.value.slice(0, 5) : [],
    recentWorkflows:
      recentWorkflows.status === 'fulfilled' ? recentWorkflows.value.slice(0, 5) : [],
    assignmentDashboard:
      assignmentDashboard.status === 'fulfilled' ? assignmentDashboard.value : null,
    recentActivity:
      auditResponse.status === 'fulfilled' ? (auditResponse.value?.results ?? []).slice(0, 10) : [],
    auditStats: auditStats.status === 'fulfilled' ? auditStats.value : null,
    documentStats: documentStats.status === 'fulfilled' ? documentStats.value : null,
  }
}
