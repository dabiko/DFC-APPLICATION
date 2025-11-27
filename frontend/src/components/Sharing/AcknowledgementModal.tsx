/**
 * AcknowledgementModal Component
 * Modal for acknowledging confidential document access requirements before accepting a share invitation.
 *
 * Features:
 * - Display acknowledgement text from share invitation
 * - Checkbox to confirm understanding
 * - Accept/Decline buttons
 * - Blocks acceptance until acknowledged
 */

import { FC, useState } from 'react'
import {
  XMarkIcon,
  ShieldExclamationIcon,
  CheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import type { ShareInvitation, PermissionLevel } from '@/services/sharedWithMeService'

export interface AcknowledgementModalProps {
  isOpen: boolean
  invitation: ShareInvitation | null
  onAccept: (acknowledged: boolean) => Promise<void>
  onDecline: () => Promise<void>
  onClose: () => void
}

// Get permission label
const getPermissionLabel = (level: PermissionLevel): string => {
  const labels: Record<PermissionLevel, string> = {
    VIEW: 'View Only',
    COMMENT: 'Can Comment',
    EDIT: 'Can Edit',
    FULL: 'Full Access',
  }
  return labels[level] || level
}

export const AcknowledgementModal: FC<AcknowledgementModalProps> = ({
  isOpen,
  invitation,
  onAccept,
  onDecline,
  onClose,
}) => {
  const [acknowledged, setAcknowledged] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleAccept = async () => {
    if (!acknowledged) return

    setIsProcessing(true)
    try {
      await onAccept(true)
      onClose()
    } catch (error) {
      console.error('Failed to accept invitation:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDecline = async () => {
    setIsProcessing(true)
    try {
      await onDecline()
      onClose()
    } catch (error) {
      console.error('Failed to decline invitation:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    if (!isProcessing) {
      setAcknowledged(false)
      onClose()
    }
  }

  if (!isOpen || !invitation) return null

  const isDocument = invitation.resource_type === 'DOCUMENT'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="acknowledgement-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldExclamationIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2
                id="acknowledgement-title"
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                Acknowledgement Required
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Please review before accepting
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Resource info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDocument
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                }`}
              >
                {isDocument ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {invitation.resource_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getPermissionLabel(invitation.permission_level)} access from
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {invitation.invited_by.first_name} {invitation.invited_by.last_name}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Warning banner */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  This {isDocument ? 'document' : 'folder'} contains confidential information
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You must acknowledge the following before access is granted.
                </p>
              </div>
            </div>
          </div>

          {/* Acknowledgement text */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {invitation.acknowledgement_text ||
                `By accepting this share, I acknowledge that:

• I understand this ${isDocument ? 'document' : 'folder'} contains confidential information
• I will only use this information for authorized purposes
• I will not share this information with unauthorized individuals
• I will comply with all applicable data protection and confidentiality policies`}
            </p>
          </div>

          {/* Acknowledgement checkbox */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  acknowledged
                    ? 'bg-green-600 border-green-600'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
                }`}
              >
                {acknowledged && <CheckIcon className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I have read and understood the above acknowledgement requirements. I agree to comply
              with all stated terms and conditions.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          <button
            type="button"
            onClick={handleDecline}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <XCircleIcon className="w-4 h-4" />
            Decline
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isProcessing || !acknowledged}
            className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Accept & Acknowledge
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AcknowledgementModal
