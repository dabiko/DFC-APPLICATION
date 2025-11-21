import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@utils/cn'

export type RadioSize = 'sm' | 'md' | 'lg'

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text */
  label?: string
  /** Helper text below radio */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: RadioSize
}

const sizeStyles: Record<RadioSize, { container: string; dot: string; label: string }> = {
  sm: {
    container: 'h-4 w-4',
    dot: 'h-2 w-2',
    label: 'text-sm',
  },
  md: {
    container: 'h-5 w-5',
    dot: 'h-2.5 w-2.5',
    label: 'text-base',
  },
  lg: {
    container: 'h-6 w-6',
    dot: 'h-3 w-3',
    label: 'text-lg',
  },
}

/**
 * Radio component
 *
 * An accessible radio input with support for labels, helper text, and error states.
 * Use RadioGroup for managing a group of related radio buttons.
 *
 * @example
 * ```tsx
 * <Radio name="plan" value="basic" label="Basic Plan" />
 * <Radio name="plan" value="pro" label="Pro Plan" />
 * ```
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, helperText, error, size = 'md', className, id, disabled, checked, ...props }, ref) => {
    const radioId = id || `${props.name}-${props.value}`

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <div className="flex items-start gap-2">
          <div className="relative flex items-center">
            <input
              ref={ref}
              id={radioId}
              type="radio"
              checked={checked}
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                'rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer',
                'peer-focus:ring-2 peer-focus:ring-offset-2 peer-focus:ring-primary-500',
                error
                  ? 'border-error-500 peer-checked:border-error-600'
                  : 'border-gray-300 dark:border-gray-700 peer-checked:border-primary-600',
                disabled && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800',
                sizeStyles[size].container
              )}
              onClick={() => {
                if (!disabled) {
                  const input = document.getElementById(radioId) as HTMLInputElement
                  input?.click()
                }
              }}
            >
              {checked && (
                <div
                  className={cn(
                    'rounded-full transition-all',
                    error ? 'bg-error-600' : 'bg-primary-600',
                    disabled && 'bg-gray-400',
                    sizeStyles[size].dot
                  )}
                />
              )}
            </div>
          </div>

          {label && (
            <label
              htmlFor={radioId}
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

Radio.displayName = 'Radio'

// RadioGroup Component
export interface RadioGroupProps {
  /** Children radio elements */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** ARIA label for the group */
  'aria-label'?: string
  /** Fieldset legend */
  legend?: string
}

/**
 * RadioGroup component
 *
 * Groups related radio buttons together with optional legend.
 * Provides semantic structure and accessibility.
 *
 * @example
 * ```tsx
 * <RadioGroup legend="Choose a plan">
 *   <Radio name="plan" value="basic" label="Basic" />
 *   <Radio name="plan" value="pro" label="Pro" />
 * </RadioGroup>
 * ```
 */
export const RadioGroup = ({
  children,
  className,
  legend,
  'aria-label': ariaLabel,
}: RadioGroupProps) => {
  return (
    <fieldset className={cn('space-y-2', className)} aria-label={ariaLabel}>
      {legend && (
        <legend className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {legend}
        </legend>
      )}
      <div className="space-y-2">{children}</div>
    </fieldset>
  )
}

RadioGroup.displayName = 'RadioGroup'
