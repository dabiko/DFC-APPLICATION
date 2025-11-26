/**
 * ShareDocumentModal Component
 * Modal for creating and managing document shares with permissions, expiry, and link generation
 */

import { FC, useState, useEffect, useCallback } from 'react'
import {
  XMarkIcon,
  ShareIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  LockClosedIcon,
  CalendarIcon,
  UserGroupIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { FileListItem } from '@/types/fileManagement'
import {
  createShare,
  getSharesForDocument,
  revokeShare,
  type Share,
  type SharePermission,
  type CreateShareRequest,
  PERMISSION_LABELS,
  PERMISSION_DESCRIPTIONS,
} from '@/services/shareService'
import { toast } from '@/utils/toast'

export interface ShareDocumentModalProps {
  isOpen: boolean
  item: FileListItem | null
  onClose: () => void
  onShareCreated?: (share: Share) => void
}

interface PermissionOption {
  value: SharePermission
  label: string
  description: string
  icon: React.ReactNode
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'VIEW_ONLY',
    label: PERMISSION_LABELS.VIEW_ONLY,
    description: PERMISSION_DESCRIPTIONS.VIEW_ONLY,
    icon: <EyeIcon className="w-5 h-5" />,
  },
  {
    value: 'VIEW_DOWNLOAD',
    label: PERMISSION_LABELS.VIEW_DOWNLOAD,
    description: PERMISSION_DESCRIPTIONS.VIEW_DOWNLOAD,
    icon: <ArrowDownTrayIcon className="w-5 h-5" />,
  },
  {
    value: 'VIEW_DOWNLOAD_COMMENT',
    label: PERMISSION_LABELS.VIEW_DOWNLOAD_COMMENT,
    description: PERMISSION_DESCRIPTIONS.VIEW_DOWNLOAD_COMMENT,
    icon: <ChatBubbleLeftRightIcon className="w-5 h-5" />,
  },
]

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'Never expires' },
]

export const ShareDocumentModal: FC<ShareDocumentModalProps> = ({
  isOpen,
  item,
  onClose,
  onShareCreated,
}) => {
  // Form state
  const [permission, setPermission] = useState<SharePermission>('VIEW_ONLY')
  const [expiryDays, setExpiryDays] = useState<number>(7)
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [recipientEmails, setRecipientEmails] = useState('')
  const [maxAccessCount, setMaxAccessCount] = useState<string>('')
  const [notes, setNotes] = useState('')

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShare, setCreatedShare] = useState<Share | null>(null)
  const [copied, setCopied] = useState(false)

  // Existing shares
  const [existingShares, setExistingShares] = useState<Share[]>([])
  const [loadingShares, setLoadingShares] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('create')

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen && item && !item.isShortcut) {
      loadExistingShares()
    }
  }, [isOpen, item])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPermission('VIEW_ONLY')
      setExpiryDays(7)
      setPassword('')
      setUsePassword(false)
      setRecipientEmails('')
      setMaxAccessCount('')
      setNotes('')
      setError(null)
      setCreatedShare(null)
      setCopied(false)
      setActiveTab('create')
    }
  }, [isOpen])

  const loadExistingShares = async () => {
    if (!item) return

    setLoadingShares(true)
    try {
      const docId = item.isShortcut ? item.originalDocumentId : item.id
      if (docId) {
        const shares = await getSharesForDocument(docId)
        setExistingShares(shares.filter((s) => s.is_active && !s.is_expired))
      }
    } catch (error) {
      console.error('Failed to load existing shares:', error)
    } finally {
      setLoadingShares(false)
    }
  }

  const handleCreateShare = async () => {
    if (!item) return

    setIsCreating(true)
    setError(null)

    try {
      const docId = item.isShortcut ? item.originalDocumentId : item.id
      if (!docId) {
        setError('Invalid document')
        return
      }

      // Parse recipient emails
      const emails = recipientEmails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      const shareData: CreateShareRequest = {
        document: docId,
        permission,
        allow_public_access: true,
      }

      if (expiryDays > 0) {
        shareData.expires_in_days = expiryDays
      }

      if (usePassword && password) {
        shareData.password = password
      }

      if (emails.length > 0) {
        shareData.recipient_emails = emails
      }

      if (maxAccessCount && parseInt(maxAccessCount) > 0) {
        shareData.max_access_count = parseInt(maxAccessCount)
      }

      if (notes) {
        shareData.notes = notes
      }

      const share = await createShare(shareData)
      setCreatedShare(share)
      onShareCreated?.(share)
      toast.success('Share link created successfully')

      // Reload existing shares
      loadExistingShares()
    } catch (err) {
      console.error('Failed to create share:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to create share link'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyLink = useCallback(async () => {
    if (!createdShare?.share_url) return

    try {
      // Generate full URL
      const fullUrl = `${window.location.origin}${createdShare.share_url}`
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link to clipboard')
    }
  }, [createdShare])

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeShare(shareId)
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId))
      toast.success('Share link revoked successfully')
    } catch (error) {
      console.error('Failed to revoke share:', error)
      toast.error('Failed to revoke share link')
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onClose()
    }
  }

  if (!isOpen || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-document-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ShareIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="share-document-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Share Document
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Create New Link
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'existing'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Existing Shares ({existingShares.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Document info */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.path || 'Root'}</p>
          </div>

          {activeTab === 'create' && !createdShare && (
            <div className="space-y-6">
              {/* Permission Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <UserGroupIcon className="w-4 h-4 inline mr-2" />
                  Permission Level
                </label>
                <div className="space-y-2">
                  {PERMISSION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${
                          permission === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="permission"
                        value={option.value}
                        checked={permission === option.value}
                        onChange={() => setPermission(option.value)}
                        className="mt-0.5"
                      />
                      <div className="flex-shrink-0 text-gray-500">{option.icon}</div>
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
              </div>

              {/* Expiry Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  Link Expiration
                </label>
                <select
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password Protection */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <LockClosedIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password protect this link
                  </span>
                </label>
                {usePassword && (
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                )}
              </div>

              {/* Max Access Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum access count (optional)
                </label>
                <input
                  type="number"
                  value={maxAccessCount}
                  onChange={(e) => setMaxAccessCount(e.target.value)}
                  placeholder="Unlimited"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Recipient Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Send notification to (optional)
                </label>
                <textarea
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  placeholder="Enter email addresses (comma or newline separated)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Share created success */}
          {activeTab === 'create' && createdShare && (
            <div className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Share Link Created!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Anyone with this link can access the document
                </p>
              </div>

              {/* Share URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-mono">
                    {`${window.location.origin}${createdShare.share_url}`}
                  </p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`
                    px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                    ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 text-white'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>

              {/* Share details */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Permission:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {PERMISSION_LABELS[createdShare.permission]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {createdShare.expires_at
                      ? new Date(createdShare.expires_at).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                {createdShare.is_password_protected && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Password protected:</span>
                    <span className="text-gray-900 dark:text-gray-100">Yes</span>
                  </div>
                )}
                {createdShare.max_access_count && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Max accesses:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {createdShare.max_access_count}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCreatedShare(null)}
                className="w-full px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Create Another Link
              </button>
            </div>
          )}

          {/* Existing shares tab */}
          {activeTab === 'existing' && (
            <div className="space-y-3">
              {loadingShares ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : existingShares.length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No active share links for this document
                  </p>
                </div>
              ) : (
                existingShares.map((share) => (
                  <div
                    key={share.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {PERMISSION_LABELS[share.permission]}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Created {new Date(share.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Revoke share"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {share.is_password_protected && (
                        <span className="flex items-center gap-1">
                          <LockClosedIcon className="w-3 h-3" />
                          Password
                        </span>
                      )}
                      <span>
                        {share.access_count} view{share.access_count !== 1 ? 's' : ''}
                      </span>
                      {share.expires_at && (
                        <span>Expires {new Date(share.expires_at).toLocaleDateString()}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${share.share_url}`}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded border-0"
                      />
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${window.location.origin}${share.share_url}`
                            )
                            toast.success('Link copied to clipboard')
                          } catch {
                            toast.error('Failed to copy link')
                          }
                        }}
                        className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                        title="Copy link"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={handleClose}
            disabled={isCreating}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
          >
            {createdShare ? 'Done' : 'Cancel'}
          </button>
          {activeTab === 'create' && !createdShare && (
            <button
              type="button"
              onClick={handleCreateShare}
              disabled={isCreating || (usePassword && !password)}
              className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isCreating ? (
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
                  Creating...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4" />
                  Create Share Link
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
