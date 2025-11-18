import { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@utils/cn'

export interface HorizontalMenuItemProps {
  /** Item label */
  label: string
  /** Item icon */
  icon?: ReactNode
  /** Link path (if using router) */
  to?: string
  /** Click handler (if not using router) */
  onClick?: () => void
  /** Badge count */
  badge?: number
  /** Is item active */
  active?: boolean
  /** Is item disabled */
  disabled?: boolean
  /** Custom class name */
  className?: string
}

export interface HorizontalMenuProps {
  /** Menu items */
  items: HorizontalMenuItemProps[]
  /** Menu variant */
  variant?: 'default' | 'pills' | 'underline'
  /** Menu size */
  size?: 'sm' | 'md' | 'lg'
  /** Active item ID */
  activeItem?: string
  /** Center align items */
  centered?: boolean
  /** Full width items (distribute evenly) */
  fullWidth?: boolean
  /** Custom class name */
  className?: string
}

/**
 * HorizontalMenu component
 *
 * A horizontal navigation menu with support for icons, badges, and multiple variants.
 *
 * @example
 * ```tsx
 * <HorizontalMenu
 *   items={[
 *     { label: 'Dashboard', icon: <HomeIcon />, to: '/' },
 *     { label: 'Documents', icon: <DocumentIcon />, to: '/documents', badge: 5 },
 *   ]}
 *   variant="underline"
 * />
 * ```
 */
export function HorizontalMenu({
  items,
  variant = 'default',
  size = 'md',
  centered = false,
  fullWidth = false,
  className,
}: HorizontalMenuProps) {
  const sizeClasses = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-2.5',
    lg: 'text-lg px-5 py-3',
  }

  const getItemClasses = (item: HorizontalMenuItemProps, isActive: boolean) => {
    const baseClasses = cn(
      'inline-flex items-center gap-2 font-medium transition-colors',
      sizeClasses[size],
      item.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
    )

    switch (variant) {
      case 'pills':
        return cn(
          baseClasses,
          'rounded-lg',
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        )

      case 'underline':
        return cn(
          baseClasses,
          'border-b-2 transition-all',
          isActive
            ? 'border-primary-600 dark:border-primary-400 text-primary-700 dark:text-primary-300'
            : 'border-transparent text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:text-gray-900 dark:hover:text-gray-100'
        )

      default:
        return cn(
          baseClasses,
          isActive
            ? 'text-primary-700 dark:text-primary-300 bg-gray-50 dark:bg-gray-800'
            : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
        )
    }
  }

  const renderItem = (item: HorizontalMenuItemProps, index: number) => {
    const isActive = item.active || false
    const itemClasses = getItemClasses(item, isActive)

    const content = (
      <>
        {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
        <span className={fullWidth ? 'flex-1 text-center' : ''}>{item.label}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold rounded-full',
              isActive
                ? 'bg-primary-600 dark:bg-primary-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            )}
          >
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </>
    )

    if (item.to) {
      return (
        <NavLink
          key={index}
          to={item.to}
          className={({ isActive: navIsActive }) =>
            cn(itemClasses, item.className, fullWidth && 'flex-1')
          }
          aria-current={isActive ? 'page' : undefined}
        >
          {content}
        </NavLink>
      )
    }

    return (
      <button
        key={index}
        onClick={item.onClick}
        className={cn(itemClasses, item.className, fullWidth && 'flex-1')}
        disabled={item.disabled}
        aria-current={isActive ? 'page' : undefined}
        type="button"
      >
        {content}
      </button>
    )
  }

  return (
    <nav
      className={cn(
        'flex overflow-x-auto',
        centered && 'justify-center',
        fullWidth && 'justify-stretch',
        variant === 'underline' && 'border-b border-gray-200 dark:border-gray-700',
        className
      )}
      role="navigation"
    >
      <div
        className={cn(
          'flex',
          fullWidth && 'w-full',
          variant === 'default' && 'gap-1',
          variant === 'pills' && 'gap-2'
        )}
      >
        {items.map((item, index) => renderItem(item, index))}
      </div>
    </nav>
  )
}

/**
 * HorizontalMenuDivider component
 *
 * Visual separator for menu items
 */
export function HorizontalMenuDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn('w-px bg-gray-200 dark:bg-gray-700 my-2', className)}
      role="separator"
      aria-orientation="vertical"
    />
  )
}
