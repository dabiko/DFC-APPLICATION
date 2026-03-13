/**
 * StepSidebar — Vertical step list on desktop, collapsible dropdown on mobile.
 * Steps are locked until all previous steps are completed.
 */

import { useState } from 'react'
import { CheckCircle, ChevronDown, Clock, Lock, Unlock } from 'lucide-react'
import type { VersionStep, StepCompletionResponse } from './types'
import { cn } from '@/utils/cn'

interface StepSidebarProps {
  steps: VersionStep[]
  currentStepIndex: number
  getStepCompletion: (stepId: string) => StepCompletionResponse | undefined
  onNavigate: (index: number) => void
  isStepAccessible?: (index: number) => boolean
}

export function StepSidebar({
  steps,
  currentStepIndex,
  getStepCompletion,
  onNavigate,
  isStepAccessible,
}: StepSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentStep = steps[currentStepIndex]
  const completedCount = steps.filter((s) => getStepCompletion(s.id)?.status === 'completed').length

  const accessible = (idx: number) => (isStepAccessible ? isStepAccessible(idx) : true)

  return (
    <>
      {/* Mobile: collapsible dropdown */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="flex items-center gap-3 min-w-0">
            <StepNumber
              index={currentStepIndex}
              isDone={getStepCompletion(currentStep?.id || '')?.status === 'completed'}
              isCurrent
              isLocked={false}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                {currentStep?.title || `Step ${currentStepIndex + 1}`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStepIndex + 1} of {steps.length} · {completedCount} completed
              </p>
            </div>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 text-gray-400 transition-transform',
              mobileOpen && 'rotate-180'
            )}
          />
        </button>

        {mobileOpen && (
          <div className="mt-1 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
            {steps.map((s, idx) => (
              <StepRow
                key={s.id}
                step={s}
                index={idx}
                isCurrent={idx === currentStepIndex}
                completion={getStepCompletion(s.id)}
                isLocked={!accessible(idx)}
                onClick={() => {
                  if (accessible(idx)) {
                    onNavigate(idx)
                    setMobileOpen(false)
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-6">
          {/* Progress header */}
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Course Outline
            </h3>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {completedCount}/{steps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-1.5 rounded-full bg-green-500 transition-all duration-500"
              style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }}
            />
          </div>

          {/* Step list */}
          <nav className="space-y-1">
            {steps.map((s, idx) => (
              <StepRow
                key={s.id}
                step={s}
                index={idx}
                isCurrent={idx === currentStepIndex}
                completion={getStepCompletion(s.id)}
                isLocked={!accessible(idx)}
                onClick={() => {
                  if (accessible(idx)) onNavigate(idx)
                }}
              />
            ))}
          </nav>
        </div>
      </div>
    </>
  )
}

/* ─── Step row item ─── */

function StepRow({
  step,
  index,
  isCurrent,
  completion,
  isLocked,
  onClick,
}: {
  step: VersionStep
  index: number
  isCurrent: boolean
  completion: StepCompletionResponse | undefined
  isLocked: boolean
  onClick: () => void
}) {
  const isDone = completion?.status === 'completed'
  const isStarted = !!completion && !isDone

  if (isLocked) {
    return (
      <div
        title="Complete the previous step to unlock"
        className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left opacity-40 select-none"
      >
        <StepNumber index={index} isDone={false} isCurrent={false} isLocked />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-gray-400 dark:text-gray-500">
            {step.title || `Step ${index + 1}`}
          </p>
          {step.estimated_duration_minutes && (
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
              <Clock className="h-3 w-3" />
              {step.estimated_duration_minutes} min
            </span>
          )}
        </div>
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-300 dark:text-gray-600" />
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer',
        isCurrent ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      )}
    >
      <StepNumber index={index} isDone={isDone} isCurrent={isCurrent} isStarted={isStarted} />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-tight',
            isCurrent
              ? 'font-semibold text-blue-700 dark:text-blue-300'
              : isDone
                ? 'font-medium text-gray-500 line-through decoration-gray-300 dark:text-gray-400 dark:decoration-gray-600'
                : 'font-medium text-gray-700 dark:text-gray-300'
          )}
        >
          {step.title || `Step ${index + 1}`}
        </p>
        {step.estimated_duration_minutes && (
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            {step.estimated_duration_minutes} min
          </span>
        )}
      </div>
      <Unlock
        className={cn(
          'mt-0.5 h-3.5 w-3.5 shrink-0',
          isDone
            ? 'text-green-400 dark:text-green-500'
            : isCurrent
              ? 'text-blue-400 dark:text-blue-500'
              : 'text-gray-400 dark:text-gray-500'
        )}
      />
    </button>
  )
}

/* ─── Step number circle ─── */

function StepNumber({
  index,
  isDone,
  isCurrent,
  isStarted,
  isLocked,
}: {
  index: number
  isDone: boolean
  isCurrent: boolean
  isStarted?: boolean
  isLocked?: boolean
}) {
  if (isDone) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      </span>
    )
  }

  if (isLocked) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-[11px] font-semibold text-gray-300 dark:border-gray-700 dark:text-gray-600">
        {index + 1}
      </span>
    )
  }

  if (isCurrent) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm shadow-blue-200 dark:shadow-blue-900">
        {index + 1}
      </span>
    )
  }

  if (isStarted) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-blue-300 text-[11px] font-semibold text-blue-500 dark:border-blue-600 dark:text-blue-400">
        {index + 1}
      </span>
    )
  }

  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-gray-200 text-[11px] font-semibold text-gray-400 dark:border-gray-600 dark:text-gray-500">
      {index + 1}
    </span>
  )
}
