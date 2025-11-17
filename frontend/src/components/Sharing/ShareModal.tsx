import React, { useState } from 'react'
import {
  XMarkIcon,
  UserIcon,
  EnvelopeIcon,
  LinkIcon,
  CalendarIcon,
  LockClosedIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type {
  ShareModalProps,
  User,
  UserGroup,
  PermissionLevel,
  CreateInternalShareRequest,
  CreateExternalShareRequest,
  CreateShareLinkRequest,
} from '@/types/sharing'
import { UserSearchSelector } from './UserSearchSelector'
import { getPermissionLabel, getPermissionDescription, validateEmail } from '@/types/sharing'

export const ShareModal: React.FC<ShareModalProps> = ({
  documentId,
  documentName,
  isOpen,
  onClose,
  initialTab = 'internal',
  existingShares = [],
}) => {
  const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'link'>(initialTab)

  // Internal Share State
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [selectedGroups, setSelectedGroups] = useState<UserGroup[]>([])
  const [internalPermission, setInternalPermission] = useState<PermissionLevel>('view')
  const [canReshare, setCanReshare] = useState(false)
  const [internalExpiry, setInternalExpiry] = useState('')
  const [internalMessage, setInternalMessage] = useState('')

  // External Share State
  const [externalEmails, setExternalEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [externalPermission, setExternalPermission] = useState<'view' | 'download'>('view')
  const [externalPassword, setExternalPassword] = useState('')
  const [externalExpiry, setExternalExpiry] = useState('')
  const [externalMessage, setExternalMessage] = useState('')

  // Link Share State
  const [linkPermission, setLinkPermission] = useState<PermissionLevel>('view')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkExpiry, setLinkExpiry] = useState('')
  const [linkMaxAccess, setLinkMaxAccess] = useState<number>()
  const [generatedLink, setGeneratedLink] = useState<string>()
  const [showQR, setShowQR] = useState(false)

  const handleAddEmail = () => {
    if (emailInput && validateEmail(emailInput) && !externalEmails.includes(emailInput)) {
      setExternalEmails([...externalEmails, emailInput])
      setEmailInput('')
    }
  }

  const handleRemoveEmail = (email: string) => {
    setExternalEmails(externalEmails.filter((e) => e !== email))
  }

  const handleShareInternal = async () => {
    const request: CreateInternalShareRequest = {
      documentId,
      userIds: selectedUsers.map((u) => u.id),
      groupIds: selectedGroups.map((g) => g.id),
      permissionLevel: internalPermission,
      canReshare,
      expiryDate: internalExpiry || undefined,
      message: internalMessage || undefined,
      sendNotification: true,
    }
    console.log('Internal share request:', request)
    // TODO: API call
    alert('Shared successfully!')
    onClose()
  }

  const handleShareExternal = async () => {
    const request: CreateExternalShareRequest = {
      documentId,
      recipientEmails: externalEmails,
      permissionLevel: externalPermission,
      password: externalPassword,
      expiryDate: externalExpiry,
      message: externalMessage || undefined,
      sendInvitation: true,
    }
    console.log('External share request:', request)
    // TODO: API call
    alert('Invitations sent!')
    onClose()
  }

  const handleGenerateLink = async () => {
    const request: CreateShareLinkRequest = {
      documentId,
      permissionLevel: linkPermission,
      expiryDate: linkExpiry || undefined,
      password: linkPassword || undefined,
      maxAccessCount: linkMaxAccess,
    }
    console.log('Link generation request:', request)
    // TODO: API call
    setGeneratedLink(`https://example.com/shared/abc123xyz`)
  }

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      alert('Link copied to clipboard!')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share Document
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate max-w-md">
              {documentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'internal'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400'
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-1" />
            Internal Users
          </button>
          <button
            onClick={() => setActiveTab('external')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'external'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400'
            }`}
          >
            <EnvelopeIcon className="w-4 h-4 inline mr-1" />
            External Users
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 dark:text-gray-400'
            }`}
          >
            <LinkIcon className="w-4 h-4 inline mr-1" />
            Share Link
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Internal Tab */}
          {activeTab === 'internal' && (
            <>
              <UserSearchSelector
                selectedUsers={selectedUsers}
                selectedGroups={selectedGroups}
                onSelectUser={(user) => setSelectedUsers([...selectedUsers, user])}
                onDeselectUser={(id) => setSelectedUsers(selectedUsers.filter((u) => u.id !== id))}
                onSelectGroup={(group) => setSelectedGroups([...selectedGroups, group])}
                onDeselectGroup={(id) => setSelectedGroups(selectedGroups.filter((g) => g.id !== id))}
                availableUsers={[
                  { id: '1', name: 'John Doe', email: 'john@example.com', isActive: true },
                  { id: '2', name: 'Jane Smith', email: 'jane@example.com', department: 'Finance', isActive: true },
                ]}
                availableGroups={[
                  { id: 'g1', name: 'Finance Team', memberCount: 12, createdAt: '', createdBy: '' },
                ]}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Permission Level
                </label>
                <select
                  value={internalPermission}
                  onChange={(e) => setInternalPermission(e.target.value as PermissionLevel)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                >
                  {(['view', 'comment', 'edit', 'download', 'full'] as PermissionLevel[]).map((perm) => (
                    <option key={perm} value={perm}>
                      {getPermissionLabel(perm)} - {getPermissionDescription(perm)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={internalExpiry}
                    onChange={(e) => setInternalExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={canReshare}
                      onChange={(e) => setCanReshare(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Allow resharing</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={internalMessage}
                  onChange={(e) => setInternalMessage(e.target.value)}
                  placeholder="Add a message for recipients..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
            </>
          )}

          {/* External Tab */}
          {activeTab === 'external' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recipient Emails
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                    placeholder="email@example.com"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                  <button
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
                {externalEmails.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {externalEmails.map((email) => (
                      <div key={email} className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                        {email}
                        <button onClick={() => handleRemoveEmail(email)} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permission
                  </label>
                  <select
                    value={externalPermission}
                    onChange={(e) => setExternalPermission(e.target.value as 'view' | 'download')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  >
                    <option value="view">View Only</option>
                    <option value="download">View & Download</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <CalendarIcon className="w-4 h-4 inline mr-1" />
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    value={externalExpiry}
                    onChange={(e) => setExternalExpiry(e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <LockClosedIcon className="w-4 h-4 inline mr-1" />
                  Password Protection *
                </label>
                <input
                  type="password"
                  value={externalPassword}
                  onChange={(e) => setExternalPassword(e.target.value)}
                  required
                  placeholder="Enter a strong password..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={externalMessage}
                  onChange={(e) => setExternalMessage(e.target.value)}
                  placeholder="Add a message for the email invitation..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
            </>
          )}

          {/* Link Tab */}
          {activeTab === 'link' && (
            <>
              {generatedLink ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-300 mb-2">
                      <CheckIcon className="w-5 h-5" />
                      <span className="font-medium">Link Generated Successfully!</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <ClipboardDocumentIcon className="w-5 h-5" />
                        Copy
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <QrCodeIcon className="w-5 h-5" />
                      {showQR ? 'Hide' : 'Show'} QR Code
                    </button>
                    <button
                      onClick={() => setGeneratedLink(undefined)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Generate New
                    </button>
                  </div>

                  {showQR && (
                    <div className="flex justify-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                        <span className="text-gray-500">QR Code Placeholder</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Permission Level
                    </label>
                    <select
                      value={linkPermission}
                      onChange={(e) => setLinkPermission(e.target.value as PermissionLevel)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    >
                      {(['view', 'comment', 'download'] as PermissionLevel[]).map((perm) => (
                        <option key={perm} value={perm}>{getPermissionLabel(perm)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expiry Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={linkExpiry}
                        onChange={(e) => setLinkExpiry(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Max Access Count
                      </label>
                      <input
                        type="number"
                        value={linkMaxAccess || ''}
                        onChange={(e) => setLinkMaxAccess(parseInt(e.target.value) || undefined)}
                        placeholder="Unlimited"
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password (Optional)
                    </label>
                    <input
                      type="password"
                      value={linkPassword}
                      onChange={(e) => setLinkPassword(e.target.value)}
                      placeholder="Leave empty for no password"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          {activeTab === 'internal' && (
            <button
              onClick={handleShareInternal}
              disabled={selectedUsers.length === 0 && selectedGroups.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share with {selectedUsers.length + selectedGroups.length} recipient(s)
            </button>
          )}
          {activeTab === 'external' && (
            <button
              onClick={handleShareExternal}
              disabled={externalEmails.length === 0 || !externalPassword || !externalExpiry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Invitations
            </button>
          )}
          {activeTab === 'link' && !generatedLink && (
            <button
              onClick={handleGenerateLink}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Generate Link
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
