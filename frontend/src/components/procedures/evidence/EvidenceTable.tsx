/**
 * EvidenceTable — Filterable evidence records table with expandable rows.
 */

import {
  Loader2,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import type { EvidenceRecord } from '@/services/evidenceService'
import { AttemptTimeline } from './AttemptTimeline'
import { cn } from '@/utils/cn'

interface EvidenceTableProps {
  evidence: EvidenceRecord[]
  loading: boolean
  error: string | null
  expandedId: string | null
  onToggleExpand: (id: string | null) => void
  onViewDetail?: (record: EvidenceRecord) => void
}

export function EvidenceTable({
  evidence,
  loading,
  error,
  expandedId,
  onToggleExpand,
  onViewDetail,
}: EvidenceTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
        <span className="ml-2 text-sm text-gray-500">Loading evidence...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (evidence.length === 0) {
    return (
      <div className="text-center py-12">
        <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No evidence records found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {evidence.map((record) => {
        const isExpanded = expandedId === record.id
        const assignment = record.assignment
        return (
          <div
            key={record.id}
            className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            {/* Summary Row */}
            <button
              onClick={() => onToggleExpand(isExpanded ? null : record.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {assignment.procedure_title}
                  </h3>
                  <span className="text-xs text-gray-400">v{assignment.version_number}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Trainee: {assignment.assigned_to_name} | Assigned by:{' '}
                  {assignment.assigned_by_name}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span
                  className={cn(
                    'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs',
                    assignment.status === 'completed'
                      ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                      : assignment.status === 'failed'
                        ? 'text-red-600 bg-red-100 dark:bg-red-900/30'
                        : 'text-gray-500 bg-gray-100 dark:bg-gray-700'
                  )}
                >
                  {assignment.status === 'completed' ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : assignment.status === 'failed' ? (
                    <XCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {assignment.status}
                </span>
                {assignment.completed_at && (
                  <span className="text-xs text-gray-400">
                    {new Date(assignment.completed_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4">
                {record.attempts.map((attempt, attemptIdx) => (
                  <AttemptTimeline key={attempt.id} attempt={attempt} index={attemptIdx} />
                ))}

                {record.attempts.length === 0 && (
                  <p className="text-xs text-gray-500 text-center py-2">
                    No training attempts recorded yet.
                  </p>
                )}

                {onViewDetail && (
                  <div className="text-center pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetail(record)
                      }}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      View full detail
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
