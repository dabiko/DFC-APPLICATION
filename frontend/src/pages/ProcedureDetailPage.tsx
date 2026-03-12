/**
 * ProcedureDetailPage — Read-only view of a procedure with versions,
 * steps, and lifecycle actions (publish, retire).
 *
 * Route: /procedures/:id
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLogout } from '@/hooks/useLogout'
import {
  ArrowLeft,
  Edit,
  Loader2,
  AlertTriangle,
  FileText,
  Clock,
  User,
  Tag,
  Send,
  Rocket,
  History,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Video,
  HelpCircle,
  Paperclip,
  Archive,
  Trash2,
  Users,
  CheckCircle,
  AlertOctagon,
  UserCheck,
  Eye,
  Mail,
  XCircle,
  Search,
  RotateCcw,
  X,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureStatusBadge } from '@/components/procedures/ProcedureStatusBadge'
import { DeleteProcedureModal } from '@/components/procedures/DeleteProcedureModal'
import { PublishConfirmModal } from '@/components/procedures/PublishConfirmModal'
import { AssignProcedureModal } from '@/components/procedures/AssignProcedureModal'
import { RetireVersionModal } from '@/components/procedures/RetireVersionModal'
import { WaiveAssignmentModal } from '@/components/procedures/WaiveAssignmentModal'
import { waiveAssignment } from '@/services/assignmentService'
import { cn } from '@/utils/cn'
import { DatePicker } from '@/components/DatePicker'
import { authService } from '@/services/auth.service'
import {
  getProcedure,
  publishProcedure,
  listVersions,
  retireVersion,
  getReviewProgress,
  deleteProcedure,
  revertToDraft,
} from '@/services/procedureService'
import type {
  ProcedureDetail,
  ProcedureVersionListItem,
  ProcedureAssignmentInfo,
} from '@/types/procedure'
import type { ReviewProgress } from '@/services/procedureService'

export function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const handleLogout = useLogout()

  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [versions, setVersions] = useState<ProcedureVersionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [retireTarget, setRetireTarget] = useState<number | null>(null)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [waiveTarget, setWaiveTarget] = useState<ProcedureAssignmentInfo | null>(null)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [showRevertModal, setShowRevertModal] = useState(false)
  const [revertReason, setRevertReason] = useState('')
  const [reverting, setReverting] = useState(false)
  const [contentWarnings, setContentWarnings] = useState<
    Array<{
      step_order: number
      step_title: string
      missing: string[]
    }>
  >([])

  const [publishData, setPublishData] = useState({
    effective_from: new Date().toISOString().split('T')[0],
    expires_on: '',
    changelog: '',
  })

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([getProcedure(id), listVersions(id), getReviewProgress(id).catch(() => null)])
      .then(([procData, versionData, progressData]) => {
        setProcedure(procData)
        setVersions(
          Array.isArray(versionData) ? versionData : ((versionData as any)?.results ?? [])
        )
        setReviewProgress(progressData)
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || 'Failed to load procedure')
      })
      .finally(() => setLoading(false))
  }, [id])

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  const handlePublish = async () => {
    if (!procedure || !publishData.effective_from) return
    setPublishing(true)
    try {
      const publishResult = await publishProcedure(procedure.id, publishData)
      // Show content warnings if any
      if (publishResult.content_warnings?.length) {
        setContentWarnings(publishResult.content_warnings)
      } else {
        setContentWarnings([])
      }
      // Reload
      const [procData, versionData] = await Promise.all([
        getProcedure(procedure.id),
        listVersions(procedure.id),
      ])
      setProcedure(procData)
      setVersions(Array.isArray(versionData) ? versionData : ((versionData as any)?.results ?? []))
      setShowPublishForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleRetire = async (reason: string) => {
    if (!procedure || retireTarget === null) return
    await retireVersion(procedure.id, retireTarget, { reason })
    const [procData, versionData] = await Promise.all([
      getProcedure(procedure.id),
      listVersions(procedure.id),
    ])
    setProcedure(procData)
    setVersions(Array.isArray(versionData) ? versionData : ((versionData as any)?.results ?? []))
    setRetireTarget(null)
  }

  const handleWaive = async (reason: string) => {
    if (!procedure || !waiveTarget) return
    await waiveAssignment(waiveTarget.id, reason)
    const procData = await getProcedure(procedure.id)
    setProcedure(procData)
    setWaiveTarget(null)
  }

  const handleDelete = async () => {
    if (!procedure) return
    await deleteProcedure(procedure.id)
    navigate('/workflows')
  }

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

  if (error && !procedure) {
    return (
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          <div className="flex flex-col items-center justify-center h-full">
            <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => navigate('/workflows')}
              className="mt-4 text-sm text-blue-600 hover:underline"
            >
              Back to Workflow Center
            </button>
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
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => navigate('/workflows')}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {procedure?.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      {procedure && <ProcedureStatusBadge state={procedure.state} />}
                      {procedure?.current_version > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400">
                          v{procedure.current_version}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {versions.some((v) => v.is_active) &&
                    (user.is_superuser ||
                      String(userData?.id) === String(procedure?.created_by)) && (
                      <button
                        onClick={() => setShowAssignModal(true)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Users className="h-4 w-4" />
                        Assign
                      </button>
                    )}
                  {procedure?.state === 'in_review' && (
                    <button
                      onClick={() => navigate(`/procedures/${procedure.id}/review`)}
                      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                    >
                      <Eye className="h-4 w-4" />
                      Review
                    </button>
                  )}
                  {procedure?.state === 'in_review' &&
                    (user.is_superuser ||
                      String(userData?.id) === String(procedure.created_by)) && (
                      <button
                        onClick={() => setShowRevertModal(true)}
                        className="flex items-center gap-2 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Revert to Draft
                      </button>
                    )}
                  {procedure?.state === 'approved' &&
                    (user.is_superuser ||
                      String(userData?.id) === String(procedure.created_by)) && (
                      <button
                        onClick={() => setShowPublishForm(true)}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                      >
                        <Rocket className="h-4 w-4" />
                        Publish
                      </button>
                    )}
                  {procedure?.state === 'draft' &&
                    (user.is_superuser ||
                      String(userData?.id) === String(procedure.created_by)) && (
                      <button
                        onClick={() => navigate(`/procedures/${procedure.id}/edit`)}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  {procedure?.state === 'draft' &&
                    !user.is_superuser &&
                    String(userData?.id) !== String(procedure.created_by) &&
                    procedure.steps?.some((s) => String(s.step_owner) === String(userData?.id)) && (
                      <button
                        onClick={() => navigate(`/procedures/${procedure.id}/edit`)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                      >
                        <Edit className="h-4 w-4" />
                        Contribute to My Steps
                      </button>
                    )}
                  {procedure &&
                    ['draft', 'in_review'].includes(procedure.state) &&
                    (user.is_superuser ||
                      String(userData?.id) === String(procedure.created_by)) && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Publish Form */}
                {showPublishForm && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-900/20">
                    <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-3">
                      Publish Procedure
                    </h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <DatePicker
                          label="Effective From"
                          required
                          value={
                            publishData.effective_from
                              ? new Date(publishData.effective_from + 'T12:00:00')
                              : undefined
                          }
                          onChange={(date) => {
                            const formatted = date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                              : ''
                            setPublishData({ ...publishData, effective_from: formatted })
                          }}
                          minDate={new Date()}
                          placeholder="Select effective date"
                          dateFormat="PP"
                        />
                        <DatePicker
                          label="Expires On"
                          value={
                            publishData.expires_on
                              ? new Date(publishData.expires_on + 'T12:00:00')
                              : undefined
                          }
                          onChange={(date) => {
                            const formatted = date
                              ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                              : ''
                            setPublishData({ ...publishData, expires_on: formatted })
                          }}
                          minDate={
                            publishData.effective_from
                              ? new Date(publishData.effective_from + 'T12:00:00')
                              : new Date()
                          }
                          placeholder="Optional expiry date"
                          dateFormat="PP"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-green-800 dark:text-green-300 mb-1.5">
                          Changelog
                        </label>
                        <textarea
                          value={publishData.changelog}
                          onChange={(e) =>
                            setPublishData({ ...publishData, changelog: e.target.value })
                          }
                          rows={2}
                          className="w-full rounded-lg border border-green-300 bg-white px-3 py-2 text-sm shadow-sm transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:border-green-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-green-400 dark:focus:ring-green-400/20"
                          placeholder="What changed in this version..."
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          onClick={() => setShowPublishConfirm(true)}
                          disabled={!publishData.effective_from}
                          className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 disabled:opacity-50"
                        >
                          <Rocket className="h-4 w-4" />
                          Publish Now
                        </button>
                        <button
                          onClick={() => setShowPublishForm(false)}
                          className="rounded-lg border border-green-300 bg-white px-5 py-2.5 text-sm font-medium text-green-800 shadow-sm transition-colors hover:bg-green-100 dark:border-green-700 dark:bg-gray-800 dark:text-green-300 dark:hover:bg-green-900/30"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Structure Warnings */}
                {contentWarnings.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                          Content Structure Suggestions
                        </h3>
                      </div>
                      <button
                        onClick={() => setContentWarnings([])}
                        className="text-amber-400 hover:text-amber-600 text-xs"
                      >
                        Dismiss
                      </button>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                      The following steps were published without structured learning content.
                      Consider adding these to improve training effectiveness.
                    </p>
                    <div className="space-y-1">
                      {contentWarnings.map((w) => (
                        <div
                          key={w.step_order}
                          className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300"
                        >
                          <span className="font-medium">Step {w.step_order}:</span>
                          <span className="truncate">{w.step_title}</span>
                          <span className="text-amber-500">— missing {w.missing.join(', ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Metadata Card */}
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Details
                  </h2>
                  {procedure?.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {procedure.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {procedure?.department_name && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Tag className="h-4 w-4" />
                        <span>
                          <span className="text-gray-400">Department:</span>{' '}
                          {procedure.department_name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4" />
                      <span>
                        <span className="text-gray-400">Created by:</span>{' '}
                        {procedure?.created_by_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>
                        <span className="text-gray-400">Created:</span>{' '}
                        {procedure?.created_at
                          ? new Date(procedure.created_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4" />
                      <span>
                        <span className="text-gray-400">Updated:</span>{' '}
                        {procedure?.updated_at
                          ? new Date(procedure.updated_at).toLocaleDateString()
                          : ''}
                      </span>
                    </div>
                    {procedure?.state === 'published' && procedure.assignment_count != null && (
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Users className="h-4 w-4" />
                        <span>
                          <span className="text-gray-400">Assigned:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {procedure.assignment_count}
                          </span>{' '}
                          user(s)
                        </span>
                      </div>
                    )}
                  </div>
                  {procedure?.tags && procedure.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {procedure.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Review Progress */}
                {reviewProgress && reviewProgress.steps_with_reviewer > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Review Progress
                      </h2>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {reviewProgress.progress_percent}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={cn(
                          'h-3 rounded-full transition-all duration-500',
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

                    {/* Per-step breakdown */}
                    <div className="mt-3 space-y-1">
                      {reviewProgress.steps.map((s) => (
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
                              className={cn(
                                'rounded-full px-2 py-0.5 font-medium',
                                s.review_status === 'approved'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : s.review_status === 'changes_requested'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                              )}
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

                {/* Steps */}
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Steps ({procedure?.steps?.length || 0})
                    </h2>
                  </div>
                  {procedure?.steps && procedure.steps.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {procedure.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step) => {
                          const isExpanded = expandedSteps.has(step.id)
                          return (
                            <div key={step.id} className="px-5">
                              <button
                                onClick={() => toggleStep(step.id)}
                                className="w-full flex items-center gap-3 py-3 text-left"
                              >
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                  {step.order}
                                </span>
                                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {step.title}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {step.step_owner_name && (
                                    <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                                      <User className="h-3 w-3" />
                                      <span className="font-semibold">Owner:</span>{' '}
                                      {step.step_owner_name}
                                    </span>
                                  )}
                                  {step.reviewer_name && (
                                    <span className="flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                                      <UserCheck className="h-3 w-3" />
                                      <span className="font-semibold">Reviewer:</span>{' '}
                                      {step.reviewer_name}
                                    </span>
                                  )}
                                  {step.review_status && step.reviewer && (
                                    <span
                                      className={cn(
                                        'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                        step.review_status === 'approved'
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                          : step.review_status === 'changes_requested'
                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                                      )}
                                    >
                                      {step.review_status === 'approved'
                                        ? 'Approved'
                                        : step.review_status === 'changes_requested'
                                          ? 'Changes'
                                          : 'Pending'}
                                    </span>
                                  )}
                                  {step.require_manual_open && (
                                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                                  )}
                                  {step.require_media_completion && (
                                    <Video className="h-3.5 w-3.5 text-purple-500" />
                                  )}
                                  {step.require_quiz_pass && (
                                    <HelpCircle className="h-3.5 w-3.5 text-green-500" />
                                  )}
                                  {step.attachments.length > 0 && (
                                    <Paperclip className="h-3.5 w-3.5 text-gray-400" />
                                  )}
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="pb-4 pl-9 text-sm text-gray-600 dark:text-gray-400 space-y-2">
                                  {step.description && <p>{step.description}</p>}
                                  {step.estimated_duration_minutes && (
                                    <p className="text-xs text-gray-400">
                                      Est. {step.estimated_duration_minutes} min
                                    </p>
                                  )}
                                  {step.attachments.length > 0 && (
                                    <div className="space-y-1">
                                      {step.attachments.map((att) => (
                                        <div
                                          key={att.id}
                                          className="flex items-center gap-2 text-xs text-gray-500"
                                        >
                                          <Paperclip className="h-3 w-3" />
                                          {att.title || att.file_name}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No steps defined yet.
                    </div>
                  )}
                </div>

                {/* Versions */}
                {versions.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-gray-500" />
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          Version History ({versions.length})
                        </h2>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {versions.map((v) => (
                        <div key={v.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                v{v.version_number}
                              </span>
                              {v.is_active && (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Published by {v.published_by_name} on{' '}
                              {new Date(v.published_at).toLocaleDateString()}
                              {v.changelog && ` — ${v.changelog}`}
                            </p>
                          </div>
                          {v.is_active &&
                            (user.is_superuser ||
                              String(userData?.id) === String(procedure?.created_by)) && (
                              <button
                                onClick={() => setRetireTarget(v.version_number)}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                              >
                                <Archive className="h-3 w-3" />
                                Retire
                              </button>
                            )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignees */}
                {procedure?.assignments && procedure.assignments.length > 0 && (
                  <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Assignees (
                            {
                              procedure.assignments.filter((a) =>
                                ['assigned', 'in_progress'].includes(a.status)
                              ).length
                            }{' '}
                            active)
                          </h2>
                        </div>
                        {procedure.assignments.length > 5 && (
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={assigneeSearch}
                              onChange={(e) => setAssigneeSearch(e.target.value)}
                              placeholder="Search assignees..."
                              className="rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                      {procedure.assignments
                        .filter((a) => {
                          if (!assigneeSearch) return true
                          const q = assigneeSearch.toLowerCase()
                          return (
                            a.assignee_name.toLowerCase().includes(q) ||
                            a.assignee_email.toLowerCase().includes(q)
                          )
                        })
                        .map((a) => {
                          const isActive = ['assigned', 'in_progress'].includes(a.status)
                          const canWaive =
                            isActive &&
                            (user.is_superuser ||
                              String(userData?.id) === String(procedure.created_by))
                          return (
                            <div
                              key={a.id}
                              className={cn(
                                'flex items-center justify-between px-5 py-3',
                                !isActive && 'opacity-50'
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={cn(
                                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-medium',
                                    isActive
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                  )}
                                >
                                  {a.assignee_name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {a.assignee_name}
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <span className="flex items-center gap-1 truncate">
                                      <Mail className="h-3 w-3 flex-shrink-0" />
                                      {a.assignee_email}
                                    </span>
                                    {a.due_date && (
                                      <span className="flex items-center gap-1 flex-shrink-0">
                                        <Clock className="h-3 w-3" />
                                        Due{' '}
                                        {new Date(a.due_date + 'T12:00:00').toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                                    a.status === 'assigned' &&
                                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                                    a.status === 'in_progress' &&
                                      'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                    a.status === 'completed' &&
                                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                                    a.status === 'waived' &&
                                      'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                                    a.status === 'failed' &&
                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  )}
                                >
                                  {a.status === 'in_progress'
                                    ? 'In Progress'
                                    : a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                                </span>
                                {canWaive && (
                                  <button
                                    onClick={() => setWaiveTarget(a)}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                                    title="Waive assignment"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                    Waive
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
      />

      {/* Delete Procedure Modal */}
      {procedure && (
        <DeleteProcedureModal
          isOpen={showDeleteModal}
          procedureTitle={procedure.title}
          procedureState={procedure.state}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDelete}
        />
      )}

      {/* Assign Procedure Modal */}
      {procedure && (
        <AssignProcedureModal
          isOpen={showAssignModal}
          procedureTitle={procedure.title}
          versions={versions}
          existingAssignments={procedure.assignments ?? []}
          onClose={() => setShowAssignModal(false)}
          onAssigned={() => {
            if (id)
              getProcedure(id)
                .then(setProcedure)
                .catch(() => {})
          }}
        />
      )}

      {/* Publish Confirmation Modal */}
      {procedure && (
        <PublishConfirmModal
          isOpen={showPublishConfirm}
          procedureTitle={procedure.title}
          versionNumber={(procedure.current_version ?? 0) + 1}
          effectiveFrom={publishData.effective_from}
          expiresOn={publishData.expires_on || undefined}
          changelog={publishData.changelog || undefined}
          isLoading={publishing}
          onClose={() => setShowPublishConfirm(false)}
          onConfirm={async () => {
            await handlePublish()
            setShowPublishConfirm(false)
          }}
        />
      )}

      {/* Retire Version Modal */}
      {procedure && retireTarget !== null && (
        <RetireVersionModal
          isOpen={true}
          procedureTitle={procedure.title}
          versionNumber={retireTarget}
          isLastActiveVersion={versions.filter((v) => v.is_active).length === 1}
          onClose={() => setRetireTarget(null)}
          onConfirm={handleRetire}
        />
      )}

      {/* Waive Assignment Modal */}
      {procedure && waiveTarget && (
        <WaiveAssignmentModal
          isOpen={true}
          assigneeName={waiveTarget.assignee_name}
          assigneeEmail={waiveTarget.assignee_email}
          procedureTitle={procedure.title}
          versionNumber={waiveTarget.version_number}
          dueDate={waiveTarget.due_date}
          onClose={() => setWaiveTarget(null)}
          onConfirm={handleWaive}
        />
      )}

      {/* Revert to Draft Modal */}
      {showRevertModal && procedure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Revert to Draft
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowRevertModal(false)
                  setRevertReason('')
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This will cancel all active reviews and revert{' '}
                  <strong>"{procedure.title}"</strong> back to draft state. Reviewers will lose
                  their review progress.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for reverting
                </label>
                <textarea
                  value={revertReason}
                  onChange={(e) => setRevertReason(e.target.value)}
                  placeholder="e.g. Need to assign step owners and update content before review..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowRevertModal(false)
                    setRevertReason('')
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setReverting(true)
                    try {
                      await revertToDraft(procedure.id, { reason: revertReason.trim() })
                      setShowRevertModal(false)
                      setRevertReason('')
                      // Reload procedure to reflect new state
                      const updated = await getProcedure(procedure.id)
                      setProcedure(updated)
                      setReviewProgress(null)
                    } catch (err: any) {
                      setError(
                        err?.response?.data?.error ||
                          err?.response?.data?.detail ||
                          'Failed to revert procedure'
                      )
                    } finally {
                      setReverting(false)
                    }
                  }}
                  disabled={reverting}
                  className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {reverting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Revert to Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ProcedureDetailPage
