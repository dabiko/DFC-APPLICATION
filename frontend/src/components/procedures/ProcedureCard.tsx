/**
 * ProcedureCard — Responsive card display for procedures list.
 */

import { FileText, Clock, User, Layers, Building2, ArrowRight } from 'lucide-react'
import { ProcedureStatusBadge } from './ProcedureStatusBadge'
import { htmlToPlainSnippet } from '@/components/RichText'
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
      className="group relative flex cursor-pointer flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:border-blue-300 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
    >
      {/* Top color accent bar based on state */}
      <div className={`h-1 w-full rounded-t-xl ${stateAccentColor(procedure.state)}`} />

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Header: Icon + Title + Status */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:group-hover:bg-blue-900/50">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-gray-900 group-hover:text-blue-600 dark:text-gray-100 dark:group-hover:text-blue-400">
                {procedure.title}
              </h3>
              <ProcedureStatusBadge state={procedure.state} />
            </div>
            {procedure.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {htmlToPlainSnippet(procedure.description, 240)}
              </p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {procedure.department_name && (
            <span className="flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              {procedure.department_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
            {procedure.created_by_name}
          </span>
          {procedure.step_count !== undefined && (
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              {procedure.step_count} step{procedure.step_count !== 1 ? 's' : ''}
            </span>
          )}
          {procedure.current_version > 0 && (
            <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
              v{procedure.current_version}
            </span>
          )}
        </div>

        {/* Tags + timestamp footer */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          {procedure.tags && procedure.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {procedure.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {tag}
                </span>
              ))}
              {procedure.tags.length > 3 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-400 dark:bg-gray-700 dark:text-gray-500">
                  +{procedure.tags.length - 3}
                </span>
              )}
            </div>
          ) : (
            <div />
          )}
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>
      </div>

      {/* Hover arrow indicator */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <ArrowRight className="h-4 w-4 text-blue-400" />
      </div>
    </div>
  )
}

function stateAccentColor(state: string): string {
  switch (state) {
    case 'draft':
      return 'bg-gray-300 dark:bg-gray-600'
    case 'in_review':
      return 'bg-yellow-400 dark:bg-yellow-500'
    case 'approved':
      return 'bg-blue-500 dark:bg-blue-400'
    case 'published':
      return 'bg-green-500 dark:bg-green-400'
    case 'retired':
      return 'bg-red-400 dark:bg-red-500'
    default:
      return 'bg-gray-200 dark:bg-gray-700'
  }
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
