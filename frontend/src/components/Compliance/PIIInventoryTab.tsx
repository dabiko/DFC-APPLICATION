/**
 * PIIInventoryTab Component
 *
 * PII (Personally Identifiable Information) Inventory Management with:
 * - Data element tracking
 * - Data source mapping
 * - Sensitivity classification
 * - Retention tracking
 * - Data flow visualization
 */

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  Database,
  FileText,
  Shield,
  Eye,
  Edit2,
  Trash2,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  X,
  Loader2,
  Server,
  HardDrive,
  Cloud,
  Globe,
  Lock,
  Users,
  MapPin,
  Calendar,
  Info,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type DataCategory =
  | 'personal_identifiers'
  | 'contact_info'
  | 'financial'
  | 'health'
  | 'biometric'
  | 'behavioral'
  | 'professional'
  | 'sensitive'

type SensitivityLevel = 'low' | 'medium' | 'high' | 'critical'

type LegalBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interest'
  | 'public_task'
  | 'legitimate_interest'

type StorageType = 'database' | 'file_system' | 'cloud' | 'third_party' | 'on_premise'

interface PIIDataElement {
  id: string
  name: string
  description: string
  category: DataCategory
  sensitivity: SensitivityLevel
  data_subjects: string[]
  legal_basis: LegalBasis
  purpose: string
  retention_period: string
  retention_days: number
  sources: DataSource[]
  processors: string[]
  transfers_outside_eea: boolean
  transfer_safeguards?: string
  encryption_at_rest: boolean
  encryption_in_transit: boolean
  access_controls: string[]
  last_reviewed: string
  next_review: string
  owner: string
  status: 'active' | 'under_review' | 'deprecated'
}

interface DataSource {
  id: string
  name: string
  type: StorageType
  location: string
  description: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_PII_ELEMENTS: PIIDataElement[] = [
  {
    id: '1',
    name: 'Customer Full Name',
    description: 'Legal name of the customer as provided during registration',
    category: 'personal_identifiers',
    sensitivity: 'medium',
    data_subjects: ['Customers', 'Prospects'],
    legal_basis: 'contract',
    purpose: 'Account identification and communication',
    retention_period: '7 years after account closure',
    retention_days: 2555,
    sources: [
      {
        id: '1',
        name: 'CRM Database',
        type: 'database',
        location: 'EU-West',
        description: 'Primary customer database',
      },
      {
        id: '2',
        name: 'Document Storage',
        type: 'file_system',
        location: 'EU-West',
        description: 'Scanned documents',
      },
    ],
    processors: ['CRM System', 'Document Management System'],
    transfers_outside_eea: false,
    encryption_at_rest: true,
    encryption_in_transit: true,
    access_controls: ['Role-based access', 'Audit logging'],
    last_reviewed: '2024-10-15',
    next_review: '2025-04-15',
    owner: 'Data Protection Team',
    status: 'active',
  },
  {
    id: '2',
    name: 'Email Address',
    description: 'Primary email address for communication',
    category: 'contact_info',
    sensitivity: 'medium',
    data_subjects: ['Customers', 'Employees', 'Prospects'],
    legal_basis: 'consent',
    purpose: 'Marketing communications and account notifications',
    retention_period: '3 years after last interaction',
    retention_days: 1095,
    sources: [
      {
        id: '3',
        name: 'Marketing Platform',
        type: 'cloud',
        location: 'US',
        description: 'Email marketing system',
      },
      {
        id: '1',
        name: 'CRM Database',
        type: 'database',
        location: 'EU-West',
        description: 'Primary customer database',
      },
    ],
    processors: ['Marketing Platform', 'CRM System'],
    transfers_outside_eea: true,
    transfer_safeguards: 'Standard Contractual Clauses',
    encryption_at_rest: true,
    encryption_in_transit: true,
    access_controls: ['Role-based access', 'MFA required'],
    last_reviewed: '2024-11-01',
    next_review: '2025-05-01',
    owner: 'Marketing Team',
    status: 'active',
  },
  {
    id: '3',
    name: 'National ID Number',
    description: 'Government-issued identification number for KYC verification',
    category: 'personal_identifiers',
    sensitivity: 'critical',
    data_subjects: ['Customers'],
    legal_basis: 'legal_obligation',
    purpose: 'KYC/AML compliance verification',
    retention_period: '10 years after relationship end',
    retention_days: 3650,
    sources: [
      {
        id: '4',
        name: 'KYC System',
        type: 'database',
        location: 'EU-West',
        description: 'Identity verification system',
      },
    ],
    processors: ['KYC Verification Provider'],
    transfers_outside_eea: false,
    encryption_at_rest: true,
    encryption_in_transit: true,
    access_controls: ['Restricted access', 'Audit logging', 'MFA required', 'Need-to-know basis'],
    last_reviewed: '2024-09-20',
    next_review: '2025-03-20',
    owner: 'Compliance Team',
    status: 'active',
  },
  {
    id: '4',
    name: 'Bank Account Details',
    description: 'Customer bank account information for transactions',
    category: 'financial',
    sensitivity: 'critical',
    data_subjects: ['Customers'],
    legal_basis: 'contract',
    purpose: 'Payment processing and fund transfers',
    retention_period: '7 years after last transaction',
    retention_days: 2555,
    sources: [
      {
        id: '5',
        name: 'Payment Gateway',
        type: 'third_party',
        location: 'EU-West',
        description: 'Payment processor',
      },
      {
        id: '6',
        name: 'Core Banking',
        type: 'on_premise',
        location: 'EU-West',
        description: 'Banking system',
      },
    ],
    processors: ['Payment Processor', 'Core Banking System'],
    transfers_outside_eea: false,
    encryption_at_rest: true,
    encryption_in_transit: true,
    access_controls: [
      'Restricted access',
      'Audit logging',
      'MFA required',
      'Segregation of duties',
    ],
    last_reviewed: '2024-11-10',
    next_review: '2025-05-10',
    owner: 'Finance Team',
    status: 'active',
  },
  {
    id: '5',
    name: 'IP Address',
    description: 'User IP addresses collected for security and analytics',
    category: 'behavioral',
    sensitivity: 'low',
    data_subjects: ['Customers', 'Website Visitors'],
    legal_basis: 'legitimate_interest',
    purpose: 'Security monitoring and fraud prevention',
    retention_period: '90 days',
    retention_days: 90,
    sources: [
      {
        id: '7',
        name: 'Web Server Logs',
        type: 'file_system',
        location: 'EU-West',
        description: 'Application logs',
      },
      {
        id: '8',
        name: 'Analytics Platform',
        type: 'cloud',
        location: 'EU',
        description: 'User analytics',
      },
    ],
    processors: ['Analytics Provider'],
    transfers_outside_eea: false,
    encryption_at_rest: false,
    encryption_in_transit: true,
    access_controls: ['IT team access only'],
    last_reviewed: '2024-08-15',
    next_review: '2025-02-15',
    owner: 'IT Security Team',
    status: 'active',
  },
  {
    id: '6',
    name: 'Health Insurance Number',
    description: 'Employee health insurance identification',
    category: 'health',
    sensitivity: 'critical',
    data_subjects: ['Employees'],
    legal_basis: 'legal_obligation',
    purpose: 'Employee benefits administration',
    retention_period: '7 years after employment end',
    retention_days: 2555,
    sources: [
      {
        id: '9',
        name: 'HR System',
        type: 'database',
        location: 'EU-West',
        description: 'Human resources management',
      },
    ],
    processors: ['Benefits Administrator'],
    transfers_outside_eea: false,
    encryption_at_rest: true,
    encryption_in_transit: true,
    access_controls: ['HR team only', 'Audit logging', 'MFA required'],
    last_reviewed: '2024-07-01',
    next_review: '2025-01-01',
    owner: 'HR Team',
    status: 'under_review',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCategoryLabel = (category: DataCategory): string => {
  const labels: Record<DataCategory, string> = {
    personal_identifiers: 'Personal Identifiers',
    contact_info: 'Contact Information',
    financial: 'Financial Data',
    health: 'Health Data',
    biometric: 'Biometric Data',
    behavioral: 'Behavioral Data',
    professional: 'Professional Data',
    sensitive: 'Sensitive Data',
  }
  return labels[category]
}

const getCategoryIcon = (category: DataCategory) => {
  const icons: Record<DataCategory, React.FC<{ className?: string }>> = {
    personal_identifiers: Users,
    contact_info: Globe,
    financial: Database,
    health: Shield,
    biometric: Eye,
    behavioral: Clock,
    professional: FileText,
    sensitive: Lock,
  }
  return icons[category]
}

const getSensitivityColor = (sensitivity: SensitivityLevel): string => {
  const colors: Record<SensitivityLevel, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[sensitivity]
}

const getLegalBasisLabel = (basis: LegalBasis): string => {
  const labels: Record<LegalBasis, string> = {
    consent: 'Consent',
    contract: 'Contractual Necessity',
    legal_obligation: 'Legal Obligation',
    vital_interest: 'Vital Interest',
    public_task: 'Public Task',
    legitimate_interest: 'Legitimate Interest',
  }
  return labels[basis]
}

const getStorageIcon = (type: StorageType) => {
  const icons: Record<StorageType, React.FC<{ className?: string }>> = {
    database: Database,
    file_system: HardDrive,
    cloud: Cloud,
    third_party: ExternalLink,
    on_premise: Server,
  }
  return icons[type]
}

const isReviewDue = (nextReview: string): boolean => {
  const reviewDate = new Date(nextReview)
  const today = new Date()
  const diffDays = Math.ceil((reviewDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    under_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    deprecated: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }
  return colors[status] || colors.active
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PIICardProps {
  element: PIIDataElement
  onClick: () => void
}

function PIICard({ element, onClick }: PIICardProps) {
  const CategoryIcon = getCategoryIcon(element.category)
  const reviewDue = isReviewDue(element.next_review)

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md',
        reviewDue
          ? 'border-yellow-300 dark:border-yellow-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <CategoryIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{element.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getCategoryLabel(element.category)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
            getSensitivityColor(element.sensitivity)
          )}
        >
          {element.sensitivity}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {element.description}
      </p>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Database className="w-3.5 h-3.5" />
          <span>
            {element.sources.length} source{element.sources.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Users className="w-3.5 h-3.5" />
          <span>{element.data_subjects.join(', ')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{element.retention_period}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
          <Shield className="w-3.5 h-3.5" />
          <span>{getLegalBasisLabel(element.legal_basis)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {element.encryption_at_rest && (
            <div
              className="flex items-center gap-1 text-green-600 dark:text-green-400"
              title="Encrypted at rest"
            >
              <Lock className="w-3.5 h-3.5" />
            </div>
          )}
          {element.transfers_outside_eea && (
            <div
              className="flex items-center gap-1 text-orange-600 dark:text-orange-400"
              title="Transfers outside EEA"
            >
              <Globe className="w-3.5 h-3.5" />
            </div>
          )}
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
              getStatusColor(element.status)
            )}
          >
            {element.status.replace('_', ' ')}
          </span>
        </div>
        {reviewDue && (
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Review due</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface PIIDetailModalProps {
  element: PIIDataElement
  onClose: () => void
  onEdit: () => void
}

function PIIDetailModal({ element, onClose, onEdit }: PIIDetailModalProps) {
  const CategoryIcon = getCategoryIcon(element.category)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <CategoryIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {element.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getCategoryLabel(element.category)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                getSensitivityColor(element.sensitivity)
              )}
            >
              {element.sensitivity} sensitivity
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
              {/* Description */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                <p className="text-gray-600 dark:text-gray-300">{element.description}</p>
              </div>

              {/* Legal Basis & Purpose */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Processing Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Legal Basis</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {getLegalBasisLabel(element.legal_basis)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Purpose</p>
                    <p className="font-medium text-gray-900 dark:text-white">{element.purpose}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Data Subjects</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {element.data_subjects.map((subject) => (
                        <span
                          key={subject}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Data Sources</h3>
                <div className="space-y-3">
                  {element.sources.map((source) => {
                    const SourceIcon = getStorageIcon(source.type)
                    return (
                      <div
                        key={source.id}
                        className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg"
                      >
                        <SourceIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{source.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {source.type.replace('_', ' ')} • {source.location}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {source.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Processors */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Data Processors
                </h3>
                <div className="flex flex-wrap gap-2">
                  {element.processors.map((processor) => (
                    <span
                      key={processor}
                      className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      {processor}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Retention */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Retention</h3>
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {element.retention_days}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">days</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {element.retention_period}
                  </p>
                </div>
              </div>

              {/* Security */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Security Measures
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Encryption at Rest
                    </span>
                    {element.encryption_at_rest ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Encryption in Transit
                    </span>
                    {element.encryption_in_transit ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Access Controls</p>
                    <div className="flex flex-wrap gap-2">
                      {element.access_controls.map((control) => (
                        <span
                          key={control}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded"
                        >
                          {control}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* International Transfers */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  International Transfers
                </h3>
                {element.transfers_outside_eea ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <Globe className="w-5 h-5" />
                      <span className="font-medium">Transfers outside EEA</span>
                    </div>
                    {element.transfer_safeguards && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Safeguards</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {element.transfer_safeguards}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">No transfers outside EEA</span>
                  </div>
                )}
              </div>

              {/* Review Schedule */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  Review Schedule
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Last Reviewed</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(element.last_reviewed).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Next Review</span>
                    <span
                      className={cn(
                        'font-medium',
                        isReviewDue(element.next_review)
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-900 dark:text-white'
                      )}
                    >
                      {new Date(element.next_review).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Owner</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {element.owner}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onEdit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Element
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface PIIFormModalProps {
  element?: PIIDataElement
  onClose: () => void
  onSubmit: (data: Partial<PIIDataElement>) => void
}

function PIIFormModal({ element, onClose, onSubmit }: PIIFormModalProps) {
  const [formData, setFormData] = useState({
    name: element?.name || '',
    description: element?.description || '',
    category: element?.category || ('personal_identifiers' as DataCategory),
    sensitivity: element?.sensitivity || ('medium' as SensitivityLevel),
    data_subjects: element?.data_subjects.join(', ') || '',
    legal_basis: element?.legal_basis || ('consent' as LegalBasis),
    purpose: element?.purpose || '',
    retention_period: element?.retention_period || '',
    retention_days: element?.retention_days || 365,
    owner: element?.owner || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      data_subjects: formData.data_subjects.split(',').map((s) => s.trim()),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {element ? 'Edit PII Element' : 'New PII Element'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Element Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Customer Email Address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as DataCategory })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="personal_identifiers">Personal Identifiers</option>
                <option value="contact_info">Contact Information</option>
                <option value="financial">Financial Data</option>
                <option value="health">Health Data</option>
                <option value="biometric">Biometric Data</option>
                <option value="behavioral">Behavioral Data</option>
                <option value="professional">Professional Data</option>
                <option value="sensitive">Sensitive Data</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sensitivity Level *
              </label>
              <select
                value={formData.sensitivity}
                onChange={(e) =>
                  setFormData({ ...formData, sensitivity: e.target.value as SensitivityLevel })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe this data element..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Legal Basis *
              </label>
              <select
                value={formData.legal_basis}
                onChange={(e) =>
                  setFormData({ ...formData, legal_basis: e.target.value as LegalBasis })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="consent">Consent</option>
                <option value="contract">Contractual Necessity</option>
                <option value="legal_obligation">Legal Obligation</option>
                <option value="vital_interest">Vital Interest</option>
                <option value="public_task">Public Task</option>
                <option value="legitimate_interest">Legitimate Interest</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Subjects *
              </label>
              <input
                type="text"
                value={formData.data_subjects}
                onChange={(e) => setFormData({ ...formData, data_subjects: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Customers, Employees (comma-separated)"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Processing Purpose *
              </label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Why is this data collected and processed?"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retention Period *
              </label>
              <input
                type="text"
                value={formData.retention_period}
                onChange={(e) => setFormData({ ...formData, retention_period: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 7 years after account closure"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retention Days *
              </label>
              <input
                type="number"
                value={formData.retention_days}
                onChange={(e) =>
                  setFormData({ ...formData, retention_days: parseInt(e.target.value) })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={1}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Data Owner *
              </label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Team or individual responsible"
                required
              />
            </div>
          </div>

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
              {element ? 'Update Element' : 'Create Element'}
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

export function PIIInventoryTab() {
  const [elements, setElements] = useState<PIIDataElement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<DataCategory | 'all'>('all')
  const [sensitivityFilter, setSensitivityFilter] = useState<SensitivityLevel | 'all'>('all')
  const [selectedElement, setSelectedElement] = useState<PIIDataElement | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingElement, setEditingElement] = useState<PIIDataElement | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setElements(MOCK_PII_ELEMENTS)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const filteredElements = elements.filter((element) => {
    const matchesSearch =
      searchQuery === '' ||
      element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || element.category === categoryFilter
    const matchesSensitivity =
      sensitivityFilter === 'all' || element.sensitivity === sensitivityFilter
    return matchesSearch && matchesCategory && matchesSensitivity
  })

  const handleCreateOrUpdate = (data: Partial<PIIDataElement>) => {
    if (editingElement) {
      setElements(elements.map((e) => (e.id === editingElement.id ? { ...e, ...data } : e)))
    } else {
      const newElement: PIIDataElement = {
        id: String(elements.length + 1),
        name: data.name || '',
        description: data.description || '',
        category: data.category || 'personal_identifiers',
        sensitivity: data.sensitivity || 'medium',
        data_subjects: data.data_subjects || [],
        legal_basis: data.legal_basis || 'consent',
        purpose: data.purpose || '',
        retention_period: data.retention_period || '',
        retention_days: data.retention_days || 365,
        sources: [],
        processors: [],
        transfers_outside_eea: false,
        encryption_at_rest: true,
        encryption_in_transit: true,
        access_controls: [],
        last_reviewed: new Date().toISOString().split('T')[0],
        next_review: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        owner: data.owner || '',
        status: 'active',
      }
      setElements([newElement, ...elements])
    }
    setShowFormModal(false)
    setEditingElement(null)
  }

  const handleEdit = () => {
    if (selectedElement) {
      setEditingElement(selectedElement)
      setSelectedElement(null)
      setShowFormModal(true)
    }
  }

  // Stats
  const stats = {
    total: elements.length,
    critical: elements.filter((e) => e.sensitivity === 'critical').length,
    high: elements.filter((e) => e.sensitivity === 'high').length,
    reviewDue: elements.filter((e) => isReviewDue(e.next_review)).length,
    outsideEEA: elements.filter((e) => e.transfers_outside_eea).length,
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Elements</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">High</p>
          <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Review Due</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.reviewDue}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outside EEA</p>
          <p className="text-2xl font-bold text-purple-600">{stats.outsideEEA}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search PII elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as DataCategory | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="personal_identifiers">Personal Identifiers</option>
            <option value="contact_info">Contact Info</option>
            <option value="financial">Financial</option>
            <option value="health">Health</option>
            <option value="biometric">Biometric</option>
            <option value="behavioral">Behavioral</option>
            <option value="professional">Professional</option>
            <option value="sensitive">Sensitive</option>
          </select>
          <select
            value={sensitivityFilter}
            onChange={(e) => setSensitivityFilter(e.target.value as SensitivityLevel | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Sensitivity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Element
          </button>
        </div>
      </div>

      {/* PII Cards */}
      {filteredElements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredElements.map((element) => (
            <PIICard
              key={element.id}
              element={element}
              onClick={() => setSelectedElement(element)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No PII elements found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || categoryFilter !== 'all' || sensitivityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Start building your PII inventory'}
          </p>
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Element
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedElement && (
        <PIIDetailModal
          element={selectedElement}
          onClose={() => setSelectedElement(null)}
          onEdit={handleEdit}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <PIIFormModal
          element={editingElement || undefined}
          onClose={() => {
            setShowFormModal(false)
            setEditingElement(null)
          }}
          onSubmit={handleCreateOrUpdate}
        />
      )}
    </div>
  )
}

export default PIIInventoryTab
