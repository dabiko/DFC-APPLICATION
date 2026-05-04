/**
 * Shared types for training components.
 */

import type { StepCompletionResponse } from '@/services/trainingService'

export interface VersionStepQuizSummary {
  id: string
  title: string
  quiz_type: string
  max_attempts: number
}

export interface VersionStep {
  id: string
  title: string
  description: string
  order: number
  estimated_duration_minutes: number | null
  learning_objectives: string[]
  key_concepts: string[]
  example_scenarios: string
  video_url: string
  require_manual_open: boolean
  require_media_completion: boolean
  require_quiz_pass: boolean
  require_read_content: boolean
  attachments: StepAttachmentItem[]
  quizzes?: VersionStepQuizSummary[]
}

export interface StepAttachmentItem {
  id: string
  attachment_type: string
  title: string
  file: string
  file_name: string
  file_size: number
  extracted_text?: string
  extraction_status?: 'pending' | 'completed' | 'failed' | 'unsupported' | 'no_text' | ''
}

export interface VersionQuiz {
  id: string
  title: string
  description: string
  quiz_type: string
  passing_score_percent: number
  max_attempts: number
  time_limit_minutes: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_correct_answers_after: boolean
  questions: VersionQuestion[]
}

export interface VersionQuestion {
  id: string
  question_type: string
  text: string
  explanation: string
  order: number
  points: number
  is_mandatory: boolean
  options: VersionOption[]
}

export interface VersionOption {
  id: string
  text: string
  order: number
  correct_order: number | null
  is_correct?: boolean
}

export interface QuestionAnswer {
  version_question_id: string
  selected_option_ids?: string[]
  text_answer?: string
  ordering_answer?: string[]
}

export type { StepCompletionResponse }
