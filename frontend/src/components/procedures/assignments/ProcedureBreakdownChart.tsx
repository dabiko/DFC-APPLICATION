/**
 * ProcedureBreakdownChart — Visual breakdown of assignments by procedure.
 */

import { ClipboardList } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ProcedureBreakdown {
  procedure_title: string
  total: number
  completed: number
  in_progress: number
  overdue: number
}

interface ProcedureBreakdownChartProps {
  data: ProcedureBreakdown[]
}

export function ProcedureBreakdownChart({ data }: ProcedureBreakdownChartProps) {
  if (data.length === 0) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <ClipboardList className="h-4 w-4 text-indigo-500" />
        By Procedure
      </h3>
      <div className="space-y-3">
        {data.map((proc) => {
          const completionPct = proc.total > 0 ? (proc.completed / proc.total) * 100 : 0
          return (
            <div key={proc.procedure_title}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[60%]">
                  {proc.procedure_title}
                </span>
                <div className="flex items-center gap-2 text-gray-500">
                  {proc.overdue > 0 && (
                    <span className="text-orange-600">{proc.overdue} overdue</span>
                  )}
                  <span>
                    {proc.completed}/{proc.total}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 flex overflow-hidden">
                <div className="bg-green-500 h-2" style={{ width: `${completionPct}%` }} />
                <div
                  className="bg-blue-400 h-2"
                  style={{
                    width: `${proc.total > 0 ? (proc.in_progress / proc.total) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-orange-400 h-2"
                  style={{
                    width: `${proc.total > 0 ? (proc.overdue / proc.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Completed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" /> In Progress
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-400" /> Overdue
        </span>
      </div>
    </div>
  )
}
