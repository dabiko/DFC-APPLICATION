/**
 * RetentionTab Component
 *
 * Retention compliance management: retention policies, legal holds,
 * upcoming deletions, and compliance reporting.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Archive,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Loader2,
  AlertCircle,
  Lock,
  Unlock,
  Calendar,
  FileText,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getRetentionPolicies,
  getLegalHolds,
  getUpcomingDeletions,
  getRetentionDashboardStats,
  type RetentionDashboardStats,
  type UpcomingDeletionsResponse,
} from '@/services/retentionService'
import type { RetentionPolicy, LegalHold } from '@/types/retention'

// ============================================================================
// TYPES
// ============================================================================

type ActiveView = 'overview' | 'policies' | 'holds' | 'upcoming'

// ============================================================================
// HELPERS
// ============================================================================

function getPolicyStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'inactive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'archived':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getHoldStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'released':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

function formatRetentionPeriod(policy: RetentionPolicy): string {
  const p = policy.retentionPeriod
  if (!p) return 'N/A'
  return `${p.value} ${p.unit}`
}

function getDeletionUrgency(daysUntilDeletion: number) {
  if (daysUntilDeletion <= 7) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
  if (daysUntilDeletion <= 30)
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
  return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  label: string
  value: number | string
  subtitle?: string
  icon: React.FC<{ className?: string }>
  iconBg: string
  onClick?: () => void
}

function StatCard({ label, value, subtitle, icon: Icon, iconBg, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5',
        onClick &&
          'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-xl', iconBg)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  )
}

interface PoliciesListProps {
  policies: RetentionPolicy[]
  searchQuery: string
  statusFilter: string
}

function PoliciesList({ policies, searchQuery, statusFilter }: PoliciesListProps) {
  const filtered = policies.filter((p) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <Archive className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {policies.length === 0
            ? 'No retention policies configured.'
            : 'No policies match your filters.'}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {filtered.map((policy) => (
        <div
          key={policy.id}
          className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
            <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {policy.name}
              </p>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full capitalize flex-shrink-0',
                  getPolicyStatusBadge(policy.status)
                )}
              >
                {policy.status}
              </span>
            </div>
            {policy.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                {policy.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Retention: {formatRetentionPeriod(policy)}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {policy.documentsAffected.toLocaleString()} documents
              </span>
              {policy.complianceStandards.length > 0 && (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {policy.complianceStandards.join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {policy.documentsAffected > 0
                ? `${Math.round((policy.documentsCompliant / policy.documentsAffected) * 100)}%`
                : '100%'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">compliant</p>
          </div>
        </div>
      ))}
    </div>
  )
}

interface HoldsListProps {
  holds: LegalHold[]
  searchQuery: string
  statusFilter: string
}

function HoldsList({ holds, searchQuery, statusFilter }: HoldsListProps) {
  const filtered = holds.filter((h) => {
    const matchesSearch =
      !searchQuery ||
      h.caseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12">
        <Lock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {holds.length === 0 ? 'No legal holds in place.' : 'No holds match your filters.'}
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {filtered.map((hold) => (
        <div
          key={hold.id}
          className="flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div
            className={cn(
              'p-2 rounded-lg flex-shrink-0',
              hold.status === 'active'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            {hold.status === 'active' ? (
              <Lock
                className={cn(
                  'w-4 h-4',
                  hold.status === 'active' ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                )}
              />
            ) : (
              <Unlock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {hold.caseName || 'Untitled Hold'}
              </p>
              <span
                className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full capitalize flex-shrink-0',
                  getHoldStatusBadge(hold.status)
                )}
              >
                {hold.status}
              </span>
            </div>
            {hold.caseNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Case: {hold.caseNumber}
              </p>
            )}
            {hold.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                {hold.description}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Since {new Date(hold.effectiveDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {hold.documentsOnHold.toLocaleString()} documents on hold
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface UpcomingDeletionsListProps {
  upcoming: UpcomingDeletionsResponse | null
}

function UpcomingDeletionsList({ upcoming }: UpcomingDeletionsListProps) {
  if (!upcoming || upcoming.schedules.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No documents scheduled for deletion in the next 30 days.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {upcoming.schedules.map((schedule) => (
        <div
          key={schedule.id}
          className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {schedule.document_title}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>{schedule.document_type}</span>
              <span>Policy: {schedule.policy_name}</span>
            </div>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0',
              getDeletionUrgency(schedule.days_until_deletion)
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            {schedule.days_until_deletion <= 0
              ? 'Due today'
              : `${schedule.days_until_deletion}d remaining`}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(schedule.deletion_date).toLocaleDateString()}
            </p>
            <span
              className={cn(
                'text-xs font-medium capitalize',
                schedule.status === 'PENDING'
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {schedule.status.toLowerCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RetentionTab() {
  const [activeView, setActiveView] = useState<ActiveView>('overview')
  const [policies, setPolicies] = useState<RetentionPolicy[]>([])
  const [holds, setHolds] = useState<LegalHold[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingDeletionsResponse | null>(null)
  const [stats, setStats] = useState<RetentionDashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [policiesData, holdsData, upcomingData, statsData] = await Promise.all([
        getRetentionPolicies(),
        getLegalHolds(),
        getUpcomingDeletions(30),
        getRetentionDashboardStats(),
      ])
      setPolicies(policiesData)
      setHolds(holdsData)
      setUpcoming(upcomingData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch retention data:', err)
      setError('Failed to load retention compliance data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const VIEWS = [
    { id: 'overview' as ActiveView, label: 'Overview' },
    { id: 'policies' as ActiveView, label: `Policies (${policies.length})` },
    {
      id: 'holds' as ActiveView,
      label: `Legal Holds (${holds.filter((h) => h.status === 'active').length})`,
    },
    { id: 'upcoming' as ActiveView, label: `Upcoming Deletions (${upcoming?.count ?? 0})` },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading retention compliance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Failed to load data
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Retention Compliance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor retention policy compliance, legal holds, and upcoming document dispositions
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit overflow-x-auto">
        {VIEWS.map((view) => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              activeView === view.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {view.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Policies"
              value={stats.activePolicies}
              subtitle={`of ${stats.totalPolicies} total`}
              icon={Archive}
              iconBg="bg-blue-600"
              onClick={() => setActiveView('policies')}
            />
            <StatCard
              label="Documents Governed"
              value={stats.documentsGoverned}
              icon={FileText}
              iconBg="bg-indigo-600"
            />
            <StatCard
              label="Active Legal Holds"
              value={stats.activeLegalHolds}
              subtitle={`${stats.documentsOnHold.toLocaleString()} documents held`}
              icon={Lock}
              iconBg={stats.activeLegalHolds > 0 ? 'bg-red-600' : 'bg-gray-500'}
              onClick={() => setActiveView('holds')}
            />
            <StatCard
              label="Expiring Soon"
              value={stats.documentsExpiringSoon}
              subtitle="within 30 days"
              icon={Clock}
              iconBg={stats.documentsExpiringSoon > 0 ? 'bg-orange-600' : 'bg-green-600'}
              onClick={() => setActiveView('upcoming')}
            />
          </div>

          {/* Compliance rate card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Retention Compliance Rate
              </h3>
              <span
                className={cn(
                  'text-lg font-bold',
                  stats.complianceRate >= 95
                    ? 'text-green-600 dark:text-green-400'
                    : stats.complianceRate >= 80
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400'
                )}
              >
                {stats.complianceRate.toFixed(1)}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  stats.complianceRate >= 95
                    ? 'bg-green-500'
                    : stats.complianceRate >= 80
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                )}
                style={{ width: `${stats.complianceRate}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {stats.documentsAtRisk.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Deletions</p>
                <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  {stats.pendingDeletions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Reviews</p>
                <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  {stats.pendingReviews.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Notifications Sent</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {stats.notificationsSentThisMonth.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Active legal holds alert */}
          {stats.activeLegalHolds > 0 && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <Lock className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {stats.activeLegalHolds} active legal hold
                  {stats.activeLegalHolds !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                  {stats.documentsOnHold.toLocaleString()} documents are preserved and cannot be
                  deleted while holds are in place.
                </p>
              </div>
              <button
                onClick={() => setActiveView('holds')}
                className="flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-300 hover:underline flex-shrink-0"
              >
                View <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setActiveView('policies')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Retention Policies
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.activePolicies} active
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            <button
              onClick={() => setActiveView('holds')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Legal Holds</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.activeLegalHolds} active
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
            <button
              onClick={() => setActiveView('upcoming')}
              className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-left"
            >
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Upcoming Deletions
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.documentsExpiringSoon} in 30 days
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          </div>
        </div>
      )}

      {/* Policies view */}
      {activeView === 'policies' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search policies..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {policies.length} retention {policies.length === 1 ? 'policy' : 'policies'}{' '}
                configured
              </p>
            </div>
            <PoliciesList
              policies={policies}
              searchQuery={searchQuery}
              statusFilter={statusFilter}
            />
          </div>
        </div>
      )}

      {/* Holds view */}
      {activeView === 'holds' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by case name or number..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="released">Released</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          {holds.some((h) => h.status === 'active') && (
            <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 dark:text-red-300">
                Documents under active legal holds cannot be modified, moved, or deleted regardless
                of retention policy.
              </p>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {holds.length} legal {holds.length === 1 ? 'hold' : 'holds'} —{' '}
                {holds.filter((h) => h.status === 'active').length} active
              </p>
            </div>
            <HoldsList holds={holds} searchQuery={searchQuery} statusFilter={statusFilter} />
          </div>
        </div>
      )}

      {/* Upcoming deletions view */}
      {activeView === 'upcoming' && (
        <div className="space-y-4">
          {upcoming && upcoming.count > 0 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                {upcoming.count} documents are scheduled for deletion within the next 30 days.
                Review and take action if needed before the scheduled dates.
              </p>
            </div>
          )}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {upcoming?.count ?? 0} documents scheduled for deletion in the next 30 days
              </p>
            </div>
            <UpcomingDeletionsList upcoming={upcoming} />
          </div>
        </div>
      )}
    </div>
  )
}

export default RetentionTab
