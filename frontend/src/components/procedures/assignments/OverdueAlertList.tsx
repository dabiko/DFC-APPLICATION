/**
 * OverdueAlertList — List of overdue assignments requiring attention.
 */

import { AlertCircle, Clock } from 'lucide-react'
import type { ProcedureAssignment } from '@/services/assignmentService'

interface OverdueAlertListProps {
  assignments: ProcedureAssignment[]
}

export function OverdueAlertList({ assignments }: OverdueAlertListProps) {
  const overdue = assignments.filter((a) => a.status === 'overdue')

  if (overdue.length === 0) return null

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
      <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4" />
        Overdue Assignments ({overdue.length})
      </h3>
      <div className="space-y-2">
        {overdue.slice(0, 5).map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-gray-800/60 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                {a.assigned_to_name}
              </p>
              <p className="text-xs text-gray-500 truncate">{a.procedure_title}</p>
            </div>
            {a.due_date && (
              <span className="flex items-center gap-1 text-xs text-orange-600 flex-shrink-0 ml-2">
                <Clock className="h-3 w-3" />
                {new Date(a.due_date).toLocaleDateString()}
              </span>
            )}
          </div>
        ))}
        {overdue.length > 5 && (
          <p className="text-xs text-orange-600 text-center">+{overdue.length - 5} more overdue</p>
        )}
      </div>
    </div>
  )
}
