/**
 * FileDetailsDrawer Component
 * Enterprise-grade right drawer for displaying comprehensive file details
 * Includes tabs for Overview, Versions, Access, and Activity
 */

import { FC, Fragment, useState, useEffect, useMemo } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ClockIcon,
  InformationCircleIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  ArrowTopRightOnSquareIcon,
  LinkIcon,
  LockClosedIcon,
  LockOpenIcon,
  FolderIcon,
  CalendarIcon,
  HashtagIcon,
  TagIcon,
  ChartBarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import { FileIcon } from '@/components/FileIcon'
import { formatFileSize } from '@/utils/versionUtils'
import { formatDistanceToNow, format } from 'date-fns'
import { CONFIDENTIALITY_COLORS, CONFIDENTIALITY_ICONS } from '@/types/fileManagement'
import { ConfidentialityBadge } from '@/components/Badge/ConfidentialityBadge'
import { VersionHistoryList } from '@/components/Version'
import { AccessList, type AccessEntry } from '@/components/Access'
import { ActivityList, type ActivityEntry } from '@/components/Activity'
import type { DocumentVersion } from '@/types/version'

// Types
export interface FileVersion {
  id: string
  versionNumber: number
  fileName: string
  fileSize: number
  createdAt: string
  createdBy: string
  changeDescription?: string
  isCurrent: boolean
}

export interface FileAccess {
  id: string
  userId: string
  userName: string
  userEmail: string
  permission: 'view' | 'edit' | 'manage' | 'owner'
  grantedAt: string
  grantedBy?: string
}

export interface FileActivity {
  id: string
  action: string
  performedBy: string
  performedAt: string
  details?: string
}

export interface FileShortcut {
  id: string
  folderName: string
  folderPath: string
  createdAt: string
}

export interface FileDetailsData {
  id: string
  title: string
  fileName: string
  fileSize: number
  fileType: string
  documentType: string
  confidentialityLevel: string
  folderId?: string | null
  folderName?: string | null
  folderPath?: string | null
  department?: string | null
  description?: string
  keywords?: string[]
  identifier?: string
  documentDate?: string
  retentionPeriod?: string
  retentionExpiresAt?: string
  versionNumber: number
  checksum?: string
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy?: string
  isLocked?: boolean
  isFavorite?: boolean
  isShared?: boolean
  hasVersions?: boolean
  thumbnailUrl?: string
  // Permissions
  canView?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canDownload?: boolean
  canShare?: boolean
  canManage?: boolean
  // Related data (loaded lazily)
  versions?: FileVersion[]
  accessList?: FileAccess[]
  activities?: FileActivity[]
  shortcuts?: FileShortcut[]
}

export interface FileDetailsDrawerProps {
  open: boolean
  onClose: () => void
  file: FileDetailsData | null
  // Actions
  onDownload?: (fileId: string) => void
  onPreview?: (fileId: string) => void
  onShare?: (fileId: string) => void
  onEdit?: (fileId: string) => void
  onDelete?: (fileId: string) => void
  onRename?: (fileId: string) => void
  onMove?: (fileId: string) => void
  onToggleFavorite?: (fileId: string) => void
  onToggleLock?: (fileId: string) => void
  onVersionRestore?: (fileId: string, versionId: string) => void
  onVersionDownload?: (fileId: string, versionId: string) => void
  onNavigateToShortcut?: (folderId: string) => void
  // Data loading callbacks
  onLoadVersions?: (fileId: string) => Promise<FileVersion[]>
  onLoadAccess?: (fileId: string) => Promise<FileAccess[]>
  onLoadActivity?: (fileId: string) => Promise<FileActivity[]>
  onLoadShortcuts?: (fileId: string) => Promise<FileShortcut[]>
  // Loading states
  isLoading?: boolean
}

const tabClasses = (selected: boolean) =>
  cn(
    'px-4 py-2.5 text-sm font-medium leading-5 rounded-lg transition-all',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
    selected
      ? 'bg-primary-600 text-white shadow'
      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
  )

export const FileDetailsDrawer: FC<FileDetailsDrawerProps> = ({
  open,
  onClose,
  file,
  onDownload,
  onPreview,
  onShare,
  onEdit,
  onDelete,
  onRename,
  onMove,
  onToggleFavorite,
  onToggleLock,
  onVersionRestore,
  onVersionDownload,
  onNavigateToShortcut,
  onLoadVersions,
  onLoadAccess,
  onLoadActivity,
  onLoadShortcuts,
  isLoading = false,
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([])
  const [accessList, setAccessList] = useState<FileAccess[]>([])
  const [activities, setActivities] = useState<FileActivity[]>([])
  const [shortcuts, setShortcuts] = useState<FileShortcut[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [loadingShortcuts, setLoadingShortcuts] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setVersions(file.versions || [])
      setAccessList(file.accessList || [])
      setActivities(file.activities || [])
      setShortcuts(file.shortcuts || [])
      setSelectedTab(0)
    }
  }, [file?.id])

  // Load versions when tab is selected
  const handleTabChange = async (index: number) => {
    setSelectedTab(index)

    if (!file) return

    // Load data based on tab
    if (index === 1 && onLoadVersions && versions.length === 0) {
      setLoadingVersions(true)
      try {
        const data = await onLoadVersions(file.id)
        setVersions(data)
      } catch (error) {
        console.error('Failed to load versions:', error)
      } finally {
        setLoadingVersions(false)
      }
    } else if (index === 2 && onLoadAccess && accessList.length === 0) {
      setLoadingAccess(true)
      try {
        const data = await onLoadAccess(file.id)
        setAccessList(data)
      } catch (error) {
        console.error('Failed to load access list:', error)
      } finally {
        setLoadingAccess(false)
      }
    } else if (index === 3 && onLoadActivity && activities.length === 0) {
      setLoadingActivity(true)
      try {
        const data = await onLoadActivity(file.id)
        setActivities(data)
      } catch (error) {
        console.error('Failed to load activity:', error)
      } finally {
        setLoadingActivity(false)
      }
    }
  }

  // Load shortcuts when drawer opens
  useEffect(() => {
    const loadShortcuts = async () => {
      if (file && onLoadShortcuts && shortcuts.length === 0) {
        setLoadingShortcuts(true)
        try {
          const data = await onLoadShortcuts(file.id)
          setShortcuts(data)
        } catch (error) {
          console.error('Failed to load shortcuts:', error)
        } finally {
          setLoadingShortcuts(false)
        }
      }
    }
    if (open && file) {
      loadShortcuts()
    }
  }, [open, file?.id])

  // Transform versions to DocumentVersion format for VersionHistoryList
  const transformedVersions: DocumentVersion[] = useMemo(() => {
    return versions.map((v) => ({
      id: v.id,
      documentId: file?.id || '',
      versionNumber: v.versionNumber,
      fileName: v.fileName,
      fileSize: v.fileSize,
      mimeType: file?.fileType || '',
      checksum: '',
      createdBy: v.createdBy,
      createdAt: v.createdAt,
      changeDescription: v.changeDescription,
      isCurrent: v.isCurrent,
      storagePath: '',
    }))
  }, [versions, file?.id, file?.fileType])

  // Transform access list to AccessEntry format for AccessList
  const transformedAccessList: AccessEntry[] = useMemo(() => {
    return accessList.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.userName,
      userEmail: a.userEmail,
      type: 'user' as const,
      permission: a.permission,
      grantedAt: a.grantedAt,
      grantedBy: a.grantedBy,
    }))
  }, [accessList])

  // Transform activities to ActivityEntry format for ActivityList
  const transformedActivities: ActivityEntry[] = useMemo(() => {
    return activities.map((a) => ({
      id: a.id,
      action: a.action,
      performedBy: a.performedBy,
      performedAt: a.performedAt,
      details: a.details,
      resourceName: file?.title || file?.fileName,
    }))
  }, [activities, file?.title, file?.fileName])

  const getConfidentialityBadgeClass = (level: string) => {
    const colors: Record<string, string> = {
      PUBLIC: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      INTERNAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      CONFIDENTIAL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      HIGHLY_CONFIDENTIAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    return colors[level] || colors.INTERNAL
  }

  const getPermissionBadgeClass = (permission: string) => {
    const colors: Record<string, string> = {
      view: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      edit: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      manage: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      owner: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    }
    return colors[permission] || colors.view
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch {
      return dateString
    }
  }

  const formatRelativeDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return dateString
    }
  }

  if (!file) return null

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        {/* Drawer panel */}
        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-300"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                  <div className="flex h-full flex-col bg-white dark:bg-gray-900 shadow-xl">
                    {/* Header */}
                    <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* File Icon */}
                          <div className="flex-shrink-0">
                            {file.thumbnailUrl ? (
                              <img
                                src={file.thumbnailUrl}
                                alt={file.fileName}
                                className="w-14 h-14 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <FileIcon
                                  fileName={file.fileName}
                                  mimeType={file.fileType}
                                  size="xl"
                                />
                              </div>
                            )}
                          </div>

                          {/* Title & Meta */}
                          <div className="flex-1 min-w-0">
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate pr-8">
                              {file.title || file.fileName}
                            </Dialog.Title>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {file.fileName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatFileSize(file.fileSize)}
                              </span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                v{file.versionNumber}
                              </span>
                              {file.isLocked && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <LockClosedIcon className="w-3.5 h-3.5 text-amber-500" />
                                </>
                              )}
                              {file.isShared && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <ShareIcon className="w-3.5 h-3.5 text-blue-500" />
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Close button */}
                        <button
                          type="button"
                          onClick={onClose}
                          className="rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                        >
                          <XMarkIcon className="h-6 w-6" />
                        </button>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        {onPreview && file.canView && (
                          <button
                            onClick={() => onPreview(file.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <EyeIcon className="w-4 h-4" />
                            Preview
                          </button>
                        )}
                        {onDownload && file.canDownload && (
                          <button
                            onClick={() => onDownload(file.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        {onShare && file.canShare && (
                          <button
                            onClick={() => onShare(file.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <ShareIcon className="w-4 h-4" />
                            Share
                          </button>
                        )}
                        {onToggleFavorite && (
                          <button
                            onClick={() => onToggleFavorite(file.id)}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              file.isFavorite
                                ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                            title={file.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <StarIconSolid className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tabs */}
                    <Tab.Group
                      selectedIndex={selectedTab}
                      onChange={handleTabChange}
                      as="div"
                      className="flex flex-col flex-1 min-h-0"
                    >
                      <Tab.List className="flex-shrink-0 flex gap-1 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                        <Tab className={({ selected }) => tabClasses(selected)}>
                          <div className="flex items-center gap-1.5">
                            <InformationCircleIcon className="w-4 h-4" />
                            Overview
                          </div>
                        </Tab>
                        <Tab className={({ selected }) => tabClasses(selected)}>
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-4 h-4" />
                            Versions
                            {file.hasVersions && (
                              <span className="ml-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">
                                {file.versionNumber}
                              </span>
                            )}
                          </div>
                        </Tab>
                        <Tab className={({ selected }) => tabClasses(selected)}>
                          <div className="flex items-center gap-1.5">
                            <UserGroupIcon className="w-4 h-4" />
                            Access
                          </div>
                        </Tab>
                        <Tab className={({ selected }) => tabClasses(selected)}>
                          <div className="flex items-center gap-1.5">
                            <ChartBarIcon className="w-4 h-4" />
                            Activity
                          </div>
                        </Tab>
                      </Tab.List>

                      <Tab.Panels className="flex-1 min-h-0 overflow-y-auto">
                        {/* Overview Tab */}
                        <Tab.Panel className="p-6 space-y-6">
                          {/* Confidentiality Badge */}
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                                getConfidentialityBadgeClass(file.confidentialityLevel)
                              )}
                            >
                              {file.confidentialityLevel?.replace('_', ' ')}
                            </span>
                            {file.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <LockClosedIcon className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {file.description && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {file.description}
                              </p>
                            </div>
                          )}

                          {/* File Details */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <InformationCircleIcon className="w-4 h-4" />
                              File Details
                            </h4>
                            <dl className="space-y-3">
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Type
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100">
                                  {file.documentType || file.fileType}
                                </dd>
                              </div>
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Size
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100">
                                  {formatFileSize(file.fileSize)}
                                </dd>
                              </div>
                              {file.identifier && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Identifier
                                  </dt>
                                  <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                                    {file.identifier}
                                  </dd>
                                </div>
                              )}
                              {file.documentDate && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Document Date
                                  </dt>
                                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                                    {formatDate(file.documentDate)}
                                  </dd>
                                </div>
                              )}
                              {file.checksum && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Checksum
                                  </dt>
                                  <dd className="text-xs text-gray-900 dark:text-gray-100 font-mono break-all">
                                    {file.checksum}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>

                          {/* Location */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <FolderIcon className="w-4 h-4" />
                              Location
                            </h4>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <p className="text-sm text-gray-900 dark:text-gray-100">
                                {file.folderPath || file.folderName || 'Root'}
                              </p>
                              {file.department && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Department: {file.department}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Keywords/Tags */}
                          {file.keywords && file.keywords.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <TagIcon className="w-4 h-4" />
                                Keywords
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {file.keywords.map((keyword, index) => (
                                  <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Shortcuts */}
                          {shortcuts.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                                Shortcuts
                              </h4>
                              <div className="space-y-2">
                                {shortcuts.map((shortcut) => (
                                  <button
                                    key={shortcut.id}
                                    onClick={() => onNavigateToShortcut?.(shortcut.id)}
                                    className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                                  >
                                    <LinkIcon className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                        {shortcut.folderName}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        {shortcut.folderPath}
                                      </p>
                                    </div>
                                    <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <CalendarIcon className="w-4 h-4" />
                              Timestamps
                            </h4>
                            <dl className="space-y-3">
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Created
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100">
                                  <div>{formatDate(file.createdAt)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    by {file.createdBy}
                                  </div>
                                </dd>
                              </div>
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Modified
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100">
                                  <div>{formatDate(file.modifiedAt)}</div>
                                  {file.modifiedBy && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      by {file.modifiedBy}
                                    </div>
                                  )}
                                </dd>
                              </div>
                              {file.retentionExpiresAt && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Retention
                                  </dt>
                                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                                    Expires {formatRelativeDate(file.retentionExpiresAt)}
                                  </dd>
                                </div>
                              )}
                            </dl>
                          </div>
                        </Tab.Panel>

                        {/* Versions Tab */}
                        <Tab.Panel className="p-6">
                          <VersionHistoryList
                            documentId={file.id}
                            versions={transformedVersions}
                            currentVersionId={transformedVersions.find((v) => v.isCurrent)?.id}
                            isLoading={loadingVersions}
                            onViewVersion={
                              onVersionDownload
                                ? (v) => onVersionDownload(file.id, v.id)
                                : undefined
                            }
                            onDownloadVersion={
                              onVersionDownload
                                ? (v) => onVersionDownload(file.id, v.id)
                                : undefined
                            }
                            onRestoreVersion={
                              onVersionRestore ? (v) => onVersionRestore(file.id, v.id) : undefined
                            }
                            canRestore={file.canEdit ?? true}
                            canDelete={false}
                          />
                        </Tab.Panel>

                        {/* Access Tab */}
                        <Tab.Panel className="p-6">
                          <AccessList
                            accessList={transformedAccessList}
                            isLoading={loadingAccess}
                            canManage={file.canManage ?? false}
                            onShare={onShare ? () => onShare(file.id) : undefined}
                          />
                        </Tab.Panel>

                        {/* Activity Tab */}
                        <Tab.Panel className="p-6">
                          <ActivityList
                            activities={transformedActivities}
                            isLoading={loadingActivity}
                            emptyMessage="No activity recorded for this file"
                            showDetails={true}
                          />
                        </Tab.Panel>
                      </Tab.Panels>
                    </Tab.Group>

                    {/* Footer Actions */}
                    <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {onEdit && file.canEdit && (
                            <button
                              onClick={() => onEdit(file.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                              Edit
                            </button>
                          )}
                          {onMove && file.canEdit && (
                            <button
                              onClick={() => onMove(file.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <FolderIcon className="w-4 h-4" />
                              Move
                            </button>
                          )}
                          {onToggleLock && file.canManage && (
                            <button
                              onClick={() => onToggleLock(file.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              {file.isLocked ? (
                                <>
                                  <LockOpenIcon className="w-4 h-4" />
                                  Unlock
                                </>
                              ) : (
                                <>
                                  <LockClosedIcon className="w-4 h-4" />
                                  Lock
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        {onDelete && file.canDelete && (
                          <button
                            onClick={() => onDelete(file.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default FileDetailsDrawer
