/**
 * FolderBreadcrumbs Component
 * Enhanced breadcrumbs specifically for folder navigation with copy path functionality
 */

import { FC, useState } from 'react'
import { ChevronRightIcon, HomeIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'
import copy from 'copy-to-clipboard'

export interface FolderBreadcrumbsProps {
  /** Current folder path (array of folders from root to current) */
  folderPath: Folder[]
  /** Callback when breadcrumb item is clicked */
  onNavigate?: (folder: Folder | null) => void
  /** Show home icon */
  showHomeIcon?: boolean
  /** Maximum breadcrumbs to show before collapsing */
  maxItems?: number
  /** Show copy path button */
  showCopyButton?: boolean
  /** Custom className */
  className?: string
}

export const FolderBreadcrumbs: FC<FolderBreadcrumbsProps> = ({
  folderPath,
  onNavigate,
  showHomeIcon = true,
  maxItems = 5,
  showCopyButton = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false)

  // Build display items with collapse logic
  const displayItems = (() => {
    if (!maxItems || folderPath.length <= maxItems) {
      return folderPath
    }

    // Keep first and last few items, collapse middle
    const firstItem = [folderPath[0]]
    const lastItems = folderPath.slice(-(maxItems - 2))
    return [...firstItem, null, ...lastItems] // null represents ellipsis
  })()

  const handleCopyPath = () => {
    const path = folderPath.length > 0 ? folderPath[folderPath.length - 1].path : '/'
    copy(path)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleNavigate = (folder: Folder | null) => {
    onNavigate?.(folder)
  }

  return (
    <nav aria-label="Folder breadcrumb" className={`flex items-center gap-2 ${className}`}>
      <ol className="flex items-center flex-wrap gap-1">
        {/* Home/Root */}
        <li className="flex items-center">
          <button
            onClick={() => handleNavigate(null)}
            className="flex items-center px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            aria-label="Go to root"
          >
            {showHomeIcon && <HomeIcon className="w-4 h-4 mr-1" />}
            <span>Home</span>
          </button>
        </li>

        {displayItems.length > 0 && (
          <li className="flex items-center text-gray-400 dark:text-gray-600" aria-hidden="true">
            <ChevronRightIcon className="w-4 h-4" />
          </li>
        )}

        {/* Folder path */}
        {displayItems.map((folder, index) => {
          const isLast = index === displayItems.length - 1
          const isEllipsis = folder === null

          return (
            <div key={folder?.id || `ellipsis-${index}`} className="flex items-center gap-1">
              <li className="flex items-center">
                {isEllipsis ? (
                  <span className="px-2 py-1 text-sm text-gray-500 dark:text-gray-400">...</span>
                ) : (
                  <button
                    onClick={() => !isLast && handleNavigate(folder)}
                    disabled={isLast}
                    className={`
                      flex items-center px-2 py-1 text-sm font-medium rounded transition-colors truncate max-w-[200px]
                      ${
                        isLast
                          ? 'text-gray-900 dark:text-gray-100 cursor-default'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                    aria-current={isLast ? 'page' : undefined}
                    title={folder.name}
                  >
                    {folder.name}
                  </button>
                )}
              </li>

              {!isLast && (
                <li className="flex items-center text-gray-400 dark:text-gray-600" aria-hidden="true">
                  <ChevronRightIcon className="w-4 h-4" />
                </li>
              )}
            </div>
          )
        })}
      </ol>

      {/* Copy Path Button */}
      {showCopyButton && folderPath.length > 0 && (
        <button
          onClick={handleCopyPath}
          className="ml-2 p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title={copied ? 'Copied!' : 'Copy full path'}
          aria-label="Copy folder path"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <DocumentDuplicateIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </nav>
  )
}
