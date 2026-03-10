/**
 * AssignmentCard — Individual assignment card display.
 */

import type { ProcedureAssignment } from '@/services/assignmentService'
import { AssignmentStatusBadge } from './AssignmentStatusBadge'

interface AssignmentCardProps {
  assignment: ProcedureAssignment
  onWaive?: (id: string) => void
}

export function AssignmentCard({ assignment, onWaive }: AssignmentCardProps) {
  const a = assignment

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {a.assigned_to_name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {a.procedure_title}
            <span className="text-gray-400 ml-1">v{a.version_number}</span>
          </p>
          <div className="flex items-center gap-3 mt-2">
            <AssignmentStatusBadge status={a.status} />
            {a.due_date && (
              <span className="text-xs text-gray-500">
                Due: {new Date(a.due_date).toLocaleDateString()}
              </span>
            )}
            <span className="text-xs text-gray-400">by {a.assigned_by_name}</span>
          </div>
        </div>

        {onWaive && (a.status === 'assigned' || a.status === 'in_progress') && (
          <button
            onClick={() => onWaive(a.id)}
            className="text-xs text-purple-600 hover:underline dark:text-purple-400 ml-4"
          >
            Waive
          </button>
        )}
      </div>
    </div>
  )
}
