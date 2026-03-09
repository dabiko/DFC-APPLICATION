/**
 * QuizSettingsPanel — Passing score, max attempts, time limit, shuffle settings.
 */

import type { Quiz } from '@/types/procedure'

interface QuizSettingsPanelProps {
  quiz: Partial<Quiz>
  onChange: (data: Partial<Quiz>) => void
}

export function QuizSettingsPanel({ quiz, onChange }: QuizSettingsPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Passing Score (%)
        </label>
        <input
          type="number"
          min={0}
          max={100}
          value={quiz.passing_score_percent ?? 70}
          onChange={(e) => onChange({ passing_score_percent: Number(e.target.value) })}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Max Attempts
        </label>
        <input
          type="number"
          min={1}
          value={quiz.max_attempts ?? 3}
          onChange={(e) => onChange({ max_attempts: Number(e.target.value) })}
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Time Limit (minutes)
        </label>
        <input
          type="number"
          min={0}
          value={quiz.time_limit_minutes ?? ''}
          onChange={(e) =>
            onChange({ time_limit_minutes: e.target.value ? Number(e.target.value) : null })
          }
          placeholder="No limit"
          className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div className="space-y-2 pt-5">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={quiz.shuffle_questions ?? false}
            onChange={(e) => onChange({ shuffle_questions: e.target.checked })}
            className="rounded border-gray-300"
          />
          Shuffle questions
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={quiz.shuffle_answers ?? false}
            onChange={(e) => onChange({ shuffle_answers: e.target.checked })}
            className="rounded border-gray-300"
          />
          Shuffle answers
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={quiz.show_correct_answers_after ?? true}
            onChange={(e) => onChange({ show_correct_answers_after: e.target.checked })}
            className="rounded border-gray-300"
          />
          Show correct answers after
        </label>
      </div>
    </div>
  )
}
