/**
 * ProcedureBuilderPage — Full-page authoring interface for creating/editing procedures.
 *
 * Routes: /procedures/new and /procedures/:id/edit
 * Features: Metadata editing, step list with drag reorder, attachment upload, gates, quiz builder.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import { useAuth } from '@/hooks/useAuth'
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  Send,
  AlertTriangle,
  Settings,
  ListOrdered,
  X,
  UserCheck,
  CheckCircle,
  Clock,
  AlertOctagon,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureMetadataForm } from '@/components/procedures/ProcedureMetadataForm'
import { ProcedureStatusBadge } from '@/components/procedures/ProcedureStatusBadge'
import { StepEditor } from '@/components/procedures/steps/StepEditor'
import { cn } from '@/utils/cn'
import { authService } from '@/services/auth.service'
import {
  getProcedure,
  createProcedure,
  updateProcedure,
  createStep,
  updateStep,
  deleteStep,
  reorderSteps,
  submitForReview,
  getReviewProgress,
} from '@/services/procedureService'
import type { ProcedureDetail, ProcedureStep } from '@/types/procedure'
import type { ReviewProgress } from '@/services/procedureService'
import { getUsers } from '@/services/userManagementService'
import type { UserBasic } from '@/services/userManagementService'

type ViewMode = 'metadata' | 'steps'

export function ProcedureBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const handleLogout = useLogout()
  const { hasRole } = useAuth()
  const isNew = !id

  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(isNew ? 'metadata' : 'steps')
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState<UserBasic[]>([])
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [procReviewers, setProcReviewers] = useState<number[]>([])
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress | null>(null)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Determine if current user is a step owner (not the creator/admin)
  const isFullEditor =
    user.is_superuser ||
    (procedure && String(userData?.id) === String(procedure.created_by)) ||
    hasRole(['admin', 'manager'])
  const isStepOwnerMode = !isNew && procedure && !isFullEditor

  // Load existing procedure
  useEffect(() => {
    if (!id) return
    setLoading(true)
    getProcedure(id)
      .then((data) => {
        setProcedure(data)
        setError(null)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load procedure')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load users for reviewer picker
  useEffect(() => {
    getUsers({ page_size: 200 })
      .then((res) => setUsers(res.results as unknown as UserBasic[]))
      .catch(() => {})
  }, [])

  // Load review progress when procedure is in_review
  useEffect(() => {
    if (!procedure || procedure.state !== 'in_review') {
      setReviewProgress(null)
      return
    }
    getReviewProgress(procedure.id)
      .then(setReviewProgress)
      .catch(() => {})
  }, [procedure?.id, procedure?.state])

  // Create or update procedure metadata
  const handleMetadataSubmit = async (data: {
    title: string
    description: string
    department: string
    parent_procedure?: string | null
    tags?: string[]
  }) => {
    setSaving(true)
    try {
      if (isNew) {
        const created = await createProcedure(data)
        navigate(`/procedures/${created.id}/edit`, { replace: true })
      } else if (procedure) {
        const updated = await updateProcedure(procedure.id, data)
        setProcedure(updated)
        setViewMode('steps')
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to save procedure')
    } finally {
      setSaving(false)
    }
  }

  // Step operations
  const handleAddStep = async () => {
    if (!procedure) return
    try {
      const newStep = await createStep(procedure.id, {
        title: `Step ${(procedure.steps?.length || 0) + 1}`,
        order: (procedure.steps?.length || 0) + 1,
      })
      setProcedure({
        ...procedure,
        steps: [...(procedure.steps || []), newStep],
      })
    } catch (err) {
      console.error('Failed to add step:', err)
    }
  }

  const handleUpdateStep = useCallback(
    async (stepId: string, data: Partial<ProcedureStep>) => {
      if (!procedure) return
      // Optimistic update
      setProcedure({
        ...procedure,
        steps: procedure.steps.map((s) => (s.id === stepId ? { ...s, ...data } : s)),
      })
      // Debounced save (attachments are handled inline)
      if (!data.attachments) {
        try {
          await updateStep(procedure.id, stepId, data)
        } catch (err) {
          console.error('Failed to update step:', err)
        }
      }
    },
    [procedure]
  )

  const handleDeleteStep = async (stepId: string) => {
    if (!procedure) return
    try {
      await deleteStep(procedure.id, stepId)
      setProcedure({
        ...procedure,
        steps: procedure.steps.filter((s) => s.id !== stepId),
      })
    } catch (err) {
      console.error('Failed to delete step:', err)
    }
  }

  const handleSubmitForReview = async () => {
    if (!procedure) return
    setSubmitting(true)
    try {
      await submitForReview(procedure.id, {
        reviewers: procReviewers.length > 0 ? procReviewers.map(String) : [],
      })
      setShowReviewModal(false)
      navigate(`/procedures/${procedure.id}`)
    } catch (err: any) {
      setError(
        err?.response?.data?.error || err?.response?.data?.detail || 'Failed to submit for review'
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        }
      />
    )
  }

  return (
    <>
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            {/* Page Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      navigate(procedure ? `/procedures/${procedure.id}` : '/workflows')
                    }
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {isNew ? 'New Procedure' : procedure?.title || 'Edit Procedure'}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      {procedure && <ProcedureStatusBadge state={procedure.state} />}
                      {procedure?.department_name && (
                        <span className="text-xs text-gray-500">{procedure.department_name}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {procedure && !isStepOwnerMode && (
                  <div className="flex items-center gap-2">
                    {procedure.state === 'draft' && (procedure.steps?.length || 0) > 0 && (
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
                      >
                        <Send className="h-4 w-4" />
                        Submit for Review
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* View Mode Tabs (only when editing existing procedure) */}
            {procedure && !isStepOwnerMode && (
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
                <nav className="flex gap-1 -mb-px">
                  <button
                    onClick={() => setViewMode('metadata')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      viewMode === 'metadata'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700'
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    Metadata
                  </button>
                  <button
                    onClick={() => setViewMode('steps')}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                      viewMode === 'steps'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700'
                    )}
                  >
                    <ListOrdered className="h-4 w-4" />
                    Steps ({procedure.steps?.length || 0})
                  </button>
                </nav>
              </div>
            )}
            {procedure && isStepOwnerMode && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-700 px-6 py-2">
                <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Step Owner Mode — You can edit the steps assigned to you. Other steps are
                  read-only.
                </p>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              {!isStepOwnerMode && (viewMode === 'metadata' || isNew) ? (
                <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <ProcedureMetadataForm
                    initialData={procedure || undefined}
                    onSubmit={handleMetadataSubmit}
                    onCancel={() => (procedure ? setViewMode('steps') : navigate('/workflows'))}
                    isSubmitting={saving}
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-3">
                  {/* Review Progress Bar */}
                  {reviewProgress && reviewProgress.steps_with_reviewer > 0 && (
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Review Progress
                        </h4>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {reviewProgress.progress_percent}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={cn(
                            'h-2.5 rounded-full transition-all duration-500',
                            reviewProgress.progress_percent === 100
                              ? 'bg-green-500'
                              : reviewProgress.changes_requested > 0
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                          )}
                          style={{ width: `${reviewProgress.progress_percent}%` }}
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          {reviewProgress.approved_steps} approved
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-500" />
                          {reviewProgress.pending_steps} pending
                        </span>
                        {reviewProgress.changes_requested > 0 && (
                          <span className="flex items-center gap-1">
                            <AlertOctagon className="h-3 w-3 text-amber-500" />
                            {reviewProgress.changes_requested} changes requested
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {procedure?.steps && procedure.steps.length > 0 ? (
                    procedure.steps
                      .sort((a, b) => a.order - b.order)
                      .map((step, idx) => {
                        const isOwnedStep =
                          isStepOwnerMode && String(step.step_owner) === String(userData?.id)
                        const stepReadOnly = isStepOwnerMode && !isOwnedStep
                        return (
                          <StepEditor
                            key={step.id}
                            step={step}
                            procedureId={procedure.id}
                            index={idx}
                            users={users}
                            onUpdate={handleUpdateStep}
                            onDelete={handleDeleteStep}
                            readOnly={stepReadOnly}
                          />
                        )
                      })
                  ) : (
                    <div className="text-center py-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <ListOrdered className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No steps yet. Add your first step to get started.
                      </p>
                    </div>
                  )}

                  {!isStepOwnerMode && (
                    <button
                      onClick={handleAddStep}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                    >
                      <Plus className="h-4 w-4" />
                      Add Step
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Submit for Review Modal */}
      {showReviewModal && procedure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Submit for Review
                </h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Step reviewers summary */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Step Reviewers
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {procedure.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5 text-xs dark:bg-gray-700"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          Step {step.order}: {step.title}
                        </span>
                        {step.reviewer_name ? (
                          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <UserCheck className="h-3 w-3" />
                            {step.reviewer_name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No reviewer</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Procedure-level reviewers */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Procedure-Level Reviewers (optional)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  These reviewers will validate the entire procedure after step reviews.
                </p>
                <select
                  multiple
                  value={procReviewers.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (opt) =>
                      Number(opt.value)
                    )
                    setProcReviewers(selected)
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  size={4}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  Hold Ctrl/Cmd to select multiple reviewers.
                </p>
              </div>

              {/* Validation message */}
              {procedure.steps.every((s) => !s.reviewer) && procReviewers.length === 0 && (
                <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  At least one reviewer is required — assign step reviewers or select
                  procedure-level reviewers.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-4 dark:border-gray-700">
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForReview}
                disabled={
                  submitting ||
                  (procedure.steps.every((s) => !s.reviewer) && procReviewers.length === 0)
                }
                className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProcedureBuilderPage
