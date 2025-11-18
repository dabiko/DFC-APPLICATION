import React, { useState } from 'react'
import {
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  EyeIcon,
  ChatBubbleLeftIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ChevronUpDownIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { SharedWithMeViewProps } from '@/types/sharing'
import { format } from 'date-fns'
import { getPermissionLabel, getPermissionIcon } from '@/types/sharing'

export const SharedWithMeView: React.FC<SharedWithMeViewProps> = ({
  items,
  onOpenDocument,
  onRemoveShare,
  loading = false,
  sortBy = 'date',
  onSortChange,
}) => {
  const [localSortBy, setLocalSortBy] = useState<'date' | 'name' | 'sharedBy'>(sortBy)

  const handleSortChange = (newSort: 'date' | 'name' | 'sharedBy') => {
    setLocalSortBy(newSort)
    onSortChange?.(newSort)
  }

  const sortedItems = [...items].sort((a, b) => {
    switch (localSortBy) {
      case 'name':
        return a.document.name.localeCompare(b.document.name)
      case 'date':
        return new Date(b.share.createdAt).getTime() - new Date(a.share.createdAt).getTime()
      case 'sharedBy':
        return a.sharedBy.name.localeCompare(b.sharedBy.name)
      default:
        return 0
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shared documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shared with Me</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {items.length} document{items.length !== 1 ? 's' : ''} shared with you
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <ChevronUpDownIcon className="w-5 h-5 text-gray-500" />
            <select
              value={localSortBy}
              onChange={(e) => handleSortChange(e.target.value as typeof localSortBy)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="date">Most Recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="sharedBy">Shared By</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {sortedItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Shared Documents
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Documents shared with you will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Document
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Shared By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  My Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Shared Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Activity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedItems.map((item) => {
                const hasUnreadComments = (item.unreadComments ?? 0) > 0

                return (
                  <tr
                    key={item.share.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => onOpenDocument(item.document.id)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.document.thumbnail ? (
                          <img
                            src={item.document.thumbnail}
                            alt={item.document.name}
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="flex-shrink-0">
                            <DocumentTextIcon className="w-10 h-10 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white truncate">
                              {item.document.name}
                            </span>
                            {item.isNew && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                <SparklesIcon className="w-3 h-3" />
                                New
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.document.type} • {(item.document.size / 1024 / 1024).toFixed(2)}{' '}
                            MB
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.sharedBy.avatar ? (
                          <img
                            src={item.sharedBy.avatar}
                            alt={item.sharedBy.name}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.sharedBy.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.sharedBy.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{getPermissionIcon(item.myPermission)}</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getPermissionLabel(item.myPermission)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        {format(new Date(item.share.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {format(new Date(item.share.createdAt), 'h:mm a')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {hasUnreadComments && (
                          <div className="flex items-center gap-1 text-sm">
                            <ChatBubbleLeftIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {item.unreadComments}
                            </span>
                          </div>
                        )}
                        {item.share.lastAccessedAt && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Last viewed: {format(new Date(item.share.lastAccessedAt), 'MMM d')}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onOpenDocument(item.document.id)
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Open document"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        {item.myPermission === 'download' || item.myPermission === 'full' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Handle download
                              window.open(
                                `/api/v1/documents/${item.document.id}/download`,
                                '_blank'
                              )
                            }}
                            className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Download document"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                          </button>
                        ) : null}
                        {onRemoveShare && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Remove this shared document from your view?')) {
                                onRemoveShare(item.share.id)
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Remove from my view"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
