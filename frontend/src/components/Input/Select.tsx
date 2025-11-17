import { cn } from '@utils/cn'
import type { SelectHTMLAttributes, ReactNode } from 'react'

export interface NativeSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text */
  label?: string
  /** Helper text below select */
  helperText?: string
  /** Error message */
  error?: string
  /** Full width */
  fullWidth?: boolean
  /** Children (option elements) */
  children: ReactNode
}

/**
 * Native Select component
 *
 * A styled wrapper around the native HTML select element.
 * Use this when you need a simple select with option children.
 *
 * @example
 * ```tsx
 * <Select label="Country" value={country} onChange={handleChange}>
 *   <option value="">Select country...</option>
 *   <option value="us">United States</option>
 *   <option value="ca">Canada</option>
 * </Select>
 * ```
 */
export function Select({
  label,
  helperText,
  error,
  fullWidth = true,
  className,
  required,
  disabled,
  children,
  ...props
}: NativeSelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-error-600 ml-1">*</span>}
        </label>
      )}

      <select
        className={cn(
          'block w-full rounded-lg border bg-white dark:bg-gray-900',
          'px-4 py-2 text-base text-gray-900 dark:text-gray-100',
          'transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-error-500 focus:ring-error-500'
            : 'border-gray-300 dark:border-gray-700 focus:ring-primary-500',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
          'appearance-none',
          'bg-[right_0.5rem_center] bg-no-repeat',
          'pr-10', // Space for dropdown arrow
          className
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundSize: '1.5em 1.5em',
        }}
        required={required}
        disabled={disabled}
        {...props}
      >
        {children}
      </select>

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
