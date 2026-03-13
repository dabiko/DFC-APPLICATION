/**
 * TrainingAssignmentsPage — Admin assignment management dashboard.
 *
 * Route: /procedures/assignments
 * Allows admins/managers to view, create, and manage training assignments.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, RefreshCw, Search, Loader2, BarChart3, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useLogout } from '@/hooks/useLogout'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  AssignmentDashboard,
  AssignmentList,
  OverdueAlertList,
  ExpirationWarningList,
  AnalyticsOverviewCards,
  QuestionDifficultyTable,
  StepBottlenecksChart,
  QuizPerformanceChart,
  ProcedureComparisonChart,
} from '@/components/procedures/assignments'
import { authService } from '@/services/auth.service'
import {
  listAssignments,
  getAssignmentDashboard,
  getContentAnalytics,
  waiveAssignment,
  type ProcedureAssignment,
  type AssignmentDashboard as DashboardData,
  type ContentAnalytics,
} from '@/services/assignmentService'

export function TrainingAssignmentsPage() {
  const handleLogout = useLogout()
  const [assignments, setAssignments] = useState<ProcedureAssignment[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [analytics, setAnalytics] = useState<ContentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [waivingId, setWaivingId] = useState<string | null>(null)
  const [showWaiveModal, setShowWaiveModal] = useState<string | null>(null)
  const [waiveReason, setWaiveReason] = useState('')
  const [activeTab, setActiveTab] = useState<'assignments' | 'analytics'>('assignments')

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string> = {}
      if (filter !== 'all') params.status = filter
      if (search) params.search = search

      const [assignmentsData, dashboardData, analyticsData] = await Promise.all([
        listAssignments(params),
        getAssignmentDashboard(),
        getContentAnalytics(),
      ])
      setAssignments(assignmentsData.results)
      setDashboard(dashboardData)
      setAnalytics(analyticsData)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load assignments')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    const debounce = setTimeout(loadData, 300)
    return () => clearTimeout(debounce)
  }, [loadData])

  const handleWaive = async (assignmentId: string) => {
    if (!waiveReason.trim()) return
    setWaivingId(assignmentId)
    try {
      await waiveAssignment(assignmentId, waiveReason)
      setShowWaiveModal(null)
      setWaiveReason('')
      loadData()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to waive assignment')
    } finally {
      setWaivingId(null)
    }
  }

  return (
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
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Training Assignments
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Manage procedure assignments and track training progress
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              <button
                onClick={() => setActiveTab('assignments')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'assignments'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignments
                </span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Content Analytics
                </span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Dashboard Metrics (always visible) */}
              {dashboard && <AssignmentDashboard dashboard={dashboard} />}

              {activeTab === 'assignments' && (
                <>
                  {/* Alert Lists */}
                  <OverdueAlertList assignments={assignments} />
                  <ExpirationWarningList assignments={assignments} />

                  {/* Search + Filter */}
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by trainee name or procedure..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <StatusFilterDropdown value={filter} onChange={setFilter} />
                  </div>

                  {/* Assignments Table */}
                  <AssignmentList
                    assignments={assignments}
                    loading={loading}
                    error={error}
                    onWaive={(id) => {
                      setShowWaiveModal(id)
                      setWaiveReason('')
                    }}
                  />
                </>
              )}

              {activeTab === 'analytics' && analytics && (
                <>
                  {/* Overall KPIs */}
                  <AnalyticsOverviewCards data={analytics.overall} />

                  {/* Step Bottlenecks + Quiz Performance side by side on wide screens */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <StepBottlenecksChart data={analytics.step_bottlenecks} />
                    <QuizPerformanceChart data={analytics.quiz_performance} />
                  </div>

                  {/* Question Difficulty (full width) */}
                  <QuestionDifficultyTable data={analytics.question_difficulty} />

                  {/* Procedure Comparison (full width) */}
                  <ProcedureComparisonChart data={analytics.procedure_comparison} />
                </>
              )}

              {activeTab === 'analytics' && !analytics && !loading && (
                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                  <BarChart3 className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No analytics data available yet.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Analytics will appear once trainees start completing procedures.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Waive Modal */}
          {showWaiveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="rounded-lg bg-white p-6 w-full max-w-md dark:bg-gray-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Waive Assignment
                </h3>
                <p className="text-sm text-gray-500 mb-3">
                  Provide a reason for waiving this training assignment.
                </p>
                <textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for waiver..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowWaiveModal(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleWaive(showWaiveModal)}
                    disabled={!waiveReason.trim() || waivingId === showWaiveModal}
                    className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {waivingId === showWaiveModal && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm Waive
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      }
    />
  )
}

/* ─── Status Filter Dropdown ─── */

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status', dot: 'bg-gray-400' },
  { value: 'assigned', label: 'Assigned', dot: 'bg-gray-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-blue-500' },
  { value: 'completed', label: 'Completed', dot: 'bg-green-500' },
  { value: 'failed', label: 'Failed', dot: 'bg-red-500' },
  { value: 'overdue', label: 'Overdue', dot: 'bg-orange-500' },
  { value: 'waived', label: 'Waived', dot: 'bg-purple-500' },
]

function StatusFilterDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = STATUS_OPTIONS.find((o) => o.value === value) || STATUS_OPTIONS[0]

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
          'border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700',
          'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
        )}
      >
        <span className={cn('h-2 w-2 rounded-full', selected.dot)} />
        <span className="text-gray-700 dark:text-gray-200">{selected.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                value === option.value
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50'
              )}
            >
              <span className={cn('h-2 w-2 rounded-full shrink-0', option.dot)} />
              <span className="flex-1 text-left">{option.label}</span>
              {value === option.value && (
                <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TrainingAssignmentsPage
