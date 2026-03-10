/**
 * TrainingAssignmentsPage — Admin assignment management dashboard.
 *
 * Route: /procedures/assignments
 * Allows admins/managers to view, create, and manage training assignments.
 */

import { useState, useEffect, useCallback } from 'react'
import { Users, RefreshCw, Search, Loader2 } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  AssignmentDashboard,
  AssignmentList,
  OverdueAlertList,
  ExpirationWarningList,
} from '@/components/procedures/assignments'
import { authService } from '@/services/auth.service'
import {
  listAssignments,
  getAssignmentDashboard,
  waiveAssignment,
  type ProcedureAssignment,
  type AssignmentDashboard as DashboardData,
} from '@/services/assignmentService'

export function TrainingAssignmentsPage() {
  const [assignments, setAssignments] = useState<ProcedureAssignment[]>([])
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [waivingId, setWaivingId] = useState<string | null>(null)
  const [showWaiveModal, setShowWaiveModal] = useState<string | null>(null)
  const [waiveReason, setWaiveReason] = useState('')

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

      const [assignmentsData, dashboardData] = await Promise.all([
        listAssignments(params),
        getAssignmentDashboard(),
      ])
      setAssignments(assignmentsData.results)
      setDashboard(dashboardData)
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
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Dashboard Metrics */}
              {dashboard && <AssignmentDashboard dashboard={dashboard} />}

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
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="all">All Status</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="overdue">Overdue</option>
                  <option value="waived">Waived</option>
                </select>
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

export default TrainingAssignmentsPage
