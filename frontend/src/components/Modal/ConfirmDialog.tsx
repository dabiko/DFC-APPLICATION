import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Button } from '@components/Button'
import { ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info'

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when confirmed */
  onConfirm: () => void
  /** Dialog title */
  title: string
  /** Dialog message */
  message: string | ReactNode
  /** Variant (determines color and icon) */
  variant?: ConfirmDialogVariant
  /** Confirm button text */
  confirmText?: string
  /** Cancel button text */
  cancelText?: string
  /** Show loading state on confirm button */
  loading?: boolean
}

const variantConfig: Record<
  ConfirmDialogVariant,
  {
    icon: typeof ExclamationTriangleIcon
    iconColor: string
    confirmVariant: 'primary' | 'danger'
  }
> = {
  danger: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-error-600 dark:text-error-400',
    confirmVariant: 'danger',
  },
  warning: {
    icon: ExclamationTriangleIcon,
    iconColor: 'text-warning-600 dark:text-warning-400',
    confirmVariant: 'primary',
  },
  info: {
    icon: InformationCircleIcon,
    iconColor: 'text-primary-600 dark:text-primary-400',
    confirmVariant: 'primary',
  },
}

/**
 * ConfirmDialog component
 *
 * A specialized modal for confirmation dialogs.
 * Commonly used for destructive actions or important decisions.
 * Renders at z-[60] to appear above side panels and other z-50 elements.
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Document"
 *   message="Are you sure you want to delete this document? This action cannot be undone."
 *   variant="danger"
 *   confirmText="Delete"
 * />
 * ```
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  variant = 'info',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  loading = false,
}: ConfirmDialogProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={loading ? () => {} : onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Full-screen container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  'w-full max-w-sm transform overflow-hidden rounded-lg',
                  'bg-white dark:bg-gray-900',
                  'shadow-xl transition-all',
                  'border border-gray-200 dark:border-gray-800',
                  'px-6 py-4'
                )}
              >
                <div className="flex gap-4">
                  <div
                    className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                      variant === 'danger' && 'bg-error-100 dark:bg-error-900/20',
                      variant === 'warning' && 'bg-warning-100 dark:bg-warning-900/20',
                      variant === 'info' && 'bg-primary-100 dark:bg-primary-900/20'
                    )}
                  >
                    <Icon className={cn('h-6 w-6', config.iconColor)} />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {title}
                    </h3>
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</div>

                    <div className="mt-6 flex gap-3 justify-end">
                      <Button variant="ghost" onClick={onClose} disabled={loading}>
                        {cancelText}
                      </Button>
                      <Button
                        variant={config.confirmVariant}
                        onClick={handleConfirm}
                        loading={loading}
                        disabled={loading}
                      >
                        {confirmText}
                      </Button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
