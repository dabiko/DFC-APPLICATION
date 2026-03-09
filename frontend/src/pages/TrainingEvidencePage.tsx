/**
 * TrainingEvidencePage — Evidence viewer for admin/compliance auditor.
 *
 * Route: /procedures/evidence
 * Displays training evidence records with export capabilities.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  FileCheck,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import { listEvidence, exportEvidenceCsv, type EvidenceRecord } from '@/services/evidenceService'
import { cn } from '@/utils/cn'

export function TrainingEvidencePage() {
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadEvidence = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const data = await listEvidence(params)
      setEvidence(data.results)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load evidence')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const debounce = setTimeout(loadEvidence, 300)
    return () => clearTimeout(debounce)
  }, [loadEvidence])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const params: Record<string, string> = {}
      if (search) params.search = search
      const blob = await exportEvidenceCsv(params)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-evidence-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to export CSV')
    } finally {
      setExporting(false)
    }
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
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Training Evidence
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Compliance evidence records for completed training
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export CSV
                </button>
                <button
                  onClick={loadEvidence}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by trainee name or procedure..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading evidence...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : evidence.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No evidence records found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evidence.map((record) => {
                    const isExpanded = expandedId === record.id
                    const assignment = record.assignment
                    return (
                      <div
                        key={record.id}
                        className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        {/* Summary Row */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : record.id)}
                          className="w-full flex items-center gap-3 p-4 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {assignment.procedure_title}
                              </h3>
                              <span className="text-xs text-gray-400">
                                v{assignment.version_number}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Trainee: {assignment.assigned_to_name} | Assigned by:{' '}
                              {assignment.assigned_by_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span
                              className={cn(
                                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                                assignment.status === 'completed'
                                  ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                                  : assignment.status === 'failed'
                                    ? 'text-red-600 bg-red-100 dark:bg-red-900/30'
                                    : 'text-gray-500 bg-gray-100 dark:bg-gray-700'
                              )}
                            >
                              {assignment.status === 'completed' ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : assignment.status === 'failed' ? (
                                <XCircle className="h-3 w-3" />
                              ) : (
                                <Clock className="h-3 w-3" />
                              )}
                              {assignment.status}
                            </span>
                            {assignment.completed_at && (
                              <span className="text-xs text-gray-400">
                                {new Date(assignment.completed_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                            {record.attempts.map((attempt, attemptIdx) => (
                              <div
                                key={attempt.id}
                                className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-3"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    Attempt {attemptIdx + 1}
                                  </h4>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>Status: {attempt.status}</span>
                                    {attempt.score !== null && <span>Score: {attempt.score}%</span>}
                                    <span>
                                      Started: {new Date(attempt.started_at).toLocaleString()}
                                    </span>
                                    {attempt.completed_at && (
                                      <span>
                                        Completed: {new Date(attempt.completed_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Step Completions */}
                                {attempt.step_completions.length > 0 && (
                                  <div className="mb-3">
                                    <h5 className="text-xs font-medium text-gray-500 mb-1">
                                      Steps
                                    </h5>
                                    <div className="space-y-1">
                                      {attempt.step_completions.map((sc, scIdx) => (
                                        <div
                                          key={scIdx}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          {sc.status === 'completed' ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Clock className="h-3 w-3 text-gray-400" />
                                          )}
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {sc.step_title}
                                          </span>
                                          <span className="text-gray-400">— {sc.status}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Quiz Attempts */}
                                {attempt.quiz_attempts.length > 0 && (
                                  <div>
                                    <h5 className="text-xs font-medium text-gray-500 mb-1">
                                      Quizzes
                                    </h5>
                                    <div className="space-y-1">
                                      {attempt.quiz_attempts.map((qa, qaIdx) => (
                                        <div
                                          key={qaIdx}
                                          className="flex items-center gap-2 text-xs"
                                        >
                                          {qa.passed ? (
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <XCircle className="h-3 w-3 text-red-500" />
                                          )}
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {qa.quiz_title}
                                          </span>
                                          <span className="text-gray-400">
                                            — {qa.score}% ({qa.passed ? 'Passed' : 'Failed'})
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}

                            {record.attempts.length === 0 && (
                              <p className="text-xs text-gray-500 text-center py-2">
                                No training attempts recorded yet.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      }
    />
  )
}

export default TrainingEvidencePage
