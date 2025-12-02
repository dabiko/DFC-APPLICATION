/**
 * SmartFolderCard Component
 * Displays a smart folder as a card with icon, name, criteria, and actions
 */

import { useState } from 'react'
import {
  FolderSearch,
  Star,
  Clock,
  Filter,
  Search,
  Bookmark,
  Tag,
  Calendar,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  type SmartFolder,
  describeCriteria,
  getSmartFolderColorClasses,
} from '@/services/smartFolderService'
import { cn } from '@/utils/cn'

interface SmartFolderCardProps {
  folder: SmartFolder
  onEdit?: (folder: SmartFolder) => void
  onDelete?: (folder: SmartFolder) => void
  onToggleVisibility?: (folder: SmartFolder) => void
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  'folder-search': FolderSearch,
  'folder-star': Star,
  'folder-clock': Clock,
  filter: Filter,
  search: Search,
  star: Star,
  bookmark: Bookmark,
  tag: Tag,
  calendar: Calendar,
  briefcase: Briefcase,
  folder_special: FolderSearch,
}

export function SmartFolderCard({
  folder,
  onEdit,
  onDelete,
  onToggleVisibility,
}: SmartFolderCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  // Get icon component
  const IconComponent = ICON_MAP[folder.icon] || FolderSearch

  // Get color classes
  const colorClasses = getSmartFolderColorClasses(folder.color)

  // Handle card click - navigate to results page
  const handleClick = () => {
    navigate(`/smart-folder/${folder.id}`)
  }

  // Handle edit
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onEdit?.(folder)
  }

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onDelete?.(folder)
  }

  // Handle toggle visibility
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onToggleVisibility?.(folder)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group relative"
    >
      {/* Header with icon and menu */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
            colorClasses.bg
          )}
        >
          <IconComponent className={cn('w-6 h-6', colorClasses.text)} />
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
          >
            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleToggleVisibility}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {folder.is_visible ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hide from sidebar
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Show in sidebar
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
        {folder.name}
      </h3>

      {/* Description */}
      {folder.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {folder.description}
        </p>
      )}

      {/* Criteria summary */}
      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 line-clamp-2">
        {describeCriteria(folder.criteria)}
      </p>

      {/* Footer with document count and visibility */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-semibold text-gray-900 dark:text-white">
              {folder.document_count}
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {folder.document_count === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {/* Visibility badge */}
          {!folder.is_visible && (
            <span className="px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              Hidden
            </span>
          )}

          {/* Scope badges */}
          {folder.is_global && (
            <span className="px-2 py-0.5 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded">
              Global
            </span>
          )}
          {!folder.is_personal && !folder.is_global && (
            <span className="px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              Department
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
