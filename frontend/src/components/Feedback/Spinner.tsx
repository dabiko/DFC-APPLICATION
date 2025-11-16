import { HTMLAttributes } from 'react'
import { cn } from '@utils/cn'

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerVariant = 'primary' | 'secondary' | 'white' | 'gray'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Spinner size */
  size?: SpinnerSize
  /** Spinner variant/color */
  variant?: SpinnerVariant
  /** Label for accessibility */
  label?: string
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
  xl: 'h-12 w-12 border-4',
}

const variantStyles: Record<SpinnerVariant, string> = {
  primary:
    'border-primary-200 border-t-primary-600 dark:border-primary-800 dark:border-t-primary-400',
  secondary:
    'border-secondary-200 border-t-secondary-600 dark:border-secondary-800 dark:border-t-secondary-400',
  white: 'border-white/30 border-t-white',
  gray: 'border-gray-200 border-t-gray-600 dark:border-gray-700 dark:border-t-gray-300',
}

/**
 * Spinner component
 *
 * A loading indicator that shows an animated spinning circle.
 * Use to indicate loading states and ongoing processes.
 *
 * @example
 * ```tsx
 * <Spinner size="md" variant="primary" label="Loading..." />
 * ```
 */
export function Spinner({
  size = 'md',
  variant = 'primary',
  label = 'Loading...',
  className,
  ...props
}: SpinnerProps) {
  return (
    <div role="status" aria-label={label} className={cn('inline-block', className)} {...props}>
      <div className={cn('animate-spin rounded-full', sizeStyles[size], variantStyles[variant])} />
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * SpinnerOverlay component
 *
 * A full-screen overlay with a centered spinner.
 * Use for blocking the entire UI during critical loading operations.
 *
 * @example
 * ```tsx
 * <SpinnerOverlay show={isLoading} label="Processing..." />
 * ```
 */
export interface SpinnerOverlayProps {
  /** Whether to show the overlay */
  show: boolean
  /** Spinner size */
  size?: SpinnerSize
  /** Spinner variant */
  variant?: SpinnerVariant
  /** Label text displayed below spinner */
  label?: string
  /** Screen reader label */
  srLabel?: string
  /** Background opacity */
  opacity?: 'light' | 'medium' | 'heavy'
}

const opacityStyles = {
  light: 'bg-white/50 dark:bg-gray-900/50',
  medium: 'bg-white/70 dark:bg-gray-900/70',
  heavy: 'bg-white/90 dark:bg-gray-900/90',
}

export function SpinnerOverlay({
  show,
  size = 'lg',
  variant = 'primary',
  label,
  srLabel = 'Loading...',
  opacity = 'medium',
}: SpinnerOverlayProps) {
  if (!show) {
    return null
  }

  return (
    <div
      className={cn('fixed inset-0 z-50 flex items-center justify-center', opacityStyles[opacity])}
      role="status"
      aria-label={srLabel}
    >
      <div className="flex flex-col items-center gap-4">
        <Spinner size={size} variant={variant} label={srLabel} />
        {label && <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</p>}
      </div>
    </div>
  )
}
