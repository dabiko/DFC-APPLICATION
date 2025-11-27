/**
 * SmartFolderItem Component
 * Special rendering for virtual smart folders
 * Favorites, Recent, and Trash navigate to dedicated pages
 */

import { FC, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FolderOpen, Share2, Clock, Star, Trash2, User, Bell, type LucideIcon } from 'lucide-react'
import { cn } from '@utils/cn'
import type { Folder } from '@/types/folder'
import { getSmartFolderInfo, type SmartFolderType } from '@/utils/smartFolders'
import { folderService } from '@/services/folderService'
import { getRecentActivityStats } from '@/services/recentService'
import { getSharedWithMeStats } from '@/services/sharedWithMeService'
import { getNotificationCount } from '@/services/notificationService'
import { getMyDocumentsStats } from '@/services/myDocumentsService'

export interface SmartFolderItemProps {
  folder: Folder
  isSelected: boolean
  onClick: (folder: Folder) => void
  className?: string
  isCollapsed?: boolean
}

/**
 * Icon mapping for smart folder types
 */
const SMART_FOLDER_ICONS: Record<SmartFolderType, LucideIcon> = {
  my_documents: User,
  shared_with_me: Share2,
  recent: Clock,
  favorites: Star,
  trash: Trash2,
}

/**
 * Color mapping for smart folder types
 */
const SMART_FOLDER_COLORS: Record<SmartFolderType, string> = {
  my_documents: 'text-blue-600 dark:text-blue-400',
  shared_with_me: 'text-green-600 dark:text-green-400',
  recent: 'text-purple-600 dark:text-purple-400',
  favorites: 'text-yellow-600 dark:text-yellow-400',
  trash: 'text-red-600 dark:text-red-400',
}

/**
 * Smart folders that navigate to dedicated pages
 */
const DEDICATED_PAGE_ROUTES: Record<string, string> = {
  my_documents: '/my-documents',
  recent: '/recent',
  favorites: '/favorites',
  trash: '/trash',
  shared_with_me: '/shared-with-me',
}

export const SmartFolderItem: FC<SmartFolderItemProps> = ({
  folder,
  isSelected,
  onClick,
  className,
  isCollapsed = false,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const smartFolderInfo = getSmartFolderInfo(folder.id)
  const [trashCount, setTrashCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)
  const [sharedCount, setSharedCount] = useState(0)
  const [pendingInvitations, setPendingInvitations] = useState(0)
  const [myDocumentsCount, setMyDocumentsCount] = useState(0)

  // Get icon and color for this folder type
  const folderType = smartFolderInfo?.type
  const Icon = folderType ? SMART_FOLDER_ICONS[folderType] : FolderOpen
  const colorClass = folderType
    ? SMART_FOLDER_COLORS[folderType]
    : 'text-gray-600 dark:text-gray-400'

  // Check if this smart folder has a dedicated page
  const dedicatedRoute = smartFolderInfo?.type ? DEDICATED_PAGE_ROUTES[smartFolderInfo.type] : null

  // Check if current route matches this smart folder's dedicated page
  const isOnDedicatedPage = dedicatedRoute && location.pathname === dedicatedRoute

  // Fetch trash count for the trash folder
  useEffect(() => {
    if (smartFolderInfo?.type !== 'trash') return

    const fetchTrashCount = async () => {
      try {
        const trashedFolders = await folderService.getTrashFolders()
        setTrashCount(trashedFolders.length)
      } catch (error) {
        console.error('Failed to fetch trash count:', error)
      }
    }

    fetchTrashCount()

    // Refresh trash count every 30 seconds
    const interval = setInterval(fetchTrashCount, 30000)
    return () => clearInterval(interval)
  }, [smartFolderInfo?.type])

  // Fetch recent activity count for the recent folder
  useEffect(() => {
    if (smartFolderInfo?.type !== 'recent') return

    const fetchRecentCount = async () => {
      try {
        const stats = await getRecentActivityStats()
        setRecentCount(stats.total)
      } catch (error) {
        console.error('Failed to fetch recent count:', error)
      }
    }

    fetchRecentCount()

    // Refresh recent count every 60 seconds
    const interval = setInterval(fetchRecentCount, 60000)
    return () => clearInterval(interval)
  }, [smartFolderInfo?.type])

  // Fetch shared with me count and pending invitations
  useEffect(() => {
    if (smartFolderInfo?.type !== 'shared_with_me') return

    const fetchSharedCount = async () => {
      try {
        const stats = await getSharedWithMeStats()
        setSharedCount(stats.total)
        setPendingInvitations(stats.pending_invitations || 0)
      } catch (error) {
        console.error('Failed to fetch shared count:', error)
      }
    }

    fetchSharedCount()

    // Refresh shared count every 60 seconds
    const interval = setInterval(fetchSharedCount, 60000)
    return () => clearInterval(interval)
  }, [smartFolderInfo?.type])

  // Fetch my documents count
  useEffect(() => {
    if (smartFolderInfo?.type !== 'my_documents') return

    const fetchMyDocumentsCount = async () => {
      try {
        const stats = await getMyDocumentsStats()
        setMyDocumentsCount(stats.total_documents)
      } catch (error) {
        console.error('Failed to fetch my documents count:', error)
      }
    }

    fetchMyDocumentsCount()

    // Refresh my documents count every 60 seconds
    const interval = setInterval(fetchMyDocumentsCount, 60000)
    return () => clearInterval(interval)
  }, [smartFolderInfo?.type])

  // Handle click - navigate to dedicated page or use default behavior
  const handleClick = () => {
    if (dedicatedRoute) {
      navigate(dedicatedRoute)
    } else {
      onClick(folder)
    }
  }

  // Determine if item should appear selected
  const showAsSelected = isOnDedicatedPage || isSelected

  // Get the appropriate count for tooltip
  const getCountForType = () => {
    switch (smartFolderInfo?.type) {
      case 'trash':
        return trashCount
      case 'recent':
        return recentCount
      case 'shared_with_me':
        return sharedCount
      case 'my_documents':
        return myDocumentsCount
      default:
        return folder.documentCount
    }
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer group relative',
        isCollapsed ? 'justify-center p-2 mx-2' : 'gap-2 px-3 py-2',
        showAsSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
      title={isCollapsed ? folder.name : undefined}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', !showAsSelected && colorClass)} />

      {/* Show text and badges only when not collapsed */}
      {!isCollapsed && (
        <>
          <span className="flex-1 truncate">{folder.name}</span>

          {/* Show trash count badge */}
          {smartFolderInfo?.type === 'trash' && trashCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
              {trashCount > 99 ? '99+' : trashCount}
            </span>
          )}

          {/* Show recent activity count badge */}
          {smartFolderInfo?.type === 'recent' && recentCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-medium rounded-full">
              {recentCount > 99 ? '99+' : recentCount}
            </span>
          )}

          {/* Show shared with me count badge or pending invitations badge */}
          {smartFolderInfo?.type === 'shared_with_me' && (
            <>
              {pendingInvitations > 0 ? (
                // Show pending invitations badge (more prominent)
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-full animate-pulse">
                  {pendingInvitations > 99 ? '99+' : pendingInvitations} pending
                </span>
              ) : sharedCount > 0 ? (
                // Show total shared count
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium rounded-full">
                  {sharedCount > 99 ? '99+' : sharedCount}
                </span>
              ) : null}
            </>
          )}

          {/* Show my documents count badge */}
          {smartFolderInfo?.type === 'my_documents' && myDocumentsCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {myDocumentsCount > 99 ? '99+' : myDocumentsCount}
            </span>
          )}

          {/* Show document count for other smart folders */}
          {smartFolderInfo?.type !== 'trash' &&
            smartFolderInfo?.type !== 'recent' &&
            smartFolderInfo?.type !== 'shared_with_me' &&
            smartFolderInfo?.type !== 'my_documents' &&
            folder.documentCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                {folder.documentCount}
              </span>
            )}
        </>
      )}

      {/* Tooltip for collapsed state */}
      {isCollapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
          {folder.name}
          {getCountForType() > 0 && (
            <span className="ml-1 text-gray-300">({getCountForType()})</span>
          )}
        </div>
      )}
    </div>
  )
}
