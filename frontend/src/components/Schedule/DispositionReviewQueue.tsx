/**
 * DispositionReviewQueue Component
 * Review queue for pending disposition actions with approval workflow
 */

import { useState, useMemo, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Archive,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreVertical,
  Shield,
  Calendar,
  User,
  Building2,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react'
import type {
  DispositionReviewItem,
  DispositionAction,
  SchedulePriority,
  BulkActionRequest,
  BulkActionResult,
} from '@/types/retention'
import {
  getDispositionActionLabel,
  getDispositionActionColor,
  getPriorityColor,
} from '@/types/retention'
import { cn } from '@/utils/cn'
import { format, formatDistanceToNow, isPast } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface DispositionReviewQueueProps {
  items: DispositionReviewItem[]
  selectedItems?: string[]
  onItemSelect?: (itemId: string) => void
  onSelectAll?: () => void
  onClearSelection?: () => void
  onApprove?: (itemId: string, notes?: string) => void
  onReject?: (itemId: string, reason: string) => void
  onDefer?: (itemId: string, deferUntil: string, reason?: string) => void
  onBulkAction?: (action: BulkActionRequest) => Promise<BulkActionResult>
  onViewDocument?: (documentId: string) => void
  loading?: boolean
  canApprove?: boolean
}

type SortField = 'scheduledDate' | 'priority' | 'documentName' | 'department'
type SortDirection = 'asc' | 'desc'

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_ICONS: Record<DispositionAction, React.ElementType> = {
  archive: Archive,
  delete: Trash2,
  extend: Clock,
  review: FileText,
  transfer: ChevronDown,
}

const REVIEW_STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
  },
  deferred: {
    label: 'Deferred',
    icon: Calendar,
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
  },
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface ActionModalProps {
  type: 'approve' | 'reject' | 'defer'
  itemCount: number
  onConfirm: (data: { notes?: string; reason?: string; deferUntil?: string }) => void
  onCancel: () => void
}

function ActionModal({ type, itemCount, onConfirm, onCancel }: ActionModalProps) {
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [deferUntil, setDeferUntil] = useState('')

  const handleSubmit = () => {
    if (type === 'reject' && !reason.trim()) return
    if (type === 'defer' && !deferUntil) return

    onConfirm({
      notes: type === 'approve' ? notes : undefined,
      reason: type === 'reject' ? reason : undefined,
      deferUntil: type === 'defer' ? deferUntil : undefined,
    })
  }

  const config = {
    approve: {
      title: 'Approve Disposition',
      description: `Approve ${itemCount} item${itemCount !== 1 ? 's' : ''} for disposition`,
      buttonText: 'Approve',
      buttonClass: 'bg-green-600 hover:bg-green-700',
    },
    reject: {
      title: 'Reject Disposition',
      description: `Reject ${itemCount} item${itemCount !== 1 ? 's' : ''} and cancel scheduled action`,
      buttonText: 'Reject',
      buttonClass: 'bg-red-600 hover:bg-red-700',
    },
    defer: {
      title: 'Defer Disposition',
      description: `Defer ${itemCount} item${itemCount !== 1 ? 's' : ''} to a later date`,
      buttonText: 'Defer',
      buttonClass: 'bg-blue-600 hover:bg-blue-700',
    },
  }

  const { title, description, buttonText, buttonClass } = config[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>

          {type === 'approve' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes about this approval..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {type === 'reject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Explain why this disposition is being rejected..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          )}

          {type === 'defer' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Defer Until <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deferUntil}
                  onChange={(e) => setDeferUntil(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Why is this being deferred?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={(type === 'reject' && !reason.trim()) || (type === 'defer' && !deferUntil)}
            className={cn(
              'px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50',
              buttonClass
            )}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DispositionReviewQueue({
  items,
  selectedItems = [],
  onItemSelect,
  onSelectAll,
  onClearSelection,
  onApprove,
  onReject,
  onDefer,
  onBulkAction,
  onViewDocument,
  loading = false,
  canApprove = true,
}: DispositionReviewQueueProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState<DispositionAction | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<SchedulePriority | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DispositionReviewItem['status'] | 'all'>(
    'pending'
  )
  const [sortField, setSortField] = useState<SortField>('scheduledDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject' | 'defer'
    itemId?: string
    isBulk?: boolean
  } | null>(null)

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !item.documentName.toLowerCase().includes(query) &&
          !item.policyName.toLowerCase().includes(query) &&
          !item.owner.toLowerCase().includes(query) &&
          !item.department.toLowerCase().includes(query)
        ) {
          return false
        }
      }

      // Action filter
      if (actionFilter !== 'all' && item.scheduledAction !== actionFilter) {
        return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) {
        return false
      }

      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      return true
    })

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'scheduledDate':
          comparison = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          break
        case 'priority': {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        }
        case 'documentName':
          comparison = a.documentName.localeCompare(b.documentName)
          break
        case 'department':
          comparison = a.department.localeCompare(b.department)
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return result
  }, [items, searchQuery, actionFilter, priorityFilter, statusFilter, sortField, sortDirection])

  // Handle sort change
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Handle action confirmation
  const handleActionConfirm = useCallback(
    async (data: { notes?: string; reason?: string; deferUntil?: string }) => {
      if (!actionModal) return

      if (actionModal.isBulk && onBulkAction) {
        const request: BulkActionRequest = {
          action: actionModal.type,
          itemIds: selectedItems,
          reason: data.reason,
          deferUntil: data.deferUntil,
          notifyOwners: true,
        }
        await onBulkAction(request)
        onClearSelection?.()
      } else if (actionModal.itemId) {
        switch (actionModal.type) {
          case 'approve':
            onApprove?.(actionModal.itemId, data.notes)
            break
          case 'reject':
            onReject?.(actionModal.itemId, data.reason || '')
            break
          case 'defer':
            onDefer?.(actionModal.itemId, data.deferUntil || '', data.reason)
            break
        }
      }

      setActionModal(null)
    },
    [actionModal, selectedItems, onBulkAction, onClearSelection, onApprove, onReject, onDefer]
  )

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading review queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>

          {/* Filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="deferred">Deferred</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as DispositionAction | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Actions</option>
            <option value="delete">Delete</option>
            <option value="archive">Archive</option>
            <option value="review">Review</option>
            <option value="extend">Extend</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as SchedulePriority | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Selection info */}
        {selectedItems.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{selectedItems.length} selected</span>
            <button
              onClick={onClearSelection}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && canApprove && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Bulk Actions:
          </span>
          <button
            onClick={() => setActionModal({ type: 'approve', isBulk: true })}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Approve All
          </button>
          <button
            onClick={() => setActionModal({ type: 'reject', isBulk: true })}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            <XCircle className="w-4 h-4" />
            Reject All
          </button>
          <button
            onClick={() => setActionModal({ type: 'defer', isBulk: true })}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Calendar className="w-4 h-4" />
            Defer All
          </button>
        </div>
      )}

      {/* Queue Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={
                    filteredItems.length > 0 &&
                    selectedItems.length ===
                      filteredItems.filter((i) => i.status === 'pending').length
                  }
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th
                onClick={() => handleSort('documentName')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              >
                <div className="flex items-center gap-1">
                  Document
                  {renderSortIndicator('documentName')}
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
              <th
                onClick={() => handleSort('department')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              >
                <div className="flex items-center gap-1">
                  Department
                  {renderSortIndicator('department')}
                </div>
              </th>
              <th
                onClick={() => handleSort('scheduledDate')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              >
                <div className="flex items-center gap-1">
                  Scheduled
                  {renderSortIndicator('scheduledDate')}
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
              >
                <div className="flex items-center gap-1">
                  Priority
                  {renderSortIndicator('priority')}
                </div>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="w-24 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {items.length === 0 ? 'Review Queue Empty' : 'No Matching Items'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4">
                      {items.length === 0
                        ? 'Great job! There are no documents pending disposition review at this time. Documents will appear here when they reach their retention end date.'
                        : 'No items match your current filters. Try adjusting the search or filter criteria.'}
                    </p>
                    {items.length === 0 && (
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>Pending items: 0</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span>All caught up!</span>
                        </div>
                      </div>
                    )}
                    {items.length > 0 && searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setActionFilter('all')
                          setPriorityFilter('all')
                          setStatusFilter('pending')
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const actionColors = getDispositionActionColor(item.scheduledAction)
                const priorityColors = getPriorityColor(item.priority)
                const statusConfig = REVIEW_STATUS_CONFIG[item.status]
                const ActionIcon = ACTION_ICONS[item.scheduledAction]
                const StatusIcon = statusConfig.icon
                const isOverdue = isPast(new Date(item.scheduledDate)) && item.status === 'pending'
                const isExpanded = expandedItem === item.id

                return (
                  <>
                    <tr
                      key={item.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
                        isOverdue && 'bg-red-50 dark:bg-red-900/10'
                      )}
                    >
                      <td className="px-4 py-3">
                        {item.status === 'pending' && (
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => onItemSelect?.(item.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          >
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 text-gray-400 transition-transform',
                                isExpanded && 'rotate-180'
                              )}
                            />
                          </button>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.documentName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {item.documentType} • {formatFileSize(item.documentSize)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn('p-1 rounded', actionColors.bg)}>
                            <ActionIcon className={cn('w-4 h-4', actionColors.icon)} />
                          </div>
                          <span className={cn('text-sm', actionColors.text)}>
                            {getDispositionActionLabel(item.scheduledAction)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.department}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p
                            className={cn(
                              'font-medium',
                              isOverdue
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                            )}
                          >
                            {format(new Date(item.scheduledDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(item.scheduledDate), { addSuffix: true })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                            priorityColors.bg,
                            priorityColors.text
                          )}
                        >
                          <div className={cn('w-1.5 h-1.5 rounded-full', priorityColors.dot)} />
                          <span className="capitalize">{item.priority}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full',
                            statusConfig.bg,
                            statusConfig.text
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {onViewDocument && (
                            <button
                              onClick={() => onViewDocument(item.documentId)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="View document"
                            >
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                          {item.status === 'pending' && canApprove && (
                            <>
                              <button
                                onClick={() => setActionModal({ type: 'approve', itemId: item.id })}
                                className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => setActionModal({ type: 'reject', itemId: item.id })}
                                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Owner</p>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-900 dark:text-white">{item.owner}</span>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.ownerEmail}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">Policy</p>
                              <p className="text-gray-900 dark:text-white">{item.policyName}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">
                                Retention End Date
                              </p>
                              <p className="text-gray-900 dark:text-white">
                                {format(new Date(item.retentionEndDate), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400 mb-1">
                                Confidentiality
                              </p>
                              <p className="text-gray-900 dark:text-white capitalize">
                                {item.confidentialityLevel.replace('_', ' ')}
                              </p>
                            </div>
                            {item.hasLegalHold && (
                              <div className="col-span-2 md:col-span-4">
                                <div className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                  <Shield className="w-4 h-4 text-orange-600" />
                                  <span className="text-sm text-orange-800 dark:text-orange-200">
                                    This document is under legal hold
                                  </span>
                                </div>
                              </div>
                            )}
                            {item.reviewNotes && (
                              <div className="col-span-2 md:col-span-4">
                                <p className="text-gray-500 dark:text-gray-400 mb-1">
                                  Review Notes
                                </p>
                                <p className="text-gray-900 dark:text-white">{item.reviewNotes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {items.length === 0 ? (
                <span className="font-medium text-green-600 dark:text-green-400">
                  No items to review
                </span>
              ) : (
                <>
                  Showing{' '}
                  <span className="font-medium text-gray-900 dark:text-white">
                    {filteredItems.length}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-gray-900 dark:text-white">{items.length}</span>{' '}
                  items
                </>
              )}
            </span>
          </div>
          {items.length > 0 && <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />}
          {items.length > 0 && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-white">
                  {items.filter((i) => i.status === 'pending').length}
                </span>{' '}
                pending review
              </span>
            </div>
          )}
        </div>
        {items.length === 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              All Clear
            </span>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {actionModal && (
        <ActionModal
          type={actionModal.type}
          itemCount={actionModal.isBulk ? selectedItems.length : 1}
          onConfirm={handleActionConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}
    </div>
  )
}

export default DispositionReviewQueue
