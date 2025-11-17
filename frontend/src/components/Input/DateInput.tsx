import { cn } from '@utils/cn'
import type { InputHTMLAttributes } from 'react'

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label text */
  label?: string
  /** Helper text below input */
  helperText?: string
  /** Error message */
  error?: string
  /** Full width */
  fullWidth?: boolean
  /** Minimum date (YYYY-MM-DD format) */
  min?: string
  /** Maximum date (YYYY-MM-DD format) */
  max?: string
}

/**
 * Native Date Input component
 *
 * A styled wrapper around the native HTML date input element.
 * Accepts and returns string values in YYYY-MM-DD format.
 *
 * @example
 * ```tsx
 * <DateInput
 *   label="Birth Date"
 *   value={birthDate}
 *   onChange={(e) => setBirthDate(e.target.value)}
 *   max={new Date().toISOString().split('T')[0]}
 * />
 * ```
 */
export function DateInput({
  label,
  helperText,
  error,
  fullWidth = true,
  className,
  required,
  disabled,
  min,
  max,
  ...props
}: DateInputProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}

      <input
        type="date"
        className={cn(
          'block w-full rounded-lg border bg-white dark:bg-gray-900',
          'px-4 py-2 text-base text-gray-900 dark:text-gray-100',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-error-500 focus:ring-error-500'
            : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
          className
        )}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        {...props}
      />

      {(helperText || error) && (
        <p
          className={cn(
            'text-sm',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
