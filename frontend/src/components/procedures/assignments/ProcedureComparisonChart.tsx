/**
 * ProcedureComparisonChart — Compares procedures by completion rate, failure rate, and avg score.
 */

import { BarChart3 } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ProcedureComparison } from '@/services/assignmentService'

interface ProcedureComparisonChartProps {
  data: ProcedureComparison[]
}

export function ProcedureComparisonChart({ data }: ProcedureComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-teal-500" />
          Procedure Comparison
        </h3>
        <p className="text-sm text-gray-500">No procedure data available yet.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-teal-500" />
        Procedure Comparison
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 pr-3 font-medium text-gray-500">Procedure</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Assigned</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Completion</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Failure</th>
              <th className="text-center py-2 pr-3 font-medium text-gray-500">Overdue</th>
              <th className="text-center py-2 font-medium text-gray-500">Avg Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr
                key={p.procedure_id}
                className="border-b border-gray-100 dark:border-gray-700/50 last:border-0"
              >
                <td className="py-2 pr-3 text-gray-800 dark:text-gray-200 max-w-[200px] truncate font-medium">
                  {p.procedure_title}
                </td>
                <td className="py-2 pr-3 text-center text-gray-600 dark:text-gray-300">
                  {p.total_assigned}
                </td>
                <td className="py-2 pr-3 text-center">
                  <span
                    className={cn(
                      'font-semibold',
                      p.completion_rate >= 80
                        ? 'text-green-600'
                        : p.completion_rate >= 50
                          ? 'text-blue-600'
                          : 'text-orange-600'
                    )}
                  >
                    {p.completion_rate}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-center">
                  <span
                    className={cn(
                      p.failure_rate > 20
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {p.failure_rate}%
                  </span>
                </td>
                <td className="py-2 pr-3 text-center">
                  <span
                    className={cn(
                      p.overdue_rate > 20
                        ? 'text-orange-600 font-semibold'
                        : 'text-gray-600 dark:text-gray-300'
                    )}
                  >
                    {p.overdue_rate}%
                  </span>
                </td>
                <td className="py-2 text-center text-gray-600 dark:text-gray-300">
                  {p.avg_score}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
