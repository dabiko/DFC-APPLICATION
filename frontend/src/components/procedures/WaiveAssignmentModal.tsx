/**
 * WaiveAssignmentModal — Confirmation modal before waiving a procedure assignment.
 * Shows assignee details and requires a reason.
 */

import { useState, useEffect } from 'react'
import { XCircle, X, Loader2, AlertTriangle, User, Mail, Clock, CheckCircle } from 'lucide-react'

interface WaiveAssignmentModalProps {
  isOpen: boolean
  assigneeName: string
  assigneeEmail: string
  procedureTitle: string
  versionNumber: number
  dueDate: string | null
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function WaiveAssignmentModal({
  isOpen,
  assigneeName,
  assigneeEmail,
  procedureTitle,
  versionNumber,
  dueDate,
  onClose,
  onConfirm,
}: WaiveAssignmentModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
      setIsLoading(false)
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      setError('Please provide a reason for waiving this assignment.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm(reason.trim())
      setSuccess(true)
      setIsLoading(false)
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to waive assignment'
      )
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && !success) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waive-assignment-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2
              id="waive-assignment-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Waive Assignment
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success state */}
        {success && (
          <div className="px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Assignment Waived
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {assigneeName} has been notified and the assignment has been removed.
            </p>
          </div>
        )}

        {/* Body */}
        {!success && (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4">
              {/* Warning */}
              <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                      This will remove the assignment
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      The assignee will be notified and will no longer see this procedure under
                      their training. This action is recorded in the audit log.
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignee details */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Assignee
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {assigneeName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {assigneeName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Mail className="h-3 w-3" />
                      {assigneeEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Procedure details */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Assignment Details
                  </p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Procedure:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {procedureTitle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Version:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      v{versionNumber}
                    </span>
                  </div>
                  {dueDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-500 dark:text-gray-400">Due:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(dueDate + 'T12:00:00').toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reason input */}
              <div>
                <label
                  htmlFor="waive-reason"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  Reason for waiving <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="waive-reason"
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value)
                    setError(null)
                  }}
                  disabled={isLoading}
                  rows={3}
                  placeholder="e.g., Assigned by mistake, employee transferred to another department..."
                  className={`
                  w-full px-3 py-2 border rounded-lg text-sm
                  bg-white dark:bg-gray-900
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-red-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                `}
                  autoFocus
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !reason.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Waiving...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Waive Assignment
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
