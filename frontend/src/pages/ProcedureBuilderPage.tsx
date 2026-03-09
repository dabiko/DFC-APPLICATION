/**
 * ProcedureBuilderPage — Full-page authoring interface for creating/editing procedures.
 *
 * Routes: /procedures/new and /procedures/:id/edit
 * Features: Metadata editing, step list with drag reorder, attachment upload, gates, quiz builder.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  Send,
  AlertTriangle,
  Settings,
  ListOrdered,
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
} from '@/services/procedureService'
import type { ProcedureDetail, ProcedureStep } from '@/types/procedure'

type ViewMode = 'metadata' | 'steps'

export function ProcedureBuilderPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(isNew ? 'metadata' : 'steps')
  const [submitting, setSubmitting] = useState(false)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

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
      await submitForReview(procedure.id, { reviewers: [] })
      navigate(`/procedures/${procedure.id}`)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit for review')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
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
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
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
                  onClick={() => navigate(procedure ? `/procedures/${procedure.id}` : '/workflows')}
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
              {procedure && (
                <div className="flex items-center gap-2">
                  {procedure.state === 'draft' && (procedure.steps?.length || 0) > 0 && (
                    <button
                      onClick={handleSubmitForReview}
                      disabled={submitting}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit for Review
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* View Mode Tabs (only when editing existing procedure) */}
          {procedure && (
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

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {viewMode === 'metadata' || isNew ? (
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
                {procedure?.steps && procedure.steps.length > 0 ? (
                  procedure.steps
                    .sort((a, b) => a.order - b.order)
                    .map((step, idx) => (
                      <StepEditor
                        key={step.id}
                        step={step}
                        procedureId={procedure.id}
                        index={idx}
                        onUpdate={handleUpdateStep}
                        onDelete={handleDeleteStep}
                      />
                    ))
                ) : (
                  <div className="text-center py-12 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <ListOrdered className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No steps yet. Add your first step to get started.
                    </p>
                  </div>
                )}

                <button
                  onClick={handleAddStep}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>
            )}
          </div>
        </div>
      }
    />
  )
}

export default ProcedureBuilderPage
