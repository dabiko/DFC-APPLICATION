import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export type DrawerPosition = 'left' | 'right'
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl'

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean
  /** Callback when drawer should close */
  onClose: () => void
  /** Drawer title */
  title?: string
  /** Drawer description */
  description?: string
  /** Drawer content */
  children: ReactNode
  /** Footer content (typically buttons) */
  footer?: ReactNode
  /** Position (left or right side) */
  position?: DrawerPosition
  /** Size variant */
  size?: DrawerSize
  /** Show close button */
  showCloseButton?: boolean
  /** Close on overlay click */
  closeOnOverlayClick?: boolean
}

const sizeStyles: Record<DrawerSize, string> = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
}

/**
 * Drawer component
 *
 * A side panel that slides in from the left or right.
 * Perfect for forms, filters, or additional content without leaving the page.
 *
 * @example
 * ```tsx
 * <Drawer
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Filters"
 *   position="right"
 *   size="md"
 * >
 *   <div>Filter options...</div>
 * </Drawer>
 * ```
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
}: DrawerProps) {
  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={closeOnOverlayClick ? onClose : () => {}}>
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

        {/* Drawer panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className={cn('absolute inset-0 overflow-hidden')}>
            <div
              className={cn(
                'pointer-events-none fixed inset-y-0 flex max-w-full',
                position === 'right' ? 'right-0 pl-10' : 'left-0 pr-10'
              )}
            >
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom={position === 'right' ? 'translate-x-full' : '-translate-x-full'}
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo={position === 'right' ? 'translate-x-full' : '-translate-x-full'}
              >
                <Dialog.Panel className={cn('pointer-events-auto w-screen', sizeStyles[size])}>
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-800">
                    {/* Header */}
                    {(title || description || showCloseButton) && (
                      <div className="relative px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-800">
                        {showCloseButton && (
                          <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            aria-label="Close drawer"
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
                    <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

                    {/* Footer */}
                    {footer && (
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
                        {footer}
                      </div>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
