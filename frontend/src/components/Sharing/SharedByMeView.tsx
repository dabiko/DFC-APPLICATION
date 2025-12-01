import React, { useState } from 'react'
import {
  UserIcon,
  LinkIcon,
  CalendarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  FunnelIcon,
  ChevronUpDownIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import { FileIcon } from '@/components/FileIcon'
import type { SharedByMeViewProps, ShareStatus } from '@/types/sharing'
import { format } from 'date-fns'
import { getShareStatusColor, getPermissionLabel, isShareExpiringSoon } from '@/types/sharing'

export const SharedByMeView: React.FC<SharedByMeViewProps> = ({
  items,
  onRevokeShare,
  onEditShare,
  onExtendExpiry,
  onViewActivity,
  loading = false,
  filter,
  onFilterChange,
}) => {
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'accesses'>('date')

  const filteredItems =
    filter && filter !== 'all' ? items.filter((item) => item.share.status === filter) : items

  const sortedItems = [...filteredItems].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.document.name.localeCompare(b.document.name)
      case 'date':
        return new Date(b.share.createdAt).getTime() - new Date(a.share.createdAt).getTime()
      case 'accesses':
        return b.stats.totalAccesses - a.stats.totalAccesses
      default:
        return 0
    }
  })

  const getShareTypeLabel = (share: any) => {
    if ('recipientEmail' in share) return 'External'
    if ('token' in share) return 'Link'
    return 'Internal'
  }

  const getRecipientDisplay = (share: any) => {
    if ('recipientEmail' in share) return share.recipientEmail
    if ('token' in share) return 'Anyone with link'
    if ('sharedWith' in share) {
      const recipient = share.sharedWith
      return 'name' in recipient ? recipient.name : `${recipient.memberCount} members`
    }
    return 'Unknown'
  }

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Shared by Me</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {filteredItems.length} document{filteredItems.length !== 1 ? 's' : ''} shared
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-500" />
            <select
              value={filter || 'all'}
              onChange={(e) => onFilterChange?.(e.target.value as ShareStatus | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="all">All Shares</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ChevronUpDownIcon className="w-5 h-5 text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="date">Most Recent</option>
              <option value="name">Name (A-Z)</option>
              <option value="accesses">Most Accessed</option>
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
          <p className="text-gray-600 dark:text-gray-400">Documents you share will appear here</p>
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
                  Shared With
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Permission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Accesses
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedItems.map((item) => {
                const statusColors = getShareStatusColor(item.share.status)
                const expiring = item.share.expiryDate && isShareExpiringSoon(item.share.expiryDate)

                return (
                  <tr key={item.share.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <FileIcon fileName={item.document.name} size="lg" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {item.document.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {getShareTypeLabel(item.share)} •{' '}
                            {format(new Date(item.share.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm">
                        {getShareTypeLabel(item.share) === 'Link' ? (
                          <LinkIcon className="w-4 h-4 text-gray-400" />
                        ) : (
                          <UserIcon className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-gray-900 dark:text-white">
                          {getRecipientDisplay(item.share)}
                        </span>
                      </div>
                      {item.stats?.totalShares && item.stats.totalShares > 1 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          +{item.stats.totalShares - 1} more
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900 dark:text-white">
                        {getPermissionLabel(item.share.permissionLevel)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.share.expiryDate ? (
                        <div
                          className={
                            expiring
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-gray-900 dark:text-white'
                          }
                        >
                          <div className="text-sm">
                            {format(new Date(item.share.expiryDate), 'MMM d, yyyy')}
                          </div>
                          {expiring && <div className="text-xs">Expiring soon</div>}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No expiry</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                      >
                        {item.share.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                        <EyeIcon className="w-4 h-4 text-gray-400" />
                        {item.stats?.totalAccesses || 0}
                      </div>
                      {item.stats?.lastAccessed && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Last: {format(new Date(item.stats.lastAccessed), 'MMM d')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {onViewActivity && (
                          <button
                            onClick={() => onViewActivity(item.share.id)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="View activity"
                          >
                            <ClockIcon className="w-4 h-4" />
                          </button>
                        )}
                        {item.share.status === 'active' && onEditShare && (
                          <button
                            onClick={() => onEditShare(item.share)}
                            className="p-1.5 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Edit permissions"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        )}
                        {item.share.status === 'active' && (
                          <button
                            onClick={() => {
                              if (confirm('Are you sure you want to revoke this share?')) {
                                onRevokeShare(item.share.id)
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Revoke share"
                          >
                            <TrashIcon className="w-4 h-4" />
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
