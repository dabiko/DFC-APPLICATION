/**
 * QuizRetryPrompt — Prompt to retry a failed quiz if attempts remain.
 */

import { RefreshCw, ArrowLeft } from 'lucide-react'

interface QuizRetryPromptProps {
  attemptsUsed: number
  maxAttempts: number
  onRetry: () => void
  onBack: () => void
}

export function QuizRetryPrompt({
  attemptsUsed,
  maxAttempts,
  onRetry,
  onBack,
}: QuizRetryPromptProps) {
  const canRetry = maxAttempts === 0 || attemptsUsed < maxAttempts
  const remaining = maxAttempts === 0 ? 'unlimited' : `${maxAttempts - attemptsUsed}`

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-800 dark:bg-orange-900/20 text-center">
      <p className="text-sm text-orange-800 dark:text-orange-200 mb-2">
        {canRetry
          ? `You have ${remaining} attempt${remaining === '1' ? '' : 's'} remaining.`
          : 'No more attempts available. Contact your manager for assistance.'}
      </p>
      <div className="flex items-center justify-center gap-3 mt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Training
        </button>
        {canRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Quiz
          </button>
        )}
      </div>
    </div>
  )
}
