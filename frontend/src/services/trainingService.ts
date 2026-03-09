/**
 * Training Service
 *
 * API client for training delivery: start, step progression, quiz submission, completion.
 */

import apiClient from './apiClient'

const BASE = '/procedures'

// =============================================================================
// Types
// =============================================================================

export interface TrainingAttemptResponse {
  id: string
  assignment: string
  version: string
  status: string
  started_at: string
  completed_at: string | null
  score: number | null
  step_completions: StepCompletionResponse[]
}

export interface StepCompletionResponse {
  id: string
  version_step: string
  status: string
  started_at: string | null
  completed_at: string | null
  manual_opened_at: string | null
  media_completed_at: string | null
}

export interface QuizAttemptResponse {
  id: string
  version_quiz: string
  score: number
  passed: boolean
  started_at: string
  completed_at: string | null
  responses: QuestionResponseData[]
}

export interface QuestionResponseData {
  id: string
  version_question: string
  selected_option_ids: string[]
  text_answer: string
  ordering_answer: string[]
  is_correct: boolean | null
  points_awarded: number
}

// =============================================================================
// Training Delivery
// =============================================================================

export const startTraining = async (assignmentId: string): Promise<TrainingAttemptResponse> => {
  const response = await apiClient.post(`${BASE}/training/${assignmentId}/start_training/`)
  return response.data
}

export const startStep = async (
  attemptId: string,
  stepId: string
): Promise<StepCompletionResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/start_step/`, {
    version_step_id: stepId,
  })
  return response.data
}

export const viewStep = async (
  attemptId: string,
  stepId: string
): Promise<StepCompletionResponse> => {
  const response = await apiClient.get(`${BASE}/training/${attemptId}/view_step/`, {
    params: { version_step_id: stepId },
  })
  return response.data
}

export const markManualOpened = async (
  attemptId: string,
  stepCompletionId: string
): Promise<StepCompletionResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/manual_opened/`, {
    step_completion_id: stepCompletionId,
  })
  return response.data
}

export const markMediaCompleted = async (
  attemptId: string,
  stepCompletionId: string
): Promise<StepCompletionResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/media_completed/`, {
    step_completion_id: stepCompletionId,
  })
  return response.data
}

export const completeStep = async (
  attemptId: string,
  stepCompletionId: string
): Promise<{ can_advance: boolean; reasons: string[] }> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/complete_step/`, {
    step_completion_id: stepCompletionId,
  })
  return response.data
}

export const startQuiz = async (
  attemptId: string,
  versionQuizId: string
): Promise<QuizAttemptResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/start_quiz/`, {
    version_quiz_id: versionQuizId,
  })
  return response.data
}

export const submitQuiz = async (
  attemptId: string,
  quizAttemptId: string,
  responses: {
    version_question_id: string
    selected_option_ids?: string[]
    text_answer?: string
    ordering_answer?: string[]
  }[]
): Promise<QuizAttemptResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/submit_quiz/`, {
    quiz_attempt_id: quizAttemptId,
    responses,
  })
  return response.data
}

export const completeTraining = async (attemptId: string): Promise<TrainingAttemptResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/complete_training/`)
  return response.data
}

// =============================================================================
// Convenience export
// =============================================================================

export const trainingService = {
  startTraining,
  startStep,
  viewStep,
  markManualOpened,
  markMediaCompleted,
  completeStep,
  startQuiz,
  submitQuiz,
  completeTraining,
}
