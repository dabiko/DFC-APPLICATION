/**
 * TrainingAssignmentsPage — Admin assignment management dashboard.
 *
 * Route: /procedures/assignments
 * Allows admins/managers to view, create, and manage training assignments.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Search,
  CheckCircle,
  Clock,
  PlayCircle,
  AlertCircle,
  XCircle,
  Shield,
  BarChart3,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  listAssignments,
  getAssignmentDashboard,
  waiveAssignment,
  type ProcedureAssignment,
  type AssignmentDashboard,
} from '@/services/assignmentService'
import { cn } from '@/utils/cn'

const STATUS_ICONS: Record<string, React.FC<{ className?: string }>> = {
  assigned: Clock,
  in_progress: PlayCircle,
  completed: CheckCircle,
  failed: XCircle,
  overdue: AlertCircle,
  waived: Shield,
}

const STATUS_COLORS: Record<string, string> = {
  assigned: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
  in_progress: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  completed: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  failed: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  overdue: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  waived: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
}

export function TrainingAssignmentsPage() {
  const [assignments, setAssignments] = useState<ProcedureAssignment[]>([])
  const [dashboard, setDashboard] = useState<AssignmentDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [waivingId, setWaivingId] = useState<string | null>(null)
  const [waiveReason, setWaiveReason] = useState('')
  const [showWaiveModal, setShowWaiveModal] = useState<string | null>(null)

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

  const statCards = dashboard
    ? [
        { label: 'Total', value: dashboard.total, color: 'text-gray-600' },
        { label: 'Assigned', value: dashboard.assigned, color: 'text-gray-500' },
        { label: 'In Progress', value: dashboard.in_progress, color: 'text-blue-600' },
        { label: 'Completed', value: dashboard.completed, color: 'text-green-600' },
        { label: 'Failed', value: dashboard.failed, color: 'text-red-600' },
        { label: 'Overdue', value: dashboard.overdue, color: 'text-orange-600' },
      ]
    : []

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
              {/* Stats Cards */}
              {dashboard && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {statCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
                      <p className={cn('text-2xl font-bold', card.color)}>{card.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Completion rate */}
              {dashboard && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-500" />
                      Completion Rate
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {dashboard.completion_rate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: `${dashboard.completion_rate}%` }}
                    />
                  </div>
                </div>
              )}

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
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading assignments...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No assignments found.</p>
                </div>
              ) : (
                <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Trainee
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Procedure
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Due Date
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Assigned By
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {assignments.map((a) => {
                        const StatusIcon = STATUS_ICONS[a.status] || Clock
                        const statusColor = STATUS_COLORS[a.status] || STATUS_COLORS.assigned
                        return (
                          <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                              {a.assigned_to_name}
                            </td>
                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                              {a.procedure_title}
                              <span className="text-xs text-gray-400 ml-1">
                                v{a.version_number}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs w-fit',
                                  statusColor
                                )}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {a.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">
                              {a.assigned_by_name}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {(a.status === 'assigned' || a.status === 'in_progress') && (
                                <button
                                  onClick={() => {
                                    setShowWaiveModal(a.id)
                                    setWaiveReason('')
                                  }}
                                  className="text-xs text-purple-600 hover:underline dark:text-purple-400"
                                >
                                  Waive
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
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

export default TrainingAssignmentsPage
