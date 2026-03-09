/**
 * Assignment Service
 *
 * API client for procedure assignment management: create, list, waive, dashboard metrics.
 */

import apiClient from './apiClient'
import type { PaginatedResponse } from '@/types/procedure'

const BASE = '/procedures'

// =============================================================================
// Types
// =============================================================================

export interface ProcedureAssignment {
  id: string
  procedure: string
  procedure_title: string
  version: string
  version_number: number
  assigned_to: string
  assigned_to_name: string
  assigned_by: string
  assigned_by_name: string
  status: string
  due_date: string | null
  completed_at: string | null
  waived_at: string | null
  waived_by: string | null
  waiver_reason: string
  source: string
  created_at: string
}

export interface AssignmentDashboard {
  total: number
  assigned: number
  in_progress: number
  completed: number
  failed: number
  overdue: number
  waived: number
  completion_rate: number
  average_score: number | null
}

export interface CreateAssignmentData {
  procedure_id: string
  version_id: string
  user_ids: string[]
  due_date?: string | null
}

// =============================================================================
// Assignment CRUD
// =============================================================================

export const listAssignments = async (
  params?: Record<string, string>
): Promise<PaginatedResponse<ProcedureAssignment>> => {
  const response = await apiClient.get(`${BASE}/assignments/`, { params })
  return response.data
}

export const getAssignment = async (id: string): Promise<ProcedureAssignment> => {
  const response = await apiClient.get(`${BASE}/assignments/${id}/`)
  return response.data
}

export const createAssignments = async (
  data: CreateAssignmentData
): Promise<ProcedureAssignment[]> => {
  const response = await apiClient.post(`${BASE}/assignments/`, data)
  return response.data
}

export const waiveAssignment = async (id: string, reason: string): Promise<ProcedureAssignment> => {
  const response = await apiClient.post(`${BASE}/assignments/${id}/waive/`, { reason })
  return response.data
}

export const getAssignmentDashboard = async (): Promise<AssignmentDashboard> => {
  const response = await apiClient.get(`${BASE}/assignments/dashboard/`)
  return response.data
}

// =============================================================================
// Convenience export
// =============================================================================

export const assignmentService = {
  list: listAssignments,
  get: getAssignment,
  create: createAssignments,
  waive: waiveAssignment,
  dashboard: getAssignmentDashboard,
}
