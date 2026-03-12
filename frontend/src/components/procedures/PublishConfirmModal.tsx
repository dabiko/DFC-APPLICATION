/**
 * PublishConfirmModal — Confirmation modal before publishing a procedure.
 * Shows publish details (effective date, expiry, changelog) and requires explicit confirmation.
 */

import { Rocket, X, Loader2 } from 'lucide-react'

interface PublishConfirmModalProps {
  isOpen: boolean
  procedureTitle: string
  versionNumber: number
  effectiveFrom: string
  expiresOn?: string
  changelog?: string
  isLoading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function PublishConfirmModal({
  isOpen,
  procedureTitle,
  versionNumber,
  effectiveFrom,
  expiresOn,
  changelog,
  isLoading,
  onClose,
  onConfirm,
}: PublishConfirmModalProps) {
  if (!isOpen) return null

  const handleClose = () => {
    if (!isLoading) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-confirm-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Rocket className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h2
              id="publish-confirm-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Publish Procedure
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
        <div className="px-6 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            You are about to publish this procedure. Once published, an immutable version snapshot
            will be created and the procedure will be available for assignment.
          </p>

          {/* Publish details */}
          <div className="space-y-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Procedure: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{procedureTitle}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Version: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">v{versionNumber}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Effective from: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{effectiveFrom}</span>
            </div>
            {expiresOn && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Expires on: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{expiresOn}</span>
              </div>
            )}
            {changelog && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Changelog: </span>
                <span className="text-gray-900 dark:text-gray-100">{changelog}</span>
              </div>
            )}
          </div>
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
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Confirm & Publish
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
