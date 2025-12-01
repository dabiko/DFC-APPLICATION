/**
 * ActivityList Component
 * Displays a list of activity/audit log entries for a resource
 */

import { FC } from 'react'
import {
  ClockIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ArrowPathIcon,
  PlusIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import { formatDistanceToNow, format, parseISO } from 'date-fns'

export interface ActivityEntry {
  id: string
  action: string
  performedBy: string
  performedByEmail?: string
  performedAt: string
  details?: string
  outcome?: 'SUCCESS' | 'FAILURE'
  resourceType?: string
  resourceName?: string
  changedFields?: string[]
  beforeValue?: Record<string, unknown>
  afterValue?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface ActivityListProps {
  /** List of activity entries */
  activities: ActivityEntry[]
  /** Loading state */
  isLoading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Show detailed changes */
  showDetails?: boolean
  /** Callback when an activity is clicked */
  onActivityClick?: (activity: ActivityEntry) => void
  /** Custom class name */
  className?: string
}

const getActionIcon = (action: string) => {
  const iconClass = 'w-4 h-4'
  const normalizedAction = action.toUpperCase()

  switch (normalizedAction) {
    case 'CREATE':
    case 'UPLOAD':
    case 'UPLOADED':
      return <PlusIcon className={iconClass} />
    case 'VIEW':
    case 'VIEWED':
      return <EyeIcon className={iconClass} />
    case 'EDIT':
    case 'UPDATE':
    case 'EDITED':
      return <PencilIcon className={iconClass} />
    case 'DELETE':
    case 'DELETED':
      return <TrashIcon className={iconClass} />
    case 'DOWNLOAD':
    case 'DOWNLOADED':
      return <ArrowDownTrayIcon className={iconClass} />
    case 'SHARE':
    case 'SHARED':
      return <ShareIcon className={iconClass} />
    case 'MOVE':
    case 'MOVED':
      return <ArrowsRightLeftIcon className={iconClass} />
    case 'RESTORE':
    case 'RESTORED':
      return <ArrowPathIcon className={iconClass} />
    default:
      return <ClockIcon className={iconClass} />
  }
}

const getActionColor = (action: string, outcome?: string) => {
  if (outcome === 'FAILURE') {
    return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
  }

  const normalizedAction = action.toUpperCase()

  switch (normalizedAction) {
    case 'CREATE':
    case 'UPLOAD':
    case 'UPLOADED':
      return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
    case 'VIEW':
    case 'VIEWED':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    case 'EDIT':
    case 'UPDATE':
    case 'EDITED':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
    case 'DELETE':
    case 'DELETED':
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
    case 'DOWNLOAD':
    case 'DOWNLOADED':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400'
    case 'SHARE':
    case 'SHARED':
      return 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
    case 'MOVE':
    case 'MOVED':
      return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
    case 'RESTORE':
    case 'RESTORED':
      return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
  }
}

const getActionLabel = (action: string) => {
  const normalizedAction = action.toUpperCase()

  const labels: Record<string, string> = {
    CREATE: 'Created',
    UPLOAD: 'Uploaded',
    UPLOADED: 'Uploaded',
    VIEW: 'Viewed',
    VIEWED: 'Viewed',
    EDIT: 'Edited',
    UPDATE: 'Updated',
    EDITED: 'Edited',
    DELETE: 'Deleted',
    DELETED: 'Deleted',
    DOWNLOAD: 'Downloaded',
    DOWNLOADED: 'Downloaded',
    SHARE: 'Shared',
    SHARED: 'Shared',
    MOVE: 'Moved',
    MOVED: 'Moved',
    RESTORE: 'Restored',
    RESTORED: 'Restored',
    RENAME: 'Renamed',
    RENAMED: 'Renamed',
  }

  return labels[normalizedAction] || action
}

const formatDate = (dateString: string) => {
  try {
    const date = parseISO(dateString)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return dateString
  }
}

const formatFullDate = (dateString: string) => {
  try {
    const date = parseISO(dateString)
    return format(date, 'MMM d, yyyy h:mm a')
  } catch {
    return dateString
  }
}

export const ActivityList: FC<ActivityListProps> = ({
  activities,
  isLoading = false,
  emptyMessage = 'No activity recorded',
  showDetails = false,
  onActivityClick,
  className,
}) => {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700',
          className
        )}
      >
        <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            'relative flex gap-3',
            onActivityClick &&
              'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2'
          )}
          onClick={() => onActivityClick?.(activity)}
        >
          {/* Timeline line */}
          <div className="flex-shrink-0 relative">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                getActionColor(activity.action, activity.outcome)
              )}
            >
              {getActionIcon(activity.action)}
            </div>
            {index < activities.length - 1 && (
              <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pb-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="font-medium">{activity.performedBy}</span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">
                    {getActionLabel(activity.action).toLowerCase()}
                  </span>
                  {activity.resourceName && (
                    <>
                      {' '}
                      <span className="font-medium truncate">{activity.resourceName}</span>
                    </>
                  )}
                </p>

                {activity.details && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {activity.details}
                  </p>
                )}

                {/* Show changed fields if available and showDetails is true */}
                {showDetails && activity.changedFields && activity.changedFields.length > 0 && (
                  <div className="mt-2 text-xs">
                    <p className="text-gray-500 dark:text-gray-400 mb-1">Changed fields:</p>
                    <div className="flex flex-wrap gap-1">
                      {activity.changedFields.map((field) => (
                        <span
                          key={field}
                          className="inline-flex px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show before/after values if available */}
                {showDetails && activity.beforeValue && activity.afterValue && (
                  <div className="mt-2 text-xs grid grid-cols-2 gap-2">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <p className="text-red-600 dark:text-red-400 font-medium mb-1">Before</p>
                      <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-hidden">
                        {JSON.stringify(activity.beforeValue, null, 2)}
                      </pre>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <p className="text-green-600 dark:text-green-400 font-medium mb-1">After</p>
                      <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-hidden">
                        {JSON.stringify(activity.afterValue, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span
                className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500"
                title={formatFullDate(activity.performedAt)}
              >
                {formatDate(activity.performedAt)}
              </span>
            </div>

            {/* Outcome badge for failures */}
            {activity.outcome === 'FAILURE' && (
              <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">
                Failed
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ActivityList
