/**
 * StepEvidenceRow — Per-step evidence detail row.
 */

import { CheckCircle, Clock } from 'lucide-react'

interface StepEvidence {
  step_title: string
  status: string
  started_at: string | null
  completed_at: string | null
}

interface StepEvidenceRowProps {
  step: StepEvidence
  index: number
}

export function StepEvidenceRow({ step, index }: StepEvidenceRowProps) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {step.status === 'completed' ? (
        <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
      ) : (
        <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
      )}
      <span className="text-gray-400 w-4">{index + 1}.</span>
      <span className="text-gray-700 dark:text-gray-300 flex-1">{step.step_title}</span>
      <span className="text-gray-400">{step.status}</span>
      {step.completed_at && (
        <span className="text-gray-400">{new Date(step.completed_at).toLocaleString()}</span>
      )}
    </div>
  )
}
