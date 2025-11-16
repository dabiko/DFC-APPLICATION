import { Checkbox } from './Checkbox'
import { cn } from '@utils/cn'
import type { CheckboxSize } from './Checkbox'

export interface CheckboxOption {
  value: string
  label: string
  disabled?: boolean
  helperText?: string
}

export interface CheckboxGroupProps {
  /** Options to display */
  options: CheckboxOption[]
  /** Selected values */
  value?: string[]
  /** Callback when values change */
  onChange?: (values: string[]) => void
  /** Group label */
  label?: string
  /** Helper text below group */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: CheckboxSize
  /** Disabled state */
  disabled?: boolean
  /** Orientation */
  orientation?: 'vertical' | 'horizontal'
}

/**
 * CheckboxGroup component
 *
 * A group of checkboxes with "select all" functionality and collective state management.
 *
 * @example
 * ```tsx
 * <CheckboxGroup
 *   label="Select interests"
 *   options={[
 *     { value: 'tech', label: 'Technology' },
 *     { value: 'sports', label: 'Sports' },
 *     { value: 'music', label: 'Music' },
 *   ]}
 *   value={selectedInterests}
 *   onChange={setSelectedInterests}
 * />
 * ```
 */
export function CheckboxGroup({
  options,
  value = [],
  onChange,
  label,
  helperText,
  error,
  size = 'md',
  disabled = false,
  orientation = 'vertical',
}: CheckboxGroupProps) {
  const enabledOptions = options.filter((opt) => !opt.disabled)
  const allChecked =
    enabledOptions.length > 0 && enabledOptions.every((opt) => value.includes(opt.value))
  const someChecked = enabledOptions.some((opt) => value.includes(opt.value)) && !allChecked

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allValues = enabledOptions.map((opt) => opt.value)
      onChange?.([...new Set([...value, ...allValues])])
    } else {
      const enabledValues = enabledOptions.map((opt) => opt.value)
      onChange?.(value.filter((v) => !enabledValues.includes(v)))
    }
  }

  const handleToggle = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue]
    onChange?.(newValue)
  }

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

      {options.length > 1 && (
        <Checkbox
          label="Select all"
          checked={allChecked}
          indeterminate={someChecked}
          onChange={(e) => handleSelectAll(e.target.checked)}
          size={size}
          disabled={disabled}
        />
      )}

      <div className={cn('flex gap-4', orientation === 'vertical' ? 'flex-col' : 'flex-wrap')}>
        {options.map((option) => (
          <Checkbox
            key={option.value}
            label={option.label}
            helperText={option.helperText}
            checked={value.includes(option.value)}
            onChange={() => handleToggle(option.value)}
            disabled={disabled || option.disabled}
            size={size}
          />
        ))}
      </div>
    </div>
  )
}
