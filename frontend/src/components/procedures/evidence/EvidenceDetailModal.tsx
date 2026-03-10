/**
 * EvidenceDetailModal — Full evidence record detail view in a modal.
 */

import { X, FileCheck } from 'lucide-react'
import type { EvidenceRecord } from '@/services/evidenceService'
import { AttemptTimeline } from './AttemptTimeline'
import { cn } from '@/utils/cn'

interface EvidenceDetailModalProps {
  record: EvidenceRecord | null
  isOpen: boolean
  onClose: () => void
}

export function EvidenceDetailModal({ record, isOpen, onClose }: EvidenceDetailModalProps) {
  if (!isOpen || !record) return null

  const a = record.assignment

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-lg bg-white w-full max-w-2xl max-h-[80vh] flex flex-col dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Evidence Detail</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Assignment Info */}
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {a.procedure_title}
              <span className="text-xs text-gray-400 ml-1 font-normal">v{a.version_number}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>
                <span className="font-medium">Trainee:</span> {a.assigned_to_name}
              </div>
              <div>
                <span className="font-medium">Assigned by:</span> {a.assigned_by_name}
              </div>
              <div>
                <span className="font-medium">Status:</span>{' '}
                <span
                  className={cn(
                    a.status === 'completed'
                      ? 'text-green-600'
                      : a.status === 'failed'
                        ? 'text-red-600'
                        : 'text-gray-600'
                  )}
                >
                  {a.status}
                </span>
              </div>
              <div>
                <span className="font-medium">Created:</span>{' '}
                {new Date(a.created_at).toLocaleDateString()}
              </div>
              {a.due_date && (
                <div>
                  <span className="font-medium">Due:</span>{' '}
                  {new Date(a.due_date).toLocaleDateString()}
                </div>
              )}
              {a.completed_at && (
                <div>
                  <span className="font-medium">Completed:</span>{' '}
                  {new Date(a.completed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>

          {/* Attempts */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Training Attempts ({record.attempts.length})
            </h3>
            {record.attempts.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No training attempts recorded yet.
              </p>
            ) : (
              <div className="space-y-3">
                {record.attempts.map((attempt, idx) => (
                  <AttemptTimeline key={attempt.id} attempt={attempt} index={idx} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
