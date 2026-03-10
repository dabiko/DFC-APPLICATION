/**
 * StepContent — Center panel displaying rich step content, attachments, and gates.
 */

import { Clock } from 'lucide-react'
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

        <StepGateBlocker
          step={step}
          completion={completion}
          actionLoading={actionLoading}
          attemptId={attemptId}
          onMarkManualOpened={onMarkManualOpened}
          onMarkMediaCompleted={onMarkMediaCompleted}
          onTakeQuiz={onTakeQuiz}
        />

        <StepNavigationButtons
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          isStepCompleted={isStepCompleted}
          allStepsCompleted={allStepsCompleted}
          actionLoading={actionLoading}
          completing={completing}
          onPrevious={onPrevious}
          onNext={onNext}
          onCompleteStep={onCompleteStep}
          onFinishTraining={onFinishTraining}
        />
      </div>
    </div>
  )
}
