/**
 * TypeScript types for the Procedure Management & Training system.
 */

// =============================================================================
// Enums
// =============================================================================

export const ProcedureState = {
  DRAFT: 'draft',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  RETIRED: 'retired',
} as const

export type ProcedureState = (typeof ProcedureState)[keyof typeof ProcedureState]

export const QuizType = {
  STEP_LEVEL: 'step_level',
  END_OF_PROCEDURE: 'end_of_procedure',
} as const

export type QuizType = (typeof QuizType)[keyof typeof QuizType]

export const QuestionType = {
  MULTIPLE_CHOICE: 'multiple_choice',
  MULTI_SELECT: 'multi_select',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
  ORDERING: 'ordering',
} as const

export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType]

export const AssignmentStatus = {
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  OVERDUE: 'overdue',
  WAIVED: 'waived',
} as const

export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus]

export const AttemptStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PASSED: 'passed',
  FAILED: 'failed',
  ABANDONED: 'abandoned',
} as const

export type AttemptStatus = (typeof AttemptStatus)[keyof typeof AttemptStatus]

export const StepEvent = {
  NOT_STARTED: 'not_started',
  STARTED: 'started',
  VIEWED: 'viewed',
  MANUAL_OPENED: 'manual_opened',
  MEDIA_COMPLETED: 'media_completed',
  QUIZ_PASSED: 'quiz_passed',
  QUIZ_FAILED: 'quiz_failed',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
} as const

export type StepEvent = (typeof StepEvent)[keyof typeof StepEvent]

// =============================================================================
// Core Models
// =============================================================================

export interface Procedure {
  id: string
  title: string
  description: string
  state: ProcedureState
  current_version: number
  tags: string[]
  created_by: string
  created_by_name: string
  department: string
  department_name: string
  parent_procedure: string | null
  step_count?: number
  created_at: string
  updated_at: string
}

export interface ProcedureAssignmentInfo {
  id: string
  assignee_id: number
  assignee_name: string
  assignee_email: string
  status: string
  due_date: string | null
  assigned_at: string | null
  assigned_by_name: string | null
  version_number: number
  assignment_source: string
  waiver_reason: string
}

export interface ProcedureDetail extends Procedure {
  steps: ProcedureStep[]
  organization: string
  is_deleted: boolean
  deleted_at: string | null
  deleted_by: string | null
  assignment_count?: number
  assignments?: ProcedureAssignmentInfo[]
}

export interface ProcedureStep {
  id: string
  procedure: string
  title: string
  description: string
  order: number
  estimated_duration_minutes: number | null
  branch_condition: BranchCondition | null
  require_manual_open: boolean
  require_media_completion: boolean
  require_quiz_pass: boolean
  reviewer: number | null
  reviewer_name: string | null
  review_status: 'pending' | 'approved' | 'changes_requested'
  attachments: StepAttachment[]
  created_at: string
  updated_at: string
}

export interface StepAttachment {
  id: string
  step: string
  attachment_type: string
  title: string
  file: string
  file_name: string
  file_size: number
  file_extension: string
  mime_type: string
  checksum_sha256: string
  order: number
  uploaded_by: string
  uploaded_at: string
  is_linked: boolean
  document_info: {
    id: string
    title: string
    file_name: string
    file_size: number
    file_type: string
    confidentiality_level: string
    folder_path: string | null
    document_url: string
  } | null
}

// =============================================================================
// Versioning
// =============================================================================

export interface ProcedureVersion {
  id: string
  procedure: string
  version_number: number
  title: string
  description: string
  tags: string[]
  published_by: string
  published_by_name: string
  approved_by: string
  published_at: string
  effective_from: string
  expires_on: string
  changelog: string
  is_active: boolean
  retired_at: string | null
  retired_by: string | null
  retirement_reason: string
  steps: ProcedureVersionStep[]
}

export interface ProcedureVersionListItem {
  id: string
  version_number: number
  title: string
  published_by_name: string
  published_at: string
  effective_from: string
  expires_on: string
  is_active: boolean
  step_count: number
  changelog: string
}

export interface ProcedureVersionStep {
  id: string
  version: string
  original_step_id: string
  title: string
  description: string
  order: number
  estimated_duration_minutes: number | null
  branch_condition: BranchCondition | null
  require_manual_open: boolean
  require_media_completion: boolean
  require_quiz_pass: boolean
  attachments: VersionStepAttachment[]
}

export interface VersionStepAttachment {
  id: string
  version_step: string
  original_attachment_id: string
  attachment_type: string
  title: string
  file: string
  file_name: string
  file_size: number
  file_extension: string
  mime_type: string
  order: number
}

// =============================================================================
// Quiz
// =============================================================================

export interface Quiz {
  id: string
  procedure: string
  step: string | null
  quiz_type: QuizType
  title: string
  description: string
  passing_score_percent: number
  max_attempts: number
  time_limit_minutes: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_correct_answers_after: boolean
  questions: Question[]
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  quiz: string
  question_type: QuestionType
  text: string
  explanation: string
  order: number
  points: number
  is_mandatory: boolean
  auto_grade_keywords: string[] | null
  options: AnswerOption[]
}

export interface AnswerOption {
  id: string
  question: string
  text: string
  is_correct: boolean
  correct_order: number | null
  order: number
}

// =============================================================================
// Branching
// =============================================================================

export type BranchCondition =
  | { all: BranchCondition[] }
  | { any: BranchCondition[] }
  | LeafCondition

export interface LeafCondition {
  field: string
  operator: string
  value: unknown
  step_id?: string
  quiz_id?: string
  key?: string
}

// =============================================================================
// Review
// =============================================================================

export interface ProcedureStepComment {
  id: string
  workflow_instance: string
  step: string
  parent_comment: string | null
  author: string
  author_name: string
  body: string
  is_resolved: boolean
  resolved_by: string | null
  replies: ProcedureStepComment[]
  created_at: string
  updated_at: string
}

// =============================================================================
// Filters & Pagination
// =============================================================================

export interface ProcedureFilters {
  state?: ProcedureState | ''
  department?: string
  search?: string
  tag?: string[]
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// =============================================================================
// Version Diff
// =============================================================================

export interface VersionDiff {
  from_version: number
  to_version: number
  metadata_changes: Record<string, { from: unknown; to: unknown }>
  step_changes: StepChange[]
  attachment_changes: unknown[]
  quiz_changes: unknown[]
}

export interface StepChange {
  type: 'added' | 'removed' | 'modified'
  step_order: number
  from_step_id?: string
  to_step_id?: string
  step_data?: { title: string }
  changes?: Record<string, { from: unknown; to: unknown }>
}
