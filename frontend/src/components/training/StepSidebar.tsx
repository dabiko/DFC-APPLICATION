/**
 * StepSidebar — Left panel showing step list with status icons.
 */

import { CheckCircle } from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'
import { cn } from '@/utils/cn'

interface StepSidebarProps {
  steps: VersionStep[]
  currentStepIndex: number
  getStepCompletion: (stepId: string) => StepCompletionResponse | undefined
  onNavigate: (index: number) => void
}

export function StepSidebar({
  steps,
  currentStepIndex,
  getStepCompletion,
  onNavigate,
}: StepSidebarProps) {
  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
      {steps.map((s, idx) => {
        const completion = getStepCompletion(s.id)
        const isDone = completion?.status === 'completed'
        const isCurrent = idx === currentStepIndex
        return (
          <button
            key={s.id}
            onClick={() => onNavigate(idx)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              isCurrent
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : isDone
                  ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
            )}
          >
            {isDone ? (
              <CheckCircle className="h-3 w-3" />
            ) : (
              <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">
                {idx + 1}
              </span>
            )}
            {s.title || `Step ${idx + 1}`}
          </button>
        )
      })}
    </div>
  )
}
