import { HTMLAttributes } from 'react'
import { cn } from '@utils/cn'

export type ProgressVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
export type ProgressSize = 'sm' | 'md' | 'lg'

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value: number
  /** Maximum value */
  max?: number
  /** Progress variant/color */
  variant?: ProgressVariant
  /** Progress bar size */
  size?: ProgressSize
  /** Show percentage label */
  showLabel?: boolean
  /** Custom label */
  label?: string
  /** Indeterminate state (animated) */
  indeterminate?: boolean
  /** Striped background */
  striped?: boolean
  /** Animate stripes */
  animated?: boolean
}

const variantStyles: Record<ProgressVariant, string> = {
  primary: 'bg-primary-600 dark:bg-primary-500',
  secondary: 'bg-secondary-600 dark:bg-secondary-500',
  success: 'bg-success-600 dark:bg-success-500',
  warning: 'bg-warning-600 dark:bg-warning-500',
  error: 'bg-error-600 dark:bg-error-500',
  info: 'bg-info-600 dark:bg-info-500',
}

const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

/**
 * Progress component (Linear)
 *
 * A horizontal progress bar for showing completion status.
 * Use for file uploads, form completion, or any measurable progress.
 *
 * @example
 * ```tsx
 * <Progress value={65} variant="primary" showLabel />
 * <Progress value={100} variant="success" label="Complete" />
 * <Progress indeterminate variant="info" />
 * ```
 */
export function Progress({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  label,
  indeterminate = false,
  striped = false,
  animated = false,
  className,
  ...props
}: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)} {...props}>
      {(showLabel || label) && (
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {label || 'Progress'}
          </span>
          {showLabel && !indeterminate && (
            <span className="text-gray-500 dark:text-gray-400">{Math.round(percentage)}%</span>
          )}
        </div>
      )}

      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            variantStyles[variant],
            indeterminate && 'animate-progress-indeterminate',
            striped &&
              'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:20px_100%]',
            striped && animated && 'animate-progress-stripes'
          )}
          style={{
            width: indeterminate ? '30%' : `${percentage}%`,
          }}
        />
      </div>
    </div>
  )
}

/**
 * CircularProgress component
 *
 * A circular progress indicator.
 * Use for compact loading states or percentage displays.
 *
 * @example
 * ```tsx
 * <CircularProgress value={75} size="lg" showLabel />
 * <CircularProgress indeterminate size="md" />
 * ```
 */
export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value?: number
  /** Maximum value */
  max?: number
  /** Progress variant/color */
  variant?: ProgressVariant
  /** Circle size */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Show percentage label in center */
  showLabel?: boolean
  /** Indeterminate state (spinning) */
  indeterminate?: boolean
  /** Stroke width */
  strokeWidth?: number
}

const circularSizeStyles = {
  sm: { size: 40, default: 4 },
  md: { size: 60, default: 4 },
  lg: { size: 80, default: 6 },
  xl: { size: 120, default: 8 },
}

const circularVariantStyles: Record<ProgressVariant, string> = {
  primary: 'stroke-primary-600 dark:stroke-primary-500',
  secondary: 'stroke-secondary-600 dark:stroke-secondary-500',
  success: 'stroke-success-600 dark:stroke-success-500',
  warning: 'stroke-warning-600 dark:stroke-warning-500',
  error: 'stroke-error-600 dark:stroke-error-500',
  info: 'stroke-info-600 dark:stroke-info-500',
}

export function CircularProgress({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  indeterminate = false,
  strokeWidth,
  className,
  ...props
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const sizeConfig = circularSizeStyles[size]
  const actualSize = sizeConfig.size
  const actualStroke = strokeWidth ?? sizeConfig.default

  const radius = (actualSize - actualStroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: actualSize, height: actualSize }}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <svg className={cn(indeterminate && 'animate-spin')} width={actualSize} height={actualSize}>
        {/* Background circle */}
        <circle
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={actualStroke}
          fill="none"
          cx={actualSize / 2}
          cy={actualSize / 2}
          r={radius}
        />

        {/* Progress circle */}
        <circle
          className={cn('transition-all duration-300', circularVariantStyles[variant])}
          strokeWidth={actualStroke}
          strokeLinecap="round"
          fill="none"
          cx={actualSize / 2}
          cy={actualSize / 2}
          r={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: indeterminate ? circumference * 0.75 : offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
          }}
        />
      </svg>

      {showLabel && !indeterminate && (
        <span
          className="absolute text-sm font-semibold text-gray-700 dark:text-gray-300"
          style={{ fontSize: actualSize / 4 }}
        >
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}
