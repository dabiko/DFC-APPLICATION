/**
 * ProcedureDetailPage — Read-only view of a procedure with versions,
 * steps, and lifecycle actions (publish, retire).
 *
 * Route: /procedures/:id
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProcedureStatusBadge } from '@/components/procedures/ProcedureStatusBadge'
import { cn } from '@/utils/cn'
import { authService } from '@/services/auth.service'
import {
  getProcedure,
  publishProcedure,
  listVersions,
  retireVersion,
} from '@/services/procedureService'
import type { ProcedureDetail, ProcedureVersionListItem } from '@/types/procedure'

export function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [procedure, setProcedure] = useState<ProcedureDetail | null>(null)
  const [versions, setVersions] = useState<ProcedureVersionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [showPublishForm, setShowPublishForm] = useState(false)
  const [publishing, setPublishing] = useState(false)
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
    Promise.all([getProcedure(id), listVersions(id)])
      .then(([procData, versionData]) => {
        setProcedure(procData)
        setVersions(versionData)
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
      await publishProcedure(procedure.id, publishData)
      // Reload
      const [procData, versionData] = await Promise.all([
        getProcedure(procedure.id),
        listVersions(procedure.id),
      ])
      setProcedure(procData)
      setVersions(versionData)
      setShowPublishForm(false)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to publish')
    } finally {
      setPublishing(false)
    }
  }

  const handleRetire = async (versionNumber: number) => {
    if (!procedure) return
    const reason = prompt('Reason for retiring this version:')
    if (!reason) return
    try {
      await retireVersion(procedure.id, versionNumber, { reason })
      const versionData = await listVersions(procedure.id)
      setVersions(versionData)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to retire version')
    }
  }

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

  if (error && !procedure) {
    return (
      <ThreePanelLayout
        header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
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
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
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
                {procedure?.state === 'approved' && (
                  <button
                    onClick={() => setShowPublishForm(true)}
                    className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    <Rocket className="h-4 w-4" />
                    Publish
                  </button>
                )}
                {procedure?.state === 'draft' && (
                  <button
                    onClick={() => navigate(`/procedures/${procedure.id}/edit`)}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
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
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Effective From
                        </label>
                        <input
                          type="date"
                          value={publishData.effective_from}
                          onChange={(e) =>
                            setPublishData({ ...publishData, effective_from: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                          Expires On
                        </label>
                        <input
                          type="date"
                          value={publishData.expires_on}
                          onChange={(e) =>
                            setPublishData({ ...publishData, expires_on: e.target.value })
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Changelog
                      </label>
                      <textarea
                        value={publishData.changelog}
                        onChange={(e) =>
                          setPublishData({ ...publishData, changelog: e.target.value })
                        }
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        placeholder="What changed in this version..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePublish}
                        disabled={publishing}
                        className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        {publishing && <Loader2 className="h-4 w-4 animate-spin" />}
                        Publish Now
                      </button>
                      <button
                        onClick={() => setShowPublishForm(false)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
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
                        {v.is_active && (
                          <button
                            onClick={() => handleRetire(v.version_number)}
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
            </div>
          </div>
        </div>
      }
    />
  )
}

export default ProcedureDetailPage
