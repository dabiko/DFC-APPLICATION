/**
 * DateTimePicker Component
 *
 * A custom date/time picker with proper light/dark theme support
 * and enhanced UX for selecting dates and times.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DateTimePickerProps {
  value: string // ISO string or empty
  onChange: (value: string) => void
  min?: string // Minimum date (ISO string)
  max?: string // Maximum date (ISO string)
  disabled?: boolean
  placeholder?: string
  className?: string
  showTime?: boolean
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Dropdown height estimate (quick select + calendar + time + actions)
const DROPDOWN_HEIGHT = 420

export function DateTimePicker({
  value,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = 'Select date and time',
  className,
  showTime = true,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState<'below' | 'above'>('below')
  const [viewDate, setViewDate] = useState(() => {
    if (value) return new Date(value)
    if (min) return new Date(min)
    return new Date()
  })
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null)
  const [hour, setHour] = useState(() => {
    if (value) return new Date(value).getHours()
    return 12
  })
  const [minute, setMinute] = useState(() => {
    if (value) return new Date(value).getMinutes()
    return 0
  })

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Parse min/max dates
  const minDate = useMemo(() => (min ? new Date(min) : null), [min])
  const maxDate = useMemo(() => (max ? new Date(max) : null), [max])

  // Calculate and update dropdown position
  useEffect(() => {
    if (!isOpen) return

    const calculatePosition = () => {
      if (!inputRef.current) return

      const inputRect = inputRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - inputRect.bottom
      const spaceAbove = inputRect.top

      // If not enough space below but more space above, position above
      const newPosition =
        spaceBelow < DROPDOWN_HEIGHT && spaceAbove > spaceBelow ? 'above' : 'below'
      setDropdownPosition(newPosition)
    }

    // Calculate initial position
    calculatePosition()

    // Recalculate on scroll/resize
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Get calendar days
  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear()
    const month = viewDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days: (Date | null)[] = []

    // Add empty slots for days before the first day
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }, [viewDate])

  // Check if a date is disabled
  const isDateDisabled = (date: Date) => {
    if (minDate) {
      const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      if (dateOnly < minDateOnly) return true
    }
    if (maxDate) {
      const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      if (dateOnly > maxDateOnly) return true
    }
    return false
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Check if a date is selected
  const isSelected = (date: Date) => {
    if (!selectedDate) return false
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  // Navigate months
  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
  }

  // Select a date
  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return
    setSelectedDate(date)

    // Build the full datetime
    const newDate = new Date(date)
    newDate.setHours(hour, minute, 0, 0)
    onChange(newDate.toISOString().slice(0, 16))
  }

  // Update time
  const handleTimeChange = (newHour: number, newMinute: number) => {
    setHour(newHour)
    setMinute(newMinute)

    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(newHour, newMinute, 0, 0)
      onChange(newDate.toISOString().slice(0, 16))
    }
  }

  // Clear value
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedDate(null)
    onChange('')
  }

  // Format display value
  const displayValue = useMemo(() => {
    if (!value) return ''
    const date = new Date(value)
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    if (!showTime) return dateStr
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return `${dateStr} at ${timeStr}`
  }, [value, showTime])

  // Quick select options
  const quickSelects = useMemo(() => {
    const now = new Date()
    return [
      { label: 'In 1 hour', date: new Date(now.getTime() + 60 * 60 * 1000) },
      { label: 'In 24 hours', date: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
      { label: 'In 7 days', date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
      { label: 'In 30 days', date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
    ]
  }, [])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input Button */}
      <button
        ref={inputRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
          'border rounded-lg transition-colors',
          'bg-white dark:bg-gray-900',
          'border-gray-300 dark:border-gray-600',
          'hover:border-gray-400 dark:hover:border-gray-500',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isOpen && 'ring-2 ring-blue-500 border-blue-500'
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span
          className={cn(
            'flex-1 truncate',
            value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
          )}
        >
          {displayValue || placeholder}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute z-50 p-4',
            'bg-white dark:bg-gray-800',
            // Enhanced border styling with ring effect for better visibility
            'border-2 border-gray-200 dark:border-gray-600',
            'ring-1 ring-black/5 dark:ring-white/10',
            // Enhanced shadow for better depth perception
            'rounded-xl shadow-2xl',
            'w-[320px]',
            // Smooth animation for opening
            'animate-in fade-in-0 zoom-in-95 duration-200',
            // Position above or below based on available space
            dropdownPosition === 'below'
              ? 'top-full mt-2 origin-top'
              : 'bottom-full mb-2 origin-bottom'
          )}
        >
          {/* Quick Select */}
          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              Quick Select
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickSelects.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setSelectedDate(opt.date)
                    setHour(opt.date.getHours())
                    setMinute(opt.date.getMinutes())
                    setViewDate(opt.date)
                    onChange(opt.date.toISOString().slice(0, 16))
                  }}
                  className={cn(
                    'px-2 py-1 text-xs font-medium rounded',
                    'bg-gray-100 dark:bg-gray-700',
                    'text-gray-700 dark:text-gray-300',
                    'hover:bg-gray-200 dark:hover:bg-gray-600',
                    'transition-colors'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={goToPrevMonth}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-600 dark:text-gray-400'
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'text-gray-600 dark:text-gray-400'
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, idx) => (
              <div key={idx} className="aspect-square">
                {date ? (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(date)}
                    disabled={isDateDisabled(date)}
                    className={cn(
                      'w-full h-full flex items-center justify-center',
                      'text-sm rounded-lg transition-colors',
                      isSelected(date)
                        ? 'bg-blue-600 text-white font-semibold'
                        : isToday(date)
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium'
                          : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700',
                      isDateDisabled(date) &&
                        'opacity-30 cursor-not-allowed hover:bg-transparent dark:hover:bg-transparent'
                    )}
                  >
                    {date.getDate()}
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {/* Time Picker */}
          {showTime && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Time:</span>
                <div className="flex items-center gap-1">
                  <select
                    value={hour}
                    onChange={(e) => handleTimeChange(parseInt(e.target.value), minute)}
                    className={cn(
                      'px-2 py-1.5 text-sm rounded-lg',
                      'bg-gray-100 dark:bg-gray-700',
                      'text-gray-900 dark:text-gray-100',
                      'border-0 focus:ring-2 focus:ring-blue-500',
                      'cursor-pointer'
                    )}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-500 dark:text-gray-400 font-bold">:</span>
                  <select
                    value={minute}
                    onChange={(e) => handleTimeChange(hour, parseInt(e.target.value))}
                    className={cn(
                      'px-2 py-1.5 text-sm rounded-lg',
                      'bg-gray-100 dark:bg-gray-700',
                      'text-gray-900 dark:text-gray-100',
                      'border-0 focus:ring-2 focus:ring-blue-500',
                      'cursor-pointer'
                    )}
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>
                        {i.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg',
                'text-gray-700 dark:text-gray-300',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors'
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={!selectedDate}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg',
                'bg-blue-600 text-white',
                'hover:bg-blue-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-colors'
              )}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DateTimePicker
