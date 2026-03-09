/**
 * ProcedureVersionPage — Read-only view of a published version.
 *
 * Route: /procedures/:id/versions/:versionNumber
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Clock,
  User,
  Tag,
  CheckCircle,
  BookOpen,
  Video,
  HelpCircle,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import { getVersion } from '@/services/procedureService'
import type { ProcedureVersion } from '@/types/procedure'

export function ProcedureVersionPage() {
  const { id, versionNumber } = useParams<{ id: string; versionNumber: string }>()
  const navigate = useNavigate()

  const [version, setVersion] = useState<ProcedureVersion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  useEffect(() => {
    if (!id || !versionNumber) return
    setLoading(true)
    getVersion(id, Number(versionNumber))
      .then((data) => {
        setVersion(data)
        setError(null)
      })
      .catch((err) => setError(err?.response?.data?.detail || 'Failed to load version'))
      .finally(() => setLoading(false))
  }, [id, versionNumber])

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) next.delete(stepId)
      else next.add(stepId)
      return next
    })
  }

  const content = loading ? (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
    </div>
  ) : error || !version ? (
    <div className="flex flex-col items-center justify-center h-full">
      <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-red-600 dark:text-red-400">{error || 'Version not found'}</p>
    </div>
  ) : (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/procedures/${id}`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {version.title}
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                v{version.version_number}
              </span>
              {version.is_active && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Published by {version.published_by_name} on{' '}
              {new Date(version.published_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Metadata */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            {version.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{version.description}</p>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Effective: {new Date(version.effective_from).toLocaleDateString()}
              </span>
              {version.expires_on && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Expires: {new Date(version.expires_on).toLocaleDateString()}
                </span>
              )}
            </div>
            {version.changelog && (
              <div className="mt-3 rounded-md bg-gray-50 p-3 dark:bg-gray-700/50">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Changelog
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{version.changelog}</p>
              </div>
            )}
            {version.tags && version.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {version.tags.map((tag) => (
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
                Steps ({version.steps?.length || 0})
              </h2>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {version.steps
                ?.sort((a, b) => a.order - b.order)
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
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={content}
    />
  )
}

export default ProcedureVersionPage
