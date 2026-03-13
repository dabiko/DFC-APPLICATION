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
  procedure_id: string
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
  latest_attempt_id: string | null
  max_training_attempts: number
  attempts_used: number
  completion_score: number | null
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
  procedure_version_id: string
  assignees?: number[]
  departments?: number[]
  roles?: string[]
  due_date: string
  max_training_attempts?: number
}

// =============================================================================
// Analytics Types
// =============================================================================

export interface QuestionDifficulty {
  question_id: string
  question_text: string
  question_order: number
  quiz_title: string
  step_title: string
  total_responses: number
  correct_count: number
  incorrect_count: number
  pass_rate: number
}

export interface StepBottleneck {
  step_id: string
  step_title: string
  step_order: number
  total_trainees: number
  avg_time_seconds: number
  completion_rate: number
  failure_rate: number
  skip_rate: number
}

export interface QuizPerformance {
  quiz_id: string
  quiz_title: string
  step_title: string
  total_attempts: number
  pass_rate: number
  avg_score: number
  avg_attempts_to_pass: number
}

export interface ProcedureComparison {
  procedure_id: string
  procedure_title: string
  total_assigned: number
  completion_rate: number
  failure_rate: number
  overdue_rate: number
  avg_score: number
}

export interface AnalyticsOverall {
  total_training_attempts: number
  avg_training_time_seconds: number
  total_questions_answered: number
  overall_question_accuracy: number
}

export interface ContentAnalytics {
  overall: AnalyticsOverall
  question_difficulty: QuestionDifficulty[]
  step_bottlenecks: StepBottleneck[]
  quiz_performance: QuizPerformance[]
  procedure_comparison: ProcedureComparison[]
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
  // Backend wraps metrics inside { summary: {...}, overdue_assignments: [...] }
  const data = response.data
  const summary = data.summary || data
  return {
    total: summary.total_assignments ?? summary.total ?? 0,
    assigned: summary.not_started ?? summary.assigned ?? 0,
    in_progress: summary.in_progress ?? 0,
    completed: summary.completed ?? 0,
    failed: summary.failed ?? 0,
    overdue: summary.overdue ?? 0,
    waived: summary.waived ?? 0,
    completion_rate: summary.completion_rate ?? 0,
    average_score: summary.average_score ?? null,
  }
}

export const getContentAnalytics = async (
  params?: Record<string, string>
): Promise<ContentAnalytics> => {
  const response = await apiClient.get(`${BASE}/assignments/analytics/`, { params })
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
  analytics: getContentAnalytics,
}
