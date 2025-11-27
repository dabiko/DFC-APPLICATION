/**
 * ReleaseHoldWorkflow Component
 * Multi-step workflow for releasing legal holds with proper approval chain
 * and compliance verification
 */

import { useState, useCallback, useMemo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Scale,
  CheckCircle,
  AlertTriangle,
  Shield,
  FileText,
  Users,
  Clock,
  Loader2,
  Info,
  XCircle,
  AlertCircle,
  Calendar,
  MessageSquare,
  Lock,
  Unlock,
} from 'lucide-react'
import type { LegalHold, HoldReleaseRequest } from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface ReleaseHoldWorkflowProps {
  hold: LegalHold
  isOpen: boolean
  onClose: () => void
  onSubmitRequest: (request: Omit<HoldReleaseRequest, 'requestedAt' | 'status'>) => Promise<void>
  pendingRequests?: HoldReleaseRequest[]
  canApprove?: boolean
  onApprove?: (requestId: string) => Promise<void>
  onReject?: (requestId: string, reason: string) => Promise<void>
  requiresApproval?: boolean
  approvers?: Array<{ id: string; name: string; email: string }>
}

interface ReleaseOption {
  id: 'full' | 'partial'
  title: string
  description: string
  icon: React.FC<{ className?: string }>
}

interface VerificationCheck {
  id: string
  label: string
  description: string
  required: boolean
  checked: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const RELEASE_OPTIONS: ReleaseOption[] = [
  {
    id: 'full',
    title: 'Full Release',
    description: 'Release all documents from this legal hold',
    icon: Unlock,
  },
  {
    id: 'partial',
    title: 'Partial Release',
    description: 'Release only selected documents',
    icon: Lock,
  },
]

const DEFAULT_VERIFICATION_CHECKS: Omit<VerificationCheck, 'checked'>[] = [
  {
    id: 'legal_matter_resolved',
    label: 'Legal matter has been resolved',
    description: 'The litigation, investigation, or audit has concluded',
    required: true,
  },
  {
    id: 'no_pending_litigation',
    label: 'No pending or anticipated litigation',
    description: 'There are no related matters that require continued preservation',
    required: true,
  },
  {
    id: 'counsel_approval',
    label: 'Legal counsel approval obtained',
    description: 'Outside or in-house counsel has approved the release',
    required: true,
  },
  {
    id: 'custodians_notified',
    label: 'Custodians will be notified',
    description: 'All custodians will receive notification of the release',
    required: false,
  },
  {
    id: 'documents_reviewed',
    label: 'Document collection has been reviewed',
    description: 'The held documents have been reviewed for relevance',
    required: false,
  },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ReleaseHoldWorkflow({
  hold,
  isOpen,
  onClose,
  onSubmitRequest,
  pendingRequests = [],
  canApprove = false,
  onApprove,
  onReject,
  requiresApproval = true,
  approvers = [],
}: ReleaseHoldWorkflowProps) {
  // State
  const [currentStep, setCurrentStep] = useState(0)
  const [releaseType, setReleaseType] = useState<'full' | 'partial'>('full')
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [verificationChecks, setVerificationChecks] = useState<VerificationCheck[]>(
    DEFAULT_VERIFICATION_CHECKS.map((check) => ({ ...check, checked: false }))
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Approval state
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)

  // Steps
  const steps = useMemo(
    () => [
      { id: 'type', title: 'Release Type', description: 'Choose release scope' },
      { id: 'verification', title: 'Verification', description: 'Confirm compliance' },
      { id: 'reason', title: 'Justification', description: 'Provide release reason' },
      { id: 'review', title: 'Review', description: 'Review and submit' },
    ],
    []
  )

  // Check if all required verifications are complete
  const allRequiredVerified = useMemo(() => {
    return verificationChecks.filter((c) => c.required).every((c) => c.checked)
  }, [verificationChecks])

  // Validation
  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const newErrors: Record<string, string> = {}

      switch (stepIndex) {
        case 0: // Release Type
          if (releaseType === 'partial' && selectedDocumentIds.size === 0) {
            newErrors.documents = 'Select at least one document for partial release'
          }
          break

        case 1: // Verification
          if (!allRequiredVerified) {
            newErrors.verification = 'All required verifications must be confirmed'
          }
          break

        case 2: // Reason
          if (!reason.trim()) {
            newErrors.reason = 'Release reason is required'
          }
          break
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [releaseType, selectedDocumentIds, allRequiredVerified, reason]
  )

  // Navigation
  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    }
  }, [currentStep, validateStep, steps.length])

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setErrors({})
  }, [])

  // Handlers
  const toggleVerification = useCallback((checkId: string) => {
    setVerificationChecks((prev) =>
      prev.map((check) => (check.id === checkId ? { ...check, checked: !check.checked } : check))
    )
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.verification
      return newErrors
    })
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!validateStep(currentStep)) return

    setIsSubmitting(true)
    try {
      await onSubmitRequest({
        holdId: hold.id,
        reason,
        requestedBy: 'current-user', // Would come from auth context
        releaseAll: releaseType === 'full',
        documentIds: releaseType === 'partial' ? Array.from(selectedDocumentIds) : undefined,
      })
      onClose()
    } catch (error) {
      setErrors({ submit: 'Failed to submit release request. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [
    hold.id,
    reason,
    releaseType,
    selectedDocumentIds,
    validateStep,
    currentStep,
    onSubmitRequest,
    onClose,
  ])

  const handleApprove = useCallback(
    async (requestId: string) => {
      if (!onApprove) return
      setIsSubmitting(true)
      try {
        await onApprove(requestId)
      } finally {
        setIsSubmitting(false)
      }
    },
    [onApprove]
  )

  const handleReject = useCallback(async () => {
    if (!onReject || !selectedRequestId || !rejectReason.trim()) return
    setIsSubmitting(true)
    try {
      await onReject(selectedRequestId, rejectReason)
      setShowRejectModal(false)
      setRejectReason('')
      setSelectedRequestId(null)
    } finally {
      setIsSubmitting(false)
    }
  }, [onReject, selectedRequestId, rejectReason])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!isOpen) return null

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderTypeStep()
      case 1:
        return renderVerificationStep()
      case 2:
        return renderReasonStep()
      case 3:
        return renderReviewStep()
      default:
        return null
    }
  }

  const renderTypeStep = () => (
    <div className="space-y-6">
      {/* Hold Summary */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-600 rounded-lg">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{hold.caseName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Case #{hold.caseNumber} • {hold.documentsOnHold} documents on hold
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Status:</span>
            <span className="ml-2 font-medium text-red-700 dark:text-red-300 capitalize">
              {hold.status}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Created:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {hold.createdAt?.split('T')[0]}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Custodians:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {hold.custodians?.length || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Release Options */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Release Type
        </label>
        <div className="grid grid-cols-2 gap-4">
          {RELEASE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setReleaseType(option.id)
                  setErrors({})
                }}
                className={cn(
                  'p-6 border-2 rounded-xl text-left transition-all',
                  releaseType === option.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'p-3 rounded-lg',
                      releaseType === option.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {option.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Document Selection for Partial Release */}
      {releaseType === 'partial' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Documents to Release
          </label>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Document selection would be implemented here with a searchable list of documents on
              hold.
            </p>
          </div>
          {errors.documents && <p className="text-sm text-red-600 mt-2">{errors.documents}</p>}
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Important Notice
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Releasing a legal hold removes preservation restrictions on the affected documents.
            Ensure all legal requirements have been met before proceeding.
          </p>
        </div>
      </div>
    </div>
  )

  const renderVerificationStep = () => (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Verification Required
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Please confirm each of the following items before proceeding with the release. Required
            items are marked with an asterisk (*).
          </p>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="space-y-3">
        {verificationChecks.map((check) => (
          <div
            key={check.id}
            className={cn(
              'p-4 border rounded-lg transition-colors',
              check.checked
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={check.checked}
                onChange={() => toggleVerification(check.id)}
                className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {check.label}
                  {check.required && <span className="text-red-500 ml-1">*</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{check.description}</p>
              </div>
              {check.checked && (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 ml-auto" />
              )}
            </label>
          </div>
        ))}
      </div>

      {errors.verification && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-sm text-red-600 dark:text-red-400">{errors.verification}</p>
        </div>
      )}

      {/* Progress */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Verification Progress
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {verificationChecks.filter((c) => c.checked).length} / {verificationChecks.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all"
            style={{
              width: `${
                (verificationChecks.filter((c) => c.checked).length / verificationChecks.length) *
                100
              }%`,
            }}
          />
        </div>
      </div>
    </div>
  )

  const renderReasonStep = () => (
    <div className="space-y-6">
      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Release Reason *
        </label>
        <textarea
          value={reason}
          onChange={(e) => {
            setReason(e.target.value)
            setErrors((prev) => {
              const newErrors = { ...prev }
              delete newErrors.reason
              return newErrors
            })
          }}
          placeholder="Explain why this legal hold should be released..."
          rows={5}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white',
            errors.reason
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        />
        {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          This reason will be recorded in the audit trail and may be reviewed for compliance
          purposes.
        </p>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional information..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Approval Info */}
      {requiresApproval && (
        <div className="flex items-start gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
              Approval Required
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              This release request will be sent to the following approvers:
            </p>
            {approvers.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {approvers.map((approver) => (
                  <span
                    key={approver.id}
                    className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full"
                  >
                    {approver.name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Legal Department, Compliance Officer
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Release Request Summary
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Legal Hold
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {hold.caseName} (#{hold.caseNumber})
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Release Type
              </span>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1 capitalize">
                {releaseType} Release
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Documents Affected
            </span>
            <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
              {releaseType === 'full'
                ? `All ${hold.documentsOnHold} documents`
                : `${selectedDocumentIds.size} selected documents`}
            </p>
          </div>

          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Release Reason
            </span>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{reason}</p>
          </div>

          {notes && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Additional Notes
              </span>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Verification Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Verified Items
        </h4>
        <div className="space-y-2">
          {verificationChecks
            .filter((c) => c.checked)
            .map((check) => (
              <div key={check.id} className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{check.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            Confirm Release Action
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {requiresApproval
              ? 'This request will be submitted for approval. Once approved, the hold will be released and affected documents will no longer be protected from deletion.'
              : 'Once submitted, this action cannot be undone. Affected documents will no longer be protected from deletion.'}
          </p>
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}
    </div>
  )

  // Render pending requests section (for approvers)
  const renderPendingRequests = () => {
    if (!canApprove || pendingRequests.length === 0) return null

    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pending Approval Requests
        </h3>
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <div
              key={request.holdId + request.requestedAt}
              className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Release Request by {request.requestedBy}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(request.requestedAt)}
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{request.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(request.holdId)}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRequestId(request.holdId)
                      setShowRejectModal(true)
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Release Legal Hold
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {steps[currentStep].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = index === currentStep
              const isComplete = index < currentStep

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg',
                      isActive && 'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                        isActive && 'bg-blue-600 text-white',
                        isComplete && 'bg-green-600 text-white',
                        !isActive && !isComplete && 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      )}
                    >
                      {isComplete ? <CheckCircle className="w-5 h-5" /> : index + 1}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium hidden md:block',
                        isActive && 'text-blue-700 dark:text-blue-300',
                        isComplete && 'text-green-700 dark:text-green-300',
                        !isActive && !isComplete && 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-12 h-0.5 mx-2',
                        index < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderPendingRequests()}
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={currentStep === 0 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  {requiresApproval ? 'Submit for Approval' : 'Release Hold'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Reject Release Request
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Please provide a reason for rejection..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                  setSelectedRequestId(null)
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ReleaseHoldWorkflow
