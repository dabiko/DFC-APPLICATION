/**
 * QuizProgress — Question navigation dots showing answered state.
 */

import { cn } from '@/utils/cn'
import type { VersionQuestion, QuestionAnswer } from '../types'

interface QuizProgressProps {
  questions: VersionQuestion[]
  answers: Record<string, QuestionAnswer>
  currentIndex: number
  onNavigate: (index: number) => void
}

export function QuizProgress({ questions, answers, currentIndex, onNavigate }: QuizProgressProps) {
  return (
    <div className="flex gap-1.5 p-4 border-b border-gray-200 dark:border-gray-700 flex-wrap">
      {questions.map((q, idx) => {
        const a = answers[q.id]
        const hasAnswer =
          q.question_type === 'short_answer'
            ? !!a?.text_answer?.trim()
            : (a?.selected_option_ids?.length || 0) > 0
        return (
          <button
            key={q.id}
            onClick={() => onNavigate(idx)}
            className={cn(
              'w-7 h-7 rounded-full text-xs font-medium transition-colors',
              idx === currentIndex
                ? 'bg-green-600 text-white'
                : hasAnswer
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
            )}
          >
            {idx + 1}
          </button>
        )
      })}
    </div>
  )
}
