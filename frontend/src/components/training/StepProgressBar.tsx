/**
 * StepProgressBar — Progress bar showing completed steps out of total.
 */

interface StepProgressBarProps {
  completedCount: number
  totalCount: number
}

export function StepProgressBar({ completedCount, totalCount }: StepProgressBarProps) {
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">
        {completedCount}/{totalCount}
      </span>
    </div>
  )
}
