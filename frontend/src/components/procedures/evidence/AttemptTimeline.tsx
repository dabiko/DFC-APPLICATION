/**
 * AttemptTimeline — Visual timeline of a training attempt with steps and quizzes.
 */

import { StepEvidenceRow } from './StepEvidenceRow'
import { QuizEvidenceRow } from './QuizEvidenceRow'

interface AttemptTimelineProps {
  attempt: {
    id: string
    status: string
    score: number | null
    started_at: string
    completed_at: string | null
    step_completions: {
      step_title: string
      status: string
      started_at: string | null
      completed_at: string | null
    }[]
    quiz_attempts: {
      quiz_title: string
      score: number
      passed: boolean
      started_at: string
      completed_at: string | null
    }[]
  }
  index: number
}

export function AttemptTimeline({ attempt, index }: AttemptTimelineProps) {
  return (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
          Attempt {index + 1}
        </h4>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Status: {attempt.status}</span>
          {attempt.score !== null && <span>Score: {attempt.score}%</span>}
          <span>Started: {new Date(attempt.started_at).toLocaleString()}</span>
          {attempt.completed_at && (
            <span>Completed: {new Date(attempt.completed_at).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Timeline line */}
      <div className="relative pl-4 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
        {attempt.step_completions.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-1">Steps</h5>
            <div className="space-y-1">
              {attempt.step_completions.map((sc, scIdx) => (
                <StepEvidenceRow key={scIdx} step={sc} index={scIdx} />
              ))}
            </div>
          </div>
        )}

        {attempt.quiz_attempts.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-1">Quizzes</h5>
            <div className="space-y-1">
              {attempt.quiz_attempts.map((qa, qaIdx) => (
                <QuizEvidenceRow key={qaIdx} quiz={qa} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
