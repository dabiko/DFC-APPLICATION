/**
 * FilePreviewCard Component
 * Preview card for uploaded files
 */

import { FC, useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { FilePreviewCardProps } from '@/types/upload'
import {
  getFileIcon,
  getFileCategoryLabel,
  isImageFile,
  createFilePreviewUrl,
  revokeFilePreviewUrl,
} from '@/utils/fileValidation'
import { formatFileSize } from '@/utils/versionUtils'

export const FilePreviewCard: FC<FilePreviewCardProps> = ({
  file,
  previewUrl: externalPreviewUrl,
  isSelected = false,
  onRemove,
  onSelect,
  showMetadata = true,
  className,
}) => {
  const [internalPreviewUrl, setInternalPreviewUrl] = useState<string | null>(null)

  const previewUrl = externalPreviewUrl || internalPreviewUrl

  // Create preview URL for images
  useEffect(() => {
    if (!externalPreviewUrl && isImageFile(file)) {
      const url = createFilePreviewUrl(file)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInternalPreviewUrl(url)

      // Cleanup on unmount
      return () => {
        if (url) {
          revokeFilePreviewUrl(url)
        }
      }
    }
  }, [file, externalPreviewUrl])

  const handleClick = () => {
    if (onSelect) {
      onSelect()
    }
  }

  return (
    <div
      className={cn(
        'relative group rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-500 ring-offset-2'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        onSelect && 'cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      {/* Remove button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="absolute top-2 right-2 z-10 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove file"
        >
          <XMarkIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-error-600 dark:hover:text-error-400" />
        </button>
      )}

      {/* Preview/Icon */}
      <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-md overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={() => setInternalPreviewUrl(null)}
          />
        ) : (
          <span className="text-6xl">{getFileIcon(file)}</span>
        )}
      </div>

      {/* File info */}
      {showMetadata && (
        <div className="p-3 space-y-1">
          <p
            className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate"
            title={file.name}
          >
            {file.name}
          </p>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{getFileCategoryLabel(file)}</span>
            <span>{formatFileSize(file.size)}</span>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {onSelect && isSelected && (
        <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-500/20 rounded-lg pointer-events-none" />
      )}
    </div>
  )
}
