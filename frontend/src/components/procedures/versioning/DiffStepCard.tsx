/**
 * DiffStepCard — Step-level diff card showing added/removed/modified status.
 */

import { Plus, Minus, RefreshCw } from 'lucide-react'
import { DiffFieldHighlight } from './DiffFieldHighlight'
import type { StepChange } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface DiffStepCardProps {
  change: StepChange
}

export function DiffStepCard({ change }: DiffStepCardProps) {
  const icon =
    change.type === 'added' ? (
      <Plus className="h-4 w-4" />
    ) : change.type === 'removed' ? (
      <Minus className="h-4 w-4" />
    ) : (
      <RefreshCw className="h-4 w-4" />
    )

  const colors = {
    added: 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10',
    removed: 'border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10',
    modified: 'border-yellow-300 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10',
  }

  const iconColors = {
    added: 'text-green-600 dark:text-green-400',
    removed: 'text-red-600 dark:text-red-400',
    modified: 'text-yellow-600 dark:text-yellow-400',
  }

  const labels = {
    added: 'Added',
    removed: 'Removed',
    modified: 'Modified',
  }

  return (
    <div className={cn('rounded-lg border p-4', colors[change.type])}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColors[change.type]}>{icon}</span>
        <span className="text-xs font-bold text-gray-400">Step {change.step_order}</span>
        <span className={cn('text-xs font-medium', iconColors[change.type])}>
          {labels[change.type]}
        </span>
        {change.step_data?.title && (
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            — {change.step_data.title}
          </span>
        )}
      </div>

      {change.type === 'modified' && change.changes && (
        <div className="space-y-2 mt-3 pl-6">
          {Object.entries(change.changes).map(([field, { from, to }]) => (
            <DiffFieldHighlight key={field} label={field} from={from} to={to} />
          ))}
        </div>
      )}
    </div>
  )
}
