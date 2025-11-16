import { HTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from '@utils/cn'

export type CardVariant = 'default' | 'outlined' | 'elevated'
export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant */
  variant?: CardVariant
  /** Padding size */
  padding?: CardPadding
  /** Make card clickable */
  clickable?: boolean
  /** Callback when card is clicked (only if clickable) */
  onCardClick?: () => void
  /** Disabled state (for clickable cards) */
  disabled?: boolean
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
  outlined: 'bg-transparent border-2 border-gray-300 dark:border-gray-700',
  elevated: 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg',
}

const paddingStyles: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/**
 * Card component
 *
 * A versatile container component for grouping related content.
 * Supports different variants, padding sizes, and clickable states.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader title="Card Title" />
 *   <CardContent>Card content goes here</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      padding = 'md',
      clickable = false,
      onCardClick,
      disabled = false,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const Component = clickable ? 'button' : 'div'

    return (
      <Component
        ref={ref as any}
        onClick={clickable && !disabled ? onCardClick : undefined}
        disabled={clickable ? disabled : undefined}
        className={cn(
          'rounded-lg transition-colors',
          variantStyles[variant],
          paddingStyles[padding],
          clickable && [
            'cursor-pointer text-left w-full',
            'hover:border-primary-500 dark:hover:border-primary-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            disabled && 'opacity-50 cursor-not-allowed',
          ],
          className
        )}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

/**
 * CardHeader component
 *
 * Header section of a card, typically containing title and optional actions.
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string
  /** Subtitle text */
  subtitle?: string
  /** Action elements (typically buttons or icons) */
  action?: ReactNode
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        )}
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        {children}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}

/**
 * CardContent component
 *
 * Main content area of a card.
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}

export function CardContent({ className, children, ...props }: CardContentProps) {
  return (
    <div className={cn('text-gray-600 dark:text-gray-400', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * CardFooter component
 *
 * Footer section of a card, typically containing actions or additional info.
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Align content to the end (right) */
  alignEnd?: boolean
}

export function CardFooter({ alignEnd = false, className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        alignEnd ? 'justify-end' : 'justify-start',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CardImage component
 *
 * Image section for a card, typically at the top.
 */
export interface CardImageProps extends HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src: string
  /** Image alt text */
  alt: string
  /** Image aspect ratio */
  aspectRatio?: '1/1' | '16/9' | '4/3' | '3/2'
}

export function CardImage({ src, alt, aspectRatio = '16/9', className, ...props }: CardImageProps) {
  const aspectRatioStyles = {
    '1/1': 'aspect-square',
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
  }

  return (
    <div className={cn('overflow-hidden', className)} {...props}>
      <img
        src={src}
        alt={alt}
        className={cn('w-full h-full object-cover', aspectRatioStyles[aspectRatio])}
      />
    </div>
  )
}

/**
 * CardDivider component
 *
 * Visual divider between card sections.
 */
export interface CardDividerProps extends HTMLAttributes<HTMLHRElement> {}

export function CardDivider({ className, ...props }: CardDividerProps) {
  return (
    <hr className={cn('border-t border-gray-200 dark:border-gray-800', className)} {...props} />
  )
}
