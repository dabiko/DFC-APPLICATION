/**
 * ResumeTrainingBanner — Banner prompting user to resume an in-progress training.
 */

import { PlayCircle, ArrowRight } from 'lucide-react'

interface ResumeTrainingBannerProps {
  procedureTitle: string
  currentStep: number
  totalSteps: number
  onResume: () => void
}

export function ResumeTrainingBanner({
  procedureTitle,
  currentStep,
  totalSteps,
  onResume,
}: ResumeTrainingBannerProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <PlayCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Resume: {procedureTitle}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              Step {currentStep} of {totalSteps} — pick up where you left off
            </p>
          </div>
        </div>
        <button
          onClick={onResume}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Resume
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
