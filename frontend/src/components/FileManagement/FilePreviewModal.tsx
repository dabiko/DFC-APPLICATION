/**
 * FilePreviewModal Component
 * Modal for previewing files with metadata and actions
 */

import { FC, Fragment, useState } from 'react'
import { Dialog, Transition, Tab } from '@headlessui/react'
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  PencilIcon,
  TrashIcon,
  DocumentIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@utils/cn'
import type { FilePreviewModalProps } from '@/types/fileManagement'
import { formatFileSize } from '@/utils/versionUtils'
import { formatDistanceToNow } from 'date-fns'
import { CONFIDENTIALITY_COLORS, CONFIDENTIALITY_ICONS } from '@/types/fileManagement'

export const FilePreviewModal: FC<FilePreviewModalProps> = ({
  preview,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onDownload,
  onShare,
  onVersionChange,
  isLoading = false,
}) => {
  const [selectedTab, setSelectedTab] = useState(0)

  if (!preview) return null

  const { fileName, fileSize, mimeType, metadata, versions, canEdit, canDelete, canDownload, canShare } = preview

  const getConfidentialityBadgeClass = () => {
    if (!metadata) return ''
    const color = CONFIDENTIALITY_COLORS[metadata.confidentialityLevel as keyof typeof CONFIDENTIALITY_COLORS]
    const baseClass = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium'

    switch (color) {
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

  const isImage = mimeType.startsWith('image/')
  const isPDF = mimeType === 'application/pdf'
  const isVideo = mimeType.startsWith('video/')
  const isAudio = mimeType.startsWith('audio/')

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex-1 min-w-0">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {fileName}
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {formatFileSize(fileSize)} • {mimeType}
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>

                {/* Loading state */}
                {isLoading && (
                  <div className="flex items-center justify-center p-12">
                    <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Content */}
                {!isLoading && (
                  <div className="flex flex-col lg:flex-row">
                    {/* Preview Panel */}
                    <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-800/50">
                      <div className="flex items-center justify-center min-h-[400px] max-h-[600px] bg-white dark:bg-gray-900 rounded-lg overflow-hidden">
                        {isImage && preview.previewUrl && (
                          <img
                            src={preview.previewUrl}
                            alt={fileName}
                            className="max-w-full max-h-full object-contain"
                          />
                        )}
                        {isPDF && preview.previewUrl && (
                          <iframe
                            src={preview.previewUrl}
                            className="w-full h-full"
                            title={fileName}
                          />
                        )}
                        {isVideo && preview.previewUrl && (
                          <video controls className="max-w-full max-h-full">
                            <source src={preview.previewUrl} type={mimeType} />
                          </video>
                        )}
                        {isAudio && preview.previewUrl && (
                          <audio controls className="w-full">
                            <source src={preview.previewUrl} type={mimeType} />
                          </audio>
                        )}
                        {!isImage && !isPDF && !isVideo && !isAudio && (
                          <div className="text-center">
                            <DocumentIcon className="w-24 h-24 mx-auto text-gray-400" />
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                              Preview not available for this file type
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        {canDownload && onDownload && (
                          <button
                            onClick={() => onDownload(preview.documentId)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                          >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download
                          </button>
                        )}
                        {canShare && onShare && (
                          <button
                            onClick={() => onShare(preview.documentId)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <ShareIcon className="w-4 h-4" />
                            Share
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(preview.documentId)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(preview.documentId)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-error-700 dark:text-error-400 border border-error-300 dark:border-error-600 rounded-lg hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors ml-auto"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Info Panel */}
                    <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700">
                      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                        <Tab.List className="flex border-b border-gray-200 dark:border-gray-700">
                          <Tab
                            className={({ selected }) =>
                              cn(
                                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                selected
                                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                              )
                            }
                          >
                            <InformationCircleIcon className="w-4 h-4" />
                            Details
                          </Tab>
                          {versions && versions.length > 0 && (
                            <Tab
                              className={({ selected }) =>
                                cn(
                                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                                  selected
                                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                )
                              }
                            >
                              <ClockIcon className="w-4 h-4" />
                              Versions ({versions.length})
                            </Tab>
                          )}
                        </Tab.List>

                        <Tab.Panels className="p-6">
                          {/* Details Tab */}
                          <Tab.Panel className="space-y-6">
                            {metadata && (
                              <>
                                {/* Confidentiality */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    Confidentiality
                                  </h4>
                                  <span className={getConfidentialityBadgeClass()}>
                                    {CONFIDENTIALITY_ICONS[metadata.confidentialityLevel as keyof typeof CONFIDENTIALITY_ICONS]}
                                    {metadata.confidentialityLevel}
                                  </span>
                                </div>

                                {/* Document Type */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    Document Type
                                  </h4>
                                  <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.documentType}</p>
                                </div>

                                {/* Department */}
                                {metadata.department && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                      Department
                                    </h4>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.department}</p>
                                  </div>
                                )}

                                {/* Created/Modified */}
                                <div>
                                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                    Dates
                                  </h4>
                                  <div className="space-y-1 text-sm">
                                    {metadata.createdAt && (
                                      <p className="text-gray-600 dark:text-gray-400">
                                        Created: {formatDistanceToNow(new Date(metadata.createdAt), { addSuffix: true })}
                                      </p>
                                    )}
                                    {metadata.modifiedAt && (
                                      <p className="text-gray-600 dark:text-gray-400">
                                        Modified: {formatDistanceToNow(new Date(metadata.modifiedAt), { addSuffix: true })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Tags */}
                                {metadata.keywords && metadata.keywords.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                      Tags
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {metadata.keywords.map((tag, index) => (
                                        <span
                                          key={index}
                                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded text-xs"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Description */}
                                {metadata.description && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                                      Description
                                    </h4>
                                    <p className="text-sm text-gray-900 dark:text-gray-100">{metadata.description}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </Tab.Panel>

                          {/* Versions Tab */}
                          {versions && versions.length > 0 && (
                            <Tab.Panel>
                              <div className="space-y-3">
                                {versions.map((version) => (
                                  <button
                                    key={version.id}
                                    onClick={() => onVersionChange && onVersionChange(version.id)}
                                    className={cn(
                                      'w-full text-left p-3 rounded-lg border transition-colors',
                                      version.isCurrent
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Version {version.versionNumber}
                                      </span>
                                      {version.isCurrent && (
                                        <span className="px-2 py-0.5 bg-primary-600 text-white text-xs rounded-full">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                                    </p>
                                    {version.changeDescription && (
                                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                        {version.changeDescription}
                                      </p>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </Tab.Panel>
                          )}
                        </Tab.Panels>
                      </Tab.Group>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
