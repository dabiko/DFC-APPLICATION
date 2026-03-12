/**
 * AnalyticsOverviewCards — Top-level KPI cards for content effectiveness analytics.
 */

import { Activity, Clock, MessageSquare, Target } from 'lucide-react'
import type { AnalyticsOverall } from '@/services/assignmentService'

interface AnalyticsOverviewCardsProps {
  data: AnalyticsOverall
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`
}

const CARDS = [
  {
    key: 'total_training_attempts' as const,
    label: 'Training Attempts',
    icon: Activity,
    iconColor: 'text-blue-500',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'avg_training_time_seconds' as const,
    label: 'Avg Training Time',
    icon: Clock,
    iconColor: 'text-amber-500',
    format: (v: number) => formatTime(v),
  },
  {
    key: 'total_questions_answered' as const,
    label: 'Questions Answered',
    icon: MessageSquare,
    iconColor: 'text-purple-500',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'overall_question_accuracy' as const,
    label: 'Question Accuracy',
    icon: Target,
    iconColor: 'text-green-500',
    format: (v: number) => `${v}%`,
  },
]

export function AnalyticsOverviewCards({ data }: AnalyticsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {CARDS.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.key}
            className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${card.iconColor}`} />
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {card.format(data[card.key])}
            </p>
          </div>
        )
      })}
    </div>
  )
}
