import { ReactNode, useState } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type AlertVariant = 'success' | 'error' | 'warning' | 'info'

export interface AlertProps {
  /** Alert variant */
  variant?: AlertVariant
  /** Alert title */
  title?: string
  /** Alert message/content */
  children?: ReactNode
  /** Show dismiss button */
  dismissible?: boolean
  /** Callback when dismissed */
  onDismiss?: () => void
  /** Custom icon */
  icon?: ReactNode
  /** Hide default icon */
  hideIcon?: boolean
  /** Additional actions/buttons */
  actions?: ReactNode
  /** Custom class name */
  className?: string
}

const variantStyles: Record<AlertVariant, string> = {
  success: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800',
  error: 'bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800',
  warning: 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800',
  info: 'bg-info-50 border-info-200 dark:bg-info-900/20 dark:border-info-800',
}

const iconVariantStyles: Record<AlertVariant, string> = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-error-600 dark:text-error-400',
  warning: 'text-warning-600 dark:text-warning-400',
  info: 'text-info-600 dark:text-info-400',
}

const textVariantStyles: Record<AlertVariant, string> = {
  success: 'text-success-900 dark:text-success-100',
  error: 'text-error-900 dark:text-error-100',
  warning: 'text-warning-900 dark:text-warning-100',
  info: 'text-info-900 dark:text-info-100',
}

const variantIcons: Record<AlertVariant, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
}

/**
 * Alert component
 *
 * A banner for displaying important messages, warnings, or notifications.
 * Use for persistent feedback that requires user attention.
 *
 * @example
 * ```tsx
 * <Alert variant="warning" title="Warning">
 *   Your session will expire in 5 minutes.
 * </Alert>
 * ```
 */
export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  hideIcon = false,
  actions,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true)
  const Icon = variantIcons[variant]

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  if (!visible) {
    return null
  }

  return (
    <div className={cn('rounded-lg border p-4', variantStyles[variant], className)} role="alert">
      <div className="flex">
        {!hideIcon && (
          <div className="flex-shrink-0">
            {icon || <Icon className={cn('h-5 w-5', iconVariantStyles[variant])} />}
          </div>
        )}

        <div className={cn('flex-1', !hideIcon && 'ml-3')}>
          {title && (
            <h3 className={cn('text-sm font-semibold', textVariantStyles[variant])}>{title}</h3>
          )}
          {children && (
            <div
              className={cn('text-sm', title && 'mt-2', textVariantStyles[variant], 'opacity-90')}
            >
              {children}
            </div>
          )}

          {actions && <div className="mt-4">{actions}</div>}
        </div>

        {dismissible && (
          <div className={cn('ml-auto', !hideIcon && 'pl-3')}>
            <button
              type="button"
              onClick={handleDismiss}
              className={cn(
                'inline-flex rounded-md p-1.5',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                'transition-colors hover:opacity-70',
                textVariantStyles[variant],
                variant === 'success' && 'focus:ring-success-500',
                variant === 'error' && 'focus:ring-error-500',
                variant === 'warning' && 'focus:ring-warning-500',
                variant === 'info' && 'focus:ring-info-500'
              )}
              aria-label="Dismiss"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
