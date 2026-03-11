/**
 * DeleteProcedureModal — Confirmation modal for deleting a procedure.
 * Requires typing the exact procedure name to confirm deletion.
 */

import { useState, useEffect } from 'react'
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteProcedureModalProps {
  isOpen: boolean
  procedureTitle: string
  procedureState: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteProcedureModal({
  isOpen,
  procedureTitle,
  procedureState,
  onClose,
  onConfirm,
}: DeleteProcedureModalProps) {
  const [confirmationText, setConfirmationText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setError(null)
      setIsLoading(false)
    }
  }, [isOpen])

  const isConfirmationValid = confirmationText === procedureTitle

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConfirmationValid) {
      setError('Procedure name does not match. Please type the exact name to confirm.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await onConfirm()
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to delete procedure'
      )
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) onClose()
  }

  if (!isOpen) return null

  const stateLabel =
    procedureState === 'in_review'
      ? 'In Review'
      : procedureState === 'draft'
        ? 'Draft'
        : procedureState

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-procedure-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2
              id="delete-procedure-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Delete Procedure
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
            {/* Warning */}
            <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 text-sm">
                    This action cannot be undone
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    This will permanently delete the procedure, all its steps, attachments, quizzes,
                    and any associated review data.
                  </p>
                </div>
              </div>
            </div>

            {/* Procedure details */}
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Procedure: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {procedureTitle}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Status: </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{stateLabel}</span>
              </div>
            </div>

            {/* Confirmation input */}
            <div>
              <label
                htmlFor="delete-confirmation"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type{' '}
                <span className="font-mono font-semibold text-red-600 dark:text-red-400">
                  {procedureTitle}
                </span>{' '}
                to confirm
              </label>
              <input
                id="delete-confirmation"
                type="text"
                value={confirmationText}
                onChange={(e) => {
                  setConfirmationText(e.target.value)
                  setError(null)
                }}
                disabled={isLoading}
                placeholder="Type procedure name here"
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
              disabled={isLoading || !isConfirmationValid}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Procedure
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
