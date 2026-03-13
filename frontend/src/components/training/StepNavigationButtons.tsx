/**
 * StepNavigationButtons — Previous / Complete Step / Next / Finish Training buttons.
 */

import { ChevronLeft, ChevronRight, CheckCircle, Loader2, Trophy } from 'lucide-react'

interface StepNavigationButtonsProps {
  currentStepIndex: number
  totalSteps: number
  isStepCompleted: boolean
  allStepsCompleted: boolean
  actionLoading: boolean
  completing: boolean
  reviewMode?: boolean
  onPrevious: () => void
  onNext: () => void
  onCompleteStep: () => void
  onFinishTraining: () => void
}

export function StepNavigationButtons({
  currentStepIndex,
  totalSteps,
  isStepCompleted,
  allStepsCompleted,
  actionLoading,
  completing,
  reviewMode = false,
  onPrevious,
  onNext,
  onCompleteStep,
  onFinishTraining,
}: StepNavigationButtonsProps) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onPrevious}
        disabled={currentStepIndex === 0}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <div className="flex items-center gap-2">
        {reviewMode ? (
          currentStepIndex < totalSteps - 1 && (
            <button
              onClick={onNext}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next Step
              <ChevronRight className="h-4 w-4" />
            </button>
          )
        ) : (
          <>
            {!isStepCompleted && (
              <button
                onClick={onCompleteStep}
                disabled={actionLoading}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Complete Step
              </button>
            )}

            {isStepCompleted && currentStepIndex < totalSteps - 1 && (
              <button
                onClick={onNext}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </button>
            )}

            {allStepsCompleted && (
              <button
                onClick={onFinishTraining}
                disabled={completing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Finish Training
              </button>
            )}
          </>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={currentStepIndex >= totalSteps - 1 || (!reviewMode && !isStepCompleted)}
        title={!reviewMode && !isStepCompleted ? 'Complete this step first' : undefined}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
