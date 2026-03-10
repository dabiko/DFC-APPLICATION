/**
 * AssignmentList — Filterable assignment table.
 */

import { Users, Loader2, AlertTriangle } from 'lucide-react'
import type { ProcedureAssignment } from '@/services/assignmentService'
import { AssignmentStatusBadge } from './AssignmentStatusBadge'

interface AssignmentListProps {
  assignments: ProcedureAssignment[]
  loading: boolean
  error: string | null
  onWaive: (id: string) => void
}

export function AssignmentList({ assignments, loading, error, onWaive }: AssignmentListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500">Loading assignments...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No assignments found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-900/50">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Trainee
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Procedure
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Due Date
            </th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Assigned By
            </th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {assignments.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                {a.assigned_to_name}
              </td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                {a.procedure_title}
                <span className="text-xs text-gray-400 ml-1">v{a.version_number}</span>
              </td>
              <td className="px-4 py-3">
                <AssignmentStatusBadge status={a.status} />
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">
                {a.due_date ? new Date(a.due_date).toLocaleDateString() : '—'}
              </td>
              <td className="px-4 py-3 text-gray-500 text-xs">{a.assigned_by_name}</td>
              <td className="px-4 py-3 text-right">
                {(a.status === 'assigned' || a.status === 'in_progress') && (
                  <button
                    onClick={() => onWaive(a.id)}
                    className="text-xs text-purple-600 hover:underline dark:text-purple-400"
                  >
                    Waive
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
