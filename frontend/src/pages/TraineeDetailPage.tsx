/**
 * TraineeDetailPage — Detailed training history for a specific trainee.
 *
 * Route: /procedures/assignments/trainee/:userId
 * Shows all assignments, attempts, quiz results, and step completions.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  User,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  Target,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  BarChart3,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import { useLogout } from '@/hooks/useLogout'
import {
  getTraineeDetail,
  type TraineeDetailData,
  type TraineeAssignmentDetail,
  type TraineeAttemptDetail,
} from '@/services/assignmentService'
import { cn } from '@/utils/cn'

export function TraineeDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const handleLogout = useLogout()

  const [data, setData] = useState<TraineeDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const result = await getTraineeDetail(userId)
      setData(result)
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.error ||
          'Failed to load trainee details'
      )
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/procedures/assignments')}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {loading ? 'Loading...' : data?.full_name || 'Trainee Detail'}
                </h1>
                {data && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {data.email}
                    {data.department && ` · ${data.department}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading trainee data...</span>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : data ? (
                <>
                  {/* Stats Cards */}
                  <StatsCards stats={data.stats} />

                  {/* Assignments */}
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Training Assignments ({data.assignments.length})
                    </h2>
                    {data.assignments.length === 0 ? (
                      <div className="text-center py-8 text-sm text-gray-500">
                        No assignments found for this trainee.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.assignments.map((assignment) => (
                          <AssignmentCard key={assignment.id} assignment={assignment} />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      }
    />
  )
}

/* ─── Stats Cards ─── */

function StatsCards({ stats }: { stats: TraineeDetailData['stats'] }) {
  const cards = [
    {
      label: 'Total',
      value: stats.total_assignments,
      icon: BookOpen,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'In Progress',
      value: stats.in_progress,
      icon: PlayCircle,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    {
      label: 'Failed Attempts',
      value: `${stats.failed_attempts} / ${stats.total_attempts}`,
      icon: XCircle,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Avg Score',
      value: `${stats.average_score}%`,
      icon: Target,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Pass Rate',
      value: `${stats.pass_rate}%`,
      icon: Trophy,
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.label}
            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('p-1 rounded', card.color)}>
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{card.label}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{card.value}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Assignment Card ─── */

function AssignmentCard({ assignment }: { assignment: TraineeAssignmentDetail }) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig: Record<string, { label: string; color: string }> = {
    assigned: {
      label: 'Not Started',
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    },
    failed: {
      label: 'Failed',
      color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    },
    overdue: {
      label: 'Overdue',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    },
    waived: {
      label: 'Waived',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    },
  }

  const config = statusConfig[assignment.status] || statusConfig.assigned

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      {/* Assignment header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {assignment.procedure_title}
              <span className="text-xs text-gray-400 ml-1">v{assignment.version_number}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-500">
              {assignment.due_date && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                </span>
              )}
              <span>{assignment.attempts.length} attempt(s)</span>
              {assignment.max_training_attempts > 0 && (
                <span className="text-gray-400">(max {assignment.max_training_attempts})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 ml-3">
          {assignment.completion_score != null && (
            <span
              className={cn(
                'text-sm font-bold',
                assignment.status === 'completed'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-500 dark:text-red-400'
              )}
            >
              {assignment.completion_score}%
            </span>
          )}
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.color)}>
            {config.label}
          </span>
        </div>
      </button>

      {/* Expanded: attempts */}
      {expanded && assignment.attempts.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {assignment.attempts.map((attempt) => (
            <AttemptRow key={attempt.id} attempt={attempt} />
          ))}
        </div>
      )}

      {expanded && assignment.attempts.length === 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4 text-center text-xs text-gray-400">
          No attempts yet
        </div>
      )}
    </div>
  )
}

/* ─── Attempt Row ─── */

function AttemptRow({ attempt }: { attempt: TraineeAttemptDetail }) {
  const [expanded, setExpanded] = useState(false)

  const statusColors: Record<string, string> = {
    passed: 'text-green-600 dark:text-green-400',
    completed: 'text-green-600 dark:text-green-400',
    failed: 'text-red-600 dark:text-red-400',
    in_progress: 'text-blue-600 dark:text-blue-400',
  }

  const formatTime = (seconds: number) => {
    if (!seconds) return '—'
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-700/50 last:border-b-0">
      {/* Attempt header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Attempt #{attempt.attempt_number}
          </span>
          <span
            className={cn('text-xs font-medium', statusColors[attempt.status] || 'text-gray-500')}
          >
            {attempt.status}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {attempt.total_score != null && (
            <span className="font-medium">{attempt.total_score}%</span>
          )}
          <span>
            {attempt.steps_completed}/{attempt.total_steps} steps
          </span>
          <span>{formatTime(attempt.total_time_seconds)}</span>
          {attempt.started_at && <span>{new Date(attempt.started_at).toLocaleDateString()}</span>}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-6 pb-3 space-y-3">
          {/* Step completions */}
          {attempt.step_completions.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Steps
              </p>
              <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/30">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">#</th>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Step</th>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Status</th>
                      <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {attempt.step_completions.map((sc) => (
                      <tr key={`${sc.step_order}-${sc.step_title}`}>
                        <td className="px-3 py-1.5 text-gray-400">{sc.step_order}</td>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {sc.step_title}
                        </td>
                        <td className="px-3 py-1.5">
                          <StepStatusBadge status={sc.status} />
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-500">
                          {formatTime(sc.time_spent_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quiz results */}
          {attempt.quiz_results.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                Quizzes
              </p>
              <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-900/30">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Quiz</th>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Score</th>
                      <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Result</th>
                      <th className="text-right px-3 py-1.5 text-gray-500 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {attempt.quiz_results.map((qr, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
                          {qr.quiz_title}
                          <span className="text-gray-400 ml-1">(#{qr.attempt_number})</span>
                        </td>
                        <td className="px-3 py-1.5 font-medium">
                          <span
                            className={
                              qr.passed
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-500 dark:text-red-400'
                            }
                          >
                            {qr.score_percent != null ? `${qr.score_percent}%` : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          {qr.passed ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" /> Passed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500 dark:text-red-400">
                              <XCircle className="h-3 w-3" /> Failed
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-500">
                          {formatTime(qr.time_spent_seconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Step Status Badge ─── */

function StepStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'text-green-600 dark:text-green-400' },
    quiz_passed: { label: 'Passed', className: 'text-green-600 dark:text-green-400' },
    quiz_failed: { label: 'Quiz Failed', className: 'text-red-500 dark:text-red-400' },
    started: { label: 'In Progress', className: 'text-blue-600 dark:text-blue-400' },
    not_started: { label: 'Not Started', className: 'text-gray-400' },
    skipped: { label: 'Skipped', className: 'text-gray-400' },
  }

  const c = config[status] || { label: status, className: 'text-gray-500' }
  return <span className={cn('text-xs font-medium', c.className)}>{c.label}</span>
}

export default TraineeDetailPage
