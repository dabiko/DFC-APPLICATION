/**
 * QuizPerformanceChart — Shows quiz pass rates, avg scores, and avg attempts to pass.
 */

import { GraduationCap } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { QuizPerformance } from '@/services/assignmentService'

interface QuizPerformanceChartProps {
  data: QuizPerformance[]
}

export function QuizPerformanceChart({ data }: QuizPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <GraduationCap className="h-4 w-4 text-indigo-500" />
          Quiz Performance
        </h3>
        <p className="text-sm text-gray-500">No quiz data available yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-indigo-500" />
        Quiz Performance
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Quiz</th>
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Step</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Attempts</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Pass Rate</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Avg Score</th>
              <th className="text-center py-2 font-medium text-gray-500">Avg Tries to Pass</th>
            </tr>
          </thead>
          <tbody>
            {data.map((q) => (
              <tr
                key={q.quiz_id}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
              >
                <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 max-w-[180px] truncate font-medium">
                  {q.quiz_title}
                </td>
                <td className="py-2 pr-3 text-gray-500 dark:text-gray-400 max-w-[120px] truncate">
                  {q.step_title}
                </td>
                <td className="py-2 pr-3 text-center text-gray-600 dark:text-gray-300">
                  {q.total_attempts}
                </td>
                <td className="py-2 pr-3 text-center">
                  <span
                    className={cn(
                      'font-semibold',
                      q.pass_rate >= 80
                        ? 'text-green-600'
                        : q.pass_rate >= 60
                          ? 'text-blue-600'
                          : q.pass_rate >= 40
                            ? 'text-orange-600'
                            : 'text-red-600'
                    )}
                  >
                    {q.pass_rate}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-center text-gray-600 dark:text-gray-300">
                  {q.avg_score}%
                </td>
                <td className="py-2 text-center">
                  <span
                    className={cn(
                      'font-mono',
                      q.avg_attempts_to_pass > 2
                        ? 'text-orange-600 font-semibold'
                        : 'text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {q.avg_attempts_to_pass}
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
