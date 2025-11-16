import { ReactNode, useState } from 'react'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface ThreePanelLayoutProps {
  /** Left panel content (navigation) */
  leftPanel: ReactNode
  /** Center panel content (main content) */
  centerPanel: ReactNode
  /** Right panel content (details) */
  rightPanel?: ReactNode
  /** Header content */
  header?: ReactNode
  /** Left panel default width */
  leftPanelWidth?: string
  /** Right panel default width */
  rightPanelWidth?: string
  /** Allow left panel to be collapsed */
  collapsibleLeft?: boolean
  /** Allow right panel to be collapsed */
  collapsibleRight?: boolean
  /** Default left panel collapsed state */
  defaultLeftCollapsed?: boolean
  /** Default right panel collapsed state */
  defaultRightCollapsed?: boolean
  /** Show mobile menu button */
  showMobileMenu?: boolean
  /** Custom class name */
  className?: string
}

/**
 * ThreePanelLayout component
 *
 * The main layout for the DFC application with left navigation,
 * center content area, and right details panel.
 *
 * @example
 * ```tsx
 * <ThreePanelLayout
 *   leftPanel={<FolderTree />}
 *   centerPanel={<DocumentList />}
 *   rightPanel={<DocumentDetails />}
 *   header={<AppHeader />}
 * />
 * ```
 */
export function ThreePanelLayout({
  leftPanel,
  centerPanel,
  rightPanel,
  header,
  leftPanelWidth = '280px',
  rightPanelWidth = '360px',
  collapsibleLeft = true,
  collapsibleRight = true,
  defaultLeftCollapsed = false,
  defaultRightCollapsed = false,
  showMobileMenu = true,
  className,
}: ThreePanelLayoutProps) {
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(defaultLeftCollapsed)
  const [isRightCollapsed, setIsRightCollapsed] = useState(defaultRightCollapsed)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className={cn('flex flex-col h-screen bg-gray-50 dark:bg-gray-950', className)}>
      {/* Header */}
      {header && (
        <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          {header}
        </header>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Desktop */}
        {!isLeftCollapsed && (
          <aside
            className={cn(
              'hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
              'overflow-hidden'
            )}
            style={{ width: leftPanelWidth }}
          >
            <div className="flex-1 overflow-y-auto">{leftPanel}</div>

            {collapsibleLeft && (
              <button
                onClick={() => setIsLeftCollapsed(true)}
                className="flex items-center justify-center h-10 border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Collapse left panel"
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-500" />
              </button>
            )}
          </aside>
        )}

        {/* Left Panel Collapsed - Desktop */}
        {isLeftCollapsed && collapsibleLeft && (
          <aside className="hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 w-12">
            <button
              onClick={() => setIsLeftCollapsed(false)}
              className="flex items-center justify-center h-10 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Expand left panel"
            >
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            </button>
          </aside>
        )}

        {/* Left Panel - Mobile */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer */}
            <aside className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-gray-900 z-50 lg:hidden flex flex-col">
              <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{leftPanel}</div>
            </aside>
          </>
        )}

        {/* Center Panel */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
          {/* Mobile menu button */}
          {showMobileMenu && (
            <div className="lg:hidden flex items-center px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">{centerPanel}</div>
        </main>

        {/* Right Panel - Desktop */}
        {rightPanel && !isRightCollapsed && (
          <aside
            className={cn(
              'hidden xl:flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-all duration-300',
              'overflow-hidden'
            )}
            style={{ width: rightPanelWidth }}
          >
            {collapsibleRight && (
              <button
                onClick={() => setIsRightCollapsed(true)}
                className="flex items-center justify-center h-10 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                aria-label="Collapse right panel"
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              </button>
            )}

            <div className="flex-1 overflow-y-auto">{rightPanel}</div>
          </aside>
        )}

        {/* Right Panel Collapsed - Desktop */}
        {rightPanel && isRightCollapsed && collapsibleRight && (
          <aside className="hidden xl:flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 w-12">
            <button
              onClick={() => setIsRightCollapsed(false)}
              className="flex items-center justify-center h-10 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              aria-label="Expand right panel"
            >
              <ChevronLeftIcon className="h-4 w-4 text-gray-500" />
            </button>
          </aside>
        )}
      </div>
    </div>
  )
}

/**
 * Predefined panel components for common use cases
 */

export interface PanelHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function PanelHeader({ title, subtitle, action, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

export interface PanelContentProps {
  children: ReactNode
  padding?: boolean
  className?: string
}

export function PanelContent({ children, padding = true, className }: PanelContentProps) {
  return <div className={cn('flex-1 overflow-y-auto', padding && 'p-4', className)}>{children}</div>
}

export interface PanelFooterProps {
  children: ReactNode
  className?: string
}

export function PanelFooter({ children, className }: PanelFooterProps) {
  return (
    <div
      className={cn(
        'flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800',
        className
      )}
    >
      {children}
    </div>
  )
}
