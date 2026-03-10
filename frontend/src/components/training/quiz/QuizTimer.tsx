/**
 * QuizTimer — Countdown timer display.
 */

import { Clock } from 'lucide-react'
import { cn } from '@/utils/cn'

interface QuizTimerProps {
  timeRemaining: number | null
  submitted: boolean
}

export function QuizTimer({ timeRemaining, submitted }: QuizTimerProps) {
  if (timeRemaining === null || submitted) return null

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <span
      className={cn(
        'flex items-center gap-1 text-sm font-mono',
        timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'
      )}
    >
      <Clock className="h-4 w-4" />
      {formatTime(timeRemaining)}
    </span>
  )
}
