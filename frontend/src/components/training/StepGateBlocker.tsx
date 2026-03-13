/**
 * StepGateBlocker — Gate requirements overlay showing completion gates for a step.
 */

import { BookOpen, Video, HelpCircle, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'
import type { QuizAttemptResponse } from '@/services/trainingService'

export interface QuizAttemptInfo {
  attemptsUsed: number
  maxAttempts: number
  bestScore: number | null
  passed: boolean
  exhausted: boolean
}

interface StepGateBlockerProps {
  step: VersionStep
  completion: StepCompletionResponse | null
  actionLoading: boolean
  attemptId: string
  quizAttemptInfo?: QuizAttemptInfo | null
  onMarkContentRead: () => void
  onMarkManualOpened: () => void
  onMarkMediaCompleted: () => void
  onTakeQuiz: () => void
}

export function StepGateBlocker({
  step,
  completion,
  actionLoading,
  quizAttemptInfo,
  onMarkContentRead,
  onMarkManualOpened,
  onMarkMediaCompleted,
  onTakeQuiz,
}: StepGateBlockerProps) {
  const hasGates =
    step.require_read_content ||
    step.require_manual_open ||
    step.require_media_completion ||
    step.require_quiz_pass

  if (!hasGates) return null

  return (
    <div className="space-y-3 mb-6">
      {step.require_read_content && (
        <ReadContentGateRow
          completion={completion}
          actionLoading={actionLoading}
          onMarkContentRead={onMarkContentRead}
        />
      )}

      {step.require_manual_open && (
        <ManualGateRow
          step={step}
          completion={completion}
          actionLoading={actionLoading}
          onMarkManualOpened={onMarkManualOpened}
        />
      )}

      {step.require_media_completion && (
        <MediaGateRow
          step={step}
          completion={completion}
          actionLoading={actionLoading}
          onMarkMediaCompleted={onMarkMediaCompleted}
        />
      )}

      {step.require_quiz_pass && (
        <QuizGateRow quizAttemptInfo={quizAttemptInfo} onTakeQuiz={onTakeQuiz} />
      )}
    </div>
  )
}

function ReadContentGateRow({
  completion,
  actionLoading,
  onMarkContentRead,
}: {
  completion: StepCompletionResponse | null
  actionLoading: boolean
  onMarkContentRead: () => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <Eye className="h-4 w-4 text-teal-500" />
        <span className="text-gray-700 dark:text-gray-300">I have read the step content</span>
      </div>
      {completion?.content_read_at ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" /> Done
        </span>
      ) : (
        <button
          onClick={onMarkContentRead}
          disabled={actionLoading}
          className="text-xs text-teal-600 hover:underline disabled:opacity-50"
        >
          Confirm
        </button>
      )}
    </div>
  )
}

function ManualGateRow({
  step,
  completion,
  actionLoading,
  onMarkManualOpened,
}: {
  step: VersionStep
  completion: StepCompletionResponse | null
  actionLoading: boolean
  onMarkManualOpened: () => void
}) {
  const docs =
    step.attachments?.filter(
      (a) => a.attachment_type === 'document' || a.attachment_type === 'manual'
    ) || []
  const hasDocuments = docs.length > 0

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <BookOpen className="h-4 w-4 text-blue-500" />
        <span className="text-gray-700 dark:text-gray-300">
          {hasDocuments
            ? `Read: ${docs.map((d) => d.title || d.file_name).join(', ')}`
            : 'I have read the step content'}
        </span>
      </div>
      {completion?.manual_opened_at ? (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" /> Done
        </span>
      ) : hasDocuments ? (
        <button
          onClick={onMarkManualOpened}
          disabled={actionLoading}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          Mark as read
        </button>
      ) : (
        <button
          onClick={onMarkManualOpened}
          disabled={actionLoading}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          Confirm
        </button>
      )}
    </div>
  )
}

function MediaGateRow({
  step,
  completion,
  actionLoading,
  onMarkMediaCompleted,
}: {
  step: VersionStep
  completion: StepCompletionResponse | null
  actionLoading: boolean
  onMarkMediaCompleted: () => void
}) {
  const videos = step.attachments?.filter((a) => a.attachment_type === 'video') || []
  const hasVideo = videos.length > 0 || !!step.video_url

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <Video className="h-4 w-4 text-purple-500" />
        <span className="text-gray-700 dark:text-gray-300">
          {hasVideo
            ? `Watch: ${videos.length > 0 ? videos.map((v) => v.title || v.file_name).join(', ') : 'Step video'}`
            : 'Complete media content'}
        </span>
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
          Mark as watched
        </button>
      )}
    </div>
  )
}

function QuizGateRow({
  quizAttemptInfo,
  onTakeQuiz,
}: {
  quizAttemptInfo?: QuizAttemptInfo | null
  onTakeQuiz: () => void
}) {
  // Quiz already passed
  if (quizAttemptInfo?.passed) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-green-700 dark:text-green-300">Quiz passed</span>
        </div>
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          {quizAttemptInfo.bestScore != null ? `${quizAttemptInfo.bestScore}%` : 'Done'}
        </span>
      </div>
    )
  }

  // All attempts exhausted and not passed
  if (quizAttemptInfo?.exhausted) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="font-medium text-red-700 dark:text-red-300">
              Quiz failed — no attempts remaining
            </span>
          </div>
          <span className="text-xs text-red-500 dark:text-red-400">
            {quizAttemptInfo.attemptsUsed}/{quizAttemptInfo.maxAttempts} used
          </span>
        </div>
        {quizAttemptInfo.bestScore != null && (
          <p className="mt-1.5 ml-6 text-xs text-red-600 dark:text-red-400">
            Best score: {quizAttemptInfo.bestScore}%
          </p>
        )}
      </div>
    )
  }

  // Attempts remain
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex items-center gap-2 text-sm">
        <HelpCircle className="h-4 w-4 text-green-500" />
        <span className="text-gray-700 dark:text-gray-300">Pass quiz</span>
      </div>
      <div className="flex items-center gap-3">
        {quizAttemptInfo && quizAttemptInfo.maxAttempts > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {quizAttemptInfo.attemptsUsed}/{quizAttemptInfo.maxAttempts} attempts used
          </span>
        )}
        <button onClick={onTakeQuiz} className="text-xs text-green-600 hover:underline">
          Take quiz
        </button>
      </div>
    </div>
  )
}
