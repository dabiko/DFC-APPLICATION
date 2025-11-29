/**
 * BulkActionPanel Component
 * Floating panel for bulk actions on selected disposition items
 */

import { useState, useCallback } from 'react'
import {
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  X,
  AlertTriangle,
  Loader2,
  ChevronDown,
  Archive,
  Trash2,
  FileText,
} from 'lucide-react'
import type { DispositionReviewItem, DispositionAction } from '@/types/retention'
import { getDispositionActionLabel, getDispositionActionColor } from '@/types/retention'
import { cn } from '@/utils/cn'
import { format, addDays, addWeeks, addMonths } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface BulkActionPanelProps {
  selectedCount: number
  selectedItems: DispositionReviewItem[]
  onApproveAll?: (notes?: string) => Promise<void>
  onRejectAll?: (reason: string) => Promise<void>
  onDeferAll?: (deferUntil: string, reason?: string) => Promise<void>
  onExtendAll?: (days: number, reason?: string) => Promise<void>
  onCancelAll?: (reason: string) => Promise<void>
  onClearSelection?: () => void
  processing?: boolean
  canApprove?: boolean
}

type ActionType = 'approve' | 'reject' | 'defer' | 'extend' | 'cancel' | null

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFER_PRESETS = [
  { label: '1 Week', getValue: () => format(addWeeks(new Date(), 1), 'yyyy-MM-dd') },
  { label: '2 Weeks', getValue: () => format(addWeeks(new Date(), 2), 'yyyy-MM-dd') },
  { label: '1 Month', getValue: () => format(addMonths(new Date(), 1), 'yyyy-MM-dd') },
  { label: '3 Months', getValue: () => format(addMonths(new Date(), 3), 'yyyy-MM-dd') },
]

const EXTEND_PRESETS = [
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
]

const ACTION_ICONS: Record<DispositionAction, React.ElementType> = {
  archive: Archive,
  delete: Trash2,
  extend: Clock,
  review: FileText,
  transfer: ChevronDown,
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BulkActionPanel({
  selectedCount,
  selectedItems,
  onApproveAll,
  onRejectAll,
  onDeferAll,
  onExtendAll,
  onCancelAll,
  onClearSelection,
  processing = false,
  canApprove = true,
}: BulkActionPanelProps) {
  // State
  const [activeAction, setActiveAction] = useState<ActionType>(null)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [deferDate, setDeferDate] = useState('')
  const [extendDays, setExtendDays] = useState<number>(30)
  const [showConfirm, setShowConfirm] = useState(false)

  // Action breakdown
  const actionBreakdown = selectedItems.reduce(
    (acc, item) => {
      acc[item.scheduledAction] = (acc[item.scheduledAction] || 0) + 1
      return acc
    },
    {} as Record<DispositionAction, number>
  )

  const hasDeleteActions = actionBreakdown.delete > 0
  const hasCriticalItems = selectedItems.some((i) => i.priority === 'critical')

  // Reset form
  const resetForm = useCallback(() => {
    setActiveAction(null)
    setNotes('')
    setReason('')
    setDeferDate('')
    setExtendDays(30)
    setShowConfirm(false)
  }, [])

  // Handle action execution
  const handleExecute = useCallback(async () => {
    if (processing) return

    try {
      switch (activeAction) {
        case 'approve':
          await onApproveAll?.(notes || undefined)
          break
        case 'reject':
          if (!reason.trim()) return
          await onRejectAll?.(reason)
          break
        case 'defer':
          if (!deferDate) return
          await onDeferAll?.(deferDate, reason || undefined)
          break
        case 'extend':
          if (!extendDays) return
          await onExtendAll?.(extendDays, reason || undefined)
          break
        case 'cancel':
          if (!reason.trim()) return
          await onCancelAll?.(reason)
          break
      }
      resetForm()
    } catch (error) {
      console.error('Bulk action failed:', error)
    }
  }, [
    activeAction,
    processing,
    notes,
    reason,
    deferDate,
    extendDays,
    onApproveAll,
    onRejectAll,
    onDeferAll,
    onExtendAll,
    onCancelAll,
    resetForm,
  ])

  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Main Panel */}
        <div className="flex items-center gap-4 px-6 py-4">
          {/* Selection Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {selectedCount}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {Object.entries(actionBreakdown).map(([action, count]) => {
                  const colors = getDispositionActionColor(action as DispositionAction)
                  return (
                    <span
                      key={action}
                      className={cn('px-1.5 py-0.5 rounded', colors.bg, colors.text)}
                    >
                      {count} {getDispositionActionLabel(action as DispositionAction).toLowerCase()}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

          {/* Action Buttons */}
          {canApprove && (
            <>
              <button
                onClick={() => setActiveAction(activeAction === 'approve' ? null : 'approve')}
                disabled={processing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  activeAction === 'approve'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Approve</span>
              </button>

              <button
                onClick={() => setActiveAction(activeAction === 'reject' ? null : 'reject')}
                disabled={processing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  activeAction === 'reject'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Reject</span>
              </button>

              <button
                onClick={() => setActiveAction(activeAction === 'defer' ? null : 'defer')}
                disabled={processing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  activeAction === 'defer'
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Defer</span>
              </button>

              <button
                onClick={() => setActiveAction(activeAction === 'extend' ? null : 'extend')}
                disabled={processing}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
                  activeAction === 'extend'
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                )}
              >
                <Clock className="w-5 h-5" />
                <span className="font-medium">Extend</span>
              </button>
            </>
          )}

          {/* Divider */}
          <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />

          {/* Clear Selection */}
          <button
            onClick={onClearSelection}
            disabled={processing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Clear selection"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Action Details Panel */}
        {activeAction && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
            {/* Warnings */}
            {(hasDeleteActions || hasCriticalItems) && activeAction === 'approve' && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    {hasDeleteActions && (
                      <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                        {actionBreakdown.delete} document{actionBreakdown.delete !== 1 ? 's' : ''}{' '}
                        will be permanently deleted
                      </p>
                    )}
                    {hasCriticalItems && (
                      <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                        Selection includes critical priority items
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Approve Form */}
            {activeAction === 'approve' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add approval notes..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {activeAction === 'reject' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    placeholder="Explain why these items are being rejected..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={processing || !reason.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Reject {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Defer Form */}
            {activeAction === 'defer' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Defer Until <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={deferDate}
                      onChange={(e) => setDeferDate(e.target.value)}
                      min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                    />
                    <div className="flex items-center gap-1">
                      {DEFER_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => setDeferDate(preset.getValue())}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why are these being deferred?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={processing || !deferDate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    Defer {selectedCount} Item{selectedCount !== 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Extend Form */}
            {activeAction === 'extend' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Extension Period <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {EXTEND_PRESETS.map((preset) => (
                        <button
                          key={preset.days}
                          onClick={() => setExtendDays(preset.days)}
                          className={cn(
                            'px-3 py-2 text-sm rounded-lg transition-colors',
                            extendDays === preset.days
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">or</span>
                    <input
                      type="number"
                      value={extendDays}
                      onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
                      min={1}
                      max={3650}
                      className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white text-sm"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">days</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Why is the retention being extended?"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecute}
                    disabled={processing || !extendDays}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
                  >
                    {processing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    Extend by {extendDays} Days
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BulkActionPanel
