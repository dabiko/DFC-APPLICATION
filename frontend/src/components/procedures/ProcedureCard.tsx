/**
 * ProcedureCard — Card display for procedures list.
 */

import { FileText, Clock, User, Tag } from 'lucide-react'
import { ProcedureStatusBadge } from './ProcedureStatusBadge'
import type { Procedure } from '@/types/procedure'

interface ProcedureCardProps {
  procedure: Procedure
  onClick: () => void
}

export function ProcedureCard({ procedure, onClick }: ProcedureCardProps) {
  const timeAgo = formatRelativeTime(procedure.updated_at)

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
              {procedure.title}
            </h3>
            {procedure.description && (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {procedure.description}
              </p>
            )}
          </div>
        </div>
        <ProcedureStatusBadge state={procedure.state} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
          <span>
            {procedure.step_count} step{procedure.step_count !== 1 ? 's' : ''}
          </span>
        )}
        {procedure.current_version > 0 && (
          <span className="text-green-600 dark:text-green-400">v{procedure.current_version}</span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
      </div>

      {procedure.tags && procedure.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {procedure.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {procedure.tags.length > 4 && (
            <span className="text-xs text-gray-400">+{procedure.tags.length - 4}</span>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
