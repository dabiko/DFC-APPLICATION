import { Fragment, ReactNode } from 'react'
import { Transition } from '@headlessui/react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface ToastProps {
  /** Whether the toast is visible */
  show: boolean
  /** Toast variant */
  variant?: ToastVariant
  /** Toast title */
  title?: string
  /** Toast message */
  message?: ReactNode
  /** Show close button */
  dismissible?: boolean
  /** Callback when close button is clicked */
  onClose?: () => void
  /** Custom icon */
  icon?: ReactNode
  /** Hide default icon */
  hideIcon?: boolean
  /** Toast position (for positioning in ToastContainer) */
  position?: ToastPosition
  /** Duration in milliseconds (auto-dismiss) */
  duration?: number
  /** Custom class name */
  className?: string
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-success-50 border-success-500 dark:bg-success-900/20 dark:border-success-500',
  error: 'bg-error-50 border-error-500 dark:bg-error-900/20 dark:border-error-500',
  warning: 'bg-warning-50 border-warning-500 dark:bg-warning-900/20 dark:border-warning-500',
  info: 'bg-info-50 border-info-500 dark:bg-info-900/20 dark:border-info-500',
}

const iconVariantStyles: Record<ToastVariant, string> = {
  success: 'text-success-600 dark:text-success-400',
  error: 'text-error-600 dark:text-error-400',
  warning: 'text-warning-600 dark:text-warning-400',
  info: 'text-info-600 dark:text-info-400',
}

const textVariantStyles: Record<ToastVariant, string> = {
  success: 'text-success-900 dark:text-success-100',
  error: 'text-error-900 dark:text-error-100',
  warning: 'text-warning-900 dark:text-warning-100',
  info: 'text-info-900 dark:text-info-100',
}

const variantIcons: Record<ToastVariant, typeof CheckCircleIcon> = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
}

/**
 * Toast component
 *
 * A notification message that appears temporarily to provide feedback.
 * Use for success confirmations, errors, warnings, and informational messages.
 *
 * @example
 * ```tsx
 * <Toast
 *   show={showToast}
 *   variant="success"
 *   title="Success"
 *   message="Your changes have been saved."
 *   onClose={() => setShowToast(false)}
 * />
 * ```
 */
export function Toast({
  show,
  variant = 'info',
  title,
  message,
  dismissible = true,
  onClose,
  icon,
  hideIcon = false,
  className,
}: ToastProps) {
  const Icon = variantIcons[variant]

  return (
    <Transition
      show={show}
      as={Fragment}
      enter="transition-all duration-300 ease-out"
      enterFrom="opacity-0 translate-y-2"
      enterTo="opacity-100 translate-y-0"
      leave="transition-all duration-200 ease-in"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-2"
    >
      <div
        className={cn(
          'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border-l-4 shadow-lg',
          'bg-white dark:bg-gray-800',
          variantStyles[variant],
          className
        )}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="p-4">
          <div className="flex items-start">
            {!hideIcon && (
              <div className="flex-shrink-0">
                {icon || <Icon className={cn('h-6 w-6', iconVariantStyles[variant])} />}
              </div>
            )}

            <div className={cn('flex-1', !hideIcon && 'ml-3')}>
              {title && (
                <p className={cn('text-sm font-semibold', textVariantStyles[variant])}>{title}</p>
              )}
              {message && (
                <div
                  className={cn(
                    'text-sm',
                    title && 'mt-1',
                    textVariantStyles[variant],
                    'opacity-90'
                  )}
                >
                  {message}
                </div>
              )}
            </div>

            {dismissible && onClose && (
              <div className="ml-4 flex flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    'inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
                    'transition-colors hover:opacity-70',
                    textVariantStyles[variant],
                    variant === 'success' && 'focus:ring-success-500',
                    variant === 'error' && 'focus:ring-error-500',
                    variant === 'warning' && 'focus:ring-warning-500',
                    variant === 'info' && 'focus:ring-info-500'
                  )}
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Transition>
  )
}
