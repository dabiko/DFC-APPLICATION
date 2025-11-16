import { Switch as HeadlessSwitch } from '@headlessui/react'
import { cn } from '@utils/cn'

export type SwitchSize = 'sm' | 'md' | 'lg'

export interface SwitchProps {
  /** Checked state */
  checked: boolean
  /** Callback when state changes */
  onChange: (checked: boolean) => void
  /** Label text */
  label?: string
  /** Helper text below switch */
  helperText?: string
  /** Error message */
  error?: string
  /** Size variant */
  size?: SwitchSize
  /** Disabled state */
  disabled?: boolean
  /** Label position */
  labelPosition?: 'left' | 'right'
}

const sizeStyles: Record<
  SwitchSize,
  { container: string; toggle: string; translate: string; label: string }
> = {
  sm: {
    container: 'h-5 w-9',
    toggle: 'h-3 w-3',
    translate: 'translate-x-4',
    label: 'text-sm',
  },
  md: {
    container: 'h-6 w-11',
    toggle: 'h-4 w-4',
    translate: 'translate-x-5',
    label: 'text-base',
  },
  lg: {
    container: 'h-7 w-14',
    toggle: 'h-5 w-5',
    translate: 'translate-x-7',
    label: 'text-lg',
  },
}

/**
 * Switch (Toggle) component
 *
 * An accessible toggle switch built with Headless UI.
 * Perfect for boolean settings and preferences.
 *
 * @example
 * ```tsx
 * <Switch
 *   checked={notifications}
 *   onChange={setNotifications}
 *   label="Enable notifications"
 * />
 * ```
 */
export function Switch({
  checked,
  onChange,
  label,
  helperText,
  error,
  size = 'md',
  disabled = false,
  labelPosition = 'right',
}: SwitchProps) {
  return (
    <div className="flex flex-col gap-1">
      <HeadlessSwitch.Group>
        <div
          className={cn(
            'flex items-center gap-3',
            labelPosition === 'left' && 'flex-row-reverse justify-end'
          )}
        >
          <HeadlessSwitch
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={cn(
              'relative inline-flex items-center rounded-full transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
              error
                ? checked
                  ? 'bg-error-600'
                  : 'bg-gray-200 dark:bg-gray-700'
                : checked
                  ? 'bg-primary-600'
                  : 'bg-gray-200 dark:bg-gray-700',
              disabled && 'opacity-50 cursor-not-allowed',
              sizeStyles[size].container
            )}
          >
            <span
              className={cn(
                'inline-block rounded-full bg-white transition-transform',
                'transform translate-x-1',
                checked && sizeStyles[size].translate,
                sizeStyles[size].toggle
              )}
            />
          </HeadlessSwitch>

          {label && (
            <HeadlessSwitch.Label
              className={cn(
                'font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none',
                disabled && 'opacity-50 cursor-not-allowed',
                sizeStyles[size].label
              )}
            >
              {label}
            </HeadlessSwitch.Label>
          )}
        </div>
      </HeadlessSwitch.Group>

      {(helperText || error) && (
        <p
          className={cn(
            'text-sm',
            labelPosition === 'left' && 'text-right',
            error ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {error || helperText}
        </p>
      )}
    </div>
  )
}
