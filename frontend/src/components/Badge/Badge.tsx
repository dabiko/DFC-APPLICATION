import { HTMLAttributes } from 'react'
import { cn } from '@utils/cn'

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'gray'
export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant */
  variant?: BadgeVariant
  /** Badge size */
  size?: BadgeSize
  /** Show dot indicator */
  dot?: boolean
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

const dotColors: Record<BadgeVariant, string> = {
  primary: 'bg-primary-600',
  secondary: 'bg-secondary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
  info: 'bg-info-600',
  gray: 'bg-gray-600',
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-sm',
  lg: 'px-3 py-1 text-base',
}

/**
 * Badge component
 *
 * A small label for displaying status, categories, or counts.
 * Use for read-only information display.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="error" dot>Offline</Badge>
 * <Badge>New</Badge>
 * ```
 */
export function Badge({
  variant = 'gray',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-full',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}
