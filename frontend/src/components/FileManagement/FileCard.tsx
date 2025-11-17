/**
 * FileCard Component
 * Displays a file or folder in grid or list view mode
 */

import { FC, MouseEvent } from 'react'
import {
  FolderIcon,
  StarIcon,
  LockClosedIcon,
  ShareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { cn } from '@utils/cn'
import type { FileCardProps } from '@/types/fileManagement'
import { CONFIDENTIALITY_COLORS, CONFIDENTIALITY_ICONS } from '@/types/fileManagement'
import { getFileIcon } from '@/utils/fileValidation'
import { formatFileSize } from '@/utils/versionUtils'
import { formatDistanceToNow } from 'date-fns'

export const FileCard: FC<FileCardProps> = ({
  item,
  viewMode,
  isSelected = false,
  onClick,
  onDoubleClick,
  onSelect,
  onFavoriteToggle,
  showCheckbox = false,
  showActions = true,
  className,
}) => {
  const isFolder = item.type === 'folder'
  const confidentialityColor = CONFIDENTIALITY_COLORS[item.confidentialityLevel]
  const confidentialityIcon = CONFIDENTIALITY_ICONS[item.confidentialityLevel]

  const handleClick = (e: MouseEvent) => {
    if (onClick) {
      e.stopPropagation()
      onClick()
    }
  }

  const handleDoubleClick = (e: MouseEvent) => {
    if (onDoubleClick) {
      e.stopPropagation()
      onDoubleClick()
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(e.target.checked)
    }
  }

  const handleFavoriteClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (onFavoriteToggle) {
      onFavoriteToggle()
    }
  }

  const getConfidentialityBadgeClass = () => {
    const baseClass = 'text-xs px-2 py-0.5 rounded-full font-medium'
    switch (confidentialityColor) {
      case 'gray':
        return cn(baseClass, 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300')
      case 'blue':
        return cn(baseClass, 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300')
      case 'orange':
        return cn(baseClass, 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300')
      case 'red':
        return cn(baseClass, 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300')
      default:
        return baseClass
    }
  }

  if (viewMode === 'grid') {
    return (
      <div
        className={cn(
          'relative group rounded-lg border-2 transition-all cursor-pointer',
          isSelected
            ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900',
          className
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Favorite */}
        {showActions && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
            title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {item.isFavorite ? (
              <StarIconSolid className="w-5 h-5 text-yellow-500" />
            ) : (
              <StarIcon className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
            )}
          </button>
        )}

        {/* Preview/Icon */}
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-md overflow-hidden flex items-center justify-center p-4">
          {isFolder ? (
            <FolderIcon className="w-20 h-20 text-blue-500" />
          ) : item.thumbnailUrl ? (
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-6xl">{getFileIcon({ name: item.name, type: item.mimeType || '' } as File)}</span>
          )}
        </div>

        {/* File info */}
        <div className="p-3 space-y-2">
          {/* Name */}
          <p
            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
            title={item.name}
          >
            {item.name}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              {isFolder
                ? `${item.itemCount || 0} items`
                : formatFileSize(item.fileSize || 0)}
            </span>
            <span>{formatDistanceToNow(new Date(item.modifiedAt), { addSuffix: true })}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Confidentiality */}
            <span className={getConfidentialityBadgeClass()}>
              {confidentialityIcon} {item.confidentialityLevel}
            </span>

            {/* Status indicators */}
            {item.isLocked && (
              <LockClosedIcon className="w-4 h-4 text-gray-500" title="Locked" />
            )}
            {item.isShared && (
              <ShareIcon className="w-4 h-4 text-blue-500" title="Shared" />
            )}
            {item.hasVersions && (
              <ClockIcon className="w-4 h-4 text-gray-500" title={`Version ${item.currentVersion}`} />
            )}
          </div>
        </div>
      </div>
    )
  }

  // List view
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50',
        className
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Icon/Thumbnail */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
        {isFolder ? (
          <FolderIcon className="w-8 h-8 text-blue-500" />
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          <span className="text-2xl">{getFileIcon({ name: item.name, type: item.mimeType || '' } as File)}</span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={getConfidentialityBadgeClass()}>
            {confidentialityIcon} {item.confidentialityLevel}
          </span>
          {item.isLocked && <LockClosedIcon className="w-3 h-3 text-gray-500" />}
          {item.isShared && <ShareIcon className="w-3 h-3 text-blue-500" />}
        </div>
      </div>

      {/* Type */}
      <div className="hidden sm:flex flex-shrink-0 w-32 text-sm text-gray-600 dark:text-gray-400">
        {isFolder ? 'Folder' : item.metadata?.documentType || item.extension?.toUpperCase() || 'File'}
      </div>

      {/* Size */}
      <div className="hidden md:flex flex-shrink-0 w-24 text-sm text-gray-600 dark:text-gray-400">
        {isFolder ? `${item.itemCount || 0} items` : formatFileSize(item.fileSize || 0)}
      </div>

      {/* Modified */}
      <div className="hidden lg:flex flex-shrink-0 w-32 text-sm text-gray-600 dark:text-gray-400">
        {formatDistanceToNow(new Date(item.modifiedAt), { addSuffix: true })}
      </div>

      {/* Favorite */}
      {showActions && (
        <button
          onClick={handleFavoriteClick}
          className="flex-shrink-0 p-1"
          title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {item.isFavorite ? (
            <StarIconSolid className="w-5 h-5 text-yellow-500" />
          ) : (
            <StarIcon className="w-5 h-5 text-gray-400 hover:text-yellow-500" />
          )}
        </button>
      )}
    </div>
  )
}
