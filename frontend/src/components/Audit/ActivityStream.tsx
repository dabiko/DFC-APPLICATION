/**
 * ActivityStream Component
 * Real-time activity feed showing recent actions across the system
 */

import { FC, useState, useEffect } from 'react'
import {
  BellIcon,
  FunnelIcon,
  UserIcon,
  ClockIcon,
  DocumentTextIcon,
  FolderIcon,
  ShareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { AuditLogEntry } from '@/types/audit'
import { ACTION_TYPE_LABELS, formatAuditLogEntry } from '@/types/audit'
import { formatDistanceToNow } from 'date-fns'

export interface ActivityStreamProps {
  /** Activity entries to display */
  entries: AuditLogEntry[]
  /** Current user ID to highlight own actions */
  currentUserId?: string
  /** Filter scope */
  scope?: 'all' | 'current-folder'
  /** Current folder ID when scope is 'current-folder' */
  currentFolderId?: string
  /** Callback when scope changes */
  onScopeChange?: (scope: 'all' | 'current-folder') => void
  /** Enable real-time updates via WebSocket */
  enableRealtime?: boolean
  /** WebSocket connection status */
  connectionStatus?: 'connected' | 'disconnected' | 'connecting'
  /** Callback when entry is clicked */
  onEntryClick?: (entry: AuditLogEntry) => void
  /** Maximum number of entries to display */
  maxEntries?: number
  /** Show timestamp as relative or absolute */
  relativeTime?: boolean
  className?: string
}

export const ActivityStream: FC<ActivityStreamProps> = ({
  entries,
  currentUserId,
  scope = 'all',
  currentFolderId,
  onScopeChange,
  enableRealtime = true,
  connectionStatus = 'connected',
  onEntryClick,
  maxEntries = 50,
  relativeTime = true,
  className,
}) => {
  const [filter, setFilter] = useState<'all' | 'documents' | 'permissions' | 'users'>('all')
  const [isExpanded, setIsExpanded] = useState(true)

  // Simulate real-time updates (in production, this would use WebSocket)
  const [liveEntries, setLiveEntries] = useState(entries)

  useEffect(() => {
    setLiveEntries(entries)
  }, [entries])

  // Filter entries based on selected filter
  const filteredEntries = liveEntries
    .filter((entry) => {
      if (filter === 'all') return true
      if (filter === 'documents') {
        return entry.actionType.startsWith('document_') || entry.actionType.startsWith('folder_')
      }
      if (filter === 'permissions') {
        return entry.actionType.startsWith('permission_') || entry.actionType.startsWith('role_')
      }
      if (filter === 'users') {
        return entry.actionType.startsWith('user_')
      }
      return true
    })
    .filter((entry) => {
      // Filter by scope
      if (scope === 'current-folder' && currentFolderId) {
        return entry.resourceId === currentFolderId || entry.resourceId.startsWith(currentFolderId)
      }
      return true
    })
    .slice(0, maxEntries)

  const getActionIcon = (entry: AuditLogEntry) => {
    const iconClass = 'w-4 h-4'

    if (entry.actionType.startsWith('document_')) {
      return <DocumentTextIcon className={iconClass} />
    }
    if (entry.actionType.startsWith('folder_')) {
      return <FolderIcon className={iconClass} />
    }
    if (entry.actionType.startsWith('permission_') || entry.actionType.includes('share')) {
      return <ShareIcon className={iconClass} />
    }
    if (entry.actionType.includes('delete')) {
      return <TrashIcon className={iconClass} />
    }
    if (entry.actionType.startsWith('user_')) {
      return <UserIcon className={iconClass} />
    }

    return <ClockIcon className={iconClass} />
  }

  const getActionColor = (entry: AuditLogEntry) => {
    if (entry.outcome === 'failure') return 'text-red-600 dark:text-red-400'
    if (entry.severity === 'critical' || entry.severity === 'error') {
      return 'text-orange-600 dark:text-orange-400'
    }
    if (entry.actionType.includes('delete') || entry.actionType.includes('revoke')) {
      return 'text-yellow-600 dark:text-yellow-400'
    }
    return 'text-blue-600 dark:text-blue-400'
  }

  const isOwnAction = (entry: AuditLogEntry) => {
    return currentUserId && entry.userId === currentUserId
  }

  const getConnectionIndicator = () => {
    const indicators = {
      connected: {
        color: 'bg-green-500',
        label: 'Live',
        pulse: true,
      },
      connecting: {
        color: 'bg-yellow-500',
        label: 'Connecting',
        pulse: true,
      },
      disconnected: {
        color: 'bg-red-500',
        label: 'Offline',
        pulse: false,
      },
    }

    const indicator = indicators[connectionStatus]

    return (
      <div className="flex items-center gap-2 text-xs">
        <div className="relative">
          <div className={cn('w-2 h-2 rounded-full', indicator.color)}></div>
          {indicator.pulse && (
            <div
              className={cn(
                'absolute inset-0 w-2 h-2 rounded-full animate-ping',
                indicator.color,
                'opacity-75'
              )}
            ></div>
          )}
        </div>
        <span className="text-gray-500 dark:text-gray-400">{indicator.label}</span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Activity Stream
            </h3>
            {enableRealtime && getConnectionIndicator()}
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isExpanded && (
          <>
            {/* Scope Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onScopeChange?.('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  scope === 'all'
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                All Activity
              </button>
              {currentFolderId && (
                <button
                  onClick={() => onScopeChange?.('current-folder')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    scope === 'current-folder'
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  Current Folder
                </button>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-4 h-4 text-gray-400" />
              {(['all', 'documents', 'permissions', 'users'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded transition-colors capitalize',
                    filter === filterType
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {filterType}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Activity Feed */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <BellIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => onEntryClick?.(entry)}
                  className={cn(
                    'p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    onEntryClick && 'cursor-pointer',
                    isOwnAction(entry) && 'bg-blue-50/50 dark:bg-blue-900/10'
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn('flex-shrink-0 mt-0.5', getActionColor(entry))}>
                      {getActionIcon(entry)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {isOwnAction(entry) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 mr-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            You
                          </span>
                        )}
                        <span className="font-medium">{entry.userName}</span>
                        <span className="text-gray-600 dark:text-gray-400 mx-1">
                          {ACTION_TYPE_LABELS[entry.actionType].toLowerCase()}
                        </span>
                        <span className="font-medium">{entry.resourceName}</span>
                      </p>

                      {entry.details && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {entry.details}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <ClockIcon className="w-3 h-3" />
                        {relativeTime ? (
                          <span>
                            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                          </span>
                        ) : (
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                        )}
                        {entry.outcome === 'failure' && (
                          <span className="text-red-500">• Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      {isExpanded && filteredEntries.length > 0 && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Showing {filteredEntries.length} of {liveEntries.length} recent activities
            {filteredEntries.length === maxEntries && ` (limited to ${maxEntries})`}
          </p>
        </div>
      )}
    </div>
  )
}
