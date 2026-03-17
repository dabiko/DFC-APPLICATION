/**
 * QuizSettingsPanel — Passing score, max attempts, time limit, shuffle settings.
 */

import { Shuffle, ArrowUpDown, Eye, Target, RotateCcw, Clock } from 'lucide-react'
import type { Quiz } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface QuizSettingsPanelProps {
  quiz: Partial<Quiz>
  onChange: (data: Partial<Quiz>) => void
}

interface ToggleCardProps {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleCard({ icon, label, description, checked, onChange }: ToggleCardProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
        checked
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/15 ring-1 ring-blue-200 dark:ring-blue-800'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-2 flex-shrink-0 transition-colors',
          checked
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-sm font-medium',
              checked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {label}
          </span>
          {/* Toggle switch */}
          <div
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
              checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                checked ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
      </div>
    </button>
  )
}

export function QuizSettingsPanel({ quiz, onChange }: QuizSettingsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Numeric settings */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Target className="h-3.5 w-3.5" />
            Passing Score (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={quiz.passing_score_percent ?? 70}
            onChange={(e) => onChange({ passing_score_percent: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Max Attempts
          </label>
          <input
            type="number"
            min={1}
            value={quiz.max_attempts ?? 3}
            onChange={(e) => onChange({ max_attempts: Number(e.target.value) })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            <Clock className="h-3.5 w-3.5" />
            Time Limit (min)
          </label>
          <input
            type="number"
            min={0}
            value={quiz.time_limit_minutes ?? ''}
            onChange={(e) =>
              onChange({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })
            }
            placeholder="No limit"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Toggle cards */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quiz Behavior
        </h4>
        <div className="space-y-2.5">
          <ToggleCard
            icon={<Shuffle className="h-4 w-4" />}
            label="Shuffle Questions"
            description="Randomize the order of questions each time the quiz is taken"
            checked={quiz.shuffle_questions ?? false}
            onChange={(checked) => onChange({ shuffle_questions: checked })}
          />
          <ToggleCard
            icon={<ArrowUpDown className="h-4 w-4" />}
            label="Shuffle Answers"
            description="Randomize the order of answer options within each question"
            checked={quiz.shuffle_answers ?? false}
            onChange={(checked) => onChange({ shuffle_answers: checked })}
          />
          <ToggleCard
            icon={<Eye className="h-4 w-4" />}
            label="Show Correct Answers"
            description="Reveal the correct answers after the quiz is submitted"
            checked={quiz.show_correct_answers_after ?? true}
            onChange={(checked) => onChange({ show_correct_answers_after: checked })}
          />
        </div>
      </div>
    </div>
  )
}
