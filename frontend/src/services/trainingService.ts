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
  version_number: number
  procedure_id: string
  procedure_title: string
  status: string
  started_at: string
  completed_at: string | null
  total_score: number | null
  attempt_number: number
  max_training_attempts: number
  step_completions: StepCompletionResponse[]
  quiz_attempts: QuizAttemptResponse[]
}

export interface StepCompletionResponse {
  id: string
  version_step: string
  status: string
  started_at: string | null
  completed_at: string | null
  time_spent_seconds: number | null
  manual_opened_at: string | null
  media_completed_at: string | null
  content_read_at: string | null
}

export interface QuizAttemptResponse {
  id: string
  version_quiz: string
  score_earned: number
  score_possible: number
  score_percent: number
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
  points_earned: number
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

export const markContentRead = async (
  attemptId: string,
  stepCompletionId: string
): Promise<StepCompletionResponse> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/content_read/`, {
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

export interface SubmitQuizResult {
  quizAttempt: QuizAttemptResponse
  correctAnswers: Record<string, string[]> | null
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
): Promise<SubmitQuizResult> => {
  const response = await apiClient.post(`${BASE}/training/${attemptId}/submit_quiz/`, {
    quiz_attempt_id: quizAttemptId,
    responses,
  })
  const data = response.data
  return {
    quizAttempt: data.quiz_attempt ?? data,
    correctAnswers: data.correct_answers ?? null,
  }
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
