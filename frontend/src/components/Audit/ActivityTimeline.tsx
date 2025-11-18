/**
 * ActivityTimeline Component
 * Visual timeline display of audit events grouped by time periods
 */

import { FC } from 'react'
import {
  ClockIcon,
  DocumentTextIcon,
  FolderIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { ActivityTimelineProps, TimelineEvent } from '@/types/audit'
import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from 'date-fns'

export const ActivityTimeline: FC<ActivityTimelineProps> = ({
  events,
  groupBy: _groupBy = 'day',
  onEventClick,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  className,
}) => {
  const getEventIcon = (event: TimelineEvent) => {
    const iconClass = 'w-5 h-5'

    // Use custom icon if provided
    if (event.icon) {
      return <span className={iconClass}>{event.icon}</span>
    }

    // Default icons based on event type
    if (event.relatedEntries.length > 0) {
      const resourceType = event.relatedEntries[0].resourceType
      switch (resourceType) {
        case 'document':
          return <DocumentTextIcon className={iconClass} />
        case 'folder':
          return <FolderIcon className={iconClass} />
        case 'user':
          return <UserIcon className={iconClass} />
        case 'role':
        case 'permission':
          return <ShieldCheckIcon className={iconClass} />
        default:
          return <ClockIcon className={iconClass} />
      }
    }

    return <ClockIcon className={iconClass} />
  }

  const getEventColor = (event: TimelineEvent) => {
    if (event.color) return event.color

    // Determine color based on event type or severity
    if (event.type === 'alert') return 'red'
    if (event.type === 'milestone') return 'blue'

    // Check for sensitive actions
    const hasSensitiveAction = event.relatedEntries.some((entry) =>
      ['document_deleted', 'permission_revoked', 'user_deactivated'].includes(entry.actionType)
    )

    if (hasSensitiveAction) return 'yellow'
    return 'green'
  }

  const getColorClasses = (color: TimelineEvent['color']) => {
    const classes = {
      blue: {
        dot: 'bg-blue-500 border-blue-200 dark:border-blue-700',
        line: 'bg-blue-200 dark:bg-blue-800',
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
      },
      green: {
        dot: 'bg-green-500 border-green-200 dark:border-green-700',
        line: 'bg-green-200 dark:bg-green-800',
        icon: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700',
      },
      yellow: {
        dot: 'bg-yellow-500 border-yellow-200 dark:border-yellow-700',
        line: 'bg-yellow-200 dark:bg-yellow-800',
        icon: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
      },
      red: {
        dot: 'bg-red-500 border-red-200 dark:border-red-700',
        line: 'bg-red-200 dark:bg-red-800',
        icon: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700',
      },
      gray: {
        dot: 'bg-gray-500 border-gray-200 dark:border-gray-700',
        line: 'bg-gray-200 dark:bg-gray-800',
        icon: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700',
      },
    }

    return classes[color || 'gray']
  }

  const formatDateHeader = (dateString: string) => {
    const date = parseISO(dateString)
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  // Group events by date
  const groupedEvents = events.reduce(
    (groups, event) => {
      const date = format(parseISO(event.timestamp), 'yyyy-MM-dd')
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(event)
      return groups
    },
    {} as Record<string, TimelineEvent[]>
  )

  const sortedDates = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a))

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700',
        className
      )}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Activity Timeline
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Timeline Content */}
      <div className="p-6">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Loading timeline...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center">
            <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No activity to display</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedDates.map((date, dateIdx) => (
              <div key={date}>
                {/* Date Header */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {formatDateHeader(date)}
                  </h3>
                </div>

                {/* Events for this date */}
                <div className="relative space-y-6">
                  {groupedEvents[date].map((event, eventIdx) => {
                    const color = getEventColor(event)
                    const colorClasses = getColorClasses(color)
                    const isLastEvent =
                      dateIdx === sortedDates.length - 1 &&
                      eventIdx === groupedEvents[date].length - 1

                    return (
                      <div key={event.id} className="relative pl-8">
                        {/* Timeline Line */}
                        {!isLastEvent && (
                          <div
                            className={cn(
                              'absolute left-2.5 top-8 bottom-0 w-0.5 -mb-6',
                              colorClasses.line
                            )}
                          ></div>
                        )}

                        {/* Timeline Dot */}
                        <div
                          className={cn(
                            'absolute left-0 top-1.5 w-5 h-5 rounded-full border-4',
                            colorClasses.dot
                          )}
                        ></div>

                        {/* Event Card */}
                        <div
                          onClick={() => onEventClick?.(event)}
                          className={cn(
                            'rounded-lg border-2 p-4 transition-all cursor-pointer',
                            onEventClick ? 'hover:shadow-md' : '',
                            colorClasses.bg
                          )}
                        >
                          <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className={cn('flex-shrink-0 mt-0.5', colorClasses.icon)}>
                              {getEventIcon(event)}
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Event Title */}
                              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {event.title}
                              </h4>

                              {/* Event Description */}
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {event.description}
                              </p>

                              {/* Event Metadata */}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <UserIcon className="w-3 h-3" />
                                  {event.userName}
                                </span>
                                <span>•</span>
                                <span>
                                  {formatDistanceToNow(parseISO(event.timestamp), {
                                    addSuffix: true,
                                  })}
                                </span>
                                {event.relatedEntries.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{event.relatedEntries.length} audit entries</span>
                                  </>
                                )}
                              </div>

                              {/* Alert Icon for alert type */}
                              {event.type === 'alert' && (
                                <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs">
                                  <ExclamationTriangleIcon className="w-4 h-4" />
                                  Alert
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !isLoading && (
          <div className="mt-8 text-center">
            <button
              onClick={onLoadMore}
              className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
