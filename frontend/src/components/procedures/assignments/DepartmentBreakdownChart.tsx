/**
 * DepartmentBreakdownChart — Visual breakdown of assignments by department.
 */

import { Building2 } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DepartmentBreakdown {
  department: string
  total: number
  completed: number
}

interface DepartmentBreakdownChartProps {
  data: DepartmentBreakdown[]
}

export function DepartmentBreakdownChart({ data }: DepartmentBreakdownChartProps) {
  if (data.length === 0) return null

  const maxTotal = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
        <Building2 className="h-4 w-4 text-blue-500" />
        By Department
      </h3>
      <div className="space-y-3">
        {data.map((dept) => {
          const completionPct = dept.total > 0 ? (dept.completed / dept.total) * 100 : 0
          const widthPct = (dept.total / maxTotal) * 100
          return (
            <div key={dept.department}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {dept.department}
                </span>
                <span className="text-gray-500">
                  {dept.completed}/{dept.total} ({completionPct.toFixed(0)}%)
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-600"
                  style={{ width: `${widthPct}%` }}
                >
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0 rounded-full',
                      completionPct >= 80
                        ? 'bg-green-500'
                        : completionPct >= 50
                          ? 'bg-blue-500'
                          : 'bg-orange-500'
                    )}
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
