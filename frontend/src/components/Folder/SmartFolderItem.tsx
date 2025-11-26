/**
 * SmartFolderItem Component
 * Special rendering for virtual smart folders
 * Favorites, Recent, and Trash navigate to dedicated pages
 */

import { FC, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FolderOpen, Share2, Clock, Star, Trash2, User, type LucideIcon } from 'lucide-react'
import { cn } from '@utils/cn'
import type { Folder } from '@/types/folder'
import { getSmartFolderInfo, type SmartFolderType } from '@/utils/smartFolders'
import { folderService } from '@/services/folderService'
import { getRecentActivityStats } from '@/services/recentService'

export interface SmartFolderItemProps {
  folder: Folder
  isSelected: boolean
  onClick: (folder: Folder) => void
  className?: string
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
  recent: '/recent',
  favorites: '/favorites',
  trash: '/trash',
}

export const SmartFolderItem: FC<SmartFolderItemProps> = ({
  folder,
  isSelected,
  onClick,
  className,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const smartFolderInfo = getSmartFolderInfo(folder.id)
  const [trashCount, setTrashCount] = useState(0)
  const [recentCount, setRecentCount] = useState(0)

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

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer group',
        showAsSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', !showAsSelected && colorClass)} />
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

      {/* Show document count for other smart folders */}
      {smartFolderInfo?.type !== 'trash' &&
        smartFolderInfo?.type !== 'recent' &&
        folder.documentCount > 0 && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
            {folder.documentCount}
          </span>
        )}
    </div>
  )
}
