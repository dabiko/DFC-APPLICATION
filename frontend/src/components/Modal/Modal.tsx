import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal title */
  title?: string
  /** Modal description */
  description?: string
  /** Modal content */
  children: ReactNode
  /** Footer content (typically buttons) */
  footer?: ReactNode
  /** Size variant */
  size?: ModalSize
  /** Show close button */
  showCloseButton?: boolean
  /** Close on overlay click */
  closeOnOverlayClick?: boolean
  /** Custom className for content */
  className?: string
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full m-4',
}

/**
 * Modal component
 *
 * An accessible modal dialog built with Headless UI.
 * Supports various sizes, custom content, and footer actions.
 *
 * @example
 * ```tsx
 * <Modal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Profile"
 *   footer={
 *     <>
 *       <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <p>Modal content goes here...</p>
 * </Modal>
 * ```
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className,
}: ModalProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-modal"
        onClose={closeOnOverlayClick ? onClose : () => {}}
      >
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
                  'w-full transform overflow-hidden rounded-lg',
                  'bg-white dark:bg-gray-900',
                  'shadow-xl transition-all',
                  'border border-gray-200 dark:border-gray-800',
                  sizeStyles[size],
                  className
                )}
              >
                {/* Header */}
                {(title || description || showCloseButton) && (
                  <div className="relative px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                    {showCloseButton && (
                      <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        aria-label="Close modal"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    )}

                    {title && (
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">
                        {title}
                      </Dialog.Title>
                    )}

                    {description && (
                      <Dialog.Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="px-6 py-4">{children}</div>

                {/* Footer */}
                {footer && (
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                    {footer}
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
