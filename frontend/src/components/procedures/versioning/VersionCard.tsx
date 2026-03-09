/**
 * VersionCard — Version metadata card.
 */

import { Clock, User, Archive, CheckCircle } from 'lucide-react'
import type { ProcedureVersionListItem } from '@/types/procedure'

interface VersionCardProps {
  version: ProcedureVersionListItem
  onView: () => void
  onRetire?: () => void
  selected?: boolean
}

export function VersionCard({ version, onView, onRetire, selected }: VersionCardProps) {
  return (
    <div
      onClick={onView}
      className={`rounded-lg border p-4 cursor-pointer transition-all ${
        selected
          ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
          : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
            v{version.version_number}
          </span>
          {version.is_active && (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              Active
            </span>
          )}
        </div>
        {version.is_active && onRetire && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRetire()
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
          >
            <Archive className="h-3 w-3" />
            Retire
          </button>
        )}
      </div>

      <h4 className="text-sm text-gray-700 dark:text-gray-300 truncate">{version.title}</h4>

      {version.changelog && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
          {version.changelog}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {version.published_by_name}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(version.published_at).toLocaleDateString()}
        </span>
        <span>{version.step_count} steps</span>
      </div>
    </div>
  )
}
