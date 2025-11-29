/**
 * FolderPropertiesModal Component
 * Modal for displaying folder properties and metadata
 */

import { FC } from 'react'
import {
  XMarkIcon,
  InformationCircleIcon,
  FolderIcon,
  LockClosedIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline'
import type { Folder } from '@/types/folder'
import { formatDistanceToNow } from 'date-fns'

export interface FolderPropertiesModalProps {
  isOpen: boolean
  folder: Folder | null
  onClose: () => void
}

export const FolderPropertiesModal: FC<FolderPropertiesModalProps> = ({
  isOpen,
  folder,
  onClose,
}) => {
  if (!isOpen || !folder) return null

  const confidentialityColors = {
    public: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    internal: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    confidential: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    highly_confidential: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }

  const confidentialityLabels = {
    public: 'Public',
    internal: 'Internal',
    confidential: 'Confidential',
    highly_confidential: 'Highly Confidential',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-properties-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <InformationCircleIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            <h2
              id="folder-properties-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Folder Properties
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* General Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              General
            </h3>
            <div className="space-y-3">
              {/* Folder Name */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Name:</span>
                <span className="col-span-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                  {folder.name}
                </span>
              </div>

              {/* Path */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Path:</span>
                <span className="col-span-2 text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                  {folder.path}
                </span>
              </div>

              {/* ID */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">ID:</span>
                <span className="col-span-2 text-xs text-gray-900 dark:text-gray-100 font-mono">
                  {folder.id}
                </span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4" />
              Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Subfolders */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <FolderOpenIcon className="w-4 h-4" />
                  <span className="text-xs">Subfolders</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {folder.childrenCount || 0}
                </p>
              </div>

              {/* Documents */}
              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                  <DocumentTextIcon className="w-4 h-4" />
                  <span className="text-xs">Documents</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {folder.documentCount || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Security & Classification */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <LockClosedIcon className="w-4 h-4" />
              Security & Classification
            </h3>
            <div className="space-y-3">
              {/* Confidentiality Level */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Confidentiality:</span>
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      confidentialityColors[folder.confidentiality] ||
                      confidentialityColors.internal
                    }`}
                  >
                    {confidentialityLabels[folder.confidentiality] || 'Internal'}
                  </span>
                </div>
              </div>

              {/* Locked Status */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <div className="col-span-2">
                  {folder.isLocked ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                      <LockClosedIcon className="w-3 h-3" />
                      Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Unlocked
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Dates
            </h3>
            <div className="space-y-3">
              {/* Created */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                  <div>
                    {new Date(folder.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ({formatDistanceToNow(new Date(folder.createdAt), { addSuffix: true })})
                  </div>
                </div>
              </div>

              {/* Modified */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Modified:</span>
                <div className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                  <div>
                    {new Date(folder.modifiedAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    ({formatDistanceToNow(new Date(folder.modifiedAt), { addSuffix: true })})
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ownership & Permissions */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <UserIcon className="w-4 h-4" />
              Ownership & Permissions
            </h3>
            <div className="space-y-3">
              {/* Created By */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Created by:</span>
                <span className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                  {folder.createdBy}
                </span>
              </div>

              {/* Modified By */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Modified by:</span>
                <span className="col-span-2 text-sm text-gray-900 dark:text-gray-100">
                  {folder.modifiedBy}
                </span>
              </div>

              {/* Permissions */}
              <div className="grid grid-cols-3 gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">Your permissions:</span>
                <div className="col-span-2 flex flex-wrap gap-1.5">
                  {folder.permissions?.canView && (
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                      View
                    </span>
                  )}
                  {folder.permissions?.canEdit && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                      Edit
                    </span>
                  )}
                  {folder.permissions?.canDelete && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded">
                      Delete
                    </span>
                  )}
                  {folder.permissions?.canManage && (
                    <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                      Manage
                    </span>
                  )}
                  {!folder.permissions && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      No permissions data available
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description (if available) */}
          {folder.description && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Description
              </h3>
              <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {folder.description}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="
              px-4 py-2 text-sm font-medium
              bg-primary-600 hover:bg-primary-700
              text-white rounded-lg transition-colors
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
