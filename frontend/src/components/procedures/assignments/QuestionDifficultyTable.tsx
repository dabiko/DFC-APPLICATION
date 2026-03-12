/**
 * QuestionDifficultyTable — Shows which questions trainees struggle with most.
 * Sorted by pass rate (hardest first).
 */

import { HelpCircle } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { QuestionDifficulty } from '@/services/assignmentService'

interface QuestionDifficultyTableProps {
  data: QuestionDifficulty[]
}

function difficultyColor(passRate: number): string {
  if (passRate >= 80) return 'text-green-600'
  if (passRate >= 60) return 'text-blue-600'
  if (passRate >= 40) return 'text-orange-600'
  return 'text-red-600'
}

function difficultyLabel(passRate: number): string {
  if (passRate >= 80) return 'Easy'
  if (passRate >= 60) return 'Moderate'
  if (passRate >= 40) return 'Hard'
  return 'Very Hard'
}

function difficultyBg(passRate: number): string {
  if (passRate >= 80) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  if (passRate >= 60) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  if (passRate >= 40)
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
}

export function QuestionDifficultyTable({ data }: QuestionDifficultyTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <HelpCircle className="h-4 w-4 text-purple-500" />
          Question Difficulty
        </h3>
        <p className="text-sm text-gray-500">No question data available yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
        <HelpCircle className="h-4 w-4 text-purple-500" />
        Question Difficulty
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Question</th>
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Quiz / Step</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Responses</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Pass Rate</th>
              <th className="text-center py-2 font-medium text-gray-500">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {data.map((q) => (
              <tr
                key={q.question_id}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
              >
                <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 max-w-[250px] truncate">
                  Q{q.question_order}. {q.question_text}
                </td>
                <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 max-w-[150px] truncate">
                  <span className="block">{q.quiz_title}</span>
                  <span className="text-[10px] text-gray-400">{q.step_title}</span>
                </td>
                <td className="py-2 pr-3 text-center text-gray-600 dark:text-gray-300">
                  {q.total_responses}
                </td>
                <td
                  className={cn(
                    'py-2 pr-3 text-center font-semibold',
                    difficultyColor(q.pass_rate)
                  )}
                >
                  {q.pass_rate}%
                </td>
                <td className="py-2 text-center">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-medium',
                      difficultyBg(q.pass_rate)
                    )}
                  >
                    {difficultyLabel(q.pass_rate)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
