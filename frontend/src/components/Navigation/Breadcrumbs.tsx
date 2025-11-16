import React, { Fragment, ReactNode } from 'react'
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'

export interface BreadcrumbItem {
  /** Label to display */
  label: string
  /** URL to navigate to (optional for current page) */
  href?: string
  /** Custom icon */
  icon?: ReactNode
  /** Callback when clicked (instead of href) */
  onClick?: () => void
}

export interface BreadcrumbsProps {
  /** Array of breadcrumb items */
  items: BreadcrumbItem[]
  /** Show home icon for first item */
  showHomeIcon?: boolean
  /** Custom separator */
  separator?: ReactNode
  /** Maximum items to show (will collapse middle items) */
  maxItems?: number
  /** Custom class name */
  className?: string
}

/**
 * Breadcrumbs component
 *
 * Navigation aid that shows the current location within a hierarchy.
 * Essential for the DFC folder navigation system.
 *
 * @example
 * ```tsx
 * <Breadcrumbs
 *   items={[
 *     { label: 'Home', href: '/' },
 *     { label: 'Documents', href: '/documents' },
 *     { label: 'Financial Reports', href: '/documents/financial' },
 *     { label: 'Q4 2024' }
 *   ]}
 * />
 * ```
 */
export function Breadcrumbs({
  items,
  showHomeIcon = true,
  separator = <ChevronRightIcon className="h-4 w-4" />,
  maxItems,
  className,
}: BreadcrumbsProps) {
  // Collapse breadcrumbs if maxItems is set
  const displayItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items
    }

    const firstItem = items[0]
    const lastItems = items.slice(-(maxItems - 1))

    return [firstItem, { label: '...', onClick: undefined, href: undefined }, ...lastItems]
  }, [items, maxItems])

  return (
    <nav aria-label="Breadcrumb" className={cn('flex', className)}>
      <ol className="flex items-center space-x-2">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1
          const isCollapsed = item.label === '...'

          return (
            <Fragment key={index}>
              <li className="flex items-center">
                {isCollapsed ? (
                  <span className="text-gray-500 dark:text-gray-400 px-1">...</span>
                ) : (
                  <BreadcrumbLink
                    item={item}
                    isFirst={index === 0}
                    isLast={isLast}
                    showHomeIcon={showHomeIcon}
                  />
                )}
              </li>

              {!isLast && (
                <li
                  className="flex items-center text-gray-400 dark:text-gray-600"
                  aria-hidden="true"
                >
                  {separator}
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

interface BreadcrumbLinkProps {
  item: BreadcrumbItem
  isFirst: boolean
  isLast: boolean
  showHomeIcon: boolean
}

function BreadcrumbLink({ item, isFirst, isLast, showHomeIcon }: BreadcrumbLinkProps) {
  const content = (
    <>
      {isFirst && showHomeIcon && item.icon === undefined ? (
        <HomeIcon className="h-4 w-4 mr-1" />
      ) : (
        item.icon && <span className="mr-1">{item.icon}</span>
      )}
      <span>{item.label}</span>
    </>
  )

  const baseClasses = cn(
    'flex items-center text-sm font-medium transition-colors',
    isLast
      ? 'text-gray-900 dark:text-gray-100 cursor-default'
      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
  )

  if (isLast) {
    return (
      <span className={baseClasses} aria-current="page">
        {content}
      </span>
    )
  }

  if (item.onClick) {
    return (
      <button type="button" onClick={item.onClick} className={baseClasses}>
        {content}
      </button>
    )
  }

  if (item.href) {
    return (
      <a href={item.href} className={baseClasses}>
        {content}
      </a>
    )
  }

  return <span className={baseClasses}>{content}</span>
}
