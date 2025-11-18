/**
 * BulkActionToolbar Component
 * Toolbar for performing bulk operations on selected files/folders
 */

import { FC, Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  FolderIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  TagIcon,
  ShieldCheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { BulkActionToolbarProps } from '@/types/fileManagement'

export const BulkActionToolbar: FC<BulkActionToolbarProps> = ({
  selectedCount,
  selectedItems,
  onMove,
  onCopy,
  onDelete,
  onDownload,
  onShare,
  onAddTags,
  onChangeConfidentiality,
  onClearSelection,
  className,
}) => {
  if (selectedCount === 0) {
    return null
  }

  const handleAction = (action: () => void) => {
    action()
  }

  const hasFiles = selectedItems.some((item) => item.type === 'file')
  const hasFolders = selectedItems.some((item) => item.type === 'folder')
  const canDelete = selectedItems.every((item) => item.permissions.canDelete)
  const canDownload = selectedItems.every((item) => item.permissions.canDownload)
  const canShare = selectedItems.every((item) => item.permissions.canShare)
  const canEdit = selectedItems.every((item) => item.permissions.canEdit)

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2 px-4 py-3',
        'bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700',
        'animate-in slide-in-from-bottom-5 duration-200',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 rounded-md">
        <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
          {selectedCount} selected
        </span>
        <button
          onClick={onClearSelection}
          className="p-0.5 hover:bg-primary-100 dark:hover:bg-primary-800/50 rounded transition-colors"
          title="Clear selection"
        >
          <XMarkIcon className="w-4 h-4 text-primary-700 dark:text-primary-300" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Move */}
        {onMove && (
          <button
            onClick={() => handleAction(() => onMove(selectedItems.map((i) => i.id)))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Move to folder"
          >
            <FolderIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Move</span>
          </button>
        )}

        {/* Copy */}
        {onCopy && (
          <button
            onClick={() => handleAction(() => onCopy(selectedItems.map((i) => i.id)))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Copy to folder"
          >
            <DocumentDuplicateIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </button>
        )}

        {/* Download */}
        {onDownload && canDownload && hasFiles && (
          <button
            onClick={() => handleAction(() => onDownload(selectedItems.map((i) => i.id)))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Download selected"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}

        {/* Share */}
        {onShare && canShare && (
          <button
            onClick={() => handleAction(() => onShare(selectedItems.map((i) => i.id)))}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title="Share selected"
          >
            <ShareIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* More actions dropdown */}
        <Menu as="div" className="relative">
          <Menu.Button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
            <span className="hidden sm:inline">More</span>
            <ChevronDownIcon className="w-4 h-4" />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute bottom-full mb-2 right-0 w-56 origin-bottom-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Add Tags */}
                {onAddTags && canEdit && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() =>
                          handleAction(() => onAddTags(selectedItems.map((i) => i.id)))
                        }
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm',
                          active
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <TagIcon className="w-4 h-4" />
                        Add Tags
                      </button>
                    )}
                  </Menu.Item>
                )}

                {/* Change Confidentiality */}
                {onChangeConfidentiality && canEdit && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() =>
                          handleAction(() =>
                            onChangeConfidentiality(selectedItems.map((i) => i.id))
                          )
                        }
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm',
                          active
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <ShieldCheckIcon className="w-4 h-4" />
                        Change Confidentiality
                      </button>
                    )}
                  </Menu.Item>
                )}

                {/* Archive */}
                {canEdit && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm',
                          active
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                        )}
                      >
                        <ArchiveBoxIcon className="w-4 h-4" />
                        Archive
                      </button>
                    )}
                  </Menu.Item>
                )}

                {/* Divider */}
                {onDelete && canDelete && (
                  <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                )}

                {/* Delete */}
                {onDelete && canDelete && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleAction(() => onDelete(selectedItems.map((i) => i.id)))}
                        className={cn(
                          'flex items-center gap-2 w-full px-4 py-2 text-sm',
                          active
                            ? 'bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-300'
                            : 'text-error-600 dark:text-error-400'
                        )}
                      >
                        <TrashIcon className="w-4 h-4" />
                        Delete
                      </button>
                    )}
                  </Menu.Item>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Selection summary */}
      <div className="hidden md:flex items-center gap-2 ml-2 px-3 text-xs text-gray-500 dark:text-gray-400">
        {hasFiles && !hasFolders && (
          <span>
            {selectedCount} file{selectedCount !== 1 ? 's' : ''}
          </span>
        )}
        {hasFolders && !hasFiles && (
          <span>
            {selectedCount} folder{selectedCount !== 1 ? 's' : ''}
          </span>
        )}
        {hasFiles && hasFolders && (
          <span>
            {selectedItems.filter((i) => i.type === 'file').length} files,{' '}
            {selectedItems.filter((i) => i.type === 'folder').length} folders
          </span>
        )}
      </div>
    </div>
  )
}
