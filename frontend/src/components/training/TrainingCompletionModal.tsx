/**
 * TrainingCompletionModal — Pass/fail modal shown after training completes.
 */

import { CheckCircle, XCircle, Trophy, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TrainingCompletionModalProps {
  isOpen: boolean
  passed: boolean
  score: number | null
  attemptNumber?: number
  maxTrainingAttempts?: number
  onClose: () => void
  onBackToTraining: () => void
}

export function TrainingCompletionModal({
  isOpen,
  passed,
  score,
  attemptNumber,
  maxTrainingAttempts,
  onClose,
  onBackToTraining,
}: TrainingCompletionModalProps) {
  if (!isOpen) return null

  const attemptsExhausted =
    !passed &&
    maxTrainingAttempts != null &&
    maxTrainingAttempts > 0 &&
    attemptNumber != null &&
    attemptNumber >= maxTrainingAttempts

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-8 w-full max-w-md dark:bg-gray-800 text-center">
        <div
          className={cn(
            'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
            passed
              ? 'bg-green-100 dark:bg-green-900/30'
              : attemptsExhausted
                ? 'bg-amber-100 dark:bg-amber-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
          )}
        >
          {passed ? (
            <Trophy className="h-8 w-8 text-green-600" />
          ) : attemptsExhausted ? (
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {passed
            ? 'Training Complete!'
            : attemptsExhausted
              ? 'No More Attempts'
              : 'Training Not Passed'}
        </h2>

        {score !== null && (
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{score}%</p>
        )}

        {!passed &&
          maxTrainingAttempts != null &&
          maxTrainingAttempts > 0 &&
          attemptNumber != null && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
              Attempt {attemptNumber} of {maxTrainingAttempts}
            </p>
          )}

        <p className="text-sm text-gray-500 mb-6">
          {passed
            ? 'Congratulations! You have successfully completed this training.'
            : attemptsExhausted
              ? 'You have used all available attempts and did not pass. Please contact your manager for assistance.'
              : 'You did not meet the passing requirements for one or more quizzes. You can restart the training to try again with fresh quiz attempts.'}
        </p>

        <div className="flex flex-col gap-2">
          {!passed && !attemptsExhausted && (
            <button
              onClick={onBackToTraining}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry Training
            </button>
          )}
          <button
            onClick={onClose}
            className={cn(
              'rounded-lg px-6 py-2 text-sm font-medium',
              passed
                ? 'bg-green-600 text-white hover:bg-green-700'
                : !passed && !attemptsExhausted
                  ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            )}
          >
            Back to My Training
          </button>
        </div>
      </div>
    </div>
  )
}
