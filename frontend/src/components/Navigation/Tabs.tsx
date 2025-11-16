import { ReactNode, useState } from 'react'
import { Tab as HeadlessTab } from '@headlessui/react'
import { cn } from '@utils/cn'

export interface TabItem {
  /** Tab label */
  label: string
  /** Tab content */
  content: ReactNode
  /** Icon to display before label */
  icon?: ReactNode
  /** Badge count */
  badge?: number | string
  /** Disabled state */
  disabled?: boolean
}

export interface TabsProps {
  /** Array of tab items */
  items: TabItem[]
  /** Default selected tab index */
  defaultIndex?: number
  /** Controlled selected index */
  selectedIndex?: number
  /** Callback when tab changes */
  onChange?: (index: number) => void
  /** Tab variant */
  variant?: 'line' | 'pill' | 'enclosed'
  /** Full width tabs */
  fullWidth?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Tabs component
 *
 * Organize content into separate views with tab navigation.
 * Essential for the DFC document view (Details, Preview, Activity tabs).
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { label: 'Details', content: <DocumentDetails /> },
 *     { label: 'Preview', content: <DocumentPreview /> },
 *     { label: 'Activity', content: <ActivityLog />, badge: 5 }
 *   ]}
 * />
 * ```
 */
export function Tabs({
  items,
  defaultIndex = 0,
  selectedIndex,
  onChange,
  variant = 'line',
  fullWidth = false,
  className,
}: TabsProps) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex)
  const currentIndex = selectedIndex !== undefined ? selectedIndex : internalIndex

  const handleChange = (index: number) => {
    setInternalIndex(index)
    onChange?.(index)
  }

  return (
    <HeadlessTab.Group selectedIndex={currentIndex} onChange={handleChange}>
      <div className={cn('w-full', className)}>
        <HeadlessTab.List
          className={cn(
            'flex',
            variant === 'line' && 'border-b border-gray-200 dark:border-gray-800',
            variant === 'pill' && 'space-x-2',
            variant === 'enclosed' && 'border-b border-gray-200 dark:border-gray-800 space-x-1',
            fullWidth && 'w-full'
          )}
        >
          {items.map((item, index) => (
            <HeadlessTab
              key={index}
              disabled={item.disabled}
              className={({ selected }) =>
                cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  fullWidth && 'flex-1 justify-center',

                  // Line variant
                  variant === 'line' &&
                    cn(
                      'border-b-2',
                      selected
                        ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:border-gray-300 dark:hover:border-gray-700'
                    ),

                  // Pill variant
                  variant === 'pill' &&
                    cn(
                      'rounded-lg',
                      selected
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    ),

                  // Enclosed variant
                  variant === 'enclosed' &&
                    cn(
                      'rounded-t-lg border border-transparent -mb-px',
                      selected
                        ? 'border-gray-200 dark:border-gray-800 border-b-white dark:border-b-gray-900 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                    )
                )
              }
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-xs font-semibold rounded-full',
                    'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </HeadlessTab>
          ))}
        </HeadlessTab.List>

        <HeadlessTab.Panels className="mt-4">
          {items.map((item, index) => (
            <HeadlessTab.Panel
              key={index}
              className={cn(
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg'
              )}
            >
              {item.content}
            </HeadlessTab.Panel>
          ))}
        </HeadlessTab.Panels>
      </div>
    </HeadlessTab.Group>
  )
}
