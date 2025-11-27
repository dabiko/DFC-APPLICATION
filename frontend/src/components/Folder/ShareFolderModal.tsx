/**
 * ShareFolderModal Component
 * Enterprise-grade folder sharing with granular permission controls
 *
 * Supports two sharing modes:
 * 1. Share with Users - Share directly with internal users (creates SharedItemAccess)
 * 2. Create Link - Generate a shareable link with optional password protection
 *
 * Folder permissions:
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
  MagnifyingGlassIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'
import {
  shareWithUsers,
  type PermissionLevel,
  type ShareWithUsersRequest,
} from '@/services/sharedWithMeService'
import { getShareableUsers, type ShareableUser } from '@/services/favoritesService'
import { toast } from '@/utils/toast'

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
  apiValue: PermissionLevel
  label: string
  description: string
  icon: React.ReactNode
  capabilities: string[]
}

const FOLDER_PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'VIEW',
    apiValue: 'VIEW',
    label: 'View',
    description: 'Can view folder contents and download files',
    icon: <EyeIcon className="w-5 h-5" />,
    capabilities: ['View folder contents', 'Download files', 'Navigate subfolders'],
  },
  {
    value: 'CONTRIBUTE',
    apiValue: 'COMMENT',
    label: 'Contribute',
    description: 'Can add new files and folders',
    icon: <PlusIcon className="w-5 h-5" />,
    capabilities: ['All View permissions', 'Upload files', 'Create subfolders'],
  },
  {
    value: 'EDIT',
    apiValue: 'EDIT',
    label: 'Edit',
    description: 'Can modify, rename, and delete contents',
    icon: <PencilIcon className="w-5 h-5" />,
    capabilities: ['All Contribute permissions', 'Rename items', 'Move items', 'Delete items'],
  },
  {
    value: 'FULL_CONTROL',
    apiValue: 'FULL',
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
  // Tab state
  const [activeTab, setActiveTab] = useState<'users' | 'link' | 'existing'>('users')

  // Form state for user sharing
  const [permission, setPermission] = useState<FolderPermissionLevel>('VIEW')
  const [expiryDays, setExpiryDays] = useState<number>(0)
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

  // Link sharing state
  const [password, setPassword] = useState('')
  const [usePassword, setUsePassword] = useState(false)
  const [includeSubfolders, setIncludeSubfolders] = useState(true)

  // UI state
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdShare, setCreatedShare] = useState<FolderShareData | null>(null)
  const [copied, setCopied] = useState(false)

  // Existing shares (mock data for now)
  const [existingShares, setExistingShares] = useState<FolderShareData[]>([])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('users')
      setPermission('VIEW')
      setExpiryDays(0)
      setMessage('')
      setRequireAcceptance(false)
      setNotifyUsers(true)
      setRequireAcknowledgement(false)
      setAcknowledgementText('')
      setUserSearchQuery('')
      setSearchResults([])
      setSelectedUsers([])
      setPassword('')
      setUsePassword(false)
      setIncludeSubfolders(true)
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
      } catch (error) {
        console.error('Failed to search users:', error)
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

  // Get API permission level from form permission
  const getApiPermission = useCallback((perm: FolderPermissionLevel): PermissionLevel => {
    const option = FOLDER_PERMISSION_OPTIONS.find((o) => o.value === perm)
    return option?.apiValue || 'VIEW'
  }, [])

  // Handle share with users
  const handleShareWithUsers = async () => {
    if (!folder || selectedUsers.length === 0) return

    setIsCreating(true)
    setError(null)

    try {
      const request: ShareWithUsersRequest = {
        folder_id: folder.id,
        recipient_ids: selectedUsers.map((u) => String(u.id)),
        permission_level: getApiPermission(permission),
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
        toast.success(`Folder shared with ${selectedUsers.length} user(s)`)
        setSelectedUsers([])
        setMessage('')

        // Create a share data object for the callback
        const shareData: FolderShareData = {
          id: crypto.randomUUID(),
          folderId: folder.id,
          permission,
          recipientEmails: selectedUsers.map((u) => u.email),
          expiresAt:
            expiryDays > 0
              ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
              : null,
          shareUrl: '',
          isPasswordProtected: false,
          includeSubfolders: true,
          createdAt: new Date().toISOString(),
        }

        onShareCreated?.(shareData)
      }
    } catch (err) {
      console.error('Failed to share folder:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to share folder'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle link creation (existing functionality)
  const handleCreateLink = async () => {
    if (!folder) return

    setIsCreating(true)
    setError(null)

    try {
      // TODO: Implement link-based folder sharing via backend
      // For now, create mock share data
      const mockShare: FolderShareData = {
        id: crypto.randomUUID(),
        folderId: folder.id,
        permission,
        recipientEmails: [],
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
      setExistingShares((prev) => [mockShare, ...prev])
      toast.success('Share link created')
    } catch (err) {
      console.error('Failed to create share link:', err)
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
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast.error('Failed to copy link')
    }
  }, [createdShare])

  const handleRevokeShare = async (shareId: string) => {
    // TODO: Call backend API to revoke share
    setExistingShares((prev) => prev.filter((s) => s.id !== shareId))
    toast.success('Share revoked')
  }

  const handleClose = () => {
    if (!isCreating) {
      onClose()
    }
  }

  const getPermissionLabelForFolder = (perm: FolderPermissionLevel): string => {
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
            Active ({existingShares.length})
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
                  value={permission}
                  onChange={(e) => setPermission(e.target.value as FolderPermissionLevel)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {FOLDER_PERMISSION_OPTIONS.map((option) => (
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
                        name="link-permission"
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

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Share link created success */}
          {activeTab === 'link' && createdShare && (
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
                  {getPermissionLabelForFolder(createdShare.permission).toLowerCase()} access
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
                    {getPermissionLabelForFolder(createdShare.permission)}
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
                Create Another Link
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
                          {getPermissionLabelForFolder(share.permission)} Access
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

                    {share.shareUrl && (
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
                            toast.success('Link copied')
                          }}
                          className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                          title="Copy link"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
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
