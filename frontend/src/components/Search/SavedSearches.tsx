/**
 * SavedSearches Component
 * Manage and execute saved searches
 */

import { FC } from 'react'
import {
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import type { SavedSearchesProps } from '@/types/search'
import { formatDistanceToNow } from 'date-fns'

export const SavedSearches: FC<SavedSearchesProps> = ({
  savedSearches,
  onExecute,
  onEdit,
  onDelete,
  onShare,
  onPin,
  canManage = true,
  className,
}) => {
  if (savedSearches.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <MagnifyingGlassIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          No saved searches
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Save your frequently used searches for quick access.
        </p>
      </div>
    )
  }

  // Sort: pinned first, then by most recent
  const sortedSearches = [...savedSearches].sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })

  return (
    <div className={cn('space-y-2', className)}>
      {sortedSearches.map((search) => (
        <div
          key={search.id}
          className={cn(
            'group relative p-4 rounded-lg border transition-all',
            search.isPinned
              ? 'border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onExecute(search)}
                  className="text-left flex-1 min-w-0"
                >
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate hover:text-primary-600 dark:hover:text-primary-400">
                    {search.name}
                  </h3>
                </button>
                {search.isPinned && (
                  <StarIconSolid className="w-4 h-4 text-yellow-500 flex-shrink-0" title="Pinned" />
                )}
              </div>

              {search.description && (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {search.description}
                </p>
              )}

              {/* Query preview */}
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">
                  <MagnifyingGlassIcon className="w-3 h-3" />
                  {search.query.query}
                </span>
                {search.query.filters && Object.keys(search.query.filters).length > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{Object.keys(search.query.filters).length} filters
                  </span>
                )}
              </div>

              {/* Metadata */}
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span>Updated {formatDistanceToNow(new Date(search.updatedAt), { addSuffix: true })}</span>
                {search.lastExecutedAt && (
                  <>
                    <span>•</span>
                    <span>
                      Last used {formatDistanceToNow(new Date(search.lastExecutedAt), { addSuffix: true })}
                    </span>
                  </>
                )}
                {search.resultCount !== undefined && (
                  <>
                    <span>•</span>
                    <span>{search.resultCount} results</span>
                  </>
                )}
                {search.isShared && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <ShareIcon className="w-3 h-3" />
                      Shared
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Pin/Unpin */}
                {onPin && (
                  <button
                    onClick={() => onPin(search.id, !search.isPinned)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title={search.isPinned ? 'Unpin' : 'Pin'}
                  >
                    {search.isPinned ? (
                      <StarIconSolid className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <StarIcon className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                    )}
                  </button>
                )}

                {/* Share */}
                {onShare && (
                  <button
                    onClick={() => onShare(search.id)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title="Share"
                  >
                    <ShareIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Edit */}
                {onEdit && (
                  <button
                    onClick={() => onEdit(search)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                )}

                {/* Delete */}
                {onDelete && (
                  <button
                    onClick={() => onDelete(search.id)}
                    className="p-1.5 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-md transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4 text-error-600 dark:text-error-400" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
