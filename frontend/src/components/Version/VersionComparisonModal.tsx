/**
 * VersionComparisonModal Component
 * Modal for comparing two document versions
 */

import { FC, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@components/Button/Button'
import type { VersionComparisonProps } from '@/types/version'
import {
  formatVersionNumber,
  formatVersionDate,
  formatFileSize,
  getVersionChangesSummary,
} from '@/utils/versionUtils'
import { cn } from '@utils/cn'

export const VersionComparisonModal: FC<VersionComparisonProps> = ({
  comparison,
  isOpen,
  onClose,
  isLoading = false,
}) => {
  const { fromVersion, toVersion } = comparison

  const changesSummary = getVersionChangesSummary(fromVersion, toVersion)

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
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-900 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <ArrowsRightLeftIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Version Comparison
                    </Dialog.Title>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Analyzing differences...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Version Comparison Grid */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* From Version */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              FROM
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatVersionNumber(fromVersion.versionNumber)}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">File Name</p>
                              <p className="font-mono text-gray-900 dark:text-gray-100">
                                {fromVersion.fileName}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Size</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {formatFileSize(fromVersion.fileSize)}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Type</p>
                              <p className="font-mono text-gray-900 dark:text-gray-100">
                                {fromVersion.mimeType}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Created</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {formatVersionDate(fromVersion.createdAt, true)}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Created By</p>
                              <p className="text-gray-900 dark:text-gray-100">{fromVersion.createdBy}</p>
                            </div>

                            {fromVersion.checksum && (
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Checksum</p>
                                <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                                  {fromVersion.checksum.substring(0, 16)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* To Version */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              TO
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {formatVersionNumber(toVersion.versionNumber)}
                            </span>
                          </div>

                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">File Name</p>
                              <p
                                className={cn(
                                  'font-mono',
                                  fromVersion.fileName !== toVersion.fileName
                                    ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {toVersion.fileName}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Size</p>
                              <p
                                className={cn(
                                  fromVersion.fileSize !== toVersion.fileSize
                                    ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {formatFileSize(toVersion.fileSize)}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Type</p>
                              <p
                                className={cn(
                                  'font-mono',
                                  fromVersion.mimeType !== toVersion.mimeType
                                    ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                    : 'text-gray-900 dark:text-gray-100'
                                )}
                              >
                                {toVersion.mimeType}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Created</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {formatVersionDate(toVersion.createdAt, true)}
                              </p>
                            </div>

                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Created By</p>
                              <p className="text-gray-900 dark:text-gray-100">{toVersion.createdBy}</p>
                            </div>

                            {toVersion.checksum && (
                              <div>
                                <p className="text-gray-500 dark:text-gray-400">Checksum</p>
                                <p
                                  className={cn(
                                    'font-mono text-xs break-all',
                                    fromVersion.checksum !== toVersion.checksum
                                      ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                      : 'text-gray-900 dark:text-gray-100'
                                  )}
                                >
                                  {toVersion.checksum.substring(0, 16)}...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Changes Summary */}
                      {changesSummary.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Detected Changes
                          </h4>
                          <div className="space-y-2">
                            {changesSummary.map((change, index) => (
                              <div
                                key={index}
                                className="flex items-start gap-2 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                              >
                                <span className="text-primary-600 dark:text-primary-400 mt-0.5">•</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{change}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata Changes */}
                      {comparison.metadataChanges && comparison.metadataChanges.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                            Metadata Changes
                          </h4>
                          <div className="space-y-2">
                            {comparison.metadataChanges.map((change, index) => (
                              <div
                                key={index}
                                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm"
                              >
                                <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                  {change.field}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">From: </span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {String(change.oldValue)}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">To: </span>
                                    <span className="text-primary-600 dark:text-primary-400 font-semibold">
                                      {String(change.newValue)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="secondary" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
