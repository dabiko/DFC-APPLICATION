import { ReactNode } from 'react'
import { Checkbox } from '@components/Checkbox'
import { cn } from '@utils/cn'

export interface GridViewItem {
  /** Unique item identifier */
  id: string
  /** Item title */
  title: string
  /** Item icon or thumbnail */
  icon?: ReactNode
  /** Subtitle or metadata */
  subtitle?: string
  /** Badge or status */
  badge?: ReactNode
  /** Disabled state */
  disabled?: boolean
  /** Custom metadata */
  metadata?: Record<string, any>
}

export interface GridViewProps {
  /** Grid items */
  items: GridViewItem[]
  /** Enable item selection */
  selectable?: boolean
  /** Selected item IDs */
  selectedIds?: string[]
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[]) => void
  /** Callback when item is clicked */
  onItemClick?: (item: GridViewItem) => void
  /** Number of columns */
  columns?: 2 | 3 | 4 | 5 | 6
  /** Item size */
  size?: 'sm' | 'md' | 'lg'
  /** Enable hover effect */
  hoverable?: boolean
  /** Loading state */
  loading?: boolean
  /** Empty state message */
  emptyMessage?: string
  /** Custom class name */
  className?: string
}

const columnClasses = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
}

const sizeClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
}

/**
 * GridView component
 *
 * Display items in a responsive grid layout.
 * Useful for displaying folders and files with icons.
 *
 * @example
 * ```tsx
 * <GridView
 *   items={folders.map(folder => ({
 *     id: folder.id,
 *     title: folder.name,
 *     icon: <FolderIcon className="h-12 w-12" />,
 *     subtitle: `${folder.count} items`
 *   }))}
 *   columns={4}
 *   selectable
 *   onItemClick={(item) => openFolder(item.id)}
 * />
 * ```
 */
export function GridView({
  items,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onItemClick,
  columns = 4,
  size = 'md',
  hoverable = true,
  loading = false,
  emptyMessage = 'No items to display',
  className,
}: GridViewProps) {
  const selectedIdsSet = new Set(selectedIds)

  const handleSelectItem = (itemId: string, event: React.MouseEvent) => {
    event.stopPropagation()
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
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {items.map((item) => {
        const isSelected = selectedIdsSet.has(item.id)

        return (
          <div
            key={item.id}
            onClick={() => !item.disabled && onItemClick?.(item)}
            className={cn(
              'relative flex flex-col items-center text-center rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all',
              sizeClasses[size],
              hoverable &&
                !item.disabled &&
                'hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md',
              isSelected &&
                'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500',
              onItemClick && !item.disabled && 'cursor-pointer',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {selectable && (
              <div
                className="absolute top-2 left-2 z-10"
                onClick={(e) => !item.disabled && handleSelectItem(item.id, e)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={item.disabled}
                  aria-label={`Select ${item.title}`}
                  onChange={() => {}}
                />
              </div>
            )}

            {item.badge && <div className="absolute top-2 right-2">{item.badge}</div>}

            {item.icon && (
              <div className={cn('text-gray-600 dark:text-gray-400 mb-2', iconSizes[size])}>
                {item.icon}
              </div>
            )}

            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate w-full px-1">
              {item.title}
            </p>

            {item.subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-full px-1 mt-1">
                {item.subtitle}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
