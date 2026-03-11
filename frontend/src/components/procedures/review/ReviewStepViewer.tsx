/**
 * ReviewStepViewer — Read-only step view with comment sidebar.
 */

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  HelpCircle,
  Paperclip,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertOctagon,
  UserCheck,
} from 'lucide-react'
import { StepCommentThread } from './StepCommentThread'
import type { ProcedureStep, ProcedureStepComment } from '@/types/procedure'

interface ReviewStepViewerProps {
  step: ProcedureStep
  comments: ProcedureStepComment[]
  onAddComment: (stepId: string, body: string, parentId?: string | null) => Promise<void>
  onResolve: (commentId: string) => Promise<void>
  onStepReview?: (stepId: string, action: 'approve' | 'request_changes') => Promise<void>
}

export function ReviewStepViewer({
  step,
  comments,
  onAddComment,
  onResolve,
  onStepReview,
}: ReviewStepViewerProps) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const stepCommentCount = comments.filter((c) => c.step === step.id && !c.parent_comment).length

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Step header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
          {step.order}
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {step.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5">
            {step.estimated_duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {step.estimated_duration_minutes} min
              </span>
            )}
            {step.require_manual_open && <BookOpen className="h-3 w-3 text-blue-500" />}
            {step.require_media_completion && <Video className="h-3 w-3 text-purple-500" />}
            {step.require_quiz_pass && <HelpCircle className="h-3 w-3 text-green-500" />}
            {step.attachments.length > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Paperclip className="h-3 w-3" />
                {step.attachments.length}
              </span>
            )}
            {step.reviewer_name && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <UserCheck className="h-3 w-3" />
                {step.reviewer_name}
              </span>
            )}
          </div>
        </div>

        {/* Review status badge */}
        {step.reviewer && (
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              step.review_status === 'approved'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : step.review_status === 'changes_requested'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
            }`}
          >
            {step.review_status === 'approved'
              ? 'Approved'
              : step.review_status === 'changes_requested'
                ? 'Changes Requested'
                : 'Pending'}
          </span>
        )}

        {/* Comment count */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowComments(!showComments)
          }}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
            stepCommentCount > 0
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
          }`}
        >
          <MessageSquare className="h-3 w-3" />
          {stepCommentCount}
        </button>

        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
          <div className={showComments ? 'grid grid-cols-2 gap-4 mt-4' : 'mt-4'}>
            {/* Step content */}
            <div className="space-y-3">
              {step.description && (
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {step.description}
                </div>
              )}

              {step.attachments.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Attachments
                  </p>
                  {step.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs dark:bg-gray-700"
                    >
                      <Paperclip className="h-3 w-3 text-gray-400" />
                      <span className="flex-1 truncate text-gray-600 dark:text-gray-300">
                        {att.title || att.file_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gates summary */}
              {(step.require_manual_open ||
                step.require_media_completion ||
                step.require_quiz_pass) && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Completion Requirements
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {step.require_manual_open && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        <BookOpen className="h-3 w-3" />
                        Manual open
                      </span>
                    )}
                    {step.require_media_completion && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                        <Video className="h-3 w-3" />
                        Media completion
                      </span>
                    )}
                    {step.require_quiz_pass && (
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        <HelpCircle className="h-3 w-3" />
                        Quiz pass
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Step review actions */}
              {onStepReview && step.reviewer && step.review_status !== 'approved' && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700 mt-3">
                  <button
                    onClick={() => onStepReview(step.id, 'approve')}
                    className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Approve Step
                  </button>
                  <button
                    onClick={() => onStepReview(step.id, 'request_changes')}
                    className="flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                  >
                    <AlertOctagon className="h-3 w-3" />
                    Request Changes
                  </button>
                </div>
              )}
            </div>

            {/* Comments sidebar */}
            {showComments && (
              <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                <StepCommentThread
                  comments={comments}
                  stepId={step.id}
                  onAddComment={onAddComment}
                  onResolve={onResolve}
                />
              </div>
            )}
          </div>

          {!showComments && (
            <button
              onClick={() => setShowComments(true)}
              className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              <MessageSquare className="h-3 w-3" />
              Show Comments ({stepCommentCount})
            </button>
          )}
        </div>
      )}
    </div>
  )
}
