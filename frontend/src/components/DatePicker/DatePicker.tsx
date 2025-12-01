import { DayPicker } from 'react-day-picker'
import type { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { cn } from '@utils/cn'
import 'react-day-picker/dist/style.css'
import './DatePicker.css'

export interface DatePickerProps {
  /** Selected date */
  value?: Date
  /** Callback when date changes */
  onChange?: (date: Date | undefined) => void
  /** Placeholder text */
  placeholder?: string
  /** Label */
  label?: string
  /** Helper text */
  helperText?: string
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Required field */
  required?: boolean
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
  /** Clearable */
  clearable?: boolean
  /** Date format */
  dateFormat?: string
  /** Custom class name */
  className?: string
}

/**
 * DatePicker component
 *
 * A date picker with calendar dropdown.
 * Useful for document date filtering and date input fields.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   label="Document Date"
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   placeholder="Select a date"
 * />
 * ```
 */
export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
  helperText,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  clearable = true,
  dateFormat = 'PPP',
  className,
}: DatePickerProps) {
  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  const disabledDays = []
  if (minDate) disabledDays.push({ before: minDate })
  if (maxDate) disabledDays.push({ after: maxDate })

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}

      <Popover className="relative">
        {() => (
          <>
            <PopoverButton
              disabled={disabled}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-left rounded-md border transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                error
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900',
                disabled && 'opacity-50 cursor-not-allowed',
                'hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  value ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {value ? format(value, dateFormat) : placeholder}
              </span>

              <div className="flex items-center gap-1">
                {clearable && value && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleClear(e as unknown as React.MouseEvent)
                      }
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
                    aria-label="Clear date"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-500" />
                  </span>
                )}
                <CalendarIcon className="h-5 w-5 text-gray-500" />
              </div>
            </PopoverButton>

            <PopoverPanel className="absolute z-10 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3">
              <DayPicker
                mode="single"
                selected={value}
                onSelect={handleSelect}
                disabled={disabledDays}
                className="rdp-custom"
              />
            </PopoverPanel>
          </>
        )}
      </Popover>

      {(helperText || error) && (
        <p
          className={cn(
            'mt-1 text-sm',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}

export interface DateRangePickerProps {
  /** Selected date range */
  value?: DateRange
  /** Callback when date range changes */
  onChange?: (range: DateRange | undefined) => void
  /** Placeholder text */
  placeholder?: string
  /** Label */
  label?: string
  /** Helper text */
  helperText?: string
  /** Error message */
  error?: string
  /** Disabled state */
  disabled?: boolean
  /** Required field */
  required?: boolean
  /** Minimum selectable date */
  minDate?: Date
  /** Maximum selectable date */
  maxDate?: Date
  /** Clearable */
  clearable?: boolean
  /** Date format */
  dateFormat?: string
  /** Custom class name */
  className?: string
}

/**
 * DateRangePicker component
 *
 * A date range picker with calendar dropdown.
 * Useful for filtering documents by date range.
 *
 * @example
 * ```tsx
 * <DateRangePicker
 *   label="Date Range"
 *   value={dateRange}
 *   onChange={setDateRange}
 *   placeholder="Select date range"
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  label,
  helperText,
  error,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  clearable = true,
  dateFormat = 'PP',
  className,
}: DateRangePickerProps) {
  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(undefined)
  }

  const disabledDays = []
  if (minDate) disabledDays.push({ before: minDate })
  if (maxDate) disabledDays.push({ after: maxDate })

  const formatRange = (): string => {
    if (!value?.from) return placeholder

    if (value.from && value.to) {
      return `${format(value.from, dateFormat)} - ${format(value.to, dateFormat)}`
    }

    return `${format(value.from, dateFormat)} - ...`
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}

      <Popover className="relative">
        {() => (
          <>
            <PopoverButton
              disabled={disabled}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-left rounded-md border transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                error
                  ? 'border-error-500 bg-error-50 dark:bg-error-900/20'
                  : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900',
                disabled && 'opacity-50 cursor-not-allowed',
                'hover:border-gray-400 dark:hover:border-gray-600'
              )}
            >
              <span
                className={cn(
                  'text-sm',
                  value?.from
                    ? 'text-gray-900 dark:text-gray-100'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {formatRange()}
              </span>

              <div className="flex items-center gap-1">
                {clearable && value?.from && !disabled && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleClear}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleClear(e as unknown as React.MouseEvent)
                      }
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors cursor-pointer"
                    aria-label="Clear date range"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-500" />
                  </span>
                )}
                <CalendarIcon className="h-5 w-5 text-gray-500" />
              </div>
            </PopoverButton>

            <PopoverPanel className="absolute z-10 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 p-3">
              <DayPicker
                mode="range"
                selected={value}
                onSelect={handleSelect}
                disabled={disabledDays}
                numberOfMonths={2}
                className="rdp-custom"
              />
            </PopoverPanel>
          </>
        )}
      </Popover>

      {(helperText || error) && (
        <p
          className={cn(
            'mt-1 text-sm',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
