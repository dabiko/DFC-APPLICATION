/**
 * ProcedureStatusBadge — Color-coded lifecycle state badge.
 */

import { cn } from '@/utils/cn'
import type { ProcedureState } from '@/types/procedure'

interface ProcedureStatusBadgeProps {
  state: ProcedureState
  className?: string
}

const stateConfig: Record<string, { label: string; colors: string }> = {
  draft: {
    label: 'Draft',
    colors: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  },
  in_review: {
    label: 'In Review',
    colors: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  approved: {
    label: 'Approved',
    colors: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  },
  published: {
    label: 'Published',
    colors: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  retired: {
    label: 'Retired',
    colors: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
}

export function ProcedureStatusBadge({ state, className }: ProcedureStatusBadgeProps) {
  const config = stateConfig[state] || stateConfig.draft

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.colors,
        className
      )}
    >
      {config.label}
    </span>
  )
}
