/**
 * MyTrainingPage — Trainee's personal training dashboard.
 *
 * Route: /my-training
 * Shows assigned procedures, progress, and completion status.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  UserCircle,
  Eye,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import { useLogout } from '@/hooks/useLogout'
import { listAssignments, type ProcedureAssignment } from '@/services/assignmentService'
import { startTraining } from '@/services/trainingService'
import { cn } from '@/utils/cn'

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  assigned: {
    label: 'Not Started',
    icon: Clock,
    color: 'text-gray-500 bg-gray-100 dark:bg-gray-700',
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertTriangle,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  },
  waived: {
    label: 'Waived',
    icon: CheckCircle,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
  },
}

export function MyTrainingPage() {
  const navigate = useNavigate()
  const handleLogout = useLogout()
  const [assignments, setAssignments] = useState<ProcedureAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startingId, setStartingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Always filter to current user's assignments only
      const params: Record<string, string> = {}
      if (userData?.id) params.assignee = String(userData.id)
      const data = await listAssignments(params)
      const items = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []
      setAssignments(items)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load training assignments')
    } finally {
      setLoading(false)
    }
  }, [userData?.id])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  const handleStartTraining = async (assignmentId: string) => {
    setStartingId(assignmentId)
    try {
      const attempt = await startTraining(assignmentId)
      navigate(`/training/${attempt.id}`)
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.max_attempts_reached) {
        // Refresh assignments to show updated status
        loadAssignments()
        setError(`Maximum training attempts (${data.max_attempts}) reached. Contact your manager.`)
      } else {
        setError(data?.error || data?.detail || 'Failed to start training')
      }
    } finally {
      setStartingId(null)
    }
  }

  const filtered = filter === 'all' ? assignments : assignments.filter((a) => a.status === filter)

  const counts = {
    all: assignments.length,
    assigned: assignments.filter((a) => a.status === 'assigned').length,
    in_progress: assignments.filter((a) => a.status === 'in_progress').length,
    completed: assignments.filter((a) => a.status === 'completed').length,
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
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    My Training
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your assigned procedures and training progress
                  </p>
                </div>
              </div>
              <button
                onClick={loadAssignments}
                className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
            <nav className="flex gap-1 -mb-px">
              {(['all', 'assigned', 'in_progress', 'completed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    filter === f
                      ? 'text-green-600 dark:text-green-400 border-green-600 dark:border-green-400'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  {f === 'all'
                    ? 'All'
                    : f === 'in_progress'
                      ? 'In Progress'
                      : f.charAt(0).toUpperCase() + f.slice(1)}
                  {counts[f] > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                      {counts[f]}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading assignments...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {filter === 'all'
                      ? 'No training assignments yet.'
                      : `No ${filter.replace('_', ' ')} assignments.`}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((assignment) => {
                    const config = STATUS_CONFIG[assignment.status] || STATUS_CONFIG.assigned
                    const StatusIcon = config.icon
                    return (
                      <div
                        key={assignment.id}
                        className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {assignment.procedure_title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                              <span
                                className={cn(
                                  'flex items-center gap-1 rounded-full px-2 py-0.5',
                                  config.color
                                )}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {config.label}
                              </span>
                              <span>v{assignment.version_number}</span>
                              {assignment.attempts_used > 0 && (
                                <span className="text-gray-400 dark:text-gray-500">
                                  Attempt {assignment.attempts_used}
                                  {assignment.max_training_attempts > 0
                                    ? ` of ${assignment.max_training_attempts}`
                                    : ''}
                                </span>
                              )}
                              {assignment.completion_score != null && (
                                <span
                                  className={
                                    assignment.status === 'completed'
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-500 dark:text-red-400'
                                  }
                                >
                                  Score: {assignment.completion_score}%
                                </span>
                              )}
                              {assignment.due_date && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Due:{' '}
                                  {new Date(assignment.due_date + 'T12:00:00').toLocaleDateString()}
                                </span>
                              )}
                              {assignment.assigned_by_name && (
                                <span className="flex items-center gap-1">
                                  <UserCircle className="h-3 w-3" />
                                  Assigned by {assignment.assigned_by_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {(assignment.status === 'assigned' ||
                            assignment.status === 'in_progress') && (
                            <button
                              onClick={() => handleStartTraining(assignment.id)}
                              disabled={startingId === assignment.id}
                              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 ml-4"
                            >
                              {startingId === assignment.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <PlayCircle className="h-4 w-4" />
                              )}
                              {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                            </button>
                          )}

                          {(assignment.status === 'completed' ||
                            assignment.status === 'failed') && (
                            <div className="flex items-center gap-2 ml-4">
                              {assignment.status === 'failed' &&
                                (assignment.max_training_attempts === 0 ||
                                  assignment.attempts_used < assignment.max_training_attempts) && (
                                  <button
                                    onClick={() => handleStartTraining(assignment.id)}
                                    disabled={startingId === assignment.id}
                                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                  >
                                    {startingId === assignment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <RefreshCw className="h-4 w-4" />
                                    )}
                                    Retry
                                  </button>
                                )}
                              {assignment.latest_attempt_id && (
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/training/${assignment.latest_attempt_id}?review=true`
                                    )
                                  }
                                  title="Review training"
                                  className="p-1.5 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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

export default MyTrainingPage
