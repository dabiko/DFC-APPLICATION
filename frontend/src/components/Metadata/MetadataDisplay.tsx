/**
 * MetadataDisplay Component
 * Read-only display of document metadata
 */

import { FC } from 'react'
import { PencilIcon, ClockIcon, UserIcon, FolderIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import type { MetadataDisplayProps } from '@/types/metadata'
import {
  getDocumentTypeInfo,
  getDepartmentInfo,
  getRetentionPeriodInfo,
  getIdentifierTypeInfo,
} from '@/data/metadataLists'
import { ConfidentialityBadge } from '@components/Badge/ConfidentialityBadge'
import { format } from 'date-fns'

export const MetadataDisplay: FC<MetadataDisplayProps> = ({
  metadata,
  mode = 'view',
  onEdit,
  showActions = true,
  className = '',
}) => {
  const documentTypeInfo = getDocumentTypeInfo(metadata.documentType)
  const departmentInfo = getDepartmentInfo(metadata.department)
  const retentionInfo = getRetentionPeriodInfo(metadata.retentionPeriod)
  const identifierTypeInfo = getIdentifierTypeInfo(metadata.identifierType)

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy')
    } catch {
      return dateString
    }
  }

  if (mode === 'compact') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">{metadata.title}</h4>
          <ConfidentialityBadge level={metadata.confidentialityLevel} />
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>{documentTypeInfo?.icon} {documentTypeInfo?.label}</span>
          <span>•</span>
          <span>{departmentInfo?.label}</span>
          <span>•</span>
          <span>{formatDate(metadata.date)}</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {metadata.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{metadata.title}</h3>
          <div className="flex items-center gap-2">
            <ConfidentialityBadge level={metadata.confidentialityLevel} size="md" />
            {metadata.isOnLegalHold && (
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
                <ShieldCheckIcon className="w-4 h-4" />
                Legal Hold
              </span>
            )}
          </div>
        </div>
        {showActions && onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
        )}
      </div>

      {/* Metadata Grid */}
      <div className="p-6 space-y-6">
        {/* Core Information */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Document Information
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Document Type</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {documentTypeInfo?.icon} {documentTypeInfo?.label}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {identifierTypeInfo?.label || 'Identifier'}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 font-mono">{metadata.identifier}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                Document Date
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatDate(metadata.date)}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                Creator / Source
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.creator}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FolderIcon className="w-4 h-4" />
                Department
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{departmentInfo?.label}</dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Retention Period</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {retentionInfo?.label}
                {metadata.customRetentionYears && ` (${metadata.customRetentionYears} years)`}
              </dd>
            </div>
          </dl>
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Tags
          </h4>
          <div className="flex flex-wrap gap-2">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Description */}
        {metadata.description && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Description
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{metadata.description}</p>
          </div>
        )}

        {/* Optional Fields */}
        {(metadata.subject ||
          metadata.customerName ||
          metadata.contractValue ||
          metadata.fiscalYear ||
          metadata.expirationDate) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Additional Information
            </h4>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.subject && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subject</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.subject}</dd>
                </div>
              )}

              {metadata.customerName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.customerName}</dd>
                </div>
              )}

              {metadata.contractValue !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Contract Value</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {metadata.currency || 'USD'} {metadata.contractValue.toLocaleString()}
                  </dd>
                </div>
              )}

              {metadata.fiscalYear && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fiscal Year</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.fiscalYear}</dd>
                </div>
              )}

              {metadata.expirationDate && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Expiration Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {formatDate(metadata.expirationDate)}
                  </dd>
                </div>
              )}

              {metadata.pageCount && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Pages</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.pageCount}</dd>
                </div>
              )}

              {metadata.language && (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Language</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">{metadata.language}</dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Keywords */}
        {metadata.keywords && metadata.keywords.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Keywords
            </h4>
            <div className="flex flex-wrap gap-2">
              {metadata.keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {metadata.comments && (
          <div>
            <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Comments
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{metadata.comments}</p>
          </div>
        )}

        {/* Legal Hold Info */}
        {metadata.isOnLegalHold && metadata.legalHoldReason && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h4 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5" />
              Legal Hold
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300">{metadata.legalHoldReason}</p>
          </div>
        )}

        {/* Version Info */}
        {metadata.version && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Version {metadata.version}</p>
          </div>
        )}
      </div>
    </div>
  )
}
