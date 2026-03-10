/**
 * TrainingCompletionModal — Pass/fail modal shown after training completes.
 */

import { CheckCircle, XCircle, Trophy } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TrainingCompletionModalProps {
  isOpen: boolean
  passed: boolean
  score: number | null
  onClose: () => void
  onBackToTraining: () => void
}

export function TrainingCompletionModal({
  isOpen,
  passed,
  score,
  onClose,
  onBackToTraining,
}: TrainingCompletionModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white p-8 w-full max-w-md dark:bg-gray-800 text-center">
        <div
          className={cn(
            'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
            passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
          )}
        >
          {passed ? (
            <Trophy className="h-8 w-8 text-green-600" />
          ) : (
            <XCircle className="h-8 w-8 text-red-600" />
          )}
        </div>

        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {passed ? 'Training Complete!' : 'Training Not Passed'}
        </h2>

        {score !== null && (
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{score}%</p>
        )}

        <p className="text-sm text-gray-500 mb-6">
          {passed
            ? 'Congratulations! You have successfully completed this training.'
            : 'You did not meet the requirements. Please try again or contact your manager.'}
        </p>

        <button
          onClick={onBackToTraining}
          className={cn(
            'rounded-lg px-6 py-2 text-sm font-medium text-white',
            passed ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {passed ? 'Back to My Training' : 'Try Again'}
        </button>
      </div>
    </div>
  )
}
