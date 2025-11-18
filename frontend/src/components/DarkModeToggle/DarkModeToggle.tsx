import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'
import { useDarkMode } from '@hooks/useDarkMode'
import { cn } from '@utils/cn'

export interface DarkModeToggleProps {
  /** Show labels for each option */
  showLabels?: boolean
  /** Toggle variant */
  variant?: 'icon' | 'button' | 'select'
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Custom class name */
  className?: string
}

/**
 * DarkModeToggle component
 *
 * Provides a UI control for switching between light, dark, and system themes.
 *
 * @example
 * ```tsx
 * // Icon toggle (simple)
 * <DarkModeToggle variant="icon" />
 *
 * // Button group with labels
 * <DarkModeToggle variant="button" showLabels />
 *
 * // Dropdown select
 * <DarkModeToggle variant="select" />
 * ```
 */
export function DarkModeToggle({
  showLabels = false,
  variant = 'icon',
  size = 'md',
  className,
}: DarkModeToggleProps) {
  const { theme, setTheme, toggleTheme } = useDarkMode()

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const buttonSizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-sm',
    lg: 'p-2.5 text-base',
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={cn(
          'rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors',
          buttonSizeClasses[size],
          className
        )}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        <SunIcon className={cn('dark:hidden', sizeClasses[size])} />
        <MoonIcon className={cn('hidden dark:block', sizeClasses[size])} />
      </button>
    )
  }

  if (variant === 'button') {
    return (
      <div
        className={cn(
          'inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-1',
          className
        )}
        role="group"
        aria-label="Theme selector"
      >
        <button
          onClick={() => setTheme('light')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            theme === 'light'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          aria-label="Light mode"
        >
          <SunIcon className={cn(sizeClasses[size])} />
          {showLabels && <span>Light</span>}
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            theme === 'dark'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          aria-label="Dark mode"
        >
          <MoonIcon className={cn(sizeClasses[size])} />
          {showLabels && <span>Dark</span>}
        </button>

        <button
          onClick={() => setTheme('system')}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            theme === 'system'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          )}
          aria-label="System theme"
        >
          <ComputerDesktopIcon className={cn(sizeClasses[size])} />
          {showLabels && <span>System</span>}
        </button>
      </div>
    )
  }

  if (variant === 'select') {
    return (
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
        className={cn(
          'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm',
          'text-gray-900 dark:text-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-primary-500',
          className
        )}
        aria-label="Select theme"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    )
  }

  return null
}
