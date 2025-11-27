/**
 * UserSmartFolderItem Component
 * Renders a user-created smart folder in the sidebar
 * Supports navigation, context menu for edit/delete
 */

import { FC, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FolderSearch,
  FolderHeart,
  FolderClock,
  FolderLock,
  FolderCheck,
  FileSearch,
  Filter,
  Search,
  Star,
  Clock,
  Shield,
  Bookmark,
  Tag,
  Archive,
  Calendar,
  Users,
  Briefcase,
  FileText,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@utils/cn'
import type { SmartFolder, SmartFolderIcon } from '@/services/smartFolderService'
import { getSmartFolderColorClasses } from '@/services/smartFolderService'

export interface UserSmartFolderItemProps {
  folder: SmartFolder
  isSelected: boolean
  onClick: (folder: SmartFolder) => void
  onEdit?: (folder: SmartFolder) => void
  onDelete?: (folder: SmartFolder) => void
  className?: string
}

/**
 * Icon mapping for smart folder icons
 */
const ICON_MAP: Record<SmartFolderIcon, LucideIcon> = {
  'folder-search': FolderSearch,
  'folder-star': FolderHeart,
  'folder-clock': FolderClock,
  'folder-lock': FolderLock,
  'folder-check': FolderCheck,
  'file-search': FileSearch,
  filter: Filter,
  search: Search,
  star: Star,
  clock: Clock,
  shield: Shield,
  bookmark: Bookmark,
  tag: Tag,
  archive: Archive,
  calendar: Calendar,
  users: Users,
  briefcase: Briefcase,
  'file-text': FileText,
  layers: Layers,
}

export const UserSmartFolderItem: FC<UserSmartFolderItemProps> = ({
  folder,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  className,
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [showMenu, setShowMenu] = useState(false)

  // Get the icon component
  const Icon = ICON_MAP[folder.icon] || FolderSearch
  const colorClasses = getSmartFolderColorClasses(folder.color)

  // Check if we're on this smart folder's results page
  const isOnResultsPage = location.pathname === `/smart-folder/${folder.id}`

  // Handle click - navigate to results page
  const handleClick = () => {
    navigate(`/smart-folder/${folder.id}`)
    onClick(folder)
  }

  // Handle context menu actions
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onEdit?.(folder)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onDelete?.(folder)
  }

  // Determine if item should appear selected
  const showAsSelected = isOnResultsPage || isSelected

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer group relative',
        showAsSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
        className
      )}
    >
      {/* Icon with color */}
      <div
        className={cn(
          'w-5 h-5 flex-shrink-0 rounded',
          colorClasses.bg,
          'flex items-center justify-center'
        )}
      >
        <Icon className={cn('w-3.5 h-3.5', colorClasses.text)} />
      </div>

      {/* Name */}
      <span className="flex-1 truncate">{folder.name}</span>

      {/* Document count badge */}
      {folder.document_count > 0 && (
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            colorClasses.bg,
            colorClasses.text
          )}
        >
          {folder.document_count > 99 ? '99+' : folder.document_count}
        </span>
      )}

      {/* Context menu button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
      >
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>

      {/* Context menu dropdown */}
      {showMenu && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(false)
            }}
          />
          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            <button
              onClick={handleEdit}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
}
