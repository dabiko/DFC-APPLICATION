/**
 * DocumentsTab Component
 *
 * Document compliance management: tracks compliance checks across documents,
 * identifies issues by type, and allows running checks and auto-fixing issues.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Wrench,
  Play,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getDocumentComplianceChecks,
  getDocumentComplianceStats,
  autoFixDocumentIssues,
  type DocumentComplianceCheck,
  type DocumentComplianceStats,
  type CheckType,
  type CheckStatus,
} from '@/services/complianceService'

// ============================================================================
// TYPES
// ============================================================================

type SortField = 'document_name' | 'check_type' | 'status' | 'last_checked' | 'issue_count'
type SortDir = 'asc' | 'desc'

// ============================================================================
// CONSTANTS
// ============================================================================

const CHECK_TYPE_OPTIONS: { value: CheckType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Check Types' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'naming', label: 'Naming Convention' },
  { value: 'classification', label: 'Classification' },
  { value: 'retention', label: 'Retention Policy' },
  { value: 'access', label: 'Access Control' },
]

const STATUS_OPTIONS: { value: CheckStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non_compliant', label: 'Non-Compliant' },
  { value: 'warning', label: 'Warning' },
  { value: 'pending', label: 'Pending' },
]

// ============================================================================
// HELPERS
// ============================================================================

function getStatusBadge(status: CheckStatus) {
  switch (status) {
    case 'compliant':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'non_compliant':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'warning':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'pending':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
}

function getStatusLabel(status: CheckStatus) {
  switch (status) {
    case 'non_compliant':
      return 'Non-Compliant'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

function getCheckTypeLabel(type: CheckType) {
  switch (type) {
    case 'metadata':
      return 'Metadata'
    case 'naming':
      return 'Naming'
    case 'classification':
      return 'Classification'
    case 'retention':
      return 'Retention'
    case 'access':
      return 'Access'
    default:
      return type
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatsBarProps {
  stats: DocumentComplianceStats
}

function StatsBar({ stats }: StatsBarProps) {
  const issueTypes = Object.entries(stats.issues_by_type).filter(([, count]) => count > 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Total Documents</p>
        <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
          {stats.total_documents.toLocaleString()}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Compliant</p>
        <p className="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
          {stats.compliant_documents.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {stats.compliance_rate.toFixed(1)}% rate
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Non-Compliant</p>
        <p className="mt-1 text-3xl font-bold text-red-600 dark:text-red-400">
          {stats.non_compliant_documents.toLocaleString()}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-sm text-gray-500 dark:text-gray-400">Auto-Fixable</p>
        <p className="mt-1 text-3xl font-bold text-blue-600 dark:text-blue-400">
          {stats.auto_fixable_count.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">issues</p>
      </div>

      {issueTypes.length > 0 && (
        <div className="col-span-2 md:col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Issues by Type
          </p>
          <div className="flex flex-wrap gap-3">
            {issueTypes.map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {type.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface CheckRowProps {
  check: DocumentComplianceCheck
  onAutoFix: (check: DocumentComplianceCheck) => Promise<void>
  isFixing: boolean
}

function CheckRow({ check, onAutoFix, isFixing }: CheckRowProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                {check.document_name}
              </p>
              {check.folder_path && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                  {check.folder_path}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {getCheckTypeLabel(check.check_type)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              getStatusBadge(check.status)
            )}
          >
            {getStatusLabel(check.status)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-900 dark:text-white">{check.issue_count}</span>
        </td>
        <td className="px-4 py-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(check.last_checked).toLocaleDateString()}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {check.can_auto_fix && !check.auto_fix_applied && (
              <button
                onClick={() => onAutoFix(check)}
                disabled={isFixing}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {isFixing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Wrench className="w-3 h-3" />
                )}
                Auto-Fix
              </button>
            )}
            {check.auto_fix_applied && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                Fixed
              </span>
            )}
            {check.issue_count > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && check.issues.length > 0 && (
        <tr>
          <td colSpan={6} className="px-4 pb-3">
            <div className="ml-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-2">Issues</p>
              <ul className="space-y-1">
                {check.issues.map((issue, idx) => (
                  <li key={idx} className="text-xs text-red-600 dark:text-red-400">
                    {typeof issue === 'object' && issue !== null
                      ? (issue as Record<string, string>).message ||
                        (issue as Record<string, string>).description ||
                        JSON.stringify(issue)
                      : String(issue)}
                  </li>
                ))}
              </ul>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DocumentsTab() {
  const [checks, setChecks] = useState<DocumentComplianceCheck[]>([])
  const [stats, setStats] = useState<DocumentComplianceStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [checkTypeFilter, setCheckTypeFilter] = useState<CheckType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<CheckStatus | 'all'>('all')
  const [sortField, setSortField] = useState<SortField>('last_checked')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [fixingId, setFixingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: { status?: string; check_type?: string } = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (checkTypeFilter !== 'all') params.check_type = checkTypeFilter

      const [checksData, statsData] = await Promise.all([
        getDocumentComplianceChecks(params),
        getDocumentComplianceStats(),
      ])
      setChecks(checksData)
      setStats(statsData)
    } catch (err) {
      console.error('Failed to fetch document compliance data:', err)
      setError('Failed to load document compliance data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, checkTypeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAutoFix = async (check: DocumentComplianceCheck) => {
    setFixingId(check.id)
    try {
      const fixed = await autoFixDocumentIssues(check.id)
      setChecks((prev) => prev.map((c) => (c.id === fixed.id ? fixed : c)))
    } catch (err) {
      console.error('Failed to auto-fix:', err)
    } finally {
      setFixingId(null)
    }
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // Client-side filter + sort
  const filteredChecks = checks
    .filter((c) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          c.document_name.toLowerCase().includes(q) ||
          c.folder_path?.toLowerCase().includes(q) ||
          c.check_type_display?.toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'document_name':
          cmp = a.document_name.localeCompare(b.document_name)
          break
        case 'check_type':
          cmp = a.check_type.localeCompare(b.check_type)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'issue_count':
          cmp = a.issue_count - b.issue_count
          break
        case 'last_checked':
          cmp = new Date(a.last_checked).getTime() - new Date(b.last_checked).getTime()
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading document compliance data...</p>
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
            Document Compliance
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor compliance status of documents across metadata, naming, classification,
            retention, and access controls
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

      {/* Stats */}
      {stats && <StatsBar stats={stats} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by document name or folder..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={checkTypeFilter}
            onChange={(e) => setCheckTypeFilter(e.target.value as CheckType | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {CHECK_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CheckStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredChecks.length === 0 ? (
        <div className="text-center py-16">
          {checks.length === 0 ? (
            <>
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No compliance checks recorded
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Compliance checks will appear here once documents are scanned. Use the Run Check
                feature on individual documents to begin.
              </p>
            </>
          ) : (
            <>
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No results match your filters
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredChecks.length} of {checks.length} checks
            </p>
            {filteredChecks.some((c) => c.status === 'non_compliant') && (
              <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="w-4 h-4" />
                {filteredChecks.filter((c) => c.status === 'non_compliant').length} non-compliant
                documents
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort('document_name')}
                  >
                    Document <SortIcon field="document_name" />
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort('check_type')}
                  >
                    Check Type <SortIcon field="check_type" />
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon field="status" />
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort('issue_count')}
                  >
                    Issues <SortIcon field="issue_count" />
                  </th>
                  <th
                    className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort('last_checked')}
                  >
                    Last Checked <SortIcon field="last_checked" />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredChecks.map((check) => (
                  <CheckRow
                    key={check.id}
                    check={check}
                    onAutoFix={handleAutoFix}
                    isFixing={fixingId === check.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance progress bar */}
      {stats && stats.total_documents > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Compliance Rate
            </span>
            <span
              className={cn(
                'text-sm font-bold',
                stats.compliance_rate >= 90
                  ? 'text-green-600 dark:text-green-400'
                  : stats.compliance_rate >= 70
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
              )}
            >
              {stats.compliance_rate.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                stats.compliance_rate >= 90
                  ? 'bg-green-500'
                  : stats.compliance_rate >= 70
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${stats.compliance_rate}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.compliant_documents.toLocaleString()} compliant
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {stats.non_compliant_documents.toLocaleString()} non-compliant
            </span>
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800 dark:text-blue-200">
          <p className="font-medium mb-1">Document Compliance Checks</p>
          <p className="text-blue-700 dark:text-blue-300">
            Compliance checks are run automatically when documents are uploaded or modified. You can
            also trigger manual checks from the document detail view. Auto-fixable issues can be
            resolved automatically without manual intervention.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DocumentsTab
