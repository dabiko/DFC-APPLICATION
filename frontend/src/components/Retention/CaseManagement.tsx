import React, { useState } from 'react'
import {
  DocumentPlusIcon,
  BellIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import type { CaseManagementProps } from '@/types/retention'
import { format } from 'date-fns'

export const CaseManagement: React.FC<CaseManagementProps> = ({
  hold,
  onUpdate,
  onAddDocument,
  onRemoveDocument,
  onSendNotification,
  notifications,
  auditEvents,
  readonly = false,
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'documents' | 'notifications' | 'audit'>(
    'details'
  )

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Case Name
          </label>
          <div className="text-gray-900 dark:text-white">{hold.caseName}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Case Number
          </label>
          <div className="text-gray-900 dark:text-white">{hold.caseNumber}</div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <div className="text-gray-900 dark:text-white">{hold.description}</div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Created
          </label>
          <div className="text-sm text-gray-900 dark:text-white">
            {format(new Date(hold.createdAt), 'MMM d, yyyy')}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">by {hold.createdBy}</div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Effective Date
          </label>
          <div className="text-sm text-gray-900 dark:text-white">
            {format(new Date(hold.effectiveDate), 'MMM d, yyyy')}
          </div>
        </div>
        {hold.expiryDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiry Date
            </label>
            <div className="text-sm text-gray-900 dark:text-white">
              {format(new Date(hold.expiryDate), 'MMM d, yyyy')}
            </div>
          </div>
        )}
      </div>

      {/* Stakeholders */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Custodians ({hold.custodians.length})
          </label>
          <div className="space-y-1">
            {hold.custodians.map((custodian, i) => (
              <div
                key={i}
                className="text-sm text-gray-900 dark:text-white flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4 text-gray-400" />
                {custodian}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Legal Counsel ({hold.legalCounsel.length})
          </label>
          <div className="space-y-1">
            {hold.legalCounsel.map((counsel, i) => (
              <div key={i} className="text-sm text-gray-900 dark:text-white">
                {counsel}
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reviewers ({hold.reviewers.length})
          </label>
          <div className="space-y-1">
            {hold.reviewers.map((reviewer, i) => (
              <div key={i} className="text-sm text-gray-900 dark:text-white">
                {reviewer}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Court Info */}
      {(hold.court || hold.jurisdiction) && (
        <div className="grid grid-cols-2 gap-6">
          {hold.court && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Court
              </label>
              <div className="text-gray-900 dark:text-white">{hold.court}</div>
            </div>
          )}
          {hold.jurisdiction && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Jurisdiction
              </label>
              <div className="text-gray-900 dark:text-white">{hold.jurisdiction}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderDocuments = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            {hold.documentsOnHold.toLocaleString()} Documents on Hold
          </div>
          {hold.documentsReleased > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {hold.documentsReleased.toLocaleString()} released
            </div>
          )}
        </div>
        {!readonly && onAddDocument && (
          <button
            onClick={() => onAddDocument([])}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <DocumentPlusIcon className="w-5 h-5" />
            Add Documents
          </button>
        )}
      </div>

      {/* Document Scope */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-3">Hold Scope</h4>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-blue-700 dark:text-blue-400 font-medium">Departments:</span>{' '}
            {hold.departments.join(', ')}
          </div>
          <div>
            <span className="text-blue-700 dark:text-blue-400 font-medium">Document Types:</span>{' '}
            {hold.documentTypes.join(', ')}
          </div>
          {hold.keywords.length > 0 && (
            <div>
              <span className="text-blue-700 dark:text-blue-400 font-medium">Keywords:</span>{' '}
              {hold.keywords.join(', ')}
            </div>
          )}
          {hold.dateRange && (
            <div>
              <span className="text-blue-700 dark:text-blue-400 font-medium">Date Range:</span>{' '}
              {format(new Date(hold.dateRange.from), 'MMM d, yyyy')} -{' '}
              {format(new Date(hold.dateRange.to), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications ({hold.notificationsSent})
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {hold.acknowledgedBy.length} acknowledged • {hold.pendingAcknowledgment.length} pending
          </div>
        </div>
        {!readonly && onSendNotification && (
          <button
            onClick={() => onSendNotification([])}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <BellIcon className="w-5 h-5" />
            Send Notification
          </button>
        )}
      </div>

      {notifications && notifications.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Sent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {notification.recipientEmail}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {format(new Date(notification.sentAt), 'MMM d, yyyy h:mm a')}
                  </td>
                  <td className="px-6 py-4">
                    {notification.acknowledgedAt ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        Acknowledged
                      </span>
                    ) : notification.status === 'failed' ? (
                      <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                        <XCircleIcon className="w-4 h-4" />
                        Failed
                      </span>
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No notifications sent yet
        </div>
      )}
    </div>
  )

  const renderAudit = () => (
    <div className="space-y-4">
      {auditEvents && auditEvents.length > 0 ? (
        <div className="space-y-3">
          {auditEvents.map((event) => (
            <div
              key={event.id}
              className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-shrink-0">
                <ClockIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-gray-900 dark:text-white capitalize">
                    {event.eventType.replace(/_/g, ' ')}
                  </div>
                  <time className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(event.performedAt), 'MMM d, yyyy h:mm a')}
                  </time>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  by {event.performedBy}
                </div>
                {Object.keys(event.details).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {JSON.stringify(event.details)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No audit events recorded
        </div>
      )}
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Case Management: {hold.caseName}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Case #{hold.caseNumber}</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex px-6">
          {[
            { id: 'details', label: 'Details' },
            { id: 'documents', label: `Documents (${hold.documentsOnHold})` },
            { id: 'notifications', label: `Notifications (${hold.notificationsSent})` },
            { id: 'audit', label: 'Audit Trail' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'details' && renderDetails()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'audit' && renderAudit()}
      </div>
    </div>
  )
}
