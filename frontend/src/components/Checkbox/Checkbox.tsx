import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@utils/cn'
import { CheckIcon, MinusIcon } from '@heroicons/react/24/outline'

export type CheckboxSize = 'sm' | 'md' | 'lg'

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string
  /** Helper text below checkbox */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: CheckboxSize
  /** Indeterminate state (for "select all" scenarios) */
  indeterminate?: boolean
}

const sizeStyles: Record<CheckboxSize, { container: string; label: string }> = {
  sm: {
    container: 'h-4 w-4',
    label: 'text-sm',
  },
  md: {
    container: 'h-5 w-5',
    label: 'text-base',
  },
  lg: {
    container: 'h-6 w-6',
    label: 'text-lg',
  },
}

const iconSizes: Record<CheckboxSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

/**
 * Checkbox component
 *
 * An accessible checkbox input with support for labels, helper text, error states,
 * and indeterminate state for "select all" scenarios.
 *
 * @example
 * ```tsx
 * <Checkbox label="Accept terms and conditions" />
 * <Checkbox label="Subscribe to newsletter" helperText="You can unsubscribe anytime" />
 * <Checkbox indeterminate label="Select all" />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      helperText,
      error,
      size = 'md',
      indeterminate = false,
      className,
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-start gap-2">
          <div className="relative flex items-center">
            <input
              ref={ref}
              id={checkboxId}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                'rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
                'peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-primary-500',
                error
                  ? 'border-error-500 peer-checked:bg-error-600 peer-checked:border-error-600'
                  : 'border-gray-300 dark:border-gray-700 peer-checked:bg-primary-600 peer-checked:border-primary-600',
                disabled &&
                  'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800 peer-checked:bg-gray-400',
                indeterminate && 'bg-primary-600 border-primary-600',
                sizeStyles[size].container
              )}
              onClick={() => {
                if (!disabled) {
                  const input = document.getElementById(checkboxId) as HTMLInputElement
                  input?.click()
                }
              }}
            >
              {(checked || indeterminate) && (
                <span className="text-white">
                  {indeterminate ? (
                    <MinusIcon className={iconSizes[size]} />
                  ) : (
                    <CheckIcon className={iconSizes[size]} strokeWidth={3} />
                  )}
                </span>
              )}
            </div>
          </div>

          {label && (
            <label
              htmlFor={checkboxId}
              className={cn(
                'font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none',
                disabled && 'opacity-50 cursor-not-allowed',
                sizeStyles[size].label
              )}
            >
              {label}
            </label>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={cn(
              'text-sm ml-7',
              error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
