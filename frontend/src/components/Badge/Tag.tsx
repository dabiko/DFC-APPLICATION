import { HTMLAttributes } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { BadgeVariant, BadgeSize } from './Badge'

export interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onRemove'> {
  /** Tag variant */
  variant?: BadgeVariant
  /** Tag size */
  size?: BadgeSize
  /** Show remove button */
  removable?: boolean
  /** Callback when remove button is clicked */
  onRemove?: () => void
  /** Disabled state */
  disabled?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900/20 dark:text-primary-300',
  secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/20 dark:text-secondary-300',
  success: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-300',
  error: 'bg-error-100 text-error-800 dark:bg-error-900/20 dark:text-error-300',
  info: 'bg-info-100 text-info-800 dark:bg-info-900/20 dark:text-info-300',
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-0.5 text-sm gap-1.5',
  lg: 'px-3 py-1 text-base gap-2',
}

const iconSizes: Record<BadgeSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
}

/**
 * Tag component
 *
 * A label with optional remove functionality, perfect for displaying
 * and managing multiple selections or categories.
 *
 * @example
 * ```tsx
 * <Tag>Design</Tag>
 * <Tag variant="primary" removable onRemove={() => handleRemove()}>
 *   React
 * </Tag>
 * ```
 */
export function Tag({
  variant = 'gray',
  size = 'md',
  removable = false,
  onRemove,
  disabled = false,
  className,
  children,
  ...props
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (!disabled && onRemove) {
              onRemove()
            }
          }}
          disabled={disabled}
          className={cn(
            'flex-shrink-0 transition-colors',
            !disabled && 'hover:opacity-70',
            disabled && 'cursor-not-allowed'
          )}
          aria-label="Remove tag"
        >
          <XMarkIcon className={iconSizes[size]} />
        </button>
      )}
    </span>
  )
}
