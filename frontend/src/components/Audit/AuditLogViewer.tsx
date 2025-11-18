/**
 * AuditLogViewer Component
 * Main component for viewing and managing audit logs
 */

import { FC, useState } from 'react'
import {
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { AuditLogViewerProps, AuditLogEntry } from '@/types/audit'
import {
  RESOURCE_TYPE_LABELS,
  getSeverityColor,
  getOutcomeColor,
  formatAuditLogEntry,
  isSensitiveAction,
} from '@/types/audit'
import { format, formatDistanceToNow } from 'date-fns'

export const AuditLogViewer: FC<AuditLogViewerProps> = ({
  entries,
  total,
  currentPage,
  pageSize,
  filters,
  onFiltersChange: _onFiltersChange,
  onPageChange,
  onEntryClick,
  onExport,
  isLoading = false,
  className,
}) => {
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, total)

  const handleEntryClick = (entry: AuditLogEntry) => {
    setSelectedEntry(entry.id === selectedEntry ? null : entry.id)
    onEntryClick?.(entry)
  }

  const getSeverityBadgeClasses = (severity: AuditLogEntry['severity']) => {
    const color = getSeverityColor(severity)
    const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full'

    const colorClasses = {
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }

    return cn(baseClasses, colorClasses[color as keyof typeof colorClasses])
  }

  const getOutcomeBadgeClasses = (outcome: AuditLogEntry['outcome']) => {
    const color = getOutcomeColor(outcome)
    const baseClasses = 'px-2 py-0.5 text-xs font-medium rounded-full'

    const colorClasses = {
      green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    }

    return cn(baseClasses, colorClasses[color as keyof typeof colorClasses])
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Audit Log</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {total.toLocaleString()} total {total === 1 ? 'entry' : 'entries'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onExport && (
              <div className="relative">
                <button
                  onClick={() => {
                    const menu = document.getElementById('export-menu')
                    menu?.classList.toggle('hidden')
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export
                </button>
                <div
                  id="export-menu"
                  className="hidden absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                >
                  <button
                    onClick={() => onExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={() => onExport('json')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => onExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 last:rounded-b-lg"
                  >
                    Export PDF
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors',
                showFilters
                  ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/20 dark:border-primary-500 dark:text-primary-400'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <FunnelIcon className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search audit logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Active filters: {Object.values(filters).filter(Boolean).length}
          </div>
          {/* Filter components would go here - placeholder for now */}
        </div>
      )}

      {/* Audit Log Entries */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading audit logs...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No audit log entries found</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              onClick={() => handleEntryClick(entry)}
              className={cn(
                'p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
                selectedEntry === entry.id && 'bg-gray-50 dark:bg-gray-800/50'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Timestamp */}
                <div className="flex-shrink-0 w-32 text-sm text-gray-500 dark:text-gray-400">
                  <div>{format(new Date(entry.timestamp), 'MMM d, yyyy')}</div>
                  <div className="text-xs">{format(new Date(entry.timestamp), 'h:mm:ss a')}</div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    {isSensitiveAction(entry.actionType) && (
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Action Description */}
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatAuditLogEntry(entry)}
                      </p>

                      {/* Details */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span>{entry.userEmail}</span>
                        <span>•</span>
                        <span>{RESOURCE_TYPE_LABELS[entry.resourceType]}</span>
                        <span>•</span>
                        <span>{entry.ipAddress}</span>
                        {entry.location && (
                          <>
                            <span>•</span>
                            <span>{entry.location}</span>
                          </>
                        )}
                      </div>

                      {/* Error Message */}
                      {entry.errorMessage && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          {entry.errorMessage}
                        </p>
                      )}

                      {/* Expanded Details */}
                      {selectedEntry === entry.id && entry.changes && entry.changes.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Changes Made:
                          </h4>
                          <div className="space-y-2">
                            {entry.changes.map((change, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                  {change.fieldLabel}:
                                </span>
                                <div className="mt-1 grid grid-cols-2 gap-2">
                                  <div className="text-red-600 dark:text-red-400">
                                    <span className="font-medium">Old:</span>{' '}
                                    {String(change.oldValue)}
                                  </div>
                                  <div className="text-green-600 dark:text-green-400">
                                    <span className="font-medium">New:</span>{' '}
                                    {String(change.newValue)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <div className={getOutcomeBadgeClasses(entry.outcome)}>{entry.outcome}</div>
                  <div className={getSeverityBadgeClasses(entry.severity)}>{entry.severity}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && entries.length > 0 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex} to {endIndex} of {total.toLocaleString()} entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (currentPage <= 3) {
                    pageNum = i + 1
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = currentPage - 2 + i
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => onPageChange(pageNum)}
                      className={cn(
                        'px-3 py-1 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
