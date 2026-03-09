/**
 * ProcedureTargetCard — Card shown in WorkflowCenterPage when the workflow
 * target is a Procedure (replaces the default document preview card).
 */

import { FileText, Tag, User, Clock, ListOrdered } from 'lucide-react'
import { ProcedureStatusBadge } from '../ProcedureStatusBadge'
import type { Procedure } from '@/types/procedure'

interface ProcedureTargetCardProps {
  procedure: Procedure
  onClick?: () => void
}

export function ProcedureTargetCard({ procedure, onClick }: ProcedureTargetCardProps) {
  return (
    <div
      onClick={onClick}
      className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-900/10 cursor-pointer hover:border-purple-300 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex-shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {procedure.title}
            </h3>
            <ProcedureStatusBadge state={procedure.state} />
          </div>
          {procedure.description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {procedure.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {procedure.department_name && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {procedure.department_name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {procedure.created_by_name}
            </span>
            {procedure.step_count !== undefined && (
              <span className="flex items-center gap-1">
                <ListOrdered className="h-3 w-3" />
                {procedure.step_count} steps
              </span>
            )}
            {procedure.current_version > 0 && (
              <span className="text-purple-600 dark:text-purple-400">
                v{procedure.current_version}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
