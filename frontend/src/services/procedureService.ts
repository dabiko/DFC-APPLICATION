/**
 * Procedure Service
 *
 * API client for procedure management, steps, quizzes, versions, and review.
 */

import apiClient from './apiClient'
import type {
  Procedure,
  ProcedureDetail,
  ProcedureStep,
  StepAttachment,
  ProcedureVersion,
  ProcedureVersionListItem,
  Quiz,
  Question,
  ProcedureStepComment,
  ProcedureFilters,
  PaginatedResponse,
  VersionDiff,
} from '@/types/procedure'

const BASE = ''

// =============================================================================
// Procedures
// =============================================================================

export const listProcedures = async (
  filters?: ProcedureFilters
): Promise<PaginatedResponse<Procedure>> => {
  const response = await apiClient.get(`${BASE}/procedures/`, { params: filters })
  return response.data
}

export const getProcedure = async (id: string): Promise<ProcedureDetail> => {
  const response = await apiClient.get(`${BASE}/procedures/${id}/`)
  return response.data
}

export const createProcedure = async (data: {
  title: string
  description: string
  department: string
  parent_procedure?: string | null
  tags?: string[]
}): Promise<ProcedureDetail> => {
  const response = await apiClient.post(`${BASE}/procedures/`, data)
  return response.data
}

export const updateProcedure = async (
  id: string,
  data: Partial<{
    title: string
    description: string
    department: string
    parent_procedure: string | null
    tags: string[]
  }>
): Promise<ProcedureDetail> => {
  const response = await apiClient.patch(`${BASE}/procedures/${id}/`, data)
  return response.data
}

export const deleteProcedure = async (id: string): Promise<void> => {
  await apiClient.delete(`${BASE}/procedures/${id}/`)
}

// =============================================================================
// Steps
// =============================================================================

export const listSteps = async (procedureId: string): Promise<ProcedureStep[]> => {
  const response = await apiClient.get(`${BASE}/procedures/${procedureId}/steps/`)
  return response.data
}

export const createStep = async (
  procedureId: string,
  data: Partial<ProcedureStep>
): Promise<ProcedureStep> => {
  const response = await apiClient.post(`${BASE}/procedures/${procedureId}/steps/`, data)
  return response.data
}

export const updateStep = async (
  procedureId: string,
  stepId: string,
  data: Partial<ProcedureStep>
): Promise<ProcedureStep> => {
  const response = await apiClient.patch(`${BASE}/procedures/${procedureId}/steps/${stepId}/`, data)
  return response.data
}

export const deleteStep = async (procedureId: string, stepId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/procedures/${procedureId}/steps/${stepId}/`)
}

export const reorderSteps = async (
  procedureId: string,
  steps: { id: string; order: number }[]
): Promise<void> => {
  await apiClient.post(`${BASE}/procedures/${procedureId}/steps/reorder/`, { steps })
}

// =============================================================================
// Attachments
// =============================================================================

export const uploadAttachment = async (
  procedureId: string,
  stepId: string,
  formData: FormData
): Promise<StepAttachment> => {
  const response = await apiClient.post(
    `${BASE}/procedures/${procedureId}/steps/${stepId}/attachments/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response.data
}

export const deleteAttachment = async (
  procedureId: string,
  stepId: string,
  attachmentId: string
): Promise<void> => {
  await apiClient.delete(
    `${BASE}/procedures/${procedureId}/steps/${stepId}/attachments/${attachmentId}/`
  )
}

// =============================================================================
// Quizzes
// =============================================================================

export const listQuizzes = async (procedureId: string): Promise<Quiz[]> => {
  const response = await apiClient.get(`${BASE}/procedures/${procedureId}/quizzes/`)
  return response.data
}

export const createQuiz = async (procedureId: string, data: Partial<Quiz>): Promise<Quiz> => {
  const response = await apiClient.post(`${BASE}/procedures/${procedureId}/quizzes/`, data)
  return response.data
}

export const updateQuiz = async (
  procedureId: string,
  quizId: string,
  data: Partial<Quiz>
): Promise<Quiz> => {
  const response = await apiClient.patch(
    `${BASE}/procedures/${procedureId}/quizzes/${quizId}/`,
    data
  )
  return response.data
}

export const deleteQuiz = async (procedureId: string, quizId: string): Promise<void> => {
  await apiClient.delete(`${BASE}/procedures/${procedureId}/quizzes/${quizId}/`)
}

// =============================================================================
// Questions
// =============================================================================

export const createQuestion = async (
  procedureId: string,
  quizId: string,
  data: Partial<Question>
): Promise<Question> => {
  const response = await apiClient.post(
    `${BASE}/procedures/${procedureId}/quizzes/${quizId}/questions/`,
    data
  )
  return response.data
}

export const updateQuestion = async (
  procedureId: string,
  quizId: string,
  questionId: string,
  data: Partial<Question>
): Promise<Question> => {
  const response = await apiClient.put(
    `${BASE}/procedures/${procedureId}/quizzes/${quizId}/questions/${questionId}/`,
    data
  )
  return response.data
}

export const deleteQuestion = async (
  procedureId: string,
  quizId: string,
  questionId: string
): Promise<void> => {
  await apiClient.delete(
    `${BASE}/procedures/${procedureId}/quizzes/${quizId}/questions/${questionId}/`
  )
}

// =============================================================================
// Review
// =============================================================================

export const submitForReview = async (
  procedureId: string,
  data: { reviewers: string[]; priority?: string; due_days?: number }
): Promise<{ workflow_instance_id: string; message: string }> => {
  const response = await apiClient.post(
    `${BASE}/procedures/${procedureId}/submit-for-review/`,
    data
  )
  return response.data
}

export const listStepComments = async (procedureId: string): Promise<ProcedureStepComment[]> => {
  const response = await apiClient.get(`${BASE}/procedures/${procedureId}/step-comments/`)
  return response.data
}

export const createStepComment = async (
  procedureId: string,
  data: { step: string; body: string; parent_comment?: string | null }
): Promise<ProcedureStepComment> => {
  const response = await apiClient.post(`${BASE}/procedures/${procedureId}/step-comments/`, data)
  return response.data
}

export const resolveStepComment = async (procedureId: string, commentId: string): Promise<void> => {
  await apiClient.post(`${BASE}/procedures/${procedureId}/step-comments/${commentId}/resolve/`)
}

// =============================================================================
// Publishing & Versioning
// =============================================================================

export const publishProcedure = async (
  procedureId: string,
  data: { effective_from: string; expires_on: string; changelog?: string }
): Promise<ProcedureVersion> => {
  const response = await apiClient.post(`${BASE}/procedures/${procedureId}/publish/`, data)
  return response.data
}

export const retireVersion = async (
  procedureId: string,
  versionNumber: number,
  data: { reason: string }
): Promise<void> => {
  await apiClient.post(`${BASE}/procedures/${procedureId}/versions/${versionNumber}/retire/`, data)
}

export const listVersions = async (procedureId: string): Promise<ProcedureVersionListItem[]> => {
  const response = await apiClient.get(`${BASE}/procedures/${procedureId}/versions/`)
  return response.data
}

export const getVersion = async (
  procedureId: string,
  versionNumber: number
): Promise<ProcedureVersion> => {
  const response = await apiClient.get(
    `${BASE}/procedures/${procedureId}/versions/${versionNumber}/`
  )
  return response.data
}

export const diffVersions = async (
  procedureId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionDiff> => {
  const response = await apiClient.get(`${BASE}/procedures/${procedureId}/versions/diff/`, {
    params: { from_version: fromVersion, to_version: toVersion },
  })
  return response.data
}

// =============================================================================
// Convenience export
// =============================================================================

export const procedureService = {
  list: listProcedures,
  get: getProcedure,
  create: createProcedure,
  update: updateProcedure,
  delete: deleteProcedure,
  listSteps,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  uploadAttachment,
  deleteAttachment,
  listQuizzes,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  submitForReview,
  listStepComments,
  createStepComment,
  resolveStepComment,
  publish: publishProcedure,
  retireVersion,
  listVersions,
  getVersion,
  diffVersions,
}
