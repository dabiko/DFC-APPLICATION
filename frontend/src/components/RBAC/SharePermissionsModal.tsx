/**
 * SharePermissionsModal Component
 * Modal for sharing documents/folders with permission settings
 */

import { FC, Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  XMarkIcon,
  ShareIcon,
  UserIcon,
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SharePermissionsModalProps, AccessLevel, PermissionType } from '@/types/rbac'
import { PermissionBadge } from './PermissionBadge'
import { getPermissionsFromAccessLevel, ACCESS_LEVEL_LABELS } from '@/types/rbac'

export const SharePermissionsModal: FC<SharePermissionsModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  resourceType,
  resourceName,
  currentACL,
  onShare,
  availableUsers,
  availableDepartments,
}) => {
  const [subjectType, setSubjectType] = useState<'user' | 'department'>('user')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('read')
  const [customPermissions, setCustomPermissions] = useState<PermissionType[]>([])
  const [expiryDate, setExpiryDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [useCustomPermissions, setUseCustomPermissions] = useState(false)

  const resetForm = () => {
    setSubjectType('user')
    setSelectedSubjectId('')
    setAccessLevel('read')
    setCustomPermissions([])
    setExpiryDate('')
    setSearchQuery('')
    setUseCustomPermissions(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleShare = () => {
    if (!selectedSubjectId) {
      alert('Please select a user or department')
      return
    }

    const permissions = useCustomPermissions
      ? customPermissions
      : getPermissionsFromAccessLevel(accessLevel)

    onShare({
      resourceId,
      resourceType,
      subjectType,
      subjectId: selectedSubjectId,
      accessLevel,
      permissions,
      expiresAt: expiryDate || undefined,
    })

    handleClose()
  }

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDepartments = availableDepartments.filter((dept) =>
    dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Future: Show selected subject details
  // const selectedSubject =
  //   subjectType === 'user'
  //     ? availableUsers.find((u) => u.id === selectedSubjectId)
  //     : availableDepartments.find((d) => d.id === selectedSubjectId)

  // Check if subject already has access
  const existingEntry = currentACL.entries.find(
    (e) => e.subjectId === selectedSubjectId && e.subjectType === subjectType
  )

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <ShareIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Share {resourceType}
                      </Dialog.Title>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {resourceName}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Subject Type Selector */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Share with
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSubjectType('user')
                          setSelectedSubjectId('')
                          setSearchQuery('')
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                          subjectType === 'user'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <UserIcon className="w-4 h-4" />
                        Individual User
                      </button>
                      <button
                        onClick={() => {
                          setSubjectType('department')
                          setSelectedSubjectId('')
                          setSearchQuery('')
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors',
                          subjectType === 'department'
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <BuildingOfficeIcon className="w-4 h-4" />
                        Department
                      </button>
                    </div>
                  </div>

                  {/* Search and Select Subject */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {subjectType === 'user' ? 'Select user' : 'Select department'}
                    </label>

                    {/* Search */}
                    <div className="relative mb-2">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${subjectType === 'user' ? 'users' : 'departments'}...`}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>

                    {/* Subject List */}
                    <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                      {subjectType === 'user' ? (
                        filteredUsers.length > 0 ? (
                          filteredUsers.map((user) => (
                            <label
                              key={user.id}
                              className={cn(
                                'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                                selectedSubjectId === user.id &&
                                  'bg-primary-50 dark:bg-primary-900/20'
                              )}
                            >
                              <input
                                type="radio"
                                name="subject"
                                value={user.id}
                                checked={selectedSubjectId === user.id}
                                onChange={() => setSelectedSubjectId(user.id)}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {user.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                            No users found
                          </p>
                        )
                      ) : filteredDepartments.length > 0 ? (
                        filteredDepartments.map((dept) => (
                          <label
                            key={dept.id}
                            className={cn(
                              'flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-200 dark:border-gray-700 last:border-b-0',
                              selectedSubjectId === dept.id &&
                                'bg-primary-50 dark:bg-primary-900/20'
                            )}
                          >
                            <input
                              type="radio"
                              name="subject"
                              value={dept.id}
                              checked={selectedSubjectId === dept.id}
                              onChange={() => setSelectedSubjectId(dept.id)}
                              className="text-primary-600 focus:ring-primary-500"
                            />
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {dept.name}
                            </p>
                          </label>
                        ))
                      ) : (
                        <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                          No departments found
                        </p>
                      )}
                    </div>

                    {existingEntry && (
                      <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                        This {subjectType} already has access. Sharing again will update their
                        permissions.
                      </p>
                    )}
                  </div>

                  {/* Access Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Access Level
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ACCESS_LEVEL_LABELS)
                        .filter(([key]) => key !== 'none')
                        .map(([level]) => (
                          <button
                            key={level}
                            onClick={() => setAccessLevel(level as AccessLevel)}
                            className={cn(
                              'flex flex-col items-start p-3 rounded-lg border-2 transition-colors text-left',
                              accessLevel === level
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                            )}
                          >
                            <div className="mb-1">
                              <PermissionBadge
                                permission={level as AccessLevel}
                                variant="access-level"
                                size="sm"
                              />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {level === 'read' && 'Can view and download'}
                              {level === 'write' && 'Can view, edit, and download'}
                              {level === 'admin' && 'Full control including sharing'}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Expiry Date (Optional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiry Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Access will automatically expire on this date
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={!selectedSubjectId}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Share {resourceType}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
