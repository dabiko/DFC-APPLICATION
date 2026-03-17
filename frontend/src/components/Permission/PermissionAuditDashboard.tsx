/**
 * PermissionAuditDashboard Component
 *
 * A comprehensive dashboard for viewing and analyzing RBAC permission changes.
 * Shows permission grants, revocations, role assignments, and access denials.
 * Includes filtering, statistics, and timeline views.
 */

import { FC, useState, useEffect, useCallback, useMemo } from 'react'
import {
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  DocumentIcon,
  FolderIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  XMarkIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserPlusIcon,
  UserMinusIcon,
  KeyIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { ErrorState } from '@/components/common'
import { cn } from '@/utils/cn'
import {
  getPermissionAuditLogs,
  getPermissionAuditLogSummary,
  type PermissionAuditLog,
  type AuditLogSummary,
} from '@/services/permissionService'
import { usePermissions } from '@/contexts/PermissionContext'

// ============================================================================
// Types
// ============================================================================

interface PermissionAuditDashboardProps {
  className?: string
}

interface FilterState {
  action: string
  resourceType: string
  fromDate: string
  toDate: string
  searchQuery: string
}

// ============================================================================
// Constants
// ============================================================================

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'GRANT', label: 'Granted' },
  { value: 'REVOKE', label: 'Revoked' },
  { value: 'MODIFY', label: 'Modified' },
  { value: 'EXPIRE', label: 'Expired' },
  { value: 'DENY', label: 'Denied' },
]

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'All Resources' },
  { value: 'FOLDER', label: 'Folders' },
  { value: 'DOCUMENT', label: 'Documents' },
  { value: 'ROLE', label: 'Roles' },
  { value: 'DEPARTMENT', label: 'Departments' },
]

const getActionIcon = (action: string) => {
  switch (action) {
    case 'GRANT':
      return UserPlusIcon
    case 'REVOKE':
      return UserMinusIcon
    case 'MODIFY':
      return KeyIcon
    case 'EXPIRE':
      return ClockIcon
    case 'DENY':
      return ShieldExclamationIcon
    default:
      return ShieldCheckIcon
  }
}

const getActionColor = (action: string) => {
  switch (action) {
    case 'GRANT':
      return {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        badge: 'bg-green-500',
      }
    case 'REVOKE':
      return {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        badge: 'bg-red-500',
      }
    case 'MODIFY':
      return {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        badge: 'bg-blue-500',
      }
    case 'EXPIRE':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        badge: 'bg-yellow-500',
      }
    case 'DENY':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/30',
        text: 'text-orange-700 dark:text-orange-400',
        badge: 'bg-orange-500',
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-400',
        badge: 'bg-gray-500',
      }
  }
}

const getResourceIcon = (resourceType: string) => {
  switch (resourceType) {
    case 'FOLDER':
      return FolderIcon
    case 'DOCUMENT':
      return DocumentIcon
    case 'ROLE':
      return ShieldCheckIcon
    case 'DEPARTMENT':
      return UserGroupIcon
    default:
      return KeyIcon
  }
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatRelativeTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// ============================================================================
// Sub-Components
// ============================================================================

interface StatCardProps {
  title: string
  value: number | string
  icon: React.FC<{ className?: string }>
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  trend?: { value: number; isPositive: boolean }
}

const StatCard: FC<StatCardProps> = ({ title, value, icon: Icon, color, trend }) => {
  const colorStyles = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.isPositive ? 'text-green-600' : 'text-red-600')}>
              {trend.isPositive ? '+' : '-'}
              {trend.value}% from last period
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', colorStyles[color])}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

interface AuditLogItemProps {
  log: PermissionAuditLog
  onClick?: () => void
}

const AuditLogItem: FC<AuditLogItemProps> = ({ log, onClick }) => {
  const ActionIcon = getActionIcon(log.action)
  const ResourceIcon = getResourceIcon(log.resource_type)
  const actionColor = getActionColor(log.action)

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700',
        'hover:shadow-md transition-all cursor-pointer'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Action Icon */}
        <div className={cn('p-2 rounded-lg flex-shrink-0', actionColor.bg)}>
          <ActionIcon className={cn('w-5 h-5', actionColor.text)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'text-sm font-medium px-2 py-0.5 rounded',
                actionColor.bg,
                actionColor.text
              )}
            >
              {log.action_display}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">on</span>
            <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
              <ResourceIcon className="w-4 h-4" />
              {log.resource_type_display}
            </span>
          </div>

          {/* Actor and Target */}
          <div className="mt-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">By </span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {log.actor_full_name || log.actor_username || 'System'}
            </span>
            {log.target_user_username && (
              <>
                <span className="text-gray-500 dark:text-gray-400"> for </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {log.target_user_username}
                </span>
              </>
            )}
            {log.target_department_name && (
              <>
                <span className="text-gray-500 dark:text-gray-400"> for </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {log.target_department_name}
                </span>
              </>
            )}
          </div>

          {/* Permission Change */}
          {(log.old_permission_level || log.new_permission_level) && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              {log.old_permission_level && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 line-through">
                  {log.old_permission_level}
                </span>
              )}
              {log.old_permission_level && log.new_permission_level && (
                <span className="text-gray-400">&rarr;</span>
              )}
              {log.new_permission_level && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-700 dark:text-blue-400">
                  {log.new_permission_level}
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          {log.reason && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
              Reason: {log.reason}
            </p>
          )}

          {/* Timestamp and IP */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span title={formatTimestamp(log.timestamp)}>{formatRelativeTime(log.timestamp)}</span>
            {log.ip_address && <span className="font-mono">{log.ip_address}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FilterDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  icon?: React.ReactNode
}

const FilterDropdown: FC<FilterDropdownProps> = ({ label, value, options, onChange, icon }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
          value
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        )}
      >
        {icon}
        <span>{selectedOption?.label || label}</span>
        <ChevronDownIcon className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700',
                  value === option.value &&
                    'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface ActivityChartProps {
  data: Array<{ date: string; count: number }>
}

const ActivityChart: FC<ActivityChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
        Daily Activity (Last 30 Days)
      </h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((item, index) => {
          const height = (item.count / maxCount) * 100
          return (
            <div key={index} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full">
                <div
                  className="w-full bg-blue-500 dark:bg-blue-400 rounded-t hover:bg-blue-600 dark:hover:bg-blue-300 transition-colors"
                  style={{ height: `${Math.max(height, 2)}%`, minHeight: '2px' }}
                />
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {item.date}: {item.count}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export const PermissionAuditDashboard: FC<PermissionAuditDashboardProps> = ({ className }) => {
  const { isAdmin, hasGlobalPermission } = usePermissions()

  // State
  const [logs, setLogs] = useState<PermissionAuditLog[]>([])
  const [summary, setSummary] = useState<AuditLogSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    action: '',
    resourceType: '',
    fromDate: '',
    toDate: '',
    searchQuery: '',
  })
  const [showFilters, setShowFilters] = useState(true)

  // Check permission
  const canViewAudit = isAdmin || hasGlobalPermission('can_view_audit_log')

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!canViewAudit) {
      setError('You do not have permission to view permission audit logs.')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {}
      if (filters.action) params.action = filters.action
      if (filters.resourceType) params.resource_type = filters.resourceType
      if (filters.fromDate) params.from_date = filters.fromDate
      if (filters.toDate) params.to_date = filters.toDate

      const [logsData, summaryData] = await Promise.all([
        getPermissionAuditLogs(params),
        getPermissionAuditLogSummary(30),
      ])

      setLogs(logsData)
      setSummary(summaryData)
    } catch (err) {
      console.error('Failed to fetch permission audit data:', err)
      setError('Failed to load permission audit logs. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [canViewAudit, filters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!filters.searchQuery) return logs

    const query = filters.searchQuery.toLowerCase()
    return logs.filter((log) => {
      return (
        log.actor_username?.toLowerCase().includes(query) ||
        log.actor_full_name?.toLowerCase().includes(query) ||
        log.target_user_username?.toLowerCase().includes(query) ||
        log.target_department_name?.toLowerCase().includes(query) ||
        log.action_display.toLowerCase().includes(query) ||
        log.resource_type_display.toLowerCase().includes(query) ||
        log.reason?.toLowerCase().includes(query)
      )
    })
  }, [logs, filters.searchQuery])

  // Clear filters
  const clearFilters = () => {
    setFilters({
      action: '',
      resourceType: '',
      fromDate: '',
      toDate: '',
      searchQuery: '',
    })
  }

  const hasActiveFilters =
    filters.action ||
    filters.resourceType ||
    filters.fromDate ||
    filters.toDate ||
    filters.searchQuery

  // Stats from summary
  const stats = useMemo(() => {
    if (!summary) return null

    const grantCount = summary.action_counts.find((a) => a.action === 'GRANT')?.count || 0
    const revokeCount = summary.action_counts.find((a) => a.action === 'REVOKE')?.count || 0
    const denyCount = summary.action_counts.find((a) => a.action === 'DENY')?.count || 0

    return {
      total: summary.total_events,
      grants: grantCount,
      revokes: revokeCount,
      denials: denyCount,
    }
  }, [summary])

  // Render error state
  if (!canViewAudit) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-64', className)}>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-full mb-4">
          <ShieldExclamationIcon className="w-12 h-12 text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Access Denied</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
          You do not have permission to view permission audit logs. This feature requires the
          &quot;can_view_audit_log&quot; permission.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Permission Audit Trail
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Track all RBAC permission changes, role assignments, and access denials
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
        {error ? (
          <ErrorState error={error} onRetry={fetchData} />
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  title="Total Events (30 days)"
                  value={stats.total}
                  icon={ShieldCheckIcon}
                  color="blue"
                />
                <StatCard
                  title="Permissions Granted"
                  value={stats.grants}
                  icon={CheckCircleIcon}
                  color="green"
                />
                <StatCard
                  title="Permissions Revoked"
                  value={stats.revokes}
                  icon={XCircleIcon}
                  color="red"
                />
                <StatCard
                  title="Access Denials"
                  value={stats.denials}
                  icon={ShieldExclamationIcon}
                  color="yellow"
                />
              </div>
            )}

            {/* Activity Chart */}
            {summary && summary.daily_activity.length > 0 && (
              <div className="mb-6">
                <ActivityChart data={summary.daily_activity} />
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  <FunnelIcon className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {showFilters && (
                <div className="p-4 flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchQuery}
                      onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                      placeholder="Search logs..."
                      className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {filters.searchQuery && (
                      <button
                        onClick={() => setFilters((f) => ({ ...f, searchQuery: '' }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>

                  {/* Dropdowns */}
                  <FilterDropdown
                    label="Action"
                    value={filters.action}
                    options={ACTION_OPTIONS}
                    onChange={(value) => setFilters((f) => ({ ...f, action: value }))}
                    icon={<KeyIcon className="w-4 h-4" />}
                  />
                  <FilterDropdown
                    label="Resource"
                    value={filters.resourceType}
                    options={RESOURCE_TYPE_OPTIONS}
                    onChange={(value) => setFilters((f) => ({ ...f, resourceType: value }))}
                    icon={<FolderIcon className="w-4 h-4" />}
                  />

                  {/* Date Range */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="date"
                        value={filters.fromDate}
                        onChange={(e) => setFilters((f) => ({ ...f, fromDate: e.target.value }))}
                        className="pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">to</span>
                    <input
                      type="date"
                      value={filters.toDate}
                      onChange={(e) => setFilters((f) => ({ ...f, toDate: e.target.value }))}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Logs List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Permission Changes
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ShieldCheckIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                    No permission changes found
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hasActiveFilters
                      ? 'Try adjusting your filters'
                      : 'Permission audit logs will appear here'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredLogs.map((log) => <AuditLogItem key={log.id} log={log} />)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PermissionAuditDashboard
