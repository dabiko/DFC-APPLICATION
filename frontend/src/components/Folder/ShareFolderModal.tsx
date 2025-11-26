/**
 * ShareFolderModal Component
 * Enterprise-grade folder sharing with granular permission controls
 *
 * Folder permissions are different from document permissions:
 * - VIEW: Can see folder contents and navigate
 * - CONTRIBUTE: Can add files/folders but not modify existing
 * - EDIT: Can modify contents (add, edit, delete files/subfolders)
 * - FULL_CONTROL: All permissions including manage sharing and folder settings
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
  PlusIcon,
  FolderIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'

export interface ShareFolderModalProps {
  isOpen: boolean
  folder: Folder | null
  onClose: () => void
  onShareCreated?: (share: FolderShareData) => void
}

export type FolderPermissionLevel = 'VIEW' | 'CONTRIBUTE' | 'EDIT' | 'FULL_CONTROL'

export interface FolderShareData {
  id: string
  folderId: string
  permission: FolderPermissionLevel
  recipientEmails: string[]
  expiresAt: string | null
  shareUrl: string
  isPasswordProtected: boolean
  includeSubfolders: boolean
  createdAt: string
}

interface PermissionOption {
  value: FolderPermissionLevel
  label: string
  description: string
  icon: React.ReactNode
  capabilities: string[]
}

const FOLDER_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'VIEW',
    label: 'View',
    description: 'Can view folder contents and download files',
    icon: <EyeIcon className="w-5 h-5" />,
    capabilities: ['View folder contents', 'Download files', 'Navigate subfolders'],
  },
  {
    value: 'CONTRIBUTE',
    label: 'Contribute',
    description: 'Can add new files and folders',
    icon: <PlusIcon className="w-5 h-5" />,
    capabilities: ['All View permissions', 'Upload files', 'Create subfolders'],
  },
  {
    value: 'EDIT',
    label: 'Edit',
    description: 'Can modify, rename, and delete contents',
    icon: <PencilIcon className="w-5 h-5" />,
    capabilities: ['All Contribute permissions', 'Rename items', 'Move items', 'Delete items'],
  },
  {
    value: 'FULL_CONTROL',
    label: 'Full Control',
    description: 'Complete control including sharing and settings',
    icon: <Cog6ToothIcon className="w-5 h-5" />,
    capabilities: [
      'All Edit permissions',
      'Manage sharing',
      'Change folder settings',
      'Set permissions',
    ],
  },
]

const EXPIRY_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Never expires' },
]

export const ShareFolderModal: FC<ShareFolderModalProps> = ({
  isOpen,
  folder,
  onClose,
  onShareCreated,
}) => {
  // Form state
  const [permission, setPermission] = useState<FolderPermissionLevel>('VIEW')
  const [expiryDays, setExpiryDays] = useState<number>(30)
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [recipientEmails, setRecipientEmails] = useState('')
  const [includeSubfolders, setIncludeSubfolders] = useState(true)
  const [_notes, setNotes] = useState('')

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShare, setCreatedShare] = useState<FolderShareData | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('create')

  // Existing shares (mock data for now)
  const [existingShares, setExistingShares] = useState<FolderShareData[]>([])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setPermission('VIEW')
      setExpiryDays(30)
      setPassword('')
      setUsePassword(false)
      setRecipientEmails('')
      setIncludeSubfolders(true)
      setNotes('')
      setError(null)
      setCreatedShare(null)
      setCopied(false)
      setActiveTab('create')
    }
  }, [isOpen])

  const handleCreateShare = async () => {
    if (!folder) return

    setIsCreating(true)
    setError(null)

    try {
      // Parse recipient emails
      const emails = recipientEmails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      // Validate emails
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emails.filter((e) => !emailRegex.test(e))
      if (invalidEmails.length > 0) {
        setError(`Invalid email addresses: ${invalidEmails.join(', ')}`)
        setIsCreating(false)
        return
      }

      // TODO: Call backend API to create folder share
      // For now, create mock share data
      const mockShare: FolderShareData = {
        id: crypto.randomUUID(),
        folderId: folder.id,
        permission,
        recipientEmails: emails,
        expiresAt:
          expiryDays > 0
            ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
            : null,
        shareUrl: `/api/v1/folder-shares/public/${crypto.randomUUID().slice(0, 8)}/`,
        isPasswordProtected: usePassword && password.length > 0,
        includeSubfolders,
        createdAt: new Date().toISOString(),
      }

      setCreatedShare(mockShare)
      onShareCreated?.(mockShare)

      // Add to existing shares
      setExistingShares((prev) => [mockShare, ...prev])
    } catch (err) {
      console.error('Failed to create folder share:', err)
      setError(err instanceof Error ? err.message : 'Failed to create share link')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopyLink = useCallback(async () => {
    if (!createdShare?.shareUrl) return

    try {
      const fullUrl = `${window.location.origin}${createdShare.shareUrl}`
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }, [createdShare])

  const handleRevokeShare = async (shareId: string) => {
    // TODO: Call backend API to revoke share
    setExistingShares((prev) => prev.filter((s) => s.id !== shareId))
  }

  const handleClose = () => {
    if (!isCreating) {
      onClose()
    }
  }

  const getPermissionLabel = (perm: FolderPermissionLevel): string => {
    return FOLDER_PERMISSION_OPTIONS.find((o) => o.value === perm)?.label || perm
  }

  if (!isOpen || !folder) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-folder-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <ShareIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="share-folder-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Share Folder
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
            Create New Share
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'existing'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Active Shares ({existingShares.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Folder info */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center gap-3">
            <FolderIcon className="w-8 h-8 text-primary-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{folder.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{folder.path}</p>
            </div>
            {folder.isLocked && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                <LockClosedIcon className="w-3 h-3" />
                Locked
              </span>
            )}
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
                  {FOLDER_PERMISSION_OPTIONS.map((option) => (
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
                        {permission === option.value && (
                          <ul className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {option.capabilities.map((cap, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <CheckIcon className="w-3 h-3 text-green-500" />
                                {cap}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Include Subfolders */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSubfolders}
                    onChange={(e) => setIncludeSubfolders(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <FolderIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Include all subfolders and their contents
                  </span>
                </label>
                <p className="ml-6 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Permissions will apply to all nested folders and files
                </p>
              </div>

              {/* Expiry Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  Share Expiration
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
                    Require password to access
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

              {/* Recipient Emails */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invite people (optional)
                </label>
                <textarea
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  placeholder="Enter email addresses (comma or newline separated)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  An email notification with the share link will be sent to these addresses
                </p>
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
                  Folder Share Created!
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Share this link to grant{' '}
                  {getPermissionLabel(createdShare.permission).toLowerCase()} access
                </p>
              </div>

              {/* Share URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate font-mono">
                    {`${window.location.origin}${createdShare.shareUrl}`}
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
                    {getPermissionLabel(createdShare.permission)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Includes subfolders:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {createdShare.includeSubfolders ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Expires:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {createdShare.expiresAt
                      ? new Date(createdShare.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </span>
                </div>
                {createdShare.isPasswordProtected && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Password protected:</span>
                    <span className="text-gray-900 dark:text-gray-100">Yes</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => setCreatedShare(null)}
                className="w-full px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                Create Another Share
              </button>
            </div>
          )}

          {/* Existing shares tab */}
          {activeTab === 'existing' && (
            <div className="space-y-3">
              {existingShares.length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    No active shares for this folder
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
                          {getPermissionLabel(share.permission)} Access
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Created {new Date(share.createdAt).toLocaleDateString()}
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
                      {share.isPasswordProtected && (
                        <span className="flex items-center gap-1">
                          <LockClosedIcon className="w-3 h-3" />
                          Password
                        </span>
                      )}
                      {share.includeSubfolders && (
                        <span className="flex items-center gap-1">
                          <FolderIcon className="w-3 h-3" />
                          Subfolders
                        </span>
                      )}
                      {share.expiresAt && (
                        <span>Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}${share.shareUrl}`}
                        className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded border-0"
                      />
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            `${window.location.origin}${share.shareUrl}`
                          )
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
