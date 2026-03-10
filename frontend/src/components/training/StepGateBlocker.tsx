/**
 * StepGateBlocker — Gate requirements overlay showing completion gates for a step.
 */

import { BookOpen, Video, HelpCircle, CheckCircle } from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'

interface StepGateBlockerProps {
  step: VersionStep
  completion: StepCompletionResponse | null
  actionLoading: boolean
  attemptId: string
  onMarkManualOpened: () => void
  onMarkMediaCompleted: () => void
  onTakeQuiz: () => void
}

export function StepGateBlocker({
  step,
  completion,
  actionLoading,
  onMarkManualOpened,
  onMarkMediaCompleted,
  onTakeQuiz,
}: StepGateBlockerProps) {
  const hasGates =
    step.require_manual_open || step.require_media_completion || step.require_quiz_pass

  if (!hasGates) return null

  return (
    <div className="space-y-3 mb-6">
      {step.require_manual_open && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="h-4 w-4 text-blue-500" />
            <span className="text-gray-700 dark:text-gray-300">Open manual/document</span>
          </div>
          {completion?.manual_opened_at ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" /> Done
            </span>
          ) : (
            <button
              onClick={onMarkManualOpened}
              disabled={actionLoading}
              className="text-xs text-blue-600 hover:underline disabled:opacity-50"
            >
              Mark as opened
            </button>
          )}
        </div>
      )}

      {step.require_media_completion && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <Video className="h-4 w-4 text-purple-500" />
            <span className="text-gray-700 dark:text-gray-300">Complete media</span>
          </div>
          {completion?.media_completed_at ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" /> Done
            </span>
          ) : (
            <button
              onClick={onMarkMediaCompleted}
              disabled={actionLoading}
              className="text-xs text-purple-600 hover:underline disabled:opacity-50"
            >
              Mark as completed
            </button>
          )}
        </div>
      )}

      {step.require_quiz_pass && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm">
            <HelpCircle className="h-4 w-4 text-green-500" />
            <span className="text-gray-700 dark:text-gray-300">Pass quiz</span>
          </div>
          <button onClick={onTakeQuiz} className="text-xs text-green-600 hover:underline">
            Take quiz
          </button>
        </div>
      )}
    </div>
  )
}
