/**
 * StepContent — Center panel displaying rich step content, attachments, and gates.
 */

import {
  Clock,
  CheckCircle,
  XCircle,
  Timer,
  Target,
  Lightbulb,
  FlaskConical,
  AlertTriangle,
  X,
} from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'
import { AttachmentViewer } from './AttachmentViewer'
import { StepGateBlocker, type QuizAttemptInfo } from './StepGateBlocker'
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
  quizAttemptInfo?: QuizAttemptInfo | null
  stepError?: string | null
  onDismissStepError?: () => void
  onMarkContentRead: () => void
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
  quizAttemptInfo,
  stepError,
  onDismissStepError,
  onPrevious,
  onNext,
  onCompleteStep,
  onFinishTraining,
  onMarkContentRead,
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

        {/* Learning Objectives */}
        {step.learning_objectives?.length > 0 && (
          <div className="mb-5 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
              <Target className="h-4 w-4" />
              Learning Objectives
            </h3>
            <ul className="space-y-1.5">
              {step.learning_objectives.map((obj, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-green-700 dark:text-green-300"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Concepts */}
        {step.key_concepts?.length > 0 && (
          <div className="mb-5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
              <Lightbulb className="h-4 w-4" />
              Key Concepts
            </h3>
            <ul className="space-y-1.5">
              {step.key_concepts.map((concept, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300"
                >
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {concept}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Example Scenarios */}
        {step.example_scenarios && (
          <div className="mb-5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-300 mb-2">
              <FlaskConical className="h-4 w-4" />
              Example Scenarios
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap">
              {step.example_scenarios}
            </p>
          </div>
        )}

        <AttachmentViewer
          attachments={step.attachments}
          videoUrl={step.video_url || undefined}
          onMediaCompleted={!reviewMode ? onMarkMediaCompleted : undefined}
          mediaCompleted={!!completion?.media_completed_at}
        />

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
            quizAttemptInfo={quizAttemptInfo}
            onMarkContentRead={onMarkContentRead}
            onMarkManualOpened={onMarkManualOpened}
            onMarkMediaCompleted={onMarkMediaCompleted}
            onTakeQuiz={onTakeQuiz}
          />
        )}

        {stepError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
            <p className="flex-1 text-sm text-red-700 dark:text-red-300">{stepError}</p>
            {onDismissStepError && (
              <button
                onClick={onDismissStepError}
                className="shrink-0 text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
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
