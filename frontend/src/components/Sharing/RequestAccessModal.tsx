/**
 * RequestAccessModal Component
 * Modal for requesting higher permission levels on a shared item.
 *
 * Features:
 * - Display current permission level
 * - Select requested permission level
 * - Provide reason for request
 * - Submit request to item owner
 */

import { FC, useState, useMemo } from 'react'
import {
  XMarkIcon,
  ArrowUpCircleIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  PencilIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import {
  requestAccess,
  type PermissionLevel,
  type SharedItemListItem,
} from '@/services/sharedWithMeService'
import { toast } from '@/utils/toast'

export interface RequestAccessModalProps {
  isOpen: boolean
  item: SharedItemListItem | null
  onClose: () => void
  onSuccess?: () => void
}

interface PermissionOption {
  value: PermissionLevel
  label: string
  description: string
  icon: React.ReactNode
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'VIEW',
    label: 'View Only',
    description: 'Can view and download',
    icon: <EyeIcon className="w-5 h-5" />,
  },
  {
    value: 'COMMENT',
    label: 'Comment',
    description: 'Can view, download, and comment',
    icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
  },
  {
    value: 'EDIT',
    label: 'Edit',
    description: 'Can view, download, comment, and edit',
    icon: <PencilIcon className="w-5 h-5" />,
  },
  {
    value: 'FULL',
    label: 'Full Access',
    description: 'Complete access including sharing',
    icon: <ShieldCheckIcon className="w-5 h-5" />,
  },
]

// Permission level order for comparison
const PERMISSION_ORDER: Record<PermissionLevel, number> = {
  VIEW: 1,
  COMMENT: 2,
  EDIT: 3,
  FULL: 4,
}

export const RequestAccessModal: FC<RequestAccessModalProps> = ({
  isOpen,
  item,
  onClose,
  onSuccess,
}) => {
  const [requestedPermission, setRequestedPermission] = useState<PermissionLevel | ''>('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  // Get available permission options (higher than current)
  const availableOptions = useMemo(() => {
    if (!item) return []

    const currentOrder = PERMISSION_ORDER[item.permission_level]
    return PERMISSION_OPTIONS.filter((opt) => PERMISSION_ORDER[opt.value] > currentOrder)
  }, [item])

  const handleSubmit = async () => {
    if (!item || !requestedPermission || !reason.trim()) return

    setIsSubmitting(true)
    try {
      const result = await requestAccess(item.id, requestedPermission, reason.trim())
      if (result.success) {
        setIsSuccess(true)
        toast.success('Access request submitted successfully')
        onSuccess?.()

        // Auto-close after showing success
        setTimeout(() => {
          handleClose()
        }, 2000)
      }
    } catch (error) {
      console.error('Failed to submit access request:', error)
      toast.error('Failed to submit access request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRequestedPermission('')
      setReason('')
      setIsSuccess(false)
      onClose()
    }
  }

  if (!isOpen || !item) return null

  const isDocument = item.resource_type === 'DOCUMENT'
  const currentOption = PERMISSION_OPTIONS.find((opt) => opt.value === item.permission_level)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="request-access-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ArrowUpCircleIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2
              id="request-access-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Request Higher Access
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isSuccess ? (
            // Success state
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <CheckCircleIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Request Submitted
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                The owner will be notified of your request. You'll receive a notification when they
                respond.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Item info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                      isDocument
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isDocument ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
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
                      {item.resource_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Shared by {item.shared_by_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current permission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Permission
                </label>
                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="text-gray-500 dark:text-gray-400">{currentOption?.icon}</div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {currentOption?.label}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentOption?.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Requested permission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Request Permission Level
                </label>
                {availableOptions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    You already have the highest permission level.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {availableOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          requestedPermission === option.value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="permission"
                          value={option.value}
                          checked={requestedPermission === option.value}
                          onChange={() => setRequestedPermission(option.value)}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            requestedPermission === option.value
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {requestedPermission === option.value && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">{option.icon}</div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {option.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {option.description}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Reason */}
              {availableOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for Request <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Please explain why you need higher access..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    This will be sent to the item owner for review.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {availableOptions.length > 0 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !requestedPermission || !reason.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <ArrowUpCircleIcon className="w-4 h-4" />
                    Submit Request
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestAccessModal
