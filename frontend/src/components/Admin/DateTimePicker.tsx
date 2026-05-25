import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
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

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Select date & time',
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentDate = value ? new Date(value) : null

  const [viewYear, setViewYear] = useState(
    () => currentDate?.getFullYear() ?? new Date().getFullYear()
  )
  const [viewMonth, setViewMonth] = useState(() => currentDate?.getMonth() ?? new Date().getMonth())
  const [selectedDay, setSelectedDay] = useState<{ y: number; m: number; d: number } | null>(
    currentDate
      ? { y: currentDate.getFullYear(), m: currentDate.getMonth(), d: currentDate.getDate() }
      : null
  )
  const [hours, setHours] = useState(() => currentDate?.getHours() ?? 9)
  const [minutes, setMinutes] = useState(() => currentDate?.getMinutes() ?? 0)

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
      setSelectedDay({ y: d.getFullYear(), m: d.getMonth(), d: d.getDate() })
      setHours(d.getHours())
      setMinutes(d.getMinutes())
    } else {
      setSelectedDay(null)
    }
  }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const today = new Date()

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  const isSelected = (day: number) =>
    selectedDay?.y === viewYear && selectedDay?.m === viewMonth && selectedDay?.d === day

  const isToday = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day

  const handleConfirm = () => {
    if (!selectedDay) return
    const d = new Date(selectedDay.y, selectedDay.m, selectedDay.d, hours, minutes)
    onChange(d.toISOString())
    setIsOpen(false)
  }

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange('')
    setSelectedDay(null)
    setIsOpen(false)
  }

  const adjustHours = (delta: number) => setHours((h) => (h + delta + 24) % 24)
  const adjustMinutes = (delta: number) => setMinutes((m) => (m + delta + 60) % 60)

  const pad = (n: number) => n.toString().padStart(2, '0')

  const displayValue = currentDate
    ? currentDate.toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm',
          'border rounded-lg transition-all duration-150',
          'bg-white dark:bg-gray-900',
          'text-gray-900 dark:text-white',
          isOpen
            ? 'border-purple-500 ring-2 ring-purple-500/20 dark:ring-purple-500/30'
            : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500'
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        <span className={cn('flex-1', !displayValue && 'text-gray-400 dark:text-gray-500')}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span
            role="button"
            onClick={handleClear}
            className="p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        )}
        <Clock className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-2 w-72',
            'bg-white dark:bg-gray-800',
            'border border-gray-200 dark:border-gray-700',
            'rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40',
            'overflow-hidden',
            // Open above if near bottom – handled via CSS transform if needed
            'left-0'
          )}
        >
          {/* Calendar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700/80">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white select-none">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day grid */}
          <div className="px-3 pt-3 pb-1">
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1 select-none"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => (
                <div key={i} className="flex items-center justify-center">
                  {day !== null ? (
                    <button
                      type="button"
                      onClick={() => setSelectedDay({ y: viewYear, m: viewMonth, d: day })}
                      className={cn(
                        'w-8 h-8 rounded-full text-sm transition-all duration-100 select-none',
                        isSelected(day)
                          ? 'bg-purple-600 text-white font-semibold shadow-sm hover:bg-purple-700'
                          : isToday(day)
                            ? 'border-2 border-purple-400 text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-50 dark:hover:bg-purple-900/20'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 my-2 border-t border-gray-100 dark:border-gray-700/80" />

          {/* Time picker */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide select-none">
                Time
              </span>
            </div>

            <div className="flex items-center justify-center gap-1">
              {/* Hours spinner */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => adjustHours(1)}
                  className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
                <div className="w-12 text-center select-none">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={pad(hours)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v)) setHours(Math.max(0, Math.min(23, v)))
                    }}
                    className={cn(
                      'w-full text-center text-lg font-bold tabular-nums',
                      'bg-gray-50 dark:bg-gray-700/60',
                      'border border-gray-200 dark:border-gray-600',
                      'text-gray-900 dark:text-white',
                      'rounded-lg py-1 px-0',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustHours(-1)}
                  className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>

              <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 mb-0.5 select-none">
                :
              </span>

              {/* Minutes spinner */}
              <div className="flex flex-col items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => adjustMinutes(5)}
                  className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                </button>
                <div className="w-12 text-center select-none">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={pad(minutes)}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v)) setMinutes(Math.max(0, Math.min(59, v)))
                    }}
                    className={cn(
                      'w-full text-center text-lg font-bold tabular-nums',
                      'bg-gray-50 dark:bg-gray-700/60',
                      'border border-gray-200 dark:border-gray-600',
                      'text-gray-900 dark:text-white',
                      'rounded-lg py-1 px-0',
                      'focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent',
                      '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => adjustMinutes(-5)}
                  className="w-8 h-6 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
                </button>
              </div>

              {/* 24h label */}
              <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 self-center select-none">
                24h
              </span>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/40 border-t border-gray-100 dark:border-gray-700/80">
            <button
              type="button"
              onClick={() => handleClear()}
              className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedDay}
              className={cn(
                'flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg transition-colors',
                selectedDay
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              )}
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
