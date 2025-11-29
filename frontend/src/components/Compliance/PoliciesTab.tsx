/**
 * PoliciesTab Component
 *
 * Policy Management with:
 * - Policy CRUD operations
 * - Version control with history
 * - Policy categories and status
 * - Approval workflow
 * - Document attachments
 */

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Download,
  Upload,
  X,
  Loader2,
  History,
  GitBranch,
  Users,
  Calendar,
  Tag,
  BookOpen,
  Shield,
  Lock,
  Send,
  MoreVertical,
  Copy,
  Archive,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type PolicyStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'expired'

type PolicyCategory =
  | 'information_security'
  | 'data_protection'
  | 'acceptable_use'
  | 'access_control'
  | 'incident_response'
  | 'business_continuity'
  | 'compliance'
  | 'hr_policies'
  | 'operational'
  | 'governance'

interface PolicyVersion {
  id: string
  version: string
  created_at: string
  created_by: string
  changes: string
  status: PolicyStatus
  document_url?: string
}

interface Policy {
  id: string
  title: string
  description: string
  category: PolicyCategory
  status: PolicyStatus
  current_version: string
  versions: PolicyVersion[]
  owner: string
  approvers: string[]
  effective_date?: string
  review_date?: string
  expiry_date?: string
  tags: string[]
  requires_acknowledgment: boolean
  acknowledgment_frequency?: 'once' | 'annual' | 'semi_annual' | 'quarterly'
  total_acknowledgments?: number
  pending_acknowledgments?: number
  created_at: string
  updated_at: string
  document_url?: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_POLICIES: Policy[] = [
  {
    id: '1',
    title: 'Information Security Policy',
    description:
      'Establishes the framework for protecting organizational information assets and ensuring confidentiality, integrity, and availability of data.',
    category: 'information_security',
    status: 'published',
    current_version: '3.0',
    versions: [
      {
        id: 'v3',
        version: '3.0',
        created_at: '2024-09-01',
        created_by: 'Sarah Johnson',
        changes: 'Updated encryption requirements and added cloud security section',
        status: 'published',
      },
      {
        id: 'v2',
        version: '2.0',
        created_at: '2023-06-15',
        created_by: 'Sarah Johnson',
        changes: 'Added remote work security guidelines',
        status: 'archived',
      },
      {
        id: 'v1',
        version: '1.0',
        created_at: '2022-01-10',
        created_by: 'Mike Chen',
        changes: 'Initial policy creation',
        status: 'archived',
      },
    ],
    owner: 'Sarah Johnson',
    approvers: ['CISO', 'Legal', 'HR Director'],
    effective_date: '2024-09-15',
    review_date: '2025-09-15',
    tags: ['Security', 'Mandatory', 'All Employees'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'annual',
    total_acknowledgments: 450,
    pending_acknowledgments: 23,
    created_at: '2022-01-10',
    updated_at: '2024-09-01',
  },
  {
    id: '2',
    title: 'Data Protection & Privacy Policy',
    description:
      'Defines how personal data is collected, processed, stored, and protected in compliance with GDPR and other privacy regulations.',
    category: 'data_protection',
    status: 'published',
    current_version: '2.1',
    versions: [
      {
        id: 'v2.1',
        version: '2.1',
        created_at: '2024-06-01',
        created_by: 'David Wilson',
        changes: 'Updated data retention schedules and cross-border transfer requirements',
        status: 'published',
      },
      {
        id: 'v2.0',
        version: '2.0',
        created_at: '2023-12-01',
        created_by: 'David Wilson',
        changes: 'Major revision for GDPR compliance updates',
        status: 'archived',
      },
    ],
    owner: 'David Wilson',
    approvers: ['DPO', 'Legal', 'CISO'],
    effective_date: '2024-06-15',
    review_date: '2025-06-15',
    tags: ['GDPR', 'Privacy', 'Mandatory', 'All Employees'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'annual',
    total_acknowledgments: 450,
    pending_acknowledgments: 15,
    created_at: '2021-05-20',
    updated_at: '2024-06-01',
  },
  {
    id: '3',
    title: 'Acceptable Use Policy',
    description:
      'Outlines acceptable and prohibited uses of company IT resources, including computers, networks, email, and internet access.',
    category: 'acceptable_use',
    status: 'published',
    current_version: '4.0',
    versions: [
      {
        id: 'v4',
        version: '4.0',
        created_at: '2024-03-01',
        created_by: 'Mike Chen',
        changes: 'Added AI tools usage guidelines and social media policy updates',
        status: 'published',
      },
    ],
    owner: 'Mike Chen',
    approvers: ['IT Director', 'HR Director', 'Legal'],
    effective_date: '2024-03-15',
    review_date: '2025-03-15',
    tags: ['IT', 'Mandatory', 'All Employees'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'annual',
    total_acknowledgments: 450,
    pending_acknowledgments: 8,
    created_at: '2020-01-15',
    updated_at: '2024-03-01',
  },
  {
    id: '4',
    title: 'Incident Response Plan',
    description:
      'Defines procedures for detecting, responding to, and recovering from security incidents and data breaches.',
    category: 'incident_response',
    status: 'pending_review',
    current_version: '2.5-draft',
    versions: [
      {
        id: 'v2.5-draft',
        version: '2.5-draft',
        created_at: '2024-11-20',
        created_by: 'Sarah Johnson',
        changes: 'Added ransomware response procedures and updated notification timelines',
        status: 'pending_review',
      },
      {
        id: 'v2.4',
        version: '2.4',
        created_at: '2024-01-15',
        created_by: 'Sarah Johnson',
        changes: 'Updated contact list and escalation procedures',
        status: 'published',
      },
    ],
    owner: 'Sarah Johnson',
    approvers: ['CISO', 'CTO', 'Legal'],
    effective_date: '2024-01-20',
    review_date: '2025-01-20',
    tags: ['Security', 'Incident Response', 'IT Team'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'semi_annual',
    total_acknowledgments: 45,
    pending_acknowledgments: 0,
    created_at: '2021-03-10',
    updated_at: '2024-11-20',
  },
  {
    id: '5',
    title: 'Business Continuity Policy',
    description:
      'Establishes framework for maintaining business operations during and after a disaster or major disruption.',
    category: 'business_continuity',
    status: 'draft',
    current_version: '1.0-draft',
    versions: [
      {
        id: 'v1-draft',
        version: '1.0-draft',
        created_at: '2024-11-15',
        created_by: 'Anna Williams',
        changes: 'Initial draft creation',
        status: 'draft',
      },
    ],
    owner: 'Anna Williams',
    approvers: ['COO', 'CTO', 'CFO'],
    tags: ['BCP', 'DR', 'Management'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'annual',
    created_at: '2024-11-15',
    updated_at: '2024-11-15',
  },
  {
    id: '6',
    title: 'Access Control Policy',
    description:
      'Defines requirements for granting, modifying, and revoking access to information systems and data.',
    category: 'access_control',
    status: 'published',
    current_version: '3.2',
    versions: [
      {
        id: 'v3.2',
        version: '3.2',
        created_at: '2024-08-01',
        created_by: 'Mike Chen',
        changes: 'Added privileged access management requirements',
        status: 'published',
      },
    ],
    owner: 'Mike Chen',
    approvers: ['CISO', 'IT Director'],
    effective_date: '2024-08-15',
    review_date: '2025-08-15',
    tags: ['Security', 'Access Management', 'IT Team'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'annual',
    total_acknowledgments: 45,
    pending_acknowledgments: 2,
    created_at: '2020-06-01',
    updated_at: '2024-08-01',
  },
  {
    id: '7',
    title: 'Code of Conduct',
    description:
      'Establishes ethical standards and expected behavior for all employees in their professional activities.',
    category: 'hr_policies',
    status: 'published',
    current_version: '2.0',
    versions: [
      {
        id: 'v2',
        version: '2.0',
        created_at: '2024-01-01',
        created_by: 'HR Director',
        changes: 'Updated diversity and inclusion sections',
        status: 'published',
      },
    ],
    owner: 'HR Director',
    approvers: ['CEO', 'Legal', 'Ethics Committee'],
    effective_date: '2024-01-15',
    review_date: '2026-01-15',
    tags: ['HR', 'Ethics', 'Mandatory', 'All Employees'],
    requires_acknowledgment: true,
    acknowledgment_frequency: 'once',
    total_acknowledgments: 450,
    pending_acknowledgments: 5,
    created_at: '2019-01-01',
    updated_at: '2024-01-01',
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCategoryLabel = (category: PolicyCategory): string => {
  const labels: Record<PolicyCategory, string> = {
    information_security: 'Information Security',
    data_protection: 'Data Protection',
    acceptable_use: 'Acceptable Use',
    access_control: 'Access Control',
    incident_response: 'Incident Response',
    business_continuity: 'Business Continuity',
    compliance: 'Compliance',
    hr_policies: 'HR Policies',
    operational: 'Operational',
    governance: 'Governance',
  }
  return labels[category]
}

const getCategoryIcon = (category: PolicyCategory) => {
  const icons: Record<PolicyCategory, React.FC<{ className?: string }>> = {
    information_security: Shield,
    data_protection: Lock,
    acceptable_use: BookOpen,
    access_control: Users,
    incident_response: AlertTriangle,
    business_continuity: RefreshCw,
    compliance: CheckCircle,
    hr_policies: Users,
    operational: FileText,
    governance: BookOpen,
  }
  return icons[category]
}

const getStatusColor = (status: PolicyStatus): string => {
  const colors: Record<PolicyStatus, string> = {
    draft: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    pending_review: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    archived: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status]
}

const getStatusLabel = (status: PolicyStatus): string => {
  const labels: Record<PolicyStatus, string> = {
    draft: 'Draft',
    pending_review: 'Pending Review',
    approved: 'Approved',
    published: 'Published',
    archived: 'Archived',
    expired: 'Expired',
  }
  return labels[status]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const isReviewDue = (reviewDate?: string): boolean => {
  if (!reviewDate) return false
  const review = new Date(reviewDate)
  const today = new Date()
  const diffDays = Math.ceil((review.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays > 0
}

const isExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}

const getAcknowledgmentFrequencyLabel = (freq?: string): string => {
  const labels: Record<string, string> = {
    once: 'One-time',
    annual: 'Annual',
    semi_annual: 'Semi-Annual',
    quarterly: 'Quarterly',
  }
  return freq ? labels[freq] || freq : 'N/A'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface PolicyCardProps {
  policy: Policy
  onClick: () => void
}

function PolicyCard({ policy, onClick }: PolicyCardProps) {
  const CategoryIcon = getCategoryIcon(policy.category)
  const reviewDue = isReviewDue(policy.review_date)
  const hasPendingAcks = (policy.pending_acknowledgments || 0) > 0

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
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {policy.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getCategoryLabel(policy.category)}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full',
            getStatusColor(policy.status)
          )}
        >
          {getStatusLabel(policy.status)}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {policy.description}
      </p>

      {/* Version & Owner */}
      <div className="flex items-center gap-4 mb-3 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <GitBranch className="w-3.5 h-3.5" />
          <span>v{policy.current_version}</span>
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          <span>{policy.owner}</span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {policy.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded"
          >
            {tag}
          </span>
        ))}
        {policy.tags.length > 3 && (
          <span className="px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            +{policy.tags.length - 3}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          {policy.requires_acknowledgment && (
            <div
              className={cn(
                'flex items-center gap-1 text-xs',
                hasPendingAcks
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-green-600 dark:text-green-400'
              )}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>
                {policy.total_acknowledgments! - policy.pending_acknowledgments!}/
                {policy.total_acknowledgments}
              </span>
            </div>
          )}
        </div>
        {reviewDue && (
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Review due</span>
          </div>
        )}
        {policy.review_date && !reviewDue && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
            <Calendar className="w-3.5 h-3.5" />
            <span>Review: {formatDate(policy.review_date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface PolicyDetailModalProps {
  policy: Policy
  onClose: () => void
  onEdit: () => void
  onPublish: () => void
  onArchive: () => void
}

function PolicyDetailModal({
  policy,
  onClose,
  onEdit,
  onPublish,
  onArchive,
}: PolicyDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'versions' | 'acknowledgments'>('details')
  const CategoryIcon = getCategoryIcon(policy.category)

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
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {policy.title}
                </h2>
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    getStatusColor(policy.status)
                  )}
                >
                  {getStatusLabel(policy.status)}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Version {policy.current_version} • {getCategoryLabel(policy.category)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            {(['details', 'versions', 'acknowledgments'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {tab}
                {tab === 'versions' && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">
                    {policy.versions.length}
                  </span>
                )}
                {tab === 'acknowledgments' && policy.pending_acknowledgments! > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-full">
                    {policy.pending_acknowledgments}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                  <p className="text-gray-600 dark:text-gray-300">{policy.description}</p>
                </div>

                {/* Key Dates */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Dates</h3>
                  <div className="space-y-3">
                    {policy.effective_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Effective Date
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDate(policy.effective_date)}
                        </span>
                      </div>
                    )}
                    {policy.review_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Next Review
                        </span>
                        <span
                          className={cn(
                            'font-medium',
                            isReviewDue(policy.review_date)
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-gray-900 dark:text-white'
                          )}
                        >
                          {formatDate(policy.review_date)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Last Updated</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(policy.updated_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Created</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDate(policy.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {policy.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Owner & Approvers */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Ownership & Approval
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Policy Owner</p>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {policy.owner}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Approvers</p>
                      <div className="flex flex-wrap gap-2">
                        {policy.approvers.map((approver) => (
                          <span
                            key={approver}
                            className="px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                          >
                            {approver}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acknowledgment Settings */}
                {policy.requires_acknowledgment && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Acknowledgment
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Required</span>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Frequency</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {getAcknowledgmentFrequencyLabel(policy.acknowledgment_frequency)}
                        </span>
                      </div>
                      {policy.total_acknowledgments !== undefined && (
                        <>
                          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                Completion
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {policy.total_acknowledgments! - policy.pending_acknowledgments!}/
                                {policy.total_acknowledgments}
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{
                                  width: `${((policy.total_acknowledgments! - policy.pending_acknowledgments!) / policy.total_acknowledgments!) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Actions</h3>
                  <div className="space-y-2">
                    {policy.status === 'draft' && (
                      <button
                        onClick={() => {}}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        Submit for Review
                      </button>
                    )}
                    {policy.status === 'pending_review' && (
                      <button
                        onClick={onPublish}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve & Publish
                      </button>
                    )}
                    <button
                      onClick={onEdit}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Policy
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    {policy.status === 'published' && (
                      <button
                        onClick={onArchive}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Archive className="w-4 h-4" />
                        Archive Policy
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Version History</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  Create New Version
                </button>
              </div>
              <div className="space-y-3">
                {policy.versions.map((version, index) => (
                  <div
                    key={version.id}
                    className={cn(
                      'bg-white dark:bg-gray-800 rounded-xl border p-4',
                      index === 0
                        ? 'border-blue-300 dark:border-blue-700'
                        : 'border-gray-200 dark:border-gray-700'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center',
                            index === 0
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : 'bg-gray-100 dark:bg-gray-700'
                          )}
                        >
                          <GitBranch
                            className={cn(
                              'w-5 h-5',
                              index === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'
                            )}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              Version {version.version}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                                Current
                              </span>
                            )}
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded-full',
                                getStatusColor(version.status)
                              )}
                            >
                              {getStatusLabel(version.status)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(version.created_at)} by {version.created_by}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Eye className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Download className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-13">
                      {version.changes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'acknowledgments' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {policy.total_acknowledgments! - policy.pending_acknowledgments!}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">Acknowledged</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {policy.pending_acknowledgments}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">Pending</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{policy.total_acknowledgments}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Total Required</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  <Send className="w-4 h-4" />
                  Send Reminders
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Acknowledgment Progress
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {Math.round(
                      ((policy.total_acknowledgments! - policy.pending_acknowledgments!) /
                        policy.total_acknowledgments!) *
                        100
                    )}
                    %
                  </span>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{
                      width: `${((policy.total_acknowledgments! - policy.pending_acknowledgments!) / policy.total_acknowledgments!) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {policy.pending_acknowledgments} users have not yet acknowledged this policy
                </p>
              </div>

              {/* Note */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Acknowledgment frequency:{' '}
                  <strong>
                    {getAcknowledgmentFrequencyLabel(policy.acknowledgment_frequency)}
                  </strong>
                  . Users will be reminded to re-acknowledge this policy according to this schedule.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface PolicyFormModalProps {
  policy?: Policy
  onClose: () => void
  onSubmit: (data: Partial<Policy>) => void
}

function PolicyFormModal({ policy, onClose, onSubmit }: PolicyFormModalProps) {
  const [formData, setFormData] = useState({
    title: policy?.title || '',
    description: policy?.description || '',
    category: policy?.category || ('information_security' as PolicyCategory),
    owner: policy?.owner || '',
    tags: policy?.tags.join(', ') || '',
    requires_acknowledgment: policy?.requires_acknowledgment ?? true,
    acknowledgment_frequency: policy?.acknowledgment_frequency || ('annual' as const),
    review_date: policy?.review_date || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tags: formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {policy ? 'Edit Policy' : 'Create New Policy'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Policy Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Information Security Policy"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as PolicyCategory })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="information_security">Information Security</option>
                <option value="data_protection">Data Protection</option>
                <option value="acceptable_use">Acceptable Use</option>
                <option value="access_control">Access Control</option>
                <option value="incident_response">Incident Response</option>
                <option value="business_continuity">Business Continuity</option>
                <option value="compliance">Compliance</option>
                <option value="hr_policies">HR Policies</option>
                <option value="operational">Operational</option>
                <option value="governance">Governance</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Policy Owner *
              </label>
              <input
                type="text"
                value={formData.owner}
                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Name or role"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the purpose and scope of this policy..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Security, Mandatory, All Employees (comma-separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Next Review Date
            </label>
            <input
              type="date"
              value={formData.review_date}
              onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Acknowledgment Settings */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Requires Acknowledgment</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Users must acknowledge they have read this policy
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    requires_acknowledgment: !formData.requires_acknowledgment,
                  })
                }
                className={cn(
                  'relative w-12 h-6 rounded-full transition-colors',
                  formData.requires_acknowledgment ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                    formData.requires_acknowledgment ? 'left-7' : 'left-1'
                  )}
                />
              </button>
            </div>

            {formData.requires_acknowledgment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Acknowledgment Frequency
                </label>
                <select
                  value={formData.acknowledgment_frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      acknowledgment_frequency: e.target.value as
                        | 'once'
                        | 'annual'
                        | 'semi_annual'
                        | 'quarterly',
                    })
                  }
                  className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="once">One-time</option>
                  <option value="annual">Annual</option>
                  <option value="semi_annual">Semi-Annual</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            )}
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
              {policy ? 'Update Policy' : 'Create Policy'}
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

export function PoliciesTab() {
  const [policies, setPolicies] = useState<Policy[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<PolicyCategory | 'all'>('all')
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 500))
      setPolicies(MOCK_POLICIES)
      setIsLoading(false)
    }
    loadData()
  }, [])

  const filteredPolicies = policies.filter((policy) => {
    const matchesSearch =
      searchQuery === '' ||
      policy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || policy.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || policy.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const handleCreateOrUpdate = (data: Partial<Policy>) => {
    if (editingPolicy) {
      setPolicies(
        policies.map((p) =>
          p.id === editingPolicy.id
            ? { ...p, ...data, updated_at: new Date().toISOString().split('T')[0] }
            : p
        )
      )
    } else {
      const newPolicy: Policy = {
        id: String(policies.length + 1),
        title: data.title || '',
        description: data.description || '',
        category: data.category || 'information_security',
        status: 'draft',
        current_version: '1.0-draft',
        versions: [
          {
            id: 'v1-draft',
            version: '1.0-draft',
            created_at: new Date().toISOString().split('T')[0],
            created_by: 'Current User',
            changes: 'Initial draft',
            status: 'draft',
          },
        ],
        owner: data.owner || '',
        approvers: [],
        tags: data.tags || [],
        requires_acknowledgment: data.requires_acknowledgment ?? true,
        acknowledgment_frequency: data.acknowledgment_frequency,
        review_date: data.review_date,
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0],
      }
      setPolicies([newPolicy, ...policies])
    }
    setShowFormModal(false)
    setEditingPolicy(null)
  }

  const handleEdit = () => {
    if (selectedPolicy) {
      setEditingPolicy(selectedPolicy)
      setSelectedPolicy(null)
      setShowFormModal(true)
    }
  }

  const handlePublish = () => {
    if (selectedPolicy) {
      setPolicies(
        policies.map((p) =>
          p.id === selectedPolicy.id
            ? {
                ...p,
                status: 'published' as PolicyStatus,
                effective_date: new Date().toISOString().split('T')[0],
                current_version: p.current_version.replace('-draft', ''),
              }
            : p
        )
      )
      setSelectedPolicy(null)
    }
  }

  const handleArchive = () => {
    if (selectedPolicy) {
      setPolicies(
        policies.map((p) =>
          p.id === selectedPolicy.id ? { ...p, status: 'archived' as PolicyStatus } : p
        )
      )
      setSelectedPolicy(null)
    }
  }

  // Stats
  const stats = {
    total: policies.length,
    published: policies.filter((p) => p.status === 'published').length,
    draft: policies.filter((p) => p.status === 'draft').length,
    pendingReview: policies.filter((p) => p.status === 'pending_review').length,
    reviewDue: policies.filter((p) => isReviewDue(p.review_date)).length,
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Policies</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Published</p>
          <p className="text-2xl font-bold text-green-600">{stats.published}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Drafts</p>
          <p className="text-2xl font-bold text-gray-600">{stats.draft}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Review Due</p>
          <p className="text-2xl font-bold text-orange-600">{stats.reviewDue}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search policies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PolicyStatus | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as PolicyCategory | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="information_security">Information Security</option>
            <option value="data_protection">Data Protection</option>
            <option value="acceptable_use">Acceptable Use</option>
            <option value="access_control">Access Control</option>
            <option value="incident_response">Incident Response</option>
            <option value="business_continuity">Business Continuity</option>
            <option value="compliance">Compliance</option>
            <option value="hr_policies">HR Policies</option>
          </select>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        </div>
      </div>

      {/* Review Due Alert */}
      {stats.reviewDue > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {stats.reviewDue} polic{stats.reviewDue !== 1 ? 'ies are' : 'y is'} due for review
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">
                Review and update policies to maintain compliance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Policy Cards */}
      {filteredPolicies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} onClick={() => setSelectedPolicy(policy)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No policies found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first policy to get started'}
          </p>
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Policy
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPolicy && (
        <PolicyDetailModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
          onEdit={handleEdit}
          onPublish={handlePublish}
          onArchive={handleArchive}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <PolicyFormModal
          policy={editingPolicy || undefined}
          onClose={() => {
            setShowFormModal(false)
            setEditingPolicy(null)
          }}
          onSubmit={handleCreateOrUpdate}
        />
      )}
    </div>
  )
}

export default PoliciesTab
