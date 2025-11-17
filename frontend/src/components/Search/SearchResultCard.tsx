/**
 * SearchResultCard Component
 * Displays a single search result with highlights
 */

import { FC } from 'react'
import {
  ArrowDownTrayIcon,
  EyeIcon,
  LockClosedIcon,
  ShareIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { SearchResultCardProps } from '@/types/search'
import { CONFIDENTIALITY_COLORS, CONFIDENTIALITY_ICONS } from '@/types/fileManagement'
import { getFileIcon } from '@/utils/fileValidation'
import { formatFileSize } from '@/utils/versionUtils'
import { formatDistanceToNow } from 'date-fns'

export const SearchResultCard: FC<SearchResultCardProps> = ({
  result,
  viewMode = 'list',
  isSelected = false,
  onSelect,
  onClick,
  onPreview,
  onDownload,
  showHighlights = true,
  className,
}) => {
  const {
    fileName,
    filePath,
    fileSize,
    mimeType,
    extension,
    score,
    highlights,
    thumbnailUrl,
    modifiedAt,
    modifiedBy,
    confidentialityLevel,
    isShared,
    isLocked,
    hasVersions,
    currentVersion,
    permissions,
  } = result

  const confidentialityColor = CONFIDENTIALITY_COLORS[confidentialityLevel]
  const confidentialityIcon = CONFIDENTIALITY_ICONS[confidentialityLevel]

  const getConfidentialityBadgeClass = () => {
    const baseClass = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium'
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

  const renderHighlight = () => {
    if (!showHighlights || highlights.length === 0) return null

    const primaryHighlight = highlights[0]
    return (
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        <span className="text-xs text-gray-500 dark:text-gray-500 uppercase mr-2">
          {primaryHighlight.field}:
        </span>
        {primaryHighlight.matches.map((match, idx) => (
          <span
            key={idx}
            className={cn(
              match.isMatch && 'bg-yellow-200 dark:bg-yellow-900/50 text-gray-900 dark:text-gray-100 font-medium'
            )}
          >
            {match.text}
          </span>
        ))}
        {highlights.length > 1 && (
          <span className="ml-2 text-xs text-gray-500">
            +{highlights.length - 1} more
          </span>
        )}
      </div>
    )
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
        onClick={onClick}
      >
        {/* Checkbox */}
        {onSelect && (
          <div className="absolute top-2 left-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation()
                onSelect(e.target.checked)
              }}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
          </div>
        )}

        {/* Relevance Score */}
        <div className="absolute top-2 right-2 z-10">
          <span className="px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
            {score}%
          </span>
        </div>

        {/* Preview/Icon */}
        <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-md overflow-hidden flex items-center justify-center p-4">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={fileName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">
              {getFileIcon({ name: fileName, type: mimeType } as File)}
            </span>
          )}
        </div>

        {/* File info */}
        <div className="p-3 space-y-2">
          {/* Name */}
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={fileName}>
            {fileName}
          </p>

          {/* Path */}
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={filePath}>
            {filePath}
          </p>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{formatFileSize(fileSize)}</span>
            <span>{formatDistanceToNow(new Date(modifiedAt), { addSuffix: true })}</span>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={getConfidentialityBadgeClass()}>
              {confidentialityIcon} {confidentialityLevel}
            </span>
            {isLocked && <LockClosedIcon className="w-4 h-4 text-gray-500" />}
            {isShared && <ShareIcon className="w-4 h-4 text-blue-500" />}
            {hasVersions && <ClockIcon className="w-4 h-4 text-gray-500" title={`v${currentVersion}`} />}
          </div>

          {/* Highlights */}
          {renderHighlight()}
        </div>

        {/* Actions */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onPreview && permissions.canView && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onPreview()
              }}
              className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Preview"
            >
              <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onDownload && permissions.canDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDownload()
              }}
              className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Download"
            >
              <ArrowDownTrayIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // List view
  return (
    <div
      className={cn(
        'flex items-start gap-4 p-4 rounded-lg border transition-all cursor-pointer',
        isSelected
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50',
        className
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation()
            onSelect(e.target.checked)
          }}
          className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
        />
      )}

      {/* Icon/Thumbnail */}
      <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={fileName} className="w-12 h-12 object-cover rounded" />
        ) : (
          <span className="text-3xl">{getFileIcon({ name: fileName, type: mimeType } as File)}</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {fileName}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={filePath}>
              {filePath}
            </p>
          </div>

          {/* Relevance Score */}
          <span className="flex-shrink-0 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">
            {score}%
          </span>
        </div>

        {/* Highlights */}
        {renderHighlight()}

        {/* Metadata */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span className={getConfidentialityBadgeClass()}>
            {confidentialityIcon} {confidentialityLevel}
          </span>
          <span>•</span>
          <span>{formatFileSize(fileSize)}</span>
          <span>•</span>
          <span>{extension?.toUpperCase()}</span>
          <span>•</span>
          <span>Modified {formatDistanceToNow(new Date(modifiedAt), { addSuffix: true })}</span>
          {modifiedBy && (
            <>
              <span>•</span>
              <span>by {modifiedBy}</span>
            </>
          )}
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mt-2">
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <LockClosedIcon className="w-3 h-3" />
              Locked
            </span>
          )}
          {isShared && (
            <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
              <ShareIcon className="w-3 h-3" />
              Shared
            </span>
          )}
          {hasVersions && (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <ClockIcon className="w-3 h-3" />
              Version {currentVersion}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex gap-1">
        {onPreview && permissions.canView && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Preview"
          >
            <EyeIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
        {onDownload && permissions.canDownload && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDownload()
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Download"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}
