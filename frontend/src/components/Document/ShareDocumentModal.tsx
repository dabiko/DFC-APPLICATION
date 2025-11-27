/**
 * ShareDocumentModal Component
 * Modal for creating and managing document shares with permissions, expiry, and link generation
 *
 * Supports two sharing modes:
 * 1. Share with Users - Share directly with internal users (creates SharedItemAccess)
 * 2. Create Link - Generate a shareable link with optional password protection
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
  MagnifyingGlassIcon,
  UserPlusIcon,
  EnvelopeIcon,
  PencilIcon,
  Cog6ToothIcon,
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
import {
  shareWithUsers,
  type PermissionLevel,
  type ShareWithUsersRequest,
} from '@/services/sharedWithMeService'
import { getShareableUsers, type ShareableUser } from '@/services/favoritesService'
import { toast } from '@/utils/toast'

export interface ShareDocumentModalProps {
  isOpen: boolean
  item: FileListItem | null
  onClose: () => void
  onShareCreated?: (share: Share) => void
}

interface LinkPermissionOption {
  value: SharePermission
  label: string
  description: string
  icon: React.ReactNode
}

interface UserPermissionOption {
  value: PermissionLevel
  label: string
  description: string
  icon: React.ReactNode
}

const LINK_PERMISSION_OPTIONS: LinkPermissionOption[] = [
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

const USER_PERMISSION_OPTIONS: UserPermissionOption[] = [
  {
    value: 'VIEW',
    label: 'View',
    description: 'Can view and download the document',
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
    description: 'Can view, download, comment, and edit metadata',
    icon: <PencilIcon className="w-5 h-5" />,
  },
  {
    value: 'FULL',
    label: 'Full Access',
    description: 'Full access including sharing and deletion',
    icon: <Cog6ToothIcon className="w-5 h-5" />,
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
  // Tab state
  const [activeTab, setActiveTab] = useState<'users' | 'link' | 'existing'>('users')

  // Form state for link sharing
  const [linkPermission, setLinkPermission] = useState<SharePermission>('VIEW_ONLY')
  const [expiryDays, setExpiryDays] = useState<number>(7)
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [recipientEmails, setRecipientEmails] = useState('')
  const [maxAccessCount, setMaxAccessCount] = useState<string>('')
  const [notes, setNotes] = useState('')

  // Form state for user sharing
  const [userPermission, setUserPermission] = useState<PermissionLevel>('VIEW')
  const [message, setMessage] = useState('')
  const [requireAcceptance, setRequireAcceptance] = useState(false)
  const [notifyUsers, setNotifyUsers] = useState(true)
  const [requireAcknowledgement, setRequireAcknowledgement] = useState(false)
  const [acknowledgementText, setAcknowledgementText] = useState('')

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ShareableUser[]>([])
  const [selectedUsers, setSelectedUsers] = useState<ShareableUser[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShare, setCreatedShare] = useState<Share | null>(null)
  const [copied, setCopied] = useState(false)

  // Existing shares
  const [existingShares, setExistingShares] = useState<Share[]>([])
  const [loadingShares, setLoadingShares] = useState(false)

  const loadExistingShares = useCallback(async () => {
    if (!item) return

    setLoadingShares(true)
    try {
      const docId = item.isShortcut ? item.originalDocumentId : item.id
      if (docId) {
        const shares = await getSharesForDocument(docId)
        setExistingShares(shares.filter((s) => s.is_active && !s.is_expired))
      }
    } catch (err) {
      console.error('Failed to load existing shares:', err)
    } finally {
      setLoadingShares(false)
    }
  }, [item])

  // Load existing shares when modal opens
  useEffect(() => {
    if (isOpen && item && !item.isShortcut) {
      loadExistingShares()
    }
  }, [isOpen, item, loadExistingShares])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('users')
      setLinkPermission('VIEW_ONLY')
      setUserPermission('VIEW')
      setExpiryDays(7)
      setPassword('')
      setUsePassword(false)
      setRecipientEmails('')
      setMaxAccessCount('')
      setNotes('')
      setMessage('')
      setRequireAcceptance(false)
      setNotifyUsers(true)
      setRequireAcknowledgement(false)
      setAcknowledgementText('')
      setUserSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
      setError(null)
      setCreatedShare(null)
      setCopied(false)
    }
  }, [isOpen])

  // Search users with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const users = await getShareableUsers(userSearchQuery)
        // Filter out already selected users
        const selectedIds = new Set(selectedUsers.map((u) => u.id))
        setSearchResults(users.filter((u) => !selectedIds.has(u.id)))
      } catch (err) {
        console.error('Failed to search users:', err)
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [userSearchQuery, selectedUsers])

  // Handle user selection
  const handleSelectUser = useCallback((user: ShareableUser) => {
    setSelectedUsers((prev) => [...prev, user])
    setUserSearchQuery('')
    setSearchResults([])
  }, [])

  // Handle user removal
  const handleRemoveUser = useCallback((userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  // Handle share with users
  const handleShareWithUsers = async () => {
    if (!item || selectedUsers.length === 0) return

    setIsCreating(true)
    setError(null)

    try {
      const docId = item.isShortcut ? item.originalDocumentId : item.id
      if (!docId) {
        setError('Invalid document')
        return
      }

      const request: ShareWithUsersRequest = {
        document_id: docId,
        recipient_ids: selectedUsers.map((u) => String(u.id)),
        permission_level: userPermission,
        message: message || undefined,
        notify: notifyUsers,
        require_acceptance: requireAcceptance,
        require_acknowledgement: requireAcknowledgement,
        acknowledgement_text: requireAcknowledgement ? acknowledgementText || undefined : undefined,
      }

      if (expiryDays > 0) {
        request.expires_in_days = expiryDays
      }

      const response = await shareWithUsers(request)

      if (response.success) {
        toast.success(`Document shared with ${selectedUsers.length} user(s)`)
        setSelectedUsers([])
        setMessage('')
      }
    } catch (err) {
      console.error('Failed to share document:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to share document'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle link creation
  const handleCreateLink = async () => {
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
        permission: linkPermission,
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
    } catch (err) {
      console.error('Failed to copy link:', err)
      toast.error('Failed to copy link to clipboard')
    }
  }, [createdShare])

  const handleRevokeShare = async (shareId: string) => {
    try {
      await revokeShare(shareId)
      setExistingShares((prev) => prev.filter((s) => s.id !== shareId))
      toast.success('Share link revoked successfully')
    } catch (err) {
      console.error('Failed to revoke share:', err)
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
            onClick={() => setActiveTab('users')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <UserPlusIcon className="w-4 h-4" />
            Share with Users
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            Create Link
          </button>
          <button
            onClick={() => setActiveTab('existing')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'existing'
                ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            Links ({existingShares.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Document info */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.path || 'Root'}</p>
          </div>

          {/* Share with Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <UserGroupIcon className="w-4 h-4 inline mr-2" />
                  Add People
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                            {user.first_name[0]}
                            {user.last_name[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm"
                      >
                        {user.first_name} {user.last_name}
                        <button
                          onClick={() => handleRemoveUser(user.id)}
                          className="ml-1 hover:text-primary-900 dark:hover:text-primary-100"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Permission Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission Level
                </label>
                <select
                  value={userPermission}
                  onChange={(e) => setUserPermission(e.target.value as PermissionLevel)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {USER_PERMISSION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <EnvelopeIcon className="w-4 h-4 inline mr-2" />
                  Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a message for the recipients..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {/* Options */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifyUsers}
                    onChange={(e) => setNotifyUsers(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Send email notification
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireAcceptance}
                    onChange={(e) => setRequireAcceptance(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Require acceptance (invitation)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireAcknowledgement}
                    onChange={(e) => setRequireAcknowledgement(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Require acknowledgement (for confidential content)
                  </span>
                </label>
              </div>

              {/* Acknowledgement Text */}
              {requireAcknowledgement && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Acknowledgement Text (optional)
                  </label>
                  <textarea
                    value={acknowledgementText}
                    onChange={(e) => setAcknowledgementText(e.target.value)}
                    placeholder="Enter custom acknowledgement text that recipients must agree to..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Leave empty to use default confidentiality acknowledgement text.
                  </p>
                </div>
              )}

              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <CalendarIcon className="w-4 h-4 inline mr-2" />
                  Access Expiration
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

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Create Link Tab */}
          {activeTab === 'link' && !createdShare && (
            <div className="space-y-6">
              {/* Permission Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  <UserGroupIcon className="w-4 h-4 inline mr-2" />
                  Permission Level
                </label>
                <div className="space-y-2">
                  {LINK_PERMISSION_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                        ${
                          linkPermission === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="permission"
                        value={option.value}
                        checked={linkPermission === option.value}
                        onChange={() => setLinkPermission(option.value)}
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
          {activeTab === 'link' && createdShare && (
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

          {/* Share with Users button */}
          {activeTab === 'users' && (
            <button
              type="button"
              onClick={handleShareWithUsers}
              disabled={isCreating || selectedUsers.length === 0}
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
                  Sharing...
                </>
              ) : (
                <>
                  <UserPlusIcon className="w-4 h-4" />
                  Share with {selectedUsers.length || ''} User
                  {selectedUsers.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          )}

          {/* Create Link button */}
          {activeTab === 'link' && !createdShare && (
            <button
              type="button"
              onClick={handleCreateLink}
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
