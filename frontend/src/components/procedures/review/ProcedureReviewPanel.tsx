/**
 * ProcedureReviewPanel — Main review interface for procedures.
 * Embeds within WorkflowCenterPage when the workflow target is a Procedure.
 * Shows read-only steps with per-step comment threads.
 */

import { useState, useEffect, useCallback } from 'react'
import { Loader2, AlertTriangle, MessageSquare, CheckCircle } from 'lucide-react'
import { ReviewStepViewer } from './ReviewStepViewer'
import { ProcedureTargetCard } from './ProcedureTargetCard'
import {
  getProcedure,
  listStepComments,
  createStepComment,
  resolveStepComment,
} from '@/services/procedureService'
import type { ProcedureDetail, ProcedureStepComment } from '@/types/procedure'

interface ProcedureReviewPanelProps {
  procedureId: string
}

export function ProcedureReviewPanel({ procedureId }: ProcedureReviewPanelProps) {
  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [comments, setComments] = useState<ProcedureStepComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [procData, commentsData] = await Promise.all([
        getProcedure(procedureId),
        listStepComments(procedureId),
      ])
      setProcedure(procData)
      setComments(commentsData)
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
              onAddComment={handleAddComment}
              onResolve={handleResolve}
            />
          ))}
      </div>
    </div>
  )
}
