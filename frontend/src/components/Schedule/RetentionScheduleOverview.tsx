/**
 * RetentionScheduleOverview Component
 * Displays an overview of retention schedules with stats and upcoming actions
 */

import { useState, useMemo } from 'react'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Archive,
  Trash2,
  FileText,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  Filter,
  Search,
  LayoutGrid,
  List,
  Download,
  PauseCircle,
} from 'lucide-react'
import type {
  RetentionSchedule,
  ScheduleStats,
  ScheduleStatus,
  DispositionAction,
  SchedulePriority,
} from '@/types/retention'
import {
  getScheduleStatusLabel,
  getScheduleStatusColor,
  getDispositionActionLabel,
  getDispositionActionColor,
  getPriorityColor,
} from '@/types/retention'
import { cn } from '@/utils/cn'
import { format, formatDistanceToNow, isToday, isTomorrow, isThisWeek } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface RetentionScheduleOverviewProps {
  schedules: RetentionSchedule[]
  stats?: ScheduleStats | null
  onScheduleSelect?: (scheduleId: string) => void
  onRefresh?: () => void
  onViewCalendar?: () => void
  onViewQueue?: () => void
  onExport?: () => void
  loading?: boolean
}

// Default stats when none provided
const DEFAULT_STATS: ScheduleStats = {
  totalScheduled: 0,
  pendingReview: 0,
  scheduledThisWeek: 0,
  scheduledThisMonth: 0,
  overdue: 0,
  onHold: 0,
  byAction: {} as Record<DispositionAction, number>,
  byPriority: {} as Record<SchedulePriority, number>,
  byDepartment: [],
}

type ViewMode = 'grid' | 'list'
type TimeFilter = 'all' | 'today' | 'week' | 'month' | 'overdue'

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: React.ElementType
  iconColor: string
  trend?: { value: number; isPositive: boolean }
  onClick?: () => void
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  trend,
  onClick,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          {trend && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-sm',
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              <TrendingUp className={cn('w-4 h-4', !trend.isPositive && 'rotate-180')} />
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// ACTION ICONS
// ============================================================================

const ACTION_ICONS: Record<DispositionAction, React.ElementType> = {
  archive: Archive,
  delete: Trash2,
  extend: Clock,
  review: FileText,
  transfer: ChevronRight,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RetentionScheduleOverview({
  schedules,
  stats: propStats,
  onScheduleSelect,
  onRefresh,
  onViewCalendar,
  onViewQueue,
  onExport,
  loading = false,
}: RetentionScheduleOverviewProps) {
  // Handle null/undefined stats
  const stats = propStats ?? DEFAULT_STATS

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleStatus | 'all'>('all')
  const [actionFilter, setActionFilter] = useState<DispositionAction | 'all'>('all')

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !schedule.documentName.toLowerCase().includes(query) &&
          !schedule.policyName.toLowerCase().includes(query) &&
          !schedule.department.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Status filter
      if (statusFilter !== 'all' && schedule.status !== statusFilter) {
        return false
      }

      // Action filter
      if (actionFilter !== 'all' && schedule.action !== actionFilter) {
        return false
      }

      // Time filter
      const scheduledDate = new Date(schedule.scheduledDate)
      const now = new Date()
      switch (timeFilter) {
        case 'today':
          if (!isToday(scheduledDate)) return false
          break
        case 'week':
          if (!isThisWeek(scheduledDate)) return false
          break
        case 'month':
          if (
            scheduledDate.getMonth() !== now.getMonth() ||
            scheduledDate.getFullYear() !== now.getFullYear()
          )
            return false
          break
        case 'overdue':
          if (scheduledDate >= now) return false
          break
      }

      return true
    })
  }, [schedules, searchQuery, statusFilter, actionFilter, timeFilter])

  // Group schedules by date for the timeline view
  const groupedSchedules = useMemo(() => {
    const groups: Record<string, RetentionSchedule[]> = {}
    filteredSchedules.forEach((schedule) => {
      const date = format(new Date(schedule.scheduledDate), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(schedule)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredSchedules])

  // Get date label
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr)
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  // Render schedule item
  const renderScheduleItem = (schedule: RetentionSchedule) => {
    const statusColors = getScheduleStatusColor(schedule.status)
    const actionColors = getDispositionActionColor(schedule.action)
    const priorityColors = getPriorityColor(schedule.priority)
    const ActionIcon = ACTION_ICONS[schedule.action]

    return (
      <div
        key={schedule.id}
        onClick={() => onScheduleSelect?.(schedule.id)}
        className={cn(
          'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4',
          'hover:shadow-md transition-all cursor-pointer',
          viewMode === 'grid' ? 'flex flex-col' : 'flex items-center gap-4'
        )}
      >
        {/* Action Icon */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-lg',
            actionColors.bg,
            viewMode === 'grid' && 'self-start mb-3'
          )}
        >
          <ActionIcon className={cn('w-5 h-5', actionColors.icon)} />
        </div>

        {/* Content */}
        <div className={cn('flex-1 min-w-0', viewMode === 'grid' && 'space-y-2')}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {schedule.documentName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {schedule.policyName}
              </p>
            </div>
            {viewMode === 'list' && (
              <span
                className={cn(
                  'flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full',
                  statusColors.bg,
                  statusColors.text
                )}
              >
                {getScheduleStatusLabel(schedule.status)}
              </span>
            )}
          </div>

          {viewMode === 'grid' && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    statusColors.bg,
                    statusColors.text
                  )}
                >
                  {getScheduleStatusLabel(schedule.status)}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    actionColors.bg,
                    actionColors.text
                  )}
                >
                  {getDispositionActionLabel(schedule.action)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{schedule.department}</span>
                <span>•</span>
                <span>{schedule.owner}</span>
              </div>
            </>
          )}

          {viewMode === 'list' && (
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{schedule.department}</span>
              <span className={cn('px-1.5 py-0.5 rounded', actionColors.bg, actionColors.text)}>
                {getDispositionActionLabel(schedule.action)}
              </span>
              <div className="flex items-center gap-1">
                <div className={cn('w-2 h-2 rounded-full', priorityColors.dot)} />
                <span className="capitalize">{schedule.priority}</span>
              </div>
            </div>
          )}
        </div>

        {/* Time */}
        <div
          className={cn(
            'text-xs text-gray-500 dark:text-gray-400',
            viewMode === 'grid'
              ? 'flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700'
              : 'flex-shrink-0 text-right'
          )}
        >
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(schedule.scheduledDate), { addSuffix: true })}
            </span>
          </div>
          {viewMode === 'grid' && (
            <div className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', priorityColors.dot)} />
              <span className="capitalize">{schedule.priority}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading schedules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Scheduled"
          value={stats.totalScheduled}
          subtitle="Documents in queue"
          icon={Calendar}
          iconColor="bg-blue-600"
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingReview}
          subtitle="Awaiting approval"
          icon={Clock}
          iconColor="bg-yellow-600"
          onClick={onViewQueue}
        />
        <StatCard
          title="This Week"
          value={stats.scheduledThisWeek}
          subtitle="Actions scheduled"
          icon={TrendingUp}
          iconColor="bg-green-600"
        />
        <StatCard
          title="Overdue"
          value={stats.overdue}
          subtitle={stats.overdue > 0 ? 'Needs attention' : 'All on track'}
          icon={AlertTriangle}
          iconColor={stats.overdue > 0 ? 'bg-red-600' : 'bg-gray-400'}
        />
      </div>

      {/* Action Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scheduled Actions Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(Object.entries(stats.byAction) as [DispositionAction, number][]).map(
            ([action, count]) => {
              const colors = getDispositionActionColor(action)
              const Icon = ACTION_ICONS[action]
              return (
                <div
                  key={action}
                  className={cn('flex items-center gap-3 p-3 rounded-lg', colors.bg)}
                >
                  <Icon className={cn('w-5 h-5', colors.icon)} />
                  <div>
                    <p className={cn('text-lg font-bold', colors.text)}>{count}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {getDispositionActionLabel(action)}
                    </p>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search schedules..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>

          {/* Filters */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ScheduleStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="on_hold">On Hold</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as DispositionAction | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Actions</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
            <option value="review">Review</option>
            <option value="extend">Extend</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'list'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 transition-colors',
                viewMode === 'grid'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {onViewCalendar && (
            <button
              onClick={onViewCalendar}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          )}

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Schedule List */}
      {filteredSchedules.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Calendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Schedules Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' || actionFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No retention schedules have been created yet'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSchedules.map(renderScheduleItem)}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedSchedules.map(([date, items]) => (
            <div key={date}>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {getDateLabel(date)}
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs">
                  {items.length}
                </span>
              </h4>
              <div className="space-y-2">{items.map(renderScheduleItem)}</div>
            </div>
          ))}
        </div>
      )}

      {/* On Hold Summary */}
      {stats.onHold > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
          <div className="flex items-center gap-3">
            <PauseCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                {stats.onHold} schedule{stats.onHold !== 1 ? 's' : ''} on legal hold
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                These items are suspended pending legal review
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RetentionScheduleOverview
