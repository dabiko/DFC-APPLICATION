/**
 * RetentionCalendarView Component
 * Calendar view for retention schedules showing upcoming dispositions
 */

import { useState, useMemo, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Archive,
  Trash2,
  Clock,
  FileText,
  AlertTriangle,
  Shield,
  X,
  ChevronDown,
} from 'lucide-react'
import type { ScheduleCalendarEvent, DispositionAction, ScheduleStatus } from '@/types/retention'
import {
  getScheduleStatusColor,
  getDispositionActionLabel,
  getDispositionActionColor,
} from '@/types/retention'
import { cn } from '@/utils/cn'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface RetentionCalendarViewProps {
  events: ScheduleCalendarEvent[]
  selectedDate?: Date
  onDateSelect?: (date: Date) => void
  onEventClick?: (event: ScheduleCalendarEvent) => void
  onMonthChange?: (year: number, month: number) => void
  loading?: boolean
}

type CalendarView = 'month' | 'week'

// ============================================================================
// CONSTANTS
// ============================================================================

const EVENT_TYPE_ICONS: Record<ScheduleCalendarEvent['type'], React.ElementType> = {
  deletion: Trash2,
  archival: Archive,
  review: FileText,
  notification: Clock,
  legal_hold: Shield,
}

const EVENT_TYPE_COLORS: Record<ScheduleCalendarEvent['type'], string> = {
  deletion: 'bg-red-500',
  archival: 'bg-blue-500',
  review: 'bg-yellow-500',
  notification: 'bg-purple-500',
  legal_hold: 'bg-orange-500',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface EventPopoverProps {
  event: ScheduleCalendarEvent
  onClose: () => void
  onEventClick?: (event: ScheduleCalendarEvent) => void
}

function EventPopover({ event, onClose, onEventClick }: EventPopoverProps) {
  const Icon = EVENT_TYPE_ICONS[event.type]
  const statusColors = getScheduleStatusColor(event.status)

  return (
    <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded', EVENT_TYPE_COLORS[event.type])}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(event.date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Status</span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                statusColors.bg,
                statusColors.text
              )}
            >
              {event.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">Items</span>
            <span className="text-gray-900 dark:text-white font-medium">{event.count}</span>
          </div>
        </div>

        {event.items.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Documents ({event.items.length})
            </p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {event.items.slice(0, 5).map((item) => {
                const actionColors = getDispositionActionColor(item.action)
                return (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        'ml-2 px-1.5 py-0.5 rounded',
                        actionColors.bg,
                        actionColors.text
                      )}
                    >
                      {getDispositionActionLabel(item.action)}
                    </span>
                  </div>
                )
              })}
              {event.items.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                  +{event.items.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => onEventClick?.(event)}
          className="w-full mt-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RetentionCalendarView({
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onMonthChange,
  loading = false,
}: RetentionCalendarViewProps) {
  // State
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date())
  const [hoveredEvent, setHoveredEvent] = useState<ScheduleCalendarEvent | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null)

  // Get calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentMonth])

  // Group events by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleCalendarEvent[]>()
    events.forEach((event) => {
      const dateKey = format(new Date(event.date), 'yyyy-MM-dd')
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      map.get(dateKey)!.push(event)
    })
    return map
  }, [events])

  // Navigation handlers
  const handlePrevMonth = useCallback(() => {
    const newMonth = subMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth())
  }, [currentMonth, onMonthChange])

  const handleNextMonth = useCallback(() => {
    const newMonth = addMonths(currentMonth, 1)
    setCurrentMonth(newMonth)
    onMonthChange?.(newMonth.getFullYear(), newMonth.getMonth())
  }, [currentMonth, onMonthChange])

  const handleToday = useCallback(() => {
    const today = new Date()
    setCurrentMonth(today)
    onDateSelect?.(today)
    onMonthChange?.(today.getFullYear(), today.getMonth())
  }, [onDateSelect, onMonthChange])

  // Event handlers
  const handleEventHover = (event: ScheduleCalendarEvent, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setHoveredEvent(event)
    setPopoverPosition({ x: rect.left, y: rect.bottom })
  }

  const handleEventLeave = () => {
    setHoveredEvent(null)
    setPopoverPosition(null)
  }

  // Get event count by type for a date
  const getEventSummary = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayEvents = eventsByDate.get(dateKey) || []

    const summary: Record<ScheduleCalendarEvent['type'], number> = {
      deletion: 0,
      archival: 0,
      review: 0,
      notification: 0,
      legal_hold: 0,
    }

    dayEvents.forEach((event) => {
      summary[event.type] += event.count
    })

    return { events: dayEvents, summary }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Calendar className="w-8 h-8 animate-pulse text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => {
          const Icon = EVENT_TYPE_ICONS[type as ScheduleCalendarEvent['type']]
          return (
            <div key={type} className="flex items-center gap-1.5 text-xs">
              <div className={cn('w-3 h-3 rounded', color)} />
              <span className="text-gray-600 dark:text-gray-400 capitalize">
                {type.replace('_', ' ')}
              </span>
            </div>
          )
        })}
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const { events: dayEvents, summary } = getEventSummary(day)
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)
          const hasEvents = dayEvents.length > 0
          const totalCount = dayEvents.reduce((sum, e) => sum + e.count, 0)

          return (
            <div
              key={dateKey}
              onClick={() => onDateSelect?.(day)}
              className={cn(
                'min-h-[100px] p-2 border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors',
                index % 7 === 6 && 'border-r-0',
                !isCurrentMonth && 'bg-gray-50 dark:bg-gray-900/50',
                isSelected && 'bg-blue-50 dark:bg-blue-900/20',
                !isSelected && 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              )}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'text-sm font-medium',
                    !isCurrentMonth && 'text-gray-400 dark:text-gray-600',
                    isCurrentMonth && 'text-gray-900 dark:text-white',
                    isTodayDate &&
                      'w-7 h-7 flex items-center justify-center bg-blue-600 text-white rounded-full'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {totalCount > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {totalCount} item{totalCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Event Indicators */}
              {hasEvents && (
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event) => {
                    const Icon = EVENT_TYPE_ICONS[event.type]
                    return (
                      <div
                        key={event.id}
                        onMouseEnter={(e) => handleEventHover(event, e)}
                        onMouseLeave={handleEventLeave}
                        onClick={(e) => {
                          e.stopPropagation()
                          onEventClick?.(event)
                        }}
                        className={cn(
                          'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate',
                          EVENT_TYPE_COLORS[event.type],
                          'text-white hover:opacity-80 transition-opacity'
                        )}
                      >
                        <Icon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {event.count} {event.type.replace('_', ' ')}
                        </span>
                      </div>
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 pl-1">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Event Popover */}
      {hoveredEvent && popoverPosition && (
        <div
          style={{
            position: 'fixed',
            left: popoverPosition.x,
            top: popoverPosition.y,
          }}
        >
          <EventPopover
            event={hoveredEvent}
            onClose={() => setHoveredEvent(null)}
            onEventClick={onEventClick}
          />
        </div>
      )}

      {/* Summary Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500 dark:text-gray-400">
              {events.length} event{events.length !== 1 ? 's' : ''} this month
            </span>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="text-gray-500 dark:text-gray-400">
              {events.reduce((sum, e) => sum + e.count, 0)} total items
            </span>
          </div>
          {events.some((e) => e.type === 'deletion') && (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>
                {events.filter((e) => e.type === 'deletion').reduce((sum, e) => sum + e.count, 0)}{' '}
                deletions scheduled
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RetentionCalendarView
