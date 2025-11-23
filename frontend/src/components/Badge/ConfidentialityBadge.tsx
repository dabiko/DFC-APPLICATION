import { HTMLAttributes } from 'react'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type ConfidentialityLevel = 'public' | 'internal' | 'confidential' | 'highly-confidential'

export interface ConfidentialityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Confidentiality level */
  level: ConfidentialityLevel
  /** Show lock icon */
  showIcon?: boolean
  /** Show as dot indicator instead of full badge */
  dotOnly?: boolean
}

const levelConfig: Record<
  ConfidentialityLevel,
  {
    label: string
    color: string
    dotColor: string
  }
> = {
  public: {
    label: 'Public',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-600',
  },
  internal: {
    label: 'Internal',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    dotColor: 'bg-blue-600',
  },
  confidential: {
    label: 'Confidential',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
    dotColor: 'bg-orange-600',
  },
  'highly-confidential': {
    label: 'Highly Confidential',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    dotColor: 'bg-red-600',
  },
}

/**
 * ConfidentialityBadge component
 *
 * A specialized badge for displaying document confidentiality levels
 * in the Digital Filing Cabinet application.
 *
 * Color coding follows the DFC specification:
 * - Public → Gray
 * - Internal → Blue
 * - Confidential → Orange
 * - Highly Confidential → Red
 *
 * @example
 * ```tsx
 * <ConfidentialityBadge level="public" />
 * <ConfidentialityBadge level="highly-confidential" showIcon />
 * <ConfidentialityBadge level="confidential" dotOnly />
 * ```
 */
export function ConfidentialityBadge({
  level,
  showIcon = false,
  dotOnly = false,
  className,
  ...props
}: ConfidentialityBadgeProps) {
  // Normalize the level to handle both underscore and hyphen formats
  const normalizedLevel = level?.replace(/_/g, '-') as ConfidentialityLevel
  const config = levelConfig[normalizedLevel] || levelConfig['internal'] // Default to internal if level is invalid

  if (dotOnly) {
    return (
      <span
        className={cn('inline-block h-2 w-2 rounded-full', config.dotColor, className)}
        title={config.label}
        aria-label={`Confidentiality: ${config.label}`}
        {...props}
      />
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-sm font-medium rounded-full',
        config.color,
        className
      )}
      aria-label={`Confidentiality: ${config.label}`}
      {...props}
    >
      {showIcon && <LockClosedIcon className="h-3.5 w-3.5" />}
      {config.label}
    </span>
  )
}

/**
 * Helper function to get confidentiality color for custom styling
 */
export function getConfidentialityColor(level: ConfidentialityLevel): string {
  return levelConfig[level].dotColor.replace('bg-', '')
}
