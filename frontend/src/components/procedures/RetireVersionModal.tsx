/**
 * RetireVersionModal — Confirmation modal before retiring a procedure version.
 * Warns if this is the last active version (which retires the entire procedure).
 */

import { useState, useEffect } from 'react'
import { Archive, X, Loader2, AlertTriangle } from 'lucide-react'

interface RetireVersionModalProps {
  isOpen: boolean
  procedureTitle: string
  versionNumber: number
  isLastActiveVersion: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function RetireVersionModal({
  isOpen,
  procedureTitle,
  versionNumber,
  isLastActiveVersion,
  onClose,
  onConfirm,
}: RetireVersionModalProps) {
  const [reason, setReason] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reason.trim()) {
      setError('Please provide a reason for retiring this version.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm(reason.trim())
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to retire version'
      )
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="retire-version-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
              <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h2
              id="retire-version-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Retire Version
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

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              You are about to retire <span className="font-medium">v{versionNumber}</span> of this
              procedure. Retired versions can no longer be assigned to users.
            </p>

            {/* Warning if last active version */}
            {isLastActiveVersion && (
              <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800 dark:text-red-200 text-sm">
                      This is the last active version
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Retiring this version will change the entire procedure status to{' '}
                      <span className="font-semibold">Retired</span>. No users will be able to be
                      assigned to this procedure until a new version is published.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Version details */}
            <div className="space-y-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Procedure: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {procedureTitle}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Version: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  v{versionNumber}
                </span>
              </div>
            </div>

            {/* Reason input */}
            <div>
              <label
                htmlFor="retire-reason"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Reason for retirement <span className="text-red-500">*</span>
              </label>
              <textarea
                id="retire-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                rows={3}
                placeholder="e.g., Superseded by updated compliance requirements..."
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm
                  bg-white dark:bg-gray-900
                  text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-amber-500
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retiring...
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  Retire Version
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
