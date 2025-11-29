/**
 * DSARTab Component
 *
 * Data Subject Access Request (DSAR) management with:
 * - Request intake form
 * - Identity verification workflow
 * - Request status tracking
 * - Data discovery integration
 * - Timeline and deadline management
 */

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  FileText,
  Shield,
  Eye,
  Trash2,
  Download,
  Mail,
  Calendar,
  User,
  Building,
  Phone,
  MapPin,
  X,
  Loader2,
  Play,
  Pause,
  RefreshCw,
  Send,
  FileSearch,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type DSARType = 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection'

type DSARStatus =
  | 'submitted'
  | 'identity_verification'
  | 'in_progress'
  | 'data_collection'
  | 'review'
  | 'completed'
  | 'rejected'
  | 'cancelled'

type VerificationStatus = 'pending' | 'verified' | 'failed' | 'not_required'

interface DSARRequest {
  id: string
  reference_number: string
  type: DSARType
  status: DSARStatus
  subject_name: string
  subject_email: string
  subject_phone?: string
  subject_address?: string
  organization?: string
  description: string
  verification_status: VerificationStatus
  verification_method?: string
  verification_date?: string
  submitted_date: string
  due_date: string
  completed_date?: string
  assigned_to?: string
  data_sources_identified: number
  data_sources_collected: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes?: string
  timeline: DSARTimelineEvent[]
}

interface DSARTimelineEvent {
  id: string
  action: string
  description: string
  performed_by: string
  timestamp: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_DSARS: DSARRequest[] = [
  {
    id: '1',
    reference_number: 'DSAR-2024-001',
    type: 'access',
    status: 'in_progress',
    subject_name: 'John Smith',
    subject_email: 'john.smith@example.com',
    subject_phone: '+1 555-123-4567',
    subject_address: '123 Main St, New York, NY 10001',
    description: 'Request for copy of all personal data held by the organization',
    verification_status: 'verified',
    verification_method: 'ID Document + Video Call',
    verification_date: '2024-11-20',
    submitted_date: '2024-11-18',
    due_date: '2024-12-18',
    assigned_to: 'Sarah Johnson',
    data_sources_identified: 8,
    data_sources_collected: 5,
    priority: 'medium',
    timeline: [
      {
        id: '1',
        action: 'Request Submitted',
        description: 'DSAR received via web portal',
        performed_by: 'System',
        timestamp: '2024-11-18T10:30:00Z',
      },
      {
        id: '2',
        action: 'Identity Verification Initiated',
        description: 'Verification email sent to subject',
        performed_by: 'System',
        timestamp: '2024-11-18T10:35:00Z',
      },
      {
        id: '3',
        action: 'Identity Verified',
        description: 'Subject verified via ID document and video call',
        performed_by: 'Sarah Johnson',
        timestamp: '2024-11-20T14:00:00Z',
      },
      {
        id: '4',
        action: 'Data Discovery Started',
        description: 'Initiated search across 8 data sources',
        performed_by: 'Sarah Johnson',
        timestamp: '2024-11-21T09:00:00Z',
      },
    ],
  },
  {
    id: '2',
    reference_number: 'DSAR-2024-002',
    type: 'erasure',
    status: 'identity_verification',
    subject_name: 'Emily Davis',
    subject_email: 'emily.davis@example.com',
    organization: 'Tech Corp Ltd',
    description: 'Request to delete all personal data - right to be forgotten',
    verification_status: 'pending',
    submitted_date: '2024-11-25',
    due_date: '2024-12-25',
    data_sources_identified: 0,
    data_sources_collected: 0,
    priority: 'high',
    timeline: [
      {
        id: '1',
        action: 'Request Submitted',
        description: 'DSAR received via email',
        performed_by: 'System',
        timestamp: '2024-11-25T08:00:00Z',
      },
      {
        id: '2',
        action: 'Identity Verification Requested',
        description: 'Awaiting identity verification documents',
        performed_by: 'System',
        timestamp: '2024-11-25T08:05:00Z',
      },
    ],
  },
  {
    id: '3',
    reference_number: 'DSAR-2024-003',
    type: 'portability',
    status: 'completed',
    subject_name: 'Michael Chen',
    subject_email: 'michael.chen@example.com',
    description: 'Request for data export in machine-readable format',
    verification_status: 'verified',
    verification_method: 'Government ID',
    verification_date: '2024-11-10',
    submitted_date: '2024-11-08',
    due_date: '2024-12-08',
    completed_date: '2024-11-22',
    assigned_to: 'David Wilson',
    data_sources_identified: 5,
    data_sources_collected: 5,
    priority: 'low',
    timeline: [
      {
        id: '1',
        action: 'Request Submitted',
        description: 'DSAR received via customer service',
        performed_by: 'System',
        timestamp: '2024-11-08T11:00:00Z',
      },
      {
        id: '2',
        action: 'Identity Verified',
        description: 'Verified via government ID',
        performed_by: 'David Wilson',
        timestamp: '2024-11-10T10:00:00Z',
      },
      {
        id: '3',
        action: 'Data Collection Complete',
        description: 'All data sources collected',
        performed_by: 'David Wilson',
        timestamp: '2024-11-20T16:00:00Z',
      },
      {
        id: '4',
        action: 'Request Completed',
        description: 'Data export sent to subject',
        performed_by: 'David Wilson',
        timestamp: '2024-11-22T09:00:00Z',
      },
    ],
  },
  {
    id: '4',
    reference_number: 'DSAR-2024-004',
    type: 'rectification',
    status: 'review',
    subject_name: 'Anna Williams',
    subject_email: 'anna.williams@example.com',
    description: 'Request to correct inaccurate personal information',
    verification_status: 'verified',
    verification_method: 'Email Confirmation',
    verification_date: '2024-11-23',
    submitted_date: '2024-11-22',
    due_date: '2024-12-22',
    assigned_to: 'Sarah Johnson',
    data_sources_identified: 3,
    data_sources_collected: 3,
    priority: 'medium',
    timeline: [],
  },
  {
    id: '5',
    reference_number: 'DSAR-2024-005',
    type: 'access',
    status: 'submitted',
    subject_name: 'Robert Brown',
    subject_email: 'robert.brown@example.com',
    description: 'Request for access to all personal data',
    verification_status: 'pending',
    submitted_date: '2024-11-27',
    due_date: '2024-12-27',
    data_sources_identified: 0,
    data_sources_collected: 0,
    priority: 'medium',
    timeline: [
      {
        id: '1',
        action: 'Request Submitted',
        description: 'DSAR received via web portal',
        performed_by: 'System',
        timestamp: '2024-11-27T09:00:00Z',
      },
    ],
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTypeLabel = (type: DSARType): string => {
  const labels: Record<DSARType, string> = {
    access: 'Access Request',
    rectification: 'Rectification',
    erasure: 'Erasure (Right to be Forgotten)',
    portability: 'Data Portability',
    restriction: 'Restriction of Processing',
    objection: 'Objection to Processing',
  }
  return labels[type]
}

const getStatusColor = (status: DSARStatus): string => {
  const colors: Record<DSARStatus, string> = {
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    identity_verification:
      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    data_collection: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    review: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[status]
}

const getStatusLabel = (status: DSARStatus): string => {
  const labels: Record<DSARStatus, string> = {
    submitted: 'Submitted',
    identity_verification: 'Identity Verification',
    in_progress: 'In Progress',
    data_collection: 'Data Collection',
    review: 'Under Review',
    completed: 'Completed',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }
  return labels[status]
}

const getVerificationStatusColor = (status: VerificationStatus): string => {
  const colors: Record<VerificationStatus, string> = {
    pending: 'text-yellow-600 dark:text-yellow-400',
    verified: 'text-green-600 dark:text-green-400',
    failed: 'text-red-600 dark:text-red-400',
    not_required: 'text-gray-500 dark:text-gray-400',
  }
  return colors[status]
}

const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[priority] || colors.medium
}

const getDaysRemaining = (dueDate: string): number => {
  const due = new Date(dueDate)
  const today = new Date()
  const diffTime = due.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const isOverdue = (dueDate: string, status: DSARStatus): boolean => {
  if (status === 'completed' || status === 'rejected' || status === 'cancelled') return false
  return getDaysRemaining(dueDate) < 0
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface DSARCardProps {
  dsar: DSARRequest
  onClick: () => void
}

function DSARCard({ dsar, onClick }: DSARCardProps) {
  const daysLeft = getDaysRemaining(dsar.due_date)
  const overdue = isOverdue(dsar.due_date, dsar.status)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md',
        overdue
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              {dsar.reference_number}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                getPriorityColor(dsar.priority)
              )}
            >
              {dsar.priority}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mt-1">{dsar.subject_name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{dsar.subject_email}</p>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full',
            getStatusColor(dsar.status)
          )}
        >
          {getStatusLabel(dsar.status)}
        </span>
      </div>

      {/* Type */}
      <div className="mb-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getTypeLabel(dsar.type)}
        </span>
      </div>

      {/* Progress */}
      {dsar.data_sources_identified > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Data Collection Progress</span>
            <span>
              {dsar.data_sources_collected} / {dsar.data_sources_identified} sources
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${(dsar.data_sources_collected / dsar.data_sources_identified) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {dsar.verification_status === 'verified' ? (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <UserCheck className="w-4 h-4" />
              <span className="text-xs">Verified</span>
            </div>
          ) : dsar.verification_status === 'pending' ? (
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Verification Pending</span>
            </div>
          ) : dsar.verification_status === 'failed' ? (
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Verification Failed</span>
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            'flex items-center gap-1 text-xs',
            overdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          {overdue ? (
            <span>Overdue by {Math.abs(daysLeft)} days</span>
          ) : dsar.status === 'completed' ? (
            <span>Completed {dsar.completed_date}</span>
          ) : (
            <span>{daysLeft} days remaining</span>
          )}
        </div>
      </div>
    </div>
  )
}

interface DSARDetailModalProps {
  dsar: DSARRequest
  onClose: () => void
  onUpdateStatus: (status: DSARStatus) => void
  onVerify: () => void
}

function DSARDetailModal({ dsar, onClose, onUpdateStatus, onVerify }: DSARDetailModalProps) {
  const daysLeft = getDaysRemaining(dsar.due_date)
  const overdue = isOverdue(dsar.due_date, dsar.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                {dsar.reference_number}
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full',
                  getStatusColor(dsar.status)
                )}
              >
                {getStatusLabel(dsar.status)}
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full',
                  getPriorityColor(dsar.priority)
                )}
              >
                {dsar.priority} priority
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">
              {getTypeLabel(dsar.type)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Subject Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Subject Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Data Subject Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dsar.subject_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {dsar.subject_email}
                      </p>
                    </div>
                  </div>
                  {dsar.subject_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dsar.subject_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  {dsar.subject_address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dsar.subject_address}
                        </p>
                      </div>
                    </div>
                  )}
                  {dsar.organization && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Organization</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {dsar.organization}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Request Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Request Details
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{dsar.description}</p>
              </div>

              {/* Identity Verification */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Identity Verification
                  </h3>
                  {dsar.verification_status === 'pending' && (
                    <button
                      onClick={onVerify}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      Verify Identity
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center',
                      dsar.verification_status === 'verified'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : dsar.verification_status === 'pending'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30'
                          : dsar.verification_status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                    )}
                  >
                    {dsar.verification_status === 'verified' ? (
                      <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : dsar.verification_status === 'pending' ? (
                      <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                    ) : dsar.verification_status === 'failed' ? (
                      <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    ) : (
                      <Shield className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p
                      className={cn(
                        'font-medium capitalize',
                        getVerificationStatusColor(dsar.verification_status)
                      )}
                    >
                      {dsar.verification_status.replace('_', ' ')}
                    </p>
                    {dsar.verification_method && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Method: {dsar.verification_method}
                      </p>
                    )}
                    {dsar.verification_date && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Verified on: {new Date(dsar.verification_date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Collection Progress */}
              {dsar.data_sources_identified > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    Data Collection Progress
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Sources Identified
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dsar.data_sources_identified}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Sources Collected
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {dsar.data_sources_collected}
                      </span>
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{
                          width: `${(dsar.data_sources_collected / dsar.data_sources_identified) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {Math.round(
                        (dsar.data_sources_collected / dsar.data_sources_identified) * 100
                      )}
                      % Complete
                    </p>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Activity Timeline
                </h3>
                {dsar.timeline.length > 0 ? (
                  <div className="space-y-4">
                    {dsar.timeline.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          {index < dsar.timeline.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {event.action}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{event.performed_by}</span>
                            <span>•</span>
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No timeline events yet
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Status & Actions */}
            <div className="space-y-6">
              {/* Deadline */}
              <div
                className={cn(
                  'rounded-xl p-5',
                  overdue
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-900'
                )}
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Deadline</h3>
                <div className="text-center">
                  <p
                    className={cn(
                      'text-3xl font-bold',
                      overdue ? 'text-red-600' : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {overdue ? Math.abs(daysLeft) : daysLeft}
                  </p>
                  <p
                    className={cn(
                      'text-sm',
                      overdue ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {overdue ? 'days overdue' : 'days remaining'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Due: {new Date(dsar.due_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Assigned To */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Assigned To</h3>
                {dsar.assigned_to ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dsar.assigned_to}
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not assigned</p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {dsar.status === 'submitted' && (
                    <button
                      onClick={() => onUpdateStatus('identity_verification')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" />
                      Start Verification
                    </button>
                  )}
                  {dsar.status === 'identity_verification' &&
                    dsar.verification_status === 'verified' && (
                      <button
                        onClick={() => onUpdateStatus('in_progress')}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Play className="w-4 h-4" />
                        Start Processing
                      </button>
                    )}
                  {dsar.status === 'in_progress' && (
                    <button
                      onClick={() => onUpdateStatus('data_collection')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-colors"
                    >
                      <FileSearch className="w-4 h-4" />
                      Start Data Discovery
                    </button>
                  )}
                  {dsar.status === 'data_collection' && (
                    <button
                      onClick={() => onUpdateStatus('review')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Send for Review
                    </button>
                  )}
                  {dsar.status === 'review' && (
                    <button
                      onClick={() => onUpdateStatus('completed')}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Complete Request
                    </button>
                  )}
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Send className="w-4 h-4" />
                    Send Communication
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface DSARFormModalProps {
  onClose: () => void
  onSubmit: (data: Partial<DSARRequest>) => void
}

function DSARFormModal({ onClose, onSubmit }: DSARFormModalProps) {
  const [formData, setFormData] = useState({
    type: 'access' as DSARType,
    subject_name: '',
    subject_email: '',
    subject_phone: '',
    subject_address: '',
    organization: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">New DSAR Request</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Request Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as DSARType })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="access">Access Request</option>
              <option value="rectification">Rectification</option>
              <option value="erasure">Erasure (Right to be Forgotten)</option>
              <option value="portability">Data Portability</option>
              <option value="restriction">Restriction of Processing</option>
              <option value="objection">Objection to Processing</option>
            </select>
          </div>

          {/* Subject Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject Name *
              </label>
              <input
                type="text"
                value={formData.subject_name}
                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject Email *
              </label>
              <input
                type="email"
                value={formData.subject_email}
                onChange={(e) => setFormData({ ...formData, subject_email: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.subject_phone}
                onChange={(e) => setFormData({ ...formData, subject_phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+1 555-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Organization
              </label>
              <input
                type="text"
                value={formData.organization}
                onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Company name (if applicable)"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.subject_address}
              onChange={(e) => setFormData({ ...formData, subject_address: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Full address"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent',
                })
              }
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Request Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the data subject's request in detail..."
              required
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DSARTab() {
  const [dsars, setDsars] = useState<DSARRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DSARStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<DSARType | 'all'>('all')
  const [selectedDSAR, setSelectedDSAR] = useState<DSARRequest | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)

  useEffect(() => {
    // Simulate API call
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setDsars(MOCK_DSARS)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const filteredDSARs = dsars.filter((dsar) => {
    const matchesSearch =
      searchQuery === '' ||
      dsar.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dsar.subject_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dsar.reference_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || dsar.status === statusFilter
    const matchesType = typeFilter === 'all' || dsar.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const handleCreateDSAR = (data: Partial<DSARRequest>) => {
    const newDSAR: DSARRequest = {
      id: String(dsars.length + 1),
      reference_number: `DSAR-2024-${String(dsars.length + 1).padStart(3, '0')}`,
      type: data.type || 'access',
      status: 'submitted',
      subject_name: data.subject_name || '',
      subject_email: data.subject_email || '',
      subject_phone: data.subject_phone,
      subject_address: data.subject_address,
      organization: data.organization,
      description: data.description || '',
      verification_status: 'pending',
      submitted_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      data_sources_identified: 0,
      data_sources_collected: 0,
      priority: data.priority || 'medium',
      timeline: [
        {
          id: '1',
          action: 'Request Submitted',
          description: 'DSAR created manually',
          performed_by: 'Current User',
          timestamp: new Date().toISOString(),
        },
      ],
    }
    setDsars([newDSAR, ...dsars])
    setShowFormModal(false)
  }

  const handleUpdateStatus = (status: DSARStatus) => {
    if (!selectedDSAR) return
    setDsars(
      dsars.map((d) =>
        d.id === selectedDSAR.id
          ? {
              ...d,
              status,
              completed_date:
                status === 'completed' ? new Date().toISOString().split('T')[0] : d.completed_date,
            }
          : d
      )
    )
    setSelectedDSAR({ ...selectedDSAR, status })
  }

  const handleVerify = () => {
    if (!selectedDSAR) return
    setDsars(
      dsars.map((d) =>
        d.id === selectedDSAR.id
          ? {
              ...d,
              verification_status: 'verified',
              verification_date: new Date().toISOString().split('T')[0],
              verification_method: 'Manual Verification',
            }
          : d
      )
    )
    setSelectedDSAR({
      ...selectedDSAR,
      verification_status: 'verified',
      verification_date: new Date().toISOString().split('T')[0],
      verification_method: 'Manual Verification',
    })
  }

  // Stats
  const stats = {
    total: dsars.length,
    pending: dsars.filter((d) => d.status === 'submitted' || d.status === 'identity_verification')
      .length,
    inProgress: dsars.filter((d) => ['in_progress', 'data_collection', 'review'].includes(d.status))
      .length,
    completed: dsars.filter((d) => d.status === 'completed').length,
    overdue: dsars.filter((d) => isOverdue(d.due_date, d.status)).length,
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Requests</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or reference..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DSARStatus | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="submitted">Submitted</option>
            <option value="identity_verification">Identity Verification</option>
            <option value="in_progress">In Progress</option>
            <option value="data_collection">Data Collection</option>
            <option value="review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DSARType | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="access">Access</option>
            <option value="rectification">Rectification</option>
            <option value="erasure">Erasure</option>
            <option value="portability">Portability</option>
            <option value="restriction">Restriction</option>
            <option value="objection">Objection</option>
          </select>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {stats.overdue} DSAR request{stats.overdue !== 1 ? 's are' : ' is'} overdue
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                GDPR requires DSARs to be completed within 30 days
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DSAR Cards */}
      {filteredDSARs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDSARs.map((dsar) => (
            <DSARCard key={dsar.id} dsar={dsar} onClick={() => setSelectedDSAR(dsar)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No DSAR requests found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create a new DSAR request to get started'}
          </p>
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedDSAR && (
        <DSARDetailModal
          dsar={selectedDSAR}
          onClose={() => setSelectedDSAR(null)}
          onUpdateStatus={handleUpdateStatus}
          onVerify={handleVerify}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <DSARFormModal onClose={() => setShowFormModal(false)} onSubmit={handleCreateDSAR} />
      )}
    </div>
  )
}

export default DSARTab
