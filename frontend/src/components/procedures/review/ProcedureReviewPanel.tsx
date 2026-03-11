/**
 * ProcedureReviewPanel — Main review interface for procedures.
 * Embeds within WorkflowCenterPage when the workflow target is a Procedure.
 * Shows read-only steps with per-step comment threads.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  Loader2,
  AlertTriangle,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertOctagon,
  UserCheck,
} from 'lucide-react'
import { ReviewStepViewer } from './ReviewStepViewer'
import { ProcedureTargetCard } from './ProcedureTargetCard'
import {
  getProcedure,
  listStepComments,
  createStepComment,
  resolveStepComment,
  getReviewProgress,
  stepReviewAction,
} from '@/services/procedureService'
import type { ProcedureDetail, ProcedureStepComment } from '@/types/procedure'
import type { ReviewProgress } from '@/services/procedureService'

interface ProcedureReviewPanelProps {
  procedureId: string
}

export function ProcedureReviewPanel({ procedureId }: ProcedureReviewPanelProps) {
  const { user: authUser } = useAuth()
  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [comments, setComments] = useState<ProcedureStepComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<ReviewProgress | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [procData, commentsData, progressData] = await Promise.all([
        getProcedure(procedureId),
        listStepComments(procedureId),
        getReviewProgress(procedureId).catch(() => null),
      ])
      setProcedure(procData)
      setComments(
        Array.isArray(commentsData) ? commentsData : ((commentsData as any)?.results ?? [])
      )
      setProgress(progressData)
      setError(null)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load procedure for review')
    } finally {
      setLoading(false)
    }
  }, [procedureId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddComment = async (stepId: string, body: string, parentId?: string | null) => {
    try {
      const comment = await createStepComment(procedureId, {
        step: stepId,
        body,
        parent_comment: parentId || null,
      })
      if (parentId) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId ? { ...c, replies: [...(c.replies || []), comment] } : c
          )
        )
      } else {
        setComments((prev) => [...prev, comment])
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  const handleResolve = async (commentId: string) => {
    try {
      await resolveStepComment(procedureId, commentId)
      const markResolved = (list: ProcedureStepComment[]): ProcedureStepComment[] =>
        list.map((c) => {
          if (c.id === commentId) return { ...c, is_resolved: true }
          if (c.replies) return { ...c, replies: markResolved(c.replies) }
          return c
        })
      setComments(markResolved)
    } catch (err) {
      console.error('Failed to resolve comment:', err)
    }
  }

  const handleStepReview = async (
    stepId: string,
    action: 'approve' | 'request_changes',
    comment: string
  ) => {
    try {
      const result = await stepReviewAction(procedureId, stepId, action, comment)
      // Reload all data (progress + comments since backend creates a comment)
      await loadData()
      return result
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Step review action failed'
      throw new Error(msg)
    }
  }

  const unresolvedCount = comments.filter((c) => !c.is_resolved && !c.parent_comment).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500">Loading procedure for review...</span>
      </div>
    )
  }

  if (error || !procedure) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error || 'Procedure not found'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Procedure overview */}
      <ProcedureTargetCard procedure={procedure} />

      {/* Review Progress Bar */}
      {progress && progress.steps_with_reviewer > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Review Progress
            </h4>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {progress.progress_percent}%
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                progress.progress_percent === 100
                  ? 'bg-green-500'
                  : progress.changes_requested > 0
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {progress.approved_steps} approved
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-500" />
              {progress.pending_steps} pending
            </span>
            {progress.changes_requested > 0 && (
              <span className="flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 text-amber-500" />
                {progress.changes_requested} changes requested
              </span>
            )}
          </div>

          {/* Per-step review status */}
          <div className="mt-3 space-y-1">
            {progress.steps.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs dark:bg-gray-700"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  Step {s.order}: {s.title}
                </span>
                <div className="flex items-center gap-2">
                  {s.reviewer_name && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <UserCheck className="h-3 w-3" />
                      {s.reviewer_name}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 font-medium ${
                      s.review_status === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : s.review_status === 'changes_requested'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {s.review_status === 'approved'
                      ? 'Approved'
                      : s.review_status === 'changes_requested'
                        ? 'Changes Requested'
                        : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {comments.filter((c) => !c.parent_comment).length} comments
        </span>
        {unresolvedCount > 0 ? (
          <span className="flex items-center gap-1 text-yellow-600">
            {unresolvedCount} unresolved
          </span>
        ) : (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-3.5 w-3.5" />
            All resolved
          </span>
        )}
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {procedure.steps
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <ReviewStepViewer
              key={step.id}
              step={step}
              comments={comments}
              currentUserId={authUser?.id}
              onAddComment={handleAddComment}
              onResolve={handleResolve}
              onStepReview={handleStepReview}
            />
          ))}
      </div>
    </div>
  )
}
