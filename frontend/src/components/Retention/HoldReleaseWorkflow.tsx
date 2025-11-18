import React, { useState } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import type { HoldReleaseWorkflowProps, HoldReleaseRequest } from '@/types/retention'
import { format } from 'date-fns'

export const HoldReleaseWorkflow: React.FC<HoldReleaseWorkflowProps> = ({
  hold,
  onSubmitRequest,
  onApprove,
  onReject,
  pendingRequests,
  canApprove = false,
}) => {
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [reason, setReason] = useState('')
  const [releaseAll, setReleaseAll] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitRequest = () => {
    if (!reason.trim()) {
      alert('Please provide a reason for the release request')
      return
    }

    const request: HoldReleaseRequest = {
      holdId: hold.id,
      reason: reason.trim(),
      requestedBy: 'current_user', // Would come from auth context
      requestedAt: new Date().toISOString(),
      status: 'pending',
      releaseAll,
      documentIds: releaseAll ? undefined : [],
    }

    setSubmitting(true)
    onSubmitRequest?.(request)
    setSubmitting(false)
    setShowRequestForm(false)
    setReason('')
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Hold Release Workflow
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Request or approve the release of documents from legal hold
        </p>
      </div>

      {/* Hold Info */}
      <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Case:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">{hold.caseName}</span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Case #:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {hold.caseNumber}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Documents on Hold:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {hold.documentsOnHold.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Status:</span>
            <span
              className={`ml-2 font-medium ${
                hold.status === 'active'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}
            >
              {hold.status === 'active' ? 'Active' : 'Released'}
            </span>
          </div>
        </div>
      </div>

      {/* Request Form */}
      {hold.status === 'active' && !showRequestForm && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowRequestForm(true)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Request Hold Release
          </button>
        </div>
      )}

      {showRequestForm && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">Submit Release Request</h4>

          <div className="space-y-4">
            {/* Release Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Release Scope
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={releaseAll}
                    onChange={() => setReleaseAll(true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Release all documents ({hold.documentsOnHold.toLocaleString()})
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!releaseAll}
                    onChange={() => setReleaseAll(false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Release specific documents
                  </span>
                </label>
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Release *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide detailed justification for releasing this legal hold..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmitRequest}
                disabled={submitting || !reason.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
              <button
                onClick={() => {
                  setShowRequestForm(false)
                  setReason('')
                }}
                className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests && pendingRequests.length > 0 && (
        <div className="p-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            Pending Release Requests ({pendingRequests.length})
          </h4>

          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div
                key={request.requestedAt}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {request.requestedBy}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          request.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : request.status === 'approved'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>
                        Requested {format(new Date(request.requestedAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                  </div>

                  {canApprove && request.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove?.(request.requestedAt)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          const rejectReason = prompt('Reason for rejection:')
                          if (rejectReason) {
                            onReject?.(request.requestedAt, rejectReason)
                          }
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircleIcon className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Scope:
                    </span>
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      {request.releaseAll
                        ? `All documents (${hold.documentsOnHold.toLocaleString()})`
                        : `${request.documentIds?.length || 0} specific documents`}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Reason:
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {request.reason}
                    </p>
                  </div>

                  {request.approvedBy && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span>
                          Approved by {request.approvedBy} on{' '}
                          {request.approvedAt &&
                            format(new Date(request.approvedAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Released Status */}
      {hold.status === 'released' && (
        <div className="p-6">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-300 mb-2">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="font-semibold">Hold Released</span>
            </div>
            <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
              {hold.releasedAt && (
                <div>Released on {format(new Date(hold.releasedAt), 'MMM d, yyyy h:mm a')}</div>
              )}
              {hold.releasedBy && <div>By {hold.releasedBy}</div>}
              {hold.documentsReleased > 0 && (
                <div>{hold.documentsReleased.toLocaleString()} documents released</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {hold.status === 'active' &&
        !showRequestForm &&
        (!pendingRequests || pendingRequests.length === 0) && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No pending release requests</p>
          </div>
        )}
    </div>
  )
}
