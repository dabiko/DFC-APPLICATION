import { HTMLAttributes } from 'react'
import { cn } from '@utils/cn'

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'rounded'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant */
  variant?: SkeletonVariant
  /** Width (CSS value or number for px) */
  width?: string | number
  /** Height (CSS value or number for px) */
  height?: string | number
  /** Disable animation */
  animation?: boolean
}

const variantStyles: Record<SkeletonVariant, string> = {
  text: 'rounded h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-lg',
}

/**
 * Skeleton component
 *
 * A placeholder for content that is loading.
 * Use to improve perceived performance by showing the structure of content before it loads.
 *
 * @example
 * ```tsx
 * <Skeleton variant="text" width="100%" />
 * <Skeleton variant="circular" width={40} height={40} />
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * ```
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  const computedStyle = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-700',
        animation && 'animate-pulse',
        variantStyles[variant],
        className
      )}
      style={computedStyle}
      {...props}
    />
  )
}

/**
 * SkeletonText component
 *
 * A skeleton for text content with multiple lines.
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * ```
 */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number
  /** Gap between lines */
  spacing?: string | number
  /** Last line width (percentage or CSS value) */
  lastLineWidth?: string | number
  /** Disable animation */
  animation?: boolean
  /** Custom class name */
  className?: string
}

export function SkeletonText({
  lines = 3,
  spacing = 8,
  lastLineWidth = '60%',
  animation = true,
  className,
}: SkeletonTextProps) {
  const gap = typeof spacing === 'number' ? `${spacing}px` : spacing
  const computedLastLineWidth =
    typeof lastLineWidth === 'number' ? `${lastLineWidth}px` : lastLineWidth

  return (
    <div className={cn('space-y-2', className)} style={{ gap }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          animation={animation}
          width={index === lines - 1 ? computedLastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

/**
 * SkeletonCard component
 *
 * A pre-built skeleton for card layouts.
 *
 * @example
 * ```tsx
 * <SkeletonCard />
 * <SkeletonCard showImage={false} />
 * ```
 */
export interface SkeletonCardProps {
  /** Show image skeleton */
  showImage?: boolean
  /** Show avatar skeleton */
  showAvatar?: boolean
  /** Number of text lines */
  textLines?: number
  /** Show action buttons */
  showActions?: boolean
  /** Disable animation */
  animation?: boolean
  /** Custom class name */
  className?: string
}

export function SkeletonCard({
  showImage = true,
  showAvatar = false,
  textLines = 3,
  showActions = true,
  animation = true,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4',
        className
      )}
    >
      {showImage && (
        <Skeleton
          variant="rectangular"
          height={200}
          animation={animation}
          className="mb-4 rounded-lg"
        />
      )}

      <div className="space-y-4">
        {showAvatar && (
          <div className="flex items-center gap-3">
            <Skeleton variant="circular" width={40} height={40} animation={animation} />
            <div className="flex-1">
              <Skeleton variant="text" width="40%" animation={animation} />
              <Skeleton variant="text" width="30%" animation={animation} className="mt-2" />
            </div>
          </div>
        )}

        <div>
          <Skeleton variant="text" width="60%" height={24} animation={animation} className="mb-3" />
          <SkeletonText lines={textLines} animation={animation} />
        </div>

        {showActions && (
          <div className="flex gap-2 pt-2">
            <Skeleton variant="rounded" width={80} height={36} animation={animation} />
            <Skeleton variant="rounded" width={80} height={36} animation={animation} />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * SkeletonList component
 *
 * A skeleton for list items.
 *
 * @example
 * ```tsx
 * <SkeletonList items={5} />
 * ```
 */
export interface SkeletonListProps {
  /** Number of list items */
  items?: number
  /** Show avatar */
  showAvatar?: boolean
  /** Disable animation */
  animation?: boolean
  /** Custom class name */
  className?: string
}

export function SkeletonList({
  items = 3,
  showAvatar = true,
  animation = true,
  className,
}: SkeletonListProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-800"
        >
          {showAvatar && (
            <Skeleton variant="circular" width={48} height={48} animation={animation} />
          )}
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="70%" animation={animation} />
            <Skeleton variant="text" width="40%" animation={animation} />
          </div>
        </div>
      ))}
    </div>
  )
}
