/**
 * StepCommentThread — Per-step comment thread with replies.
 */

import { useState } from 'react'
import { MessageSquare, CheckCircle, Reply, User } from 'lucide-react'
import { StepCommentForm } from './StepCommentForm'
import type { ProcedureStepComment } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface StepCommentThreadProps {
  comments: ProcedureStepComment[]
  stepId: string
  onAddComment: (stepId: string, body: string, parentId?: string | null) => Promise<void>
  onResolve: (commentId: string) => Promise<void>
}

export function StepCommentThread({
  comments,
  stepId,
  onAddComment,
  onResolve,
}: StepCommentThreadProps) {
  const stepComments = comments.filter((c) => c.step === stepId && !c.parent_comment)

  return (
    <div className="space-y-3">
      {stepComments.length === 0 && (
        <p className="text-xs text-gray-400 italic">No comments on this step.</p>
      )}

      {stepComments.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onReply={(body) => onAddComment(stepId, body, comment.id)}
          onResolve={() => onResolve(comment.id)}
        />
      ))}

      <StepCommentForm
        onSubmit={(body) => onAddComment(stepId, body)}
        placeholder="Comment on this step..."
        compact
      />
    </div>
  )
}

function CommentItem({
  comment,
  onReply,
  onResolve,
  depth = 0,
}: {
  comment: ProcedureStepComment
  onReply: (body: string) => Promise<void>
  onResolve: () => Promise<void>
  depth?: number
}) {
  const [showReply, setShowReply] = useState(false)

  return (
    <div
      className={cn(
        'space-y-2',
        depth > 0 && 'ml-6 border-l-2 border-gray-100 dark:border-gray-700 pl-3'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-3 text-sm',
          comment.is_resolved
            ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800'
            : 'bg-gray-50 dark:bg-gray-700/50'
        )}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-gray-400" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {comment.author_name}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(comment.created_at).toLocaleString()}
            </span>
          </div>
          {comment.is_resolved && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              Resolved
            </span>
          )}
        </div>
        <p className="text-gray-800 dark:text-gray-200">{comment.body}</p>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => setShowReply(!showReply)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500"
          >
            <Reply className="h-3 w-3" />
            Reply
          </button>
          {!comment.is_resolved && (
            <button
              onClick={onResolve}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-500"
            >
              <CheckCircle className="h-3 w-3" />
              Resolve
            </button>
          )}
        </div>
      </div>

      {showReply && (
        <div className="ml-2">
          <StepCommentForm
            onSubmit={async (body) => {
              await onReply(body)
              setShowReply(false)
            }}
            placeholder="Reply..."
            compact
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          onReply={onReply}
          onResolve={onResolve}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}
