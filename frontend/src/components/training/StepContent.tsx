/**
 * StepContent — Center panel displaying rich step content, attachments, and gates.
 */

import { Clock, CheckCircle, XCircle, Timer } from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'
import { AttachmentViewer } from './AttachmentViewer'
import { StepGateBlocker } from './StepGateBlocker'
import { StepNavigationButtons } from './StepNavigationButtons'

interface StepContentProps {
  step: VersionStep
  completion: StepCompletionResponse | null
  currentStepIndex: number
  totalSteps: number
  isStepCompleted: boolean
  allStepsCompleted: boolean
  actionLoading: boolean
  completing: boolean
  attemptId: string
  reviewMode?: boolean
  onPrevious: () => void
  onNext: () => void
  onCompleteStep: () => void
  onFinishTraining: () => void
  onMarkManualOpened: () => void
  onMarkMediaCompleted: () => void
  onTakeQuiz: () => void
}

export function StepContent({
  step,
  completion,
  currentStepIndex,
  totalSteps,
  isStepCompleted,
  allStepsCompleted,
  actionLoading,
  completing,
  attemptId,
  reviewMode = false,
  onPrevious,
  onNext,
  onCompleteStep,
  onFinishTraining,
  onMarkManualOpened,
  onMarkMediaCompleted,
  onTakeQuiz,
}: StepContentProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{step.title}</h2>
        {step.estimated_duration_minutes && (
          <p className="flex items-center gap-1 text-xs text-gray-500 mb-4">
            <Clock className="h-3 w-3" />
            Estimated: {step.estimated_duration_minutes} min
          </p>
        )}
        {step.description && (
          <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {step.description}
            </p>
          </div>
        )}

        <AttachmentViewer attachments={step.attachments} />

        {/* Review mode: step performance summary */}
        {reviewMode && completion && (
          <div className="mb-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Step Performance
              </p>
            </div>
            <div className="px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
              <span
                className={`flex items-center gap-1.5 font-medium ${
                  completion.status === 'completed'
                    ? 'text-green-600 dark:text-green-400'
                    : completion.status === 'skipped'
                      ? 'text-gray-400'
                      : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {completion.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : completion.status === 'skipped' ? (
                  <XCircle className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {completion.status === 'completed'
                  ? 'Completed'
                  : completion.status === 'skipped'
                    ? 'Skipped'
                    : 'Incomplete'}
              </span>
              {completion.started_at && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Started: {new Date(completion.started_at).toLocaleString()}
                </span>
              )}
              {completion.completed_at && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Completed: {new Date(completion.completed_at).toLocaleString()}
                </span>
              )}
              {completion.time_spent_seconds != null && completion.time_spent_seconds > 0 && (
                <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Timer className="h-3 w-3" />
                  {completion.time_spent_seconds < 60
                    ? `${completion.time_spent_seconds}s`
                    : `${Math.floor(completion.time_spent_seconds / 60)}m ${completion.time_spent_seconds % 60}s`}
                </span>
              )}
              {completion.manual_opened_at && (
                <span className="text-xs text-blue-500">Manual opened</span>
              )}
              {completion.media_completed_at && (
                <span className="text-xs text-purple-500">Media completed</span>
              )}
            </div>
          </div>
        )}

        {!reviewMode && (
          <StepGateBlocker
            step={step}
            completion={completion}
            actionLoading={actionLoading}
            attemptId={attemptId}
            onMarkManualOpened={onMarkManualOpened}
            onMarkMediaCompleted={onMarkMediaCompleted}
            onTakeQuiz={onTakeQuiz}
          />
        )}

        <StepNavigationButtons
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          isStepCompleted={isStepCompleted}
          allStepsCompleted={allStepsCompleted}
          actionLoading={actionLoading}
          completing={completing}
          reviewMode={reviewMode}
          onPrevious={onPrevious}
          onNext={onNext}
          onCompleteStep={onCompleteStep}
          onFinishTraining={onFinishTraining}
        />
      </div>
    </div>
  )
}
