import { Radio } from './Radio'
import { cn } from '@utils/cn'
import type { RadioSize } from './Radio'

export interface RadioOption {
  value: string
  label: string
  disabled?: boolean
  helperText?: string
}

export interface RadioGroupProps {
  /** Group name (required for radio buttons) */
  name: string
  /** Options to display */
  options: RadioOption[]
  /** Selected value */
  value?: string
  /** Callback when value changes */
  onChange?: (value: string) => void
  /** Group label */
  label?: string
  /** Helper text below group */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: RadioSize
  /** Disabled state */
  disabled?: boolean
  /** Orientation */
  orientation?: 'vertical' | 'horizontal'
}

/**
 * RadioGroup component
 *
 * A group of radio buttons with collective state management.
 * Only one option can be selected at a time.
 *
 * @example
 * ```tsx
 * <RadioGroup
 *   name="plan"
 *   label="Select a plan"
 *   options={[
 *     { value: 'basic', label: 'Basic - $9/month' },
 *     { value: 'pro', label: 'Pro - $29/month' },
 *     { value: 'enterprise', label: 'Enterprise - Custom' },
 *   ]}
 *   value={selectedPlan}
 *   onChange={setSelectedPlan}
 * />
 * ```
 */
export function RadioGroup({
  name,
  options,
  value,
  onChange,
  label,
  helperText,
  error,
  size = 'md',
  disabled = false,
  orientation = 'vertical',
}: RadioGroupProps) {
  return (
    <div className="flex flex-col gap-3">
      {label && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
          {helperText && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
          )}
          {error && <p className="text-sm text-error-600 dark:text-error-400">{error}</p>}
        </div>
      )}

      <div
        className={cn('flex gap-4', orientation === 'vertical' ? 'flex-col' : 'flex-wrap')}
        role="radiogroup"
        aria-label={label}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            helperText={option.helperText}
            checked={value === option.value}
            onChange={() => onChange?.(option.value)}
            disabled={disabled || option.disabled}
            size={size}
          />
        ))}
      </div>
    </div>
  )
}
