import React from 'react'
import {
  DocumentPlusIcon,
  PencilSquareIcon,
  ClockIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  BellIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import type { RetentionTimeline as RetentionTimelineType, RetentionTimelineProps } from '@/types/retention'
import { format, formatDistance } from 'date-fns'
import { getLifecycleStageLabel, getLifecycleStageColor } from '@/types/retention'

export const RetentionTimeline: React.FC<RetentionTimelineProps> = ({
  timeline,
  compact = false,
  showMilestones = true,
  interactive = false,
  onEventClick,
}) => {
  const getEventIcon = (type: RetentionTimelineType['events'][0]['type']) => {
    const icons = {
      creation: DocumentPlusIcon,
      modification: PencilSquareIcon,
      policy_applied: ClockIcon,
      hold_applied: ShieldExclamationIcon,
      hold_released: CheckCircleIcon,
      archived: ArchiveBoxIcon,
      deleted: TrashIcon,
      notification: BellIcon,
      violation: ExclamationTriangleIcon,
    }
    return icons[type] || ClockIcon
  }

  const getEventColor = (type: RetentionTimelineType['events'][0]['type']) => {
    const colors = {
      creation: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
      modification: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30',
      policy_applied: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      hold_applied: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
      hold_released: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
      archived: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-900/30',
      deleted: 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
      notification: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
      violation: 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    }
    return colors[type] || 'text-gray-600 bg-gray-100'
  }

  const stageColors = getLifecycleStageColor(timeline.currentStage)

  const renderMilestones = () => {
    if (!showMilestones) return null

    const now = new Date()
    const retentionEnd = new Date(timeline.milestones.retentionEnd)
    const isExpired = retentionEnd < now
    const daysUntilExpiration = Math.ceil(
      (retentionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <ClockIcon className="w-4 h-4" />
          Document Lifecycle Milestones
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {format(new Date(timeline.milestones.created), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Retention Start:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {format(new Date(timeline.milestones.retentionStart), 'MMM d, yyyy')}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Retention End:</span>
            <span
              className={`font-medium ${
                isExpired
                  ? 'text-red-600 dark:text-red-400'
                  : daysUntilExpiration <= 30
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-gray-900 dark:text-white'
              }`}
            >
              {format(new Date(timeline.milestones.retentionEnd), 'MMM d, yyyy')}
              {!isExpired && daysUntilExpiration <= 90 && (
                <span className="ml-2 text-xs">
                  ({daysUntilExpiration} days remaining)
                </span>
              )}
              {isExpired && <span className="ml-2 text-xs">(Expired)</span>}
            </span>
          </div>
          {timeline.milestones.expectedArchival && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected Archival:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {format(new Date(timeline.milestones.expectedArchival), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          {timeline.milestones.expectedDeletion && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600 dark:text-gray-400">Expected Deletion:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                {format(new Date(timeline.milestones.expectedDeletion), 'MMM d, yyyy')}
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!isExpired && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Retention Progress</span>
              <span>
                {Math.min(
                  100,
                  Math.max(
                    0,
                    ((now.getTime() -
                      new Date(timeline.milestones.retentionStart).getTime()) /
                      (retentionEnd.getTime() -
                        new Date(timeline.milestones.retentionStart).getTime())) *
                      100
                  )
                ).toFixed(0)}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  daysUntilExpiration <= 30
                    ? 'bg-orange-500'
                    : daysUntilExpiration <= 90
                      ? 'bg-yellow-500'
                      : 'bg-blue-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      ((now.getTime() -
                        new Date(timeline.milestones.retentionStart).getTime()) /
                        (retentionEnd.getTime() -
                          new Date(timeline.milestones.retentionStart).getTime())) *
                        100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderCompactTimeline = () => (
    <div className="space-y-2">
      {timeline.events.map((event, index) => {
        const Icon = getEventIcon(event.type)
        return (
          <div
            key={event.id}
            onClick={() => interactive && onEventClick?.(event)}
            className={`
              flex items-center gap-3 p-2 rounded-lg
              ${interactive ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
            `}
          >
            <div className={`p-1.5 rounded-full ${getEventColor(event.type)}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {event.title}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatDistance(new Date(event.date), new Date(), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  const renderFullTimeline = () => (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-6">
        {timeline.events.map((event, index) => {
          const Icon = getEventIcon(event.type)
          return (
            <div
              key={event.id}
              onClick={() => interactive && onEventClick?.(event)}
              className={`
                relative flex gap-4
                ${interactive ? 'cursor-pointer' : ''}
              `}
            >
              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                <div className={`p-2 rounded-full ${getEventColor(event.type)}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              {/* Content */}
              <div
                className={`
                flex-1 pb-6
                ${
                  interactive
                    ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50 -ml-2 pl-2 -mt-2 pt-2 rounded-lg'
                    : ''
                }
              `}
              >
                <div className="flex items-baseline justify-between gap-4 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{event.title}</h4>
                  <time className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(new Date(event.date), 'MMM d, yyyy')}
                  </time>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{event.description}</p>
                {event.performedBy && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    by {event.performedBy}
                  </p>
                )}
                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(event.metadata).map(([key, value]) => (
                      <span
                        key={key}
                        className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {timeline.documentName}
          </h2>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${stageColors.bg} ${stageColors.text} ${stageColors.border}`}
          >
            {getLifecycleStageLabel(timeline.currentStage)}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Document lifecycle timeline and retention history
        </p>
      </div>

      {/* Milestones */}
      {renderMilestones()}

      {/* Timeline Events */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Event History ({timeline.events.length})
        </h3>
        {timeline.events.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events recorded yet</p>
          </div>
        ) : compact ? (
          renderCompactTimeline()
        ) : (
          renderFullTimeline()
        )}
      </div>
    </div>
  )
}
