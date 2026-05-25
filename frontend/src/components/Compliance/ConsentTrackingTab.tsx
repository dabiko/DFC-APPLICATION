/**
 * ConsentTrackingTab Component
 *
 * Consent Management with:
 * - Consent records tracking
 * - Consent purpose management
 * - Consent lifecycle (given, withdrawn, expired)
 * - Consent audit trail
 * - Consent analytics
 */

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  FileText,
  Shield,
  Eye,
  Edit2,
  Trash2,
  User,
  Calendar,
  X,
  Loader2,
  RefreshCw,
  Download,
  Mail,
  Tag,
  History,
  ToggleLeft,
  ToggleRight,
  Info,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type ConsentStatus = 'active' | 'withdrawn' | 'expired' | 'pending'

type ConsentSource = 'web_form' | 'email' | 'paper' | 'verbal' | 'api' | 'mobile_app'

interface ConsentPurpose {
  id: string
  name: string
  description: string
  legal_basis: string
  data_categories: string[]
  retention_period: string
  is_required: boolean
  active: boolean
  created_at: string
  updated_at: string
}

interface ConsentRecord {
  id: string
  subject_id: string
  subject_name: string
  subject_email: string
  purpose: ConsentPurpose
  status: ConsentStatus
  source: ConsentSource
  given_at: string
  expires_at?: string
  withdrawn_at?: string
  withdrawal_reason?: string
  ip_address?: string
  user_agent?: string
  version: string
  proof_document?: string
  notes?: string
  history: ConsentHistoryEntry[]
}

interface ConsentHistoryEntry {
  id: string
  action: 'given' | 'renewed' | 'withdrawn' | 'expired' | 'updated'
  timestamp: string
  performed_by: string
  details: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PURPOSES: ConsentPurpose[] = [
  {
    id: '1',
    name: 'Marketing Communications',
    description: 'Permission to send promotional emails, newsletters, and marketing materials',
    legal_basis: 'Consent',
    data_categories: ['Email', 'Name', 'Preferences'],
    retention_period: '3 years after last interaction',
    is_required: false,
    active: true,
    created_at: '2024-01-15',
    updated_at: '2024-06-20',
  },
  {
    id: '2',
    name: 'Service Communications',
    description: 'Essential communications about account and service updates',
    legal_basis: 'Contractual Necessity',
    data_categories: ['Email', 'Name', 'Account Details'],
    retention_period: 'Duration of service',
    is_required: true,
    active: true,
    created_at: '2024-01-15',
    updated_at: '2024-01-15',
  },
  {
    id: '3',
    name: 'Analytics & Personalization',
    description: 'Use of cookies and tracking for analytics and personalized experience',
    legal_basis: 'Consent',
    data_categories: ['Browsing Data', 'Device Info', 'IP Address'],
    retention_period: '2 years',
    is_required: false,
    active: true,
    created_at: '2024-01-15',
    updated_at: '2024-08-10',
  },
  {
    id: '4',
    name: 'Third-Party Sharing',
    description: 'Sharing data with trusted partners for enhanced services',
    legal_basis: 'Consent',
    data_categories: ['Name', 'Email', 'Transaction History'],
    retention_period: '1 year after consent withdrawal',
    is_required: false,
    active: true,
    created_at: '2024-03-01',
    updated_at: '2024-03-01',
  },
]

const MOCK_CONSENTS: ConsentRecord[] = [
  {
    id: '1',
    subject_id: 'USR-001',
    subject_name: 'John Smith',
    subject_email: 'john.smith@example.com',
    purpose: MOCK_PURPOSES[0],
    status: 'active',
    source: 'web_form',
    given_at: '2024-06-15T10:30:00Z',
    expires_at: '2027-06-15T10:30:00Z',
    ip_address: '192.168.1.100',
    user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    version: 'v2.1',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2024-06-15T10:30:00Z',
        performed_by: 'Subject',
        details: 'Consent given via website registration form',
      },
    ],
  },
  {
    id: '2',
    subject_id: 'USR-001',
    subject_name: 'John Smith',
    subject_email: 'john.smith@example.com',
    purpose: MOCK_PURPOSES[2],
    status: 'active',
    source: 'web_form',
    given_at: '2024-06-15T10:30:00Z',
    expires_at: '2026-06-15T10:30:00Z',
    ip_address: '192.168.1.100',
    version: 'v2.1',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2024-06-15T10:30:00Z',
        performed_by: 'Subject',
        details: 'Consent given via cookie banner',
      },
    ],
  },
  {
    id: '3',
    subject_id: 'USR-002',
    subject_name: 'Emily Davis',
    subject_email: 'emily.davis@example.com',
    purpose: MOCK_PURPOSES[0],
    status: 'withdrawn',
    source: 'email',
    given_at: '2024-03-10T14:00:00Z',
    withdrawn_at: '2024-11-01T09:15:00Z',
    withdrawal_reason: 'No longer interested in marketing communications',
    version: 'v2.0',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2024-03-10T14:00:00Z',
        performed_by: 'Subject',
        details: 'Consent given via email confirmation',
      },
      {
        id: '2',
        action: 'withdrawn',
        timestamp: '2024-11-01T09:15:00Z',
        performed_by: 'Subject',
        details: 'Consent withdrawn via preference center',
      },
    ],
  },
  {
    id: '4',
    subject_id: 'USR-003',
    subject_name: 'Michael Chen',
    subject_email: 'michael.chen@example.com',
    purpose: MOCK_PURPOSES[0],
    status: 'expired',
    source: 'web_form',
    given_at: '2021-08-20T11:00:00Z',
    expires_at: '2024-08-20T11:00:00Z',
    version: 'v1.5',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2021-08-20T11:00:00Z',
        performed_by: 'Subject',
        details: 'Initial consent given',
      },
      {
        id: '2',
        action: 'expired',
        timestamp: '2024-08-20T11:00:00Z',
        performed_by: 'System',
        details: 'Consent expired after 3-year retention period',
      },
    ],
  },
  {
    id: '5',
    subject_id: 'USR-004',
    subject_name: 'Anna Williams',
    subject_email: 'anna.williams@example.com',
    purpose: MOCK_PURPOSES[3],
    status: 'active',
    source: 'mobile_app',
    given_at: '2024-09-05T16:45:00Z',
    expires_at: '2025-09-05T16:45:00Z',
    version: 'v2.1',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2024-09-05T16:45:00Z',
        performed_by: 'Subject',
        details: 'Consent given via mobile app settings',
      },
    ],
  },
  {
    id: '6',
    subject_id: 'USR-005',
    subject_name: 'Robert Brown',
    subject_email: 'robert.brown@example.com',
    purpose: MOCK_PURPOSES[0],
    status: 'pending',
    source: 'email',
    given_at: '2024-11-25T08:00:00Z',
    version: 'v2.1',
    notes: 'Awaiting email confirmation',
    history: [
      {
        id: '1',
        action: 'given',
        timestamp: '2024-11-25T08:00:00Z',
        performed_by: 'System',
        details: 'Consent request sent via email, awaiting confirmation',
      },
    ],
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: ConsentStatus): string => {
  const colors: Record<ConsentStatus, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    withdrawn: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  }
  return colors[status]
}

const getStatusIcon = (status: ConsentStatus) => {
  const icons: Record<ConsentStatus, React.FC<{ className?: string }>> = {
    active: CheckCircle,
    withdrawn: XCircle,
    expired: Clock,
    pending: AlertTriangle,
  }
  return icons[status]
}

const getSourceLabel = (source: ConsentSource): string => {
  const labels: Record<ConsentSource, string> = {
    web_form: 'Web Form',
    email: 'Email',
    paper: 'Paper Form',
    verbal: 'Verbal',
    api: 'API',
    mobile_app: 'Mobile App',
  }
  return labels[source]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const isExpiringSoon = (expiresAt?: string): boolean => {
  if (!expiresAt) return false
  const expiryDate = new Date(expiresAt)
  const today = new Date()
  const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays > 0 && diffDays <= 30
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ConsentCardProps {
  consent: ConsentRecord
  onClick: () => void
}

function ConsentCard({ consent, onClick }: ConsentCardProps) {
  const StatusIcon = getStatusIcon(consent.status)
  const expiringSoon = isExpiringSoon(consent.expires_at)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md',
        expiringSoon
          ? 'border-yellow-300 dark:border-yellow-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{consent.subject_name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{consent.subject_email}</p>
          </div>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
            getStatusColor(consent.status)
          )}
        >
          {consent.status}
        </span>
      </div>

      {/* Purpose */}
      <div className="mb-3">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {consent.purpose.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
          {consent.purpose.description}
        </p>
      </div>

      {/* Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>Given: {formatDate(consent.given_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Tag className="w-3.5 h-3.5" />
          <span>{getSourceLabel(consent.source)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Version {consent.version}</span>
        </div>
        {consent.expires_at && consent.status === 'active' && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              expiringSoon
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>
              {expiringSoon ? 'Expiring soon: ' : 'Expires: '}
              {formatDate(consent.expires_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

interface ConsentDetailModalProps {
  consent: ConsentRecord
  onClose: () => void
  onWithdraw: () => void
  onRenew: () => void
}

function ConsentDetailModal({ consent, onClose, onWithdraw, onRenew }: ConsentDetailModalProps) {
  const StatusIcon = getStatusIcon(consent.status)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {consent.subject_name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{consent.subject_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-full capitalize',
                getStatusColor(consent.status)
              )}
            >
              <StatusIcon className="w-4 h-4 inline mr-1" />
              {consent.status}
            </span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Purpose Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Consent Purpose
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Purpose Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {consent.purpose.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {consent.purpose.description}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Legal Basis</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {consent.purpose.legal_basis}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data Categories</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {consent.purpose.data_categories.map((cat) => (
                        <span
                          key={cat}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Consent Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Consent Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Source</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getSourceLabel(consent.source)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Given At</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(consent.given_at)}
                    </span>
                  </div>
                  {consent.expires_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Expires At</span>
                      <span
                        className={cn(
                          'font-medium',
                          isExpiringSoon(consent.expires_at)
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-gray-900 dark:text-white'
                        )}
                      >
                        {formatDate(consent.expires_at)}
                      </span>
                    </div>
                  )}
                  {consent.withdrawn_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Withdrawn At</span>
                      <span className="font-medium text-red-600 dark:text-red-400">
                        {formatDate(consent.withdrawn_at)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Version</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {consent.version}
                    </span>
                  </div>
                </div>
              </div>

              {/* Withdrawal Reason */}
              {consent.withdrawal_reason && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5">
                  <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                    Withdrawal Reason
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {consent.withdrawal_reason}
                  </p>
                </div>
              )}

              {/* Technical Details */}
              {(consent.ip_address || consent.user_agent) && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Technical Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    {consent.ip_address && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">IP Address: </span>
                        <span className="font-mono text-gray-900 dark:text-white">
                          {consent.ip_address}
                        </span>
                      </div>
                    )}
                    {consent.user_agent && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">User Agent: </span>
                        <span className="text-gray-900 dark:text-white text-xs">
                          {consent.user_agent}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* History */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Consent History
                </h3>
                {consent.history.length > 0 ? (
                  <div className="space-y-4">
                    {consent.history.map((entry, index) => (
                      <div key={entry.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              'w-3 h-3 rounded-full',
                              entry.action === 'given' || entry.action === 'renewed'
                                ? 'bg-green-500'
                                : entry.action === 'withdrawn'
                                  ? 'bg-red-500'
                                  : entry.action === 'expired'
                                    ? 'bg-gray-500'
                                    : 'bg-blue-500'
                            )}
                          />
                          {index < consent.history.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {entry.action}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {entry.details}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <span>{entry.performed_by}</span>
                            <span>•</span>
                            <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    No history available
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Actions</h3>
                <div className="space-y-2">
                  {consent.status === 'active' && (
                    <>
                      <button
                        onClick={onRenew}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Renew Consent
                      </button>
                      <button
                        onClick={onWithdraw}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Withdraw Consent
                      </button>
                    </>
                  )}
                  {(consent.status === 'expired' || consent.status === 'withdrawn') && (
                    <button
                      onClick={onRenew}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Request New Consent
                    </button>
                  )}
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Export Record
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <Mail className="w-4 h-4" />
                    Send Reminder
                  </button>
                </div>
              </div>

              {/* Notes */}
              {consent.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-5">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Notes</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{consent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PurposeCardProps {
  purpose: ConsentPurpose
  consentCount: number
  activeCount: number
}

function PurposeCard({ purpose, consentCount, activeCount }: PurposeCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{purpose.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {purpose.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {purpose.is_required && (
            <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
              Required
            </span>
          )}
          {purpose.active ? (
            <ToggleRight className="w-6 h-6 text-green-500" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-gray-400" />
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
        <span>{purpose.legal_basis}</span>
        <span>•</span>
        <span>{purpose.retention_period}</span>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{consentCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ViewMode = 'consents' | 'purposes'

export function ConsentTrackingTab() {
  const [consents, setConsents] = useState<ConsentRecord[]>([])
  const [purposes, setPurposes] = useState<ConsentPurpose[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('consents')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ConsentStatus | 'all'>('all')
  const [purposeFilter, setPurposeFilter] = useState<string>('all')
  const [selectedConsent, setSelectedConsent] = useState<ConsentRecord | null>(null)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const filteredConsents = consents.filter((consent) => {
    const matchesSearch =
      searchQuery === '' ||
      consent.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      consent.subject_email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || consent.status === statusFilter
    const matchesPurpose = purposeFilter === 'all' || consent.purpose.id === purposeFilter
    return matchesSearch && matchesStatus && matchesPurpose
  })

  const handleWithdraw = () => {
    if (!selectedConsent) return
    setConsents(
      consents.map((c) =>
        c.id === selectedConsent.id
          ? {
              ...c,
              status: 'withdrawn' as ConsentStatus,
              withdrawn_at: new Date().toISOString(),
              history: [
                ...c.history,
                {
                  id: String(c.history.length + 1),
                  action: 'withdrawn' as const,
                  timestamp: new Date().toISOString(),
                  performed_by: 'Current User',
                  details: 'Consent withdrawn by administrator',
                },
              ],
            }
          : c
      )
    )
    setSelectedConsent(null)
  }

  const handleRenew = () => {
    if (!selectedConsent) return
    const newExpiryDate = new Date()
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 3)

    setConsents(
      consents.map((c) =>
        c.id === selectedConsent.id
          ? {
              ...c,
              status: 'active' as ConsentStatus,
              expires_at: newExpiryDate.toISOString(),
              withdrawn_at: undefined,
              history: [
                ...c.history,
                {
                  id: String(c.history.length + 1),
                  action: 'renewed' as const,
                  timestamp: new Date().toISOString(),
                  performed_by: 'Current User',
                  details: 'Consent renewed for 3 years',
                },
              ],
            }
          : c
      )
    )
    setSelectedConsent(null)
  }

  // Stats
  const stats = {
    total: consents.length,
    active: consents.filter((c) => c.status === 'active').length,
    withdrawn: consents.filter((c) => c.status === 'withdrawn').length,
    expired: consents.filter((c) => c.status === 'expired').length,
    expiringSoon: consents.filter((c) => c.status === 'active' && isExpiringSoon(c.expires_at))
      .length,
  }

  // Purpose stats
  const getPurposeStats = (purposeId: string) => {
    const purposeConsents = consents.filter((c) => c.purpose.id === purposeId)
    return {
      total: purposeConsents.length,
      active: purposeConsents.filter((c) => c.status === 'active').length,
    }
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Consents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Withdrawn</p>
          <p className="text-2xl font-bold text-red-600">{stats.withdrawn}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expired</p>
          <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Expiring Soon</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.expiringSoon}</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setViewMode('consents')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'consents'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Consent Records
          </button>
          <button
            onClick={() => setViewMode('purposes')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md transition-colors',
              viewMode === 'purposes'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            Consent Purposes
          </button>
        </div>

        {viewMode === 'purposes' && (
          <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Purpose
          </button>
        )}
      </div>

      {viewMode === 'consents' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ConsentStatus | 'all')}
                className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="withdrawn">Withdrawn</option>
                <option value="expired">Expired</option>
                <option value="pending">Pending</option>
              </select>
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value)}
                className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Purposes</option>
                {purposes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>

          {/* Expiring Soon Alert */}
          {stats.expiringSoon > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {stats.expiringSoon} consent{stats.expiringSoon !== 1 ? 's are' : ' is'}{' '}
                    expiring within 30 days
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Consider sending renewal reminders to maintain consent coverage
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Consent Cards */}
          {filteredConsents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConsents.map((consent) => (
                <ConsentCard
                  key={consent.id}
                  consent={consent}
                  onClick={() => setSelectedConsent(consent)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No consent records found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchQuery || statusFilter !== 'all' || purposeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Consent records will appear here when collected'}
              </p>
            </div>
          )}
        </>
      ) : (
        /* Purposes View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {purposes.map((purpose) => {
            const purposeStats = getPurposeStats(purpose.id)
            return (
              <PurposeCard
                key={purpose.id}
                purpose={purpose}
                consentCount={purposeStats.total}
                activeCount={purposeStats.active}
              />
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedConsent && (
        <ConsentDetailModal
          consent={selectedConsent}
          onClose={() => setSelectedConsent(null)}
          onWithdraw={handleWithdraw}
          onRenew={handleRenew}
        />
      )}
    </div>
  )
}

export default ConsentTrackingTab
