/**
 * DateRangeFilter Component
 *
 * Allows users to filter dashboard data by predefined time ranges.
 */

import { cn } from '@utils/cn'
import type { DateRange } from '@/services/dashboardService'

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

const ranges: Array<{ value: DateRange; label: string }> = [
  { value: '1d', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
]

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-0.5">
      {ranges.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
            value === range.value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
