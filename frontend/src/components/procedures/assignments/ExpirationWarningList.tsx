/**
 * ExpirationWarningList — List of assignments with versions nearing expiration.
 */

import { AlertTriangle, Calendar } from 'lucide-react'
import type { ProcedureAssignment } from '@/services/assignmentService'

interface ExpirationWarningListProps {
  assignments: ProcedureAssignment[]
  daysThreshold?: number
}

export function ExpirationWarningList({
  assignments,
  daysThreshold = 30,
}: ExpirationWarningListProps) {
  const now = new Date()
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000)

  const expiring = assignments.filter((a) => {
    if (!a.due_date || a.status === 'completed' || a.status === 'waived') return false
    const due = new Date(a.due_date)
    return due > now && due <= threshold
  })

  if (expiring.length === 0) return null

  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4" />
        Expiring Soon ({expiring.length})
      </h3>
      <div className="space-y-2">
        {expiring.slice(0, 5).map((a) => {
          const daysLeft = Math.ceil(
            (new Date(a.due_date!).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
          )
          return (
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
              <span className="flex items-center gap-1 text-xs text-yellow-700 flex-shrink-0 ml-2">
                <Calendar className="h-3 w-3" />
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            </div>
          )
        })}
        {expiring.length > 5 && (
          <p className="text-xs text-yellow-700 text-center">
            +{expiring.length - 5} more expiring
          </p>
        )}
      </div>
    </div>
  )
}
