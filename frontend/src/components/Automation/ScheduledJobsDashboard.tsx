/**
 * ScheduledJobsDashboard Component
 * Dashboard for monitoring and managing scheduled automation jobs
 */

import { useState, useMemo } from 'react'
import {
  Play,
  Pause,
  Square,
  Trash2,
  RefreshCw,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MoreVertical,
  Calendar,
  FileText,
  Archive,
  Bell,
  Shield,
  Database,
  HardDrive,
  Activity,
  TrendingUp,
  Eye,
} from 'lucide-react'
import type { ScheduledJob, AutomationStats, JobStatus, JobType } from '@/types/retention'
import {
  getJobStatusLabel,
  getJobStatusColor,
  getJobTypeLabel,
  formatJobDuration,
} from '@/types/retention'
import { cn } from '@/utils/cn'
import { format, formatDistanceToNow } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface ScheduledJobsDashboardProps {
  jobs?: ScheduledJob[]
  stats?: AutomationStats
  onViewJob?: (jobId: string) => void
  onRunJob?: (jobId: string) => void
  onPauseJob?: (jobId: string) => void
  onResumeJob?: (jobId: string) => void
  onCancelJob?: (jobId: string) => void
  onDeleteJob?: (jobId: string) => void
  onCreateJob?: () => void
  onRefresh?: () => void
  loading?: boolean
  isLoading?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const JOB_TYPE_ICONS: Record<JobType, React.ElementType> = {
  retention_scan: Search,
  disposition_execution: Play,
  archival_batch: Archive,
  deletion_batch: Trash2,
  notification_batch: Bell,
  compliance_check: Shield,
  index_rebuild: Database,
  backup: HardDrive,
}

const STATUS_ICONS: Record<JobStatus, React.ElementType> = {
  pending: Clock,
  running: Loader2,
  completed: CheckCircle,
  failed: XCircle,
  cancelled: Square,
  paused: Pause,
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  trend?: { value: number; isPositive: boolean }
}

function StatCard({ title, value, icon: Icon, iconColor, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1 text-xs',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              <TrendingUp className={cn('w-3 h-3', !trend.isPositive && 'rotate-180')} />
              <span>{trend.value}% from yesterday</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

interface JobRowProps {
  job: ScheduledJob
  onView: () => void
  onRun: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onDelete: () => void
}

function JobRow({ job, onView, onRun, onPause, onResume, onCancel, onDelete }: JobRowProps) {
  const [showActions, setShowActions] = useState(false)
  const TypeIcon = JOB_TYPE_ICONS[job.type]
  const StatusIcon = STATUS_ICONS[job.status]
  const statusColors = getJobStatusColor(job.status)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Job Info */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <TypeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{job.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{getJobTypeLabel(job.type)}</p>
          </div>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn('w-4 h-4', job.status === 'running' && 'animate-spin', statusColors.text)}
          />
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              statusColors.bg,
              statusColors.text
            )}
          >
            {getJobStatusLabel(job.status)}
          </span>
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-3">
        {job.status === 'running' ? (
          <div className="w-32">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500 dark:text-gray-400">{job.progress}%</span>
              <span className="text-gray-500 dark:text-gray-400">{job.currentStep}</span>
            </div>
            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {job.processedCount > 0 ? `${job.successCount}/${job.processedCount} processed` : '-'}
          </span>
        )}
      </td>

      {/* Schedule */}
      <td className="px-4 py-3">
        {job.isRecurring ? (
          <div className="text-sm">
            <p className="text-gray-900 dark:text-white capitalize">{job.schedule.frequency}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">at {job.schedule.timeOfDay}</p>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">One-time</span>
        )}
      </td>

      {/* Last Run */}
      <td className="px-4 py-3">
        {job.lastRunAt ? (
          <div className="text-sm">
            <p className="text-gray-900 dark:text-white">
              {formatDistanceToNow(new Date(job.lastRunAt), { addSuffix: true })}
            </p>
            {job.duration && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Duration: {formatJobDuration(job.duration)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">Never</span>
        )}
      </td>

      {/* Next Run */}
      <td className="px-4 py-3">
        {job.nextRunAt ? (
          <div className="text-sm">
            <p className="text-gray-900 dark:text-white">
              {format(new Date(job.nextRunAt), 'MMM d, HH:mm')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true })}
            </p>
          </div>
        ) : (
          <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="relative flex items-center justify-end gap-1">
          <button
            onClick={onView}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>

          {job.status === 'pending' && (
            <button
              onClick={onRun}
              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
              title="Run now"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {job.status === 'running' && (
            <button
              onClick={onPause}
              className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded transition-colors"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {job.status === 'paused' && (
            <button
              onClick={onResume}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showActions && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {job.status === 'running' && (
                    <button
                      onClick={() => {
                        onCancel()
                        setShowActions(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Square className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDelete()
                      setShowActions(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ScheduledJobsDashboard({
  jobs = [],
  stats,
  onViewJob = () => {},
  onRunJob = () => {},
  onPauseJob = () => {},
  onResumeJob = () => {},
  onCancelJob = () => {},
  onDeleteJob = () => {},
  onCreateJob = () => {},
  onRefresh = () => {},
  loading = false,
  isLoading = false,
}: ScheduledJobsDashboardProps) {
  // Default stats to prevent undefined errors
  const safeStats = {
    activeJobs: 0,
    pendingJobs: 0,
    completedToday: 0,
    failedToday: 0,
    successRate: 100,
    documentsProcessed: 0,
    documentsArchived: 0,
    notificationsSent: 0,
    documentsProcessedToday: 0,
    documentsProcessedThisWeek: 0,
    documentsProcessedThisMonth: 0,
    archivalSuccessRate: 100,
    deletionSuccessRate: 100,
    notificationSuccessRate: 100,
    averageJobDuration: 0,
    upcomingJobs: [] as ScheduledJob[],
    recentErrors: [] as { message: string; timestamp: string }[],
    notificationsSentToday: 0,
    notificationsPendingDelivery: 0,
    notificationFailureRate: 0,
    ...stats,
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<JobStatus | 'all'>('all')
  const [filterType, setFilterType] = useState<JobType | 'all'>('all')

  // Filter jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus
      const matchesType = filterType === 'all' || job.type === filterType
      return matchesSearch && matchesStatus && matchesType
    })
  }, [jobs, searchQuery, filterStatus, filterType])

  // Get unique types for filter
  const jobTypes = useMemo(() => {
    const types = new Set(jobs.map((j) => j.type))
    return Array.from(types)
  }, [jobs])

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading scheduled jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={safeStats.activeJobs}
          icon={Activity}
          iconColor="bg-blue-600"
        />
        <StatCard
          title="Completed Today"
          value={safeStats.completedToday}
          icon={CheckCircle}
          iconColor="bg-green-600"
        />
        <StatCard
          title="Failed Today"
          value={safeStats.failedToday}
          icon={XCircle}
          iconColor="bg-red-600"
        />
        <StatCard
          title="Success Rate"
          value={`${safeStats.successRate}%`}
          icon={TrendingUp}
          iconColor="bg-purple-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Documents Processed
            </h4>
            <FileText className="w-4 h-4 text-gray-400" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {safeStats.documentsProcessedToday.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {safeStats.documentsProcessedThisWeek.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">This Week</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {safeStats.documentsProcessedThisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">This Month</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Action Success Rates
            </h4>
            <Shield className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Archival</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${safeStats.archivalSuccessRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {safeStats.archivalSuccessRate}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Deletion</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full"
                    style={{ width: `${safeStats.deletionSuccessRate}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {safeStats.deletionSuccessRate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Notifications</h4>
            <Bell className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Sent Today</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {safeStats.notificationsSentToday}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {safeStats.notificationsPendingDelivery}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Failure Rate</span>
              <span
                className={cn(
                  'text-sm font-medium',
                  safeStats.notificationFailureRate > 5 ? 'text-red-600' : 'text-green-600'
                )}
              >
                {safeStats.notificationFailureRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Scheduled Jobs
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''} configured
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onRefresh}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={onCreateJob}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Job
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search jobs..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as JobStatus | 'all')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as JobType | 'all')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              {jobTypes.map((type) => (
                <option key={type} value={type}>
                  {getJobTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No jobs found</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Run
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Next Run
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredJobs.map((job) => (
                  <JobRow
                    key={job.id}
                    job={job}
                    onView={() => onViewJob(job.id)}
                    onRun={() => onRunJob(job.id)}
                    onPause={() => onPauseJob(job.id)}
                    onResume={() => onResumeJob(job.id)}
                    onCancel={() => onCancelJob(job.id)}
                    onDelete={() => onDeleteJob(job.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upcoming Jobs */}
      {safeStats.upcomingJobs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Jobs
          </h3>
          <div className="space-y-3">
            {safeStats.upcomingJobs.slice(0, 5).map((job) => {
              const TypeIcon = JOB_TYPE_ICONS[job.type]
              return (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                      <TypeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {job.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getJobTypeLabel(job.type)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {job.nextRunAt && format(new Date(job.nextRunAt), 'MMM d, HH:mm')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {job.nextRunAt &&
                        formatDistanceToNow(new Date(job.nextRunAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScheduledJobsDashboard
