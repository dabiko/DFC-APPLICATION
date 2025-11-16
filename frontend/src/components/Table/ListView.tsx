import { ReactNode } from 'react'
import { Checkbox } from '@components/Checkbox'
import { cn } from '@utils/cn'

export interface ListViewItem {
  /** Unique item identifier */
  id: string
  /** Primary text */
  title: string
  /** Secondary text */
  subtitle?: string
  /** Left icon or avatar */
  leading?: ReactNode
  /** Right content (actions, metadata, etc.) */
  trailing?: ReactNode
  /** Badge or status indicator */
  badge?: ReactNode
  /** Disabled state */
  disabled?: boolean
  /** Custom metadata */
  metadata?: Record<string, any>
}

export interface ListViewProps {
  /** List items */
  items: ListViewItem[]
  /** Enable item selection */
  selectable?: boolean
  /** Selected item IDs */
  selectedIds?: string[]
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Callback when item is clicked */
  onItemClick?: (item: ListViewItem) => void
  /** Show dividers between items */
  divided?: boolean
  /** Dense padding */
  dense?: boolean
  /** Enable hover effect */
  hoverable?: boolean
  /** Loading state */
  loading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Custom class name */
  className?: string
}

/**
 * ListView component
 *
 * A list of items with title, subtitle, and optional leading/trailing content.
 * Alternative to Table for more compact display.
 *
 * @example
 * ```tsx
 * <ListView
 *   items={documents.map(doc => ({
 *     id: doc.id,
 *     title: doc.name,
 *     subtitle: doc.date,
 *     leading: <DocumentIcon />,
 *     trailing: <ConfidentialityBadge level={doc.level} />
 *   }))}
 *   selectable
 *   onItemClick={(item) => openDocument(item.id)}
 * />
 * ```
 */
export function ListView({
  items,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onItemClick,
  divided = true,
  dense = false,
  hoverable = true,
  loading = false,
  emptyMessage = 'No items to display',
  className,
}: ListViewProps) {
  const selectedIdsSet = new Set(selectedIds)

  const handleSelectItem = (itemId: string) => {
    const newSelectedIds = new Set(selectedIds)

    if (newSelectedIds.has(itemId)) {
      newSelectedIds.delete(itemId)
    } else {
      newSelectedIds.add(itemId)
    }

    onSelectionChange?.(Array.from(newSelectedIds))
  }

  if (loading) {
    return (
      <div
        className={cn('w-full rounded-lg border border-gray-200 dark:border-gray-800', className)}
      >
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className={cn('w-full rounded-lg border border-gray-200 dark:border-gray-800', className)}
      >
        <div className="p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('w-full rounded-lg border border-gray-200 dark:border-gray-800', className)}>
      <ul
        className={cn(
          'bg-white dark:bg-gray-900',
          divided && 'divide-y divide-gray-200 dark:divide-gray-800'
        )}
      >
        {items.map((item) => {
          const isSelected = selectedIdsSet.has(item.id)

          return (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-3 transition-colors',
                dense ? 'px-3 py-2' : 'px-4 py-3',
                hoverable && !item.disabled && 'hover:bg-gray-50 dark:hover:bg-gray-800',
                isSelected && 'bg-primary-50 dark:bg-primary-900/20',
                onItemClick && !item.disabled && 'cursor-pointer',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              onClick={() => !item.disabled && onItemClick?.(item)}
            >
              {selectable && (
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isSelected}
                    onChange={() => handleSelectItem(item.id)}
                    disabled={item.disabled}
                    aria-label={`Select ${item.title}`}
                  />
                </div>
              )}

              {item.leading && (
                <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">{item.leading}</div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {item.title}
                  </p>
                  {item.badge}
                </div>

                {item.subtitle && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {item.subtitle}
                  </p>
                )}
              </div>

              {item.trailing && <div className="flex-shrink-0">{item.trailing}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
