/**
 * FolderDetailsDrawer Component
 * Enterprise-grade right drawer for displaying comprehensive folder details
 * Includes tabs for Overview, Contents, Access, and Activity
 */

import { FC, Fragment, useState, useEffect, useMemo } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'
import {
  XMarkIcon,
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ArrowRightIcon,
  Cog6ToothIcon,
  ClockIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import { formatDistanceToNow, format } from 'date-fns'
import { AccessList, type AccessEntry } from '@/components/Access'
import { ActivityList, type ActivityEntry } from '@/components/Activity'

// Types
export interface FolderAccess {
  id: string
  userId: string
  userName: string
  userEmail: string
  permission: 'view' | 'edit' | 'manage' | 'owner'
  inherited: boolean
  grantedAt: string
  grantedBy?: string
}

export interface FolderActivity {
  id: string
  action: string
  performedBy: string
  performedAt: string
  details?: string
}

export interface FolderContentsStats {
  totalItems: number
  totalSize: number
  subfolders: number
  documents: number
  byType: Record<string, number>
}

export interface FolderDetailsData {
  id: string
  name: string
  path: string
  description?: string
  confidentiality: 'public' | 'internal' | 'confidential' | 'highly_confidential'
  parentId?: string | null
  parentName?: string | null
  department?: string | null
  isLocked?: boolean
  isFavorite?: boolean
  isShared?: boolean
  childrenCount: number
  documentCount: number
  totalSize?: number
  createdAt: string
  createdBy: string
  modifiedAt: string
  modifiedBy?: string
  // Permissions
  permissions?: {
    canView: boolean
    canEdit: boolean
    canDelete: boolean
    canManage: boolean
    canCreateSubfolder: boolean
    canUploadDocuments: boolean
  }
  // Related data (loaded lazily)
  accessList?: FolderAccess[]
  activities?: FolderActivity[]
  contentsStats?: FolderContentsStats
}

export interface FolderDetailsDrawerProps {
  open: boolean
  onClose: () => void
  folder: FolderDetailsData | null
  // Actions
  onOpen?: (folderId: string) => void
  onShare?: (folderId: string) => void
  onEdit?: (folderId: string) => void
  onRename?: (folderId: string) => void
  onMove?: (folderId: string) => void
  onDelete?: (folderId: string) => void
  onToggleFavorite?: (folderId: string) => void
  onToggleLock?: (folderId: string) => void
  onManagePermissions?: (folderId: string) => void
  onCreateSubfolder?: (folderId: string) => void
  onUploadDocuments?: (folderId: string) => void
  // Data loading callbacks
  onLoadAccess?: (folderId: string) => Promise<FolderAccess[]>
  onLoadActivity?: (folderId: string) => Promise<FolderActivity[]>
  onLoadContentsStats?: (folderId: string) => Promise<FolderContentsStats>
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

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FolderDetailsDrawer: FC<FolderDetailsDrawerProps> = ({
  open,
  onClose,
  folder,
  onOpen,
  onShare,
  onEdit,
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  onToggleLock,
  onManagePermissions,
  onCreateSubfolder,
  onUploadDocuments,
  onLoadAccess,
  onLoadActivity,
  onLoadContentsStats,
  isLoading = false,
}) => {
  const [accessList, setAccessList] = useState<FolderAccess[]>([])
  const [activities, setActivities] = useState<FolderActivity[]>([])
  const [contentsStats, setContentsStats] = useState<FolderContentsStats | null>(null)
  const [loadingAccess, setLoadingAccess] = useState(false)
  const [loadingActivity, setLoadingActivity] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedTab, setSelectedTab] = useState(0)

  // Reset state when folder changes
  useEffect(() => {
    if (folder) {
      setAccessList(folder.accessList || [])
      setActivities(folder.activities || [])
      setContentsStats(folder.contentsStats || null)
      setSelectedTab(0)
    }
  }, [folder?.id])

  // Load contents stats when drawer opens
  useEffect(() => {
    const loadStats = async () => {
      if (folder && onLoadContentsStats && !contentsStats) {
        setLoadingStats(true)
        try {
          const data = await onLoadContentsStats(folder.id)
          setContentsStats(data)
        } catch (error) {
          console.error('Failed to load contents stats:', error)
        } finally {
          setLoadingStats(false)
        }
      }
    }
    if (open && folder) {
      loadStats()
    }
  }, [open, folder?.id])

  // Load data based on tab selection
  const handleTabChange = async (index: number) => {
    setSelectedTab(index)

    if (!folder) return

    if (index === 2 && onLoadAccess && accessList.length === 0) {
      setLoadingAccess(true)
      try {
        const data = await onLoadAccess(folder.id)
        setAccessList(data)
      } catch (error) {
        console.error('Failed to load access list:', error)
      } finally {
        setLoadingAccess(false)
      }
    } else if (index === 3 && onLoadActivity && activities.length === 0) {
      setLoadingActivity(true)
      try {
        const data = await onLoadActivity(folder.id)
        setActivities(data)
      } catch (error) {
        console.error('Failed to load activity:', error)
      } finally {
        setLoadingActivity(false)
      }
    }
  }

  // Transform access list to AccessEntry format for AccessList component
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

  // Transform activities to ActivityEntry format for ActivityList component
  const transformedActivities: ActivityEntry[] = useMemo(() => {
    return activities.map((a) => ({
      id: a.id,
      action: a.action,
      performedBy: a.performedBy,
      performedAt: a.performedAt,
      details: a.details,
      resourceName: folder?.name,
    }))
  }, [activities, folder?.name])

  const getConfidentialityBadgeClass = (level: string) => {
    const colors: Record<string, string> = {
      public: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      internal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      confidential: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      highly_confidential: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    }
    return colors[level] || colors.internal
  }

  const getConfidentialityLabel = (level: string) => {
    const labels: Record<string, string> = {
      public: 'Public',
      internal: 'Internal',
      confidential: 'Confidential',
      highly_confidential: 'Highly Confidential',
    }
    return labels[level] || 'Internal'
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

  if (!folder) return null

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
                          {/* Folder Icon */}
                          <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <FolderIcon className="w-8 h-8 text-blue-500" />
                          </div>

                          {/* Title & Meta */}
                          <div className="flex-1 min-w-0">
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate pr-8">
                              {folder.name}
                            </Dialog.Title>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {folder.path}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {folder.childrenCount} folders
                              </span>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {folder.documentCount} files
                              </span>
                              {folder.isLocked && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-600">•</span>
                                  <LockClosedIcon className="w-3.5 h-3.5 text-amber-500" />
                                </>
                              )}
                              {folder.isShared && (
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
                        {onOpen && (
                          <button
                            onClick={() => {
                              onOpen(folder.id)
                              onClose()
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                          >
                            <FolderOpenIcon className="w-4 h-4" />
                            Open Folder
                          </button>
                        )}
                        {onShare && folder.permissions?.canManage && (
                          <button
                            onClick={() => onShare(folder.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <ShareIcon className="w-4 h-4" />
                            Share
                          </button>
                        )}
                        {onToggleFavorite && (
                          <button
                            onClick={() => onToggleFavorite(folder.id)}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              folder.isFavorite
                                ? 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                            title={folder.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
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
                            <DocumentTextIcon className="w-4 h-4" />
                            Contents
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
                                getConfidentialityBadgeClass(folder.confidentiality)
                              )}
                            >
                              {getConfidentialityLabel(folder.confidentiality)}
                            </span>
                            {folder.isLocked && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                <LockClosedIcon className="w-3 h-3" />
                                Locked
                              </span>
                            )}
                          </div>

                          {/* Description */}
                          {folder.description && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {folder.description}
                              </p>
                            </div>
                          )}

                          {/* Folder Details */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <InformationCircleIcon className="w-4 h-4" />
                              Folder Details
                            </h4>
                            <dl className="space-y-3">
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Full Path
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                                  {folder.path}
                                </dd>
                              </div>
                              {folder.parentName && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Parent
                                  </dt>
                                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                                    {folder.parentName}
                                  </dd>
                                </div>
                              )}
                              {folder.department && (
                                <div className="flex items-start">
                                  <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                    Department
                                  </dt>
                                  <dd className="text-sm text-gray-900 dark:text-gray-100">
                                    {folder.department}
                                  </dd>
                                </div>
                              )}
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Folder ID
                                </dt>
                                <dd className="text-xs text-gray-900 dark:text-gray-100 font-mono break-all">
                                  {folder.id}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Quick Stats */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                              <ChartBarIcon className="w-4 h-4" />
                              Quick Stats
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                  <FolderOpenIcon className="w-4 h-4" />
                                  <span className="text-xs">Subfolders</span>
                                </div>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                  {folder.childrenCount}
                                </p>
                              </div>
                              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                                  <DocumentTextIcon className="w-4 h-4" />
                                  <span className="text-xs">Documents</span>
                                </div>
                                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                  {folder.documentCount}
                                </p>
                              </div>
                            </div>
                            {folder.totalSize !== undefined && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    Total Size
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {formatFileSize(folder.totalSize)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

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
                                  <div>{formatDate(folder.createdAt)}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    by {folder.createdBy}
                                  </div>
                                </dd>
                              </div>
                              <div className="flex items-start">
                                <dt className="w-32 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                                  Modified
                                </dt>
                                <dd className="text-sm text-gray-900 dark:text-gray-100">
                                  <div>{formatDate(folder.modifiedAt)}</div>
                                  {folder.modifiedBy && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      by {folder.modifiedBy}
                                    </div>
                                  )}
                                </dd>
                              </div>
                            </dl>
                          </div>

                          {/* Your Permissions */}
                          {folder.permissions && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Cog6ToothIcon className="w-4 h-4" />
                                Your Permissions
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {folder.permissions.canView && (
                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded">
                                    View
                                  </span>
                                )}
                                {folder.permissions.canEdit && (
                                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                                    Edit
                                  </span>
                                )}
                                {folder.permissions.canDelete && (
                                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">
                                    Delete
                                  </span>
                                )}
                                {folder.permissions.canManage && (
                                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                                    Manage
                                  </span>
                                )}
                                {folder.permissions.canCreateSubfolder && (
                                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                                    Create Subfolders
                                  </span>
                                )}
                                {folder.permissions.canUploadDocuments && (
                                  <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-xs rounded">
                                    Upload Documents
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Tab.Panel>

                        {/* Contents Tab */}
                        <Tab.Panel className="p-6">
                          {loadingStats ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                          ) : !contentsStats ? (
                            <div className="space-y-6">
                              {/* Basic stats from folder */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <FolderOpenIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    {folder.childrenCount}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Subfolders
                                  </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <DocumentTextIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    {folder.documentCount}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Documents
                                  </p>
                                </div>
                              </div>

                              {/* Quick actions */}
                              <div className="space-y-2">
                                {onCreateSubfolder && folder.permissions?.canCreateSubfolder && (
                                  <button
                                    onClick={() => onCreateSubfolder(folder.id)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <FolderIcon className="w-5 h-5 text-blue-500" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Create Subfolder
                                      </span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                                  </button>
                                )}
                                {onUploadDocuments && folder.permissions?.canUploadDocuments && (
                                  <button
                                    onClick={() => onUploadDocuments(folder.id)}
                                    className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <DocumentTextIcon className="w-5 h-5 text-green-500" />
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Upload Documents
                                      </span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Stats overview */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    {contentsStats.totalItems}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Total Items
                                  </p>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                                    {formatFileSize(contentsStats.totalSize)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Total Size
                                  </p>
                                </div>
                              </div>

                              {/* By type breakdown */}
                              {Object.keys(contentsStats.byType).length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                    Files by Type
                                  </h4>
                                  <div className="space-y-2">
                                    {Object.entries(contentsStats.byType).map(([type, count]) => (
                                      <div
                                        key={type}
                                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
                                      >
                                        <span className="text-sm text-gray-600 dark:text-gray-400 uppercase">
                                          {type}
                                        </span>
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {count}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Tab.Panel>

                        {/* Access Tab */}
                        <Tab.Panel className="p-6">
                          <AccessList
                            accessList={transformedAccessList}
                            isLoading={loadingAccess}
                            canManage={folder.permissions?.canManage ?? false}
                            onShare={
                              onManagePermissions ? () => onManagePermissions(folder.id) : undefined
                            }
                          />
                        </Tab.Panel>

                        {/* Activity Tab */}
                        <Tab.Panel className="p-6">
                          <ActivityList
                            activities={transformedActivities}
                            isLoading={loadingActivity}
                            emptyMessage="No activity recorded for this folder"
                            showDetails={true}
                          />
                        </Tab.Panel>
                      </Tab.Panels>
                    </Tab.Group>

                    {/* Footer Actions */}
                    <div className="flex-shrink-0 px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {onRename && folder.permissions?.canEdit && (
                            <button
                              onClick={() => onRename(folder.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <PencilIcon className="w-4 h-4" />
                              Rename
                            </button>
                          )}
                          {onMove && folder.permissions?.canEdit && (
                            <button
                              onClick={() => onMove(folder.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                              Move
                            </button>
                          )}
                          {onToggleLock && folder.permissions?.canManage && (
                            <button
                              onClick={() => onToggleLock(folder.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              {folder.isLocked ? (
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
                        {onDelete && folder.permissions?.canDelete && (
                          <button
                            onClick={() => onDelete(folder.id)}
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

export default FolderDetailsDrawer
