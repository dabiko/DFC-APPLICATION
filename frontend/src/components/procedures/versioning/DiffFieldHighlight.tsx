/**
 * DiffFieldHighlight — Inline text diff highlighting for field changes.
 */

import { cn } from '@/utils/cn'

interface DiffFieldHighlightProps {
  label: string
  from: unknown
  to: unknown
}

export function DiffFieldHighlight({ label, from, to }: DiffFieldHighlightProps) {
  const fromStr = String(from ?? '(empty)')
  const toStr = String(to ?? '(empty)')

  if (fromStr === toStr) return null

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="font-medium text-gray-500 dark:text-gray-400 min-w-[80px]">{label}:</span>
      <div className="flex-1 space-y-0.5">
        <div
          className={cn(
            'rounded px-1.5 py-0.5 inline-block',
            'bg-red-100 text-red-700 line-through dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {fromStr}
        </div>
        <div
          className={cn(
            'rounded px-1.5 py-0.5 inline-block',
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          )}
        >
          {toStr}
        </div>
      </div>
    </div>
  )
}
