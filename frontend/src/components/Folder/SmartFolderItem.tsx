/**
 * SmartFolderItem Component
 * Special rendering for virtual smart folders
 */

import { FC, useMemo } from 'react'
import { FolderOpen, Share2, Clock, Star, Trash2, User } from 'lucide-react'
import { cn } from '@utils/cn'
import type { Folder } from '@/types/folder'
import { getSmartFolderInfo, type SmartFolderType } from '@/utils/smartFolders'

export interface SmartFolderItemProps {
  folder: Folder
  isSelected: boolean
  onClick: (folder: Folder) => void
  className?: string
}

/**
 * Get icon component for smart folder type
 */
function getSmartFolderIcon(type: SmartFolderType | null) {
  switch (type) {
    case 'my_documents':
      return User
    case 'shared_with_me':
      return Share2
    case 'recent':
      return Clock
    case 'favorites':
      return Star
    case 'trash':
      return Trash2
    default:
      return FolderOpen
  }
}

/**
 * Get color classes for smart folder type
 */
function getSmartFolderColor(type: SmartFolderType | null) {
  switch (type) {
    case 'my_documents':
      return 'text-blue-600 dark:text-blue-400'
    case 'shared_with_me':
      return 'text-green-600 dark:text-green-400'
    case 'recent':
      return 'text-purple-600 dark:text-purple-400'
    case 'favorites':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'trash':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

export const SmartFolderItem: FC<SmartFolderItemProps> = ({
  folder,
  isSelected,
  onClick,
  className,
}) => {
  const smartFolderInfo = getSmartFolderInfo(folder.id)
  const Icon = useMemo(
    () => getSmartFolderIcon(smartFolderInfo?.type || null),
    [smartFolderInfo?.type]
  )
  const colorClass = useMemo(
    () => getSmartFolderColor(smartFolderInfo?.type || null),
    [smartFolderInfo?.type]
  )

  return (
    <div
      onClick={() => onClick(folder)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer group',
        isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      {/* eslint-disable-next-line react-hooks/rules-of-hooks */}
      <Icon className={cn('w-5 h-5 flex-shrink-0', !isSelected && colorClass)} />
      <span className="flex-1 truncate">{folder.name}</span>
      {folder.documentCount > 0 && (
        <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
          {folder.documentCount}
        </span>
      )}
    </div>
  )
}
