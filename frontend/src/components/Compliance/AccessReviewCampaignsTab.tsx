import React, { useState, useCallback } from 'react'
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportData,
  type ExportOptions,
} from '../../utils/reportExport'

// Types
type CampaignStatus = 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
type CampaignType =
  | 'user_access'
  | 'role_access'
  | 'privileged_access'
  | 'application_access'
  | 'entitlement'
type ReviewDecision = 'approved' | 'revoked' | 'modified' | 'pending'

interface ReviewItem {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_department: string
  resource_type: 'folder' | 'document' | 'application' | 'role'
  resource_name: string
  permission_level: string
  last_used?: string
  risk_score: number
  decision: ReviewDecision
  reviewer_id?: string
  reviewer_name?: string
  reviewed_at?: string
  comments?: string
}

interface AccessReviewCampaign {
  id: string
  name: string
  description: string
  type: CampaignType
  status: CampaignStatus
  scope: {
    departments?: string[]
    roles?: string[]
    applications?: string[]
    risk_levels?: string[]
  }
  reviewers: Array<{
    id: string
    name: string
    email: string
    role: string
  }>
  schedule: {
    start_date: string
    end_date: string
    reminder_frequency: 'daily' | 'weekly' | 'none'
  }
  progress: {
    total_items: number
    reviewed_items: number
    approved: number
    revoked: number
    modified: number
    pending: number
  }
  created_by: string
  created_at: string
  updated_at: string
}

// Mock Data
const mockCampaigns: AccessReviewCampaign[] = [
  {
    id: '1',
    name: 'Q4 2024 Privileged Access Review',
    description: 'Quarterly review of all privileged access accounts and permissions',
    type: 'privileged_access',
    status: 'in_progress',
    scope: {
      roles: ['Admin', 'Super Admin', 'System Admin'],
      risk_levels: ['high', 'critical'],
    },
    reviewers: [
      { id: 'r1', name: 'John Smith', email: 'john.smith@company.com', role: 'Security Manager' },
      { id: 'r2', name: 'Jane Doe', email: 'jane.doe@company.com', role: 'IT Director' },
    ],
    schedule: {
      start_date: '2024-10-01',
      end_date: '2024-10-31',
      reminder_frequency: 'weekly',
    },
    progress: {
      total_items: 45,
      reviewed_items: 32,
      approved: 28,
      revoked: 3,
      modified: 1,
      pending: 13,
    },
    created_by: 'admin@company.com',
    created_at: '2024-09-25T10:00:00Z',
    updated_at: '2024-10-15T14:30:00Z',
  },
  {
    id: '2',
    name: 'Finance Department Access Review',
    description: 'Annual review of Finance department access to sensitive financial data',
    type: 'user_access',
    status: 'scheduled',
    scope: {
      departments: ['Finance', 'Accounting'],
      applications: ['Financial System', 'Payroll', 'ERP'],
    },
    reviewers: [{ id: 'r3', name: 'Mike Johnson', email: 'mike.johnson@company.com', role: 'CFO' }],
    schedule: {
      start_date: '2024-11-01',
      end_date: '2024-11-30',
      reminder_frequency: 'weekly',
    },
    progress: {
      total_items: 120,
      reviewed_items: 0,
      approved: 0,
      revoked: 0,
      modified: 0,
      pending: 120,
    },
    created_by: 'admin@company.com',
    created_at: '2024-10-20T09:00:00Z',
    updated_at: '2024-10-20T09:00:00Z',
  },
  {
    id: '3',
    name: 'Application Role Review - DFC',
    description: 'Review of all role assignments in the Digital Filing Cabinet application',
    type: 'role_access',
    status: 'completed',
    scope: {
      applications: ['Digital Filing Cabinet'],
    },
    reviewers: [
      { id: 'r1', name: 'John Smith', email: 'john.smith@company.com', role: 'Security Manager' },
      { id: 'r4', name: 'Sarah Williams', email: 'sarah.williams@company.com', role: 'App Owner' },
    ],
    schedule: {
      start_date: '2024-09-01',
      end_date: '2024-09-30',
      reminder_frequency: 'daily',
    },
    progress: {
      total_items: 89,
      reviewed_items: 89,
      approved: 82,
      revoked: 5,
      modified: 2,
      pending: 0,
    },
    created_by: 'admin@company.com',
    created_at: '2024-08-25T11:00:00Z',
    updated_at: '2024-09-30T16:45:00Z',
  },
]

const mockReviewItems: ReviewItem[] = [
  {
    id: 'ri1',
    user_id: 'u1',
    user_name: 'Alice Brown',
    user_email: 'alice.brown@company.com',
    user_department: 'IT',
    resource_type: 'role',
    resource_name: 'System Administrator',
    permission_level: 'Full Access',
    last_used: '2024-10-14T08:30:00Z',
    risk_score: 85,
    decision: 'pending',
  },
  {
    id: 'ri2',
    user_id: 'u2',
    user_name: 'Bob Wilson',
    user_email: 'bob.wilson@company.com',
    user_department: 'Finance',
    resource_type: 'application',
    resource_name: 'Financial System',
    permission_level: 'Admin',
    last_used: '2024-10-10T14:20:00Z',
    risk_score: 72,
    decision: 'approved',
    reviewer_id: 'r1',
    reviewer_name: 'John Smith',
    reviewed_at: '2024-10-12T09:15:00Z',
    comments: 'Access verified with manager',
  },
  {
    id: 'ri3',
    user_id: 'u3',
    user_name: 'Carol Davis',
    user_email: 'carol.davis@company.com',
    user_department: 'HR',
    resource_type: 'folder',
    resource_name: '/Confidential/Employee Records',
    permission_level: 'Read/Write',
    last_used: '2024-08-05T11:00:00Z',
    risk_score: 65,
    decision: 'revoked',
    reviewer_id: 'r1',
    reviewer_name: 'John Smith',
    reviewed_at: '2024-10-13T10:30:00Z',
    comments: 'User transferred to different department, access no longer needed',
  },
  {
    id: 'ri4',
    user_id: 'u4',
    user_name: 'David Lee',
    user_email: 'david.lee@company.com',
    user_department: 'IT',
    resource_type: 'role',
    resource_name: 'Database Administrator',
    permission_level: 'Full Access',
    last_used: '2024-10-15T16:45:00Z',
    risk_score: 90,
    decision: 'pending',
  },
  {
    id: 'ri5',
    user_id: 'u5',
    user_name: 'Eva Martinez',
    user_email: 'eva.martinez@company.com',
    user_department: 'Legal',
    resource_type: 'document',
    resource_name: 'Contract Templates',
    permission_level: 'Read Only',
    risk_score: 25,
    decision: 'approved',
    reviewer_id: 'r2',
    reviewer_name: 'Jane Doe',
    reviewed_at: '2024-10-11T13:00:00Z',
  },
]

// Helper Functions
const getStatusColor = (status: CampaignStatus): string => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'scheduled':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'completed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getTypeLabel = (type: CampaignType): string => {
  switch (type) {
    case 'user_access':
      return 'User Access'
    case 'role_access':
      return 'Role Access'
    case 'privileged_access':
      return 'Privileged Access'
    case 'application_access':
      return 'Application Access'
    case 'entitlement':
      return 'Entitlement'
    default:
      return type
  }
}

const getDecisionColor = (decision: ReviewDecision): string => {
  switch (decision) {
    case 'approved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'revoked':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'modified':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'pending':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getRiskColor = (score: number): string => {
  if (score >= 80) return 'text-red-600 dark:text-red-400'
  if (score >= 60) return 'text-orange-600 dark:text-orange-400'
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Campaign Card Component
const CampaignCard: React.FC<{
  campaign: AccessReviewCampaign
  onView: () => void
  onEdit: () => void
}> = ({ campaign, onView, onEdit }) => {
  const progressPercent = Math.round(
    (campaign.progress.reviewed_items / campaign.progress.total_items) * 100
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getStatusColor(campaign.status)}`}
            >
              {campaign.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {campaign.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onView}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="View Details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
          {campaign.status !== 'completed' && campaign.status !== 'cancelled' && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Edit Campaign"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Type</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {getTypeLabel(campaign.type)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Timeline</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatDate(campaign.schedule.start_date)} - {formatDate(campaign.schedule.end_date)}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">Progress</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {campaign.progress.reviewed_items} / {campaign.progress.total_items} ({progressPercent}
            %)
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Decision Summary */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Approved: {campaign.progress.approved}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Revoked: {campaign.progress.revoked}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Modified: {campaign.progress.modified}
          </span>
        </div>
      </div>

      {/* Reviewers */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Reviewers</p>
        <div className="flex items-center gap-2">
          {campaign.reviewers.slice(0, 3).map((reviewer, index) => (
            <div
              key={reviewer.id}
              className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-400"
              title={reviewer.name}
              style={{ marginLeft: index > 0 ? '-8px' : '0', zIndex: 3 - index }}
            >
              {reviewer.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
          ))}
          {campaign.reviewers.length > 3 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              +{campaign.reviewers.length - 3} more
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Review Items Table Component
const ReviewItemsTable: React.FC<{
  items: ReviewItem[]
  onDecision: (itemId: string, decision: ReviewDecision, comments?: string) => void
}> = ({ items, onDecision }) => {
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Resource
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Permission
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Last Used
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Decision
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.user_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.user_email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {item.user_department}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 capitalize mb-1">
                      {item.resource_type}
                    </span>
                    <p className="text-sm text-gray-900 dark:text-white">{item.resource_name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {item.permission_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {item.last_used ? formatDate(item.last_used) : 'Never'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-semibold ${getRiskColor(item.risk_score)}`}>
                    {item.risk_score}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getDecisionColor(item.decision)}`}
                  >
                    {item.decision}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {item.decision === 'pending' ? (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onDecision(item.id, 'approved')}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                        title="Approve"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDecision(item.id, 'revoked')}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Revoke"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="More Options"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                          />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        by {item.reviewer_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {item.reviewed_at && formatDate(item.reviewed_at)}
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Stats Card Component
const StatsCard: React.FC<{
  title: string
  value: number | string
  subtitle?: string
  icon: React.ReactNode
  color: string
}> = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
    </div>
  </div>
)

// Main Component
const AccessReviewCampaignsTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<AccessReviewCampaign[]>([])
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<AccessReviewCampaign | null>(null)
  const [filterStatus, setFilterStatus] = useState<CampaignStatus | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const filteredCampaigns =
    filterStatus === 'all' ? campaigns : campaigns.filter((c) => c.status === filterStatus)

  const activeCampaigns = campaigns.filter((c) => c.status === 'in_progress').length
  const totalPendingReviews = campaigns.reduce((acc, c) => acc + c.progress.pending, 0)
  const completionRate = Math.round(
    (campaigns.filter((c) => c.status === 'completed').length / campaigns.length) * 100
  )

  const handleDecision = useCallback(
    (itemId: string, decision: ReviewDecision, comments?: string) => {
      setReviewItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                decision,
                reviewer_id: 'current_user',
                reviewer_name: 'Current User',
                reviewed_at: new Date().toISOString(),
                comments,
              }
            : item
        )
      )
    },
    []
  )

  const handleExport = useCallback(
    (format: 'pdf' | 'excel' | 'csv') => {
      const exportData: ExportData = {
        columns: [
          { field: 'name', label: 'Campaign Name' },
          { field: 'type', label: 'Type' },
          { field: 'status', label: 'Status' },
          { field: 'progress', label: 'Progress' },
          { field: 'approved', label: 'Approved', align: 'right' as const },
          { field: 'revoked', label: 'Revoked', align: 'right' as const },
          { field: 'pending', label: 'Pending', align: 'right' as const },
          { field: 'end_date', label: 'Due Date' },
        ],
        rows: campaigns.map((c) => ({
          name: c.name,
          type: getTypeLabel(c.type),
          status: c.status.replace('_', ' '),
          progress: `${c.progress.reviewed_items}/${c.progress.total_items}`,
          approved: c.progress.approved,
          revoked: c.progress.revoked,
          pending: c.progress.pending,
          end_date: formatDate(c.schedule.end_date),
        })),
        title: 'Access Review Campaigns Report',
        generatedAt: new Date().toISOString(),
        summary: {
          'Total Campaigns': campaigns.length,
          'Active Campaigns': activeCampaigns,
          'Pending Reviews': totalPendingReviews,
          'Completion Rate': `${completionRate}%`,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `Access_Review_Campaigns_${new Date().toISOString().split('T')[0]}`,
        title: 'Access Review Campaigns Report',
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      switch (format) {
        case 'csv':
          exportToCSV(exportData, exportOptions)
          break
        case 'excel':
          exportToExcel(exportData, exportOptions)
          break
        case 'pdf':
          exportToPDF(exportData, exportOptions)
          break
      }
    },
    [campaigns, activeCampaigns, totalPendingReviews, completionRate]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Access Review Campaigns
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and conduct periodic access reviews across your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible hover:opacity-100 hover:visible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Excel
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                CSV
              </button>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Active Campaigns"
          value={activeCampaigns}
          subtitle="Currently in progress"
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
          color="bg-blue-600"
        />
        <StatsCard
          title="Pending Reviews"
          value={totalPendingReviews}
          subtitle="Awaiting decision"
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="bg-yellow-600"
        />
        <StatsCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle="Campaigns completed"
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
          color="bg-green-600"
        />
        <StatsCard
          title="Total Campaigns"
          value={campaigns.length}
          subtitle="All time"
          icon={
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
          color="bg-purple-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['all', 'in_progress', 'scheduled', 'completed', 'draft'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filterStatus === status
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {status === 'all'
              ? 'All Campaigns'
              : status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            {status !== 'all' && (
              <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700">
                {campaigns.filter((c) => c.status === status).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {selectedCampaign ? (
        <div className="space-y-4">
          <button
            onClick={() => setSelectedCampaign(null)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Campaigns
          </button>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedCampaign.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedCampaign.description}
                </p>
              </div>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getStatusColor(selectedCampaign.status)}`}
              >
                {selectedCampaign.status.replace('_', ' ')}
              </span>
            </div>
            <ReviewItemsTable items={reviewItems} onDecision={handleDecision} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={() => setSelectedCampaign(campaign)}
              onEdit={() => {}}
            />
          ))}
        </div>
      )}

      {filteredCampaigns.length === 0 && !selectedCampaign && (
        <div className="text-center py-12">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No campaigns found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filterStatus === 'all'
              ? 'Create your first access review campaign to get started.'
              : `No ${filterStatus.replace('_', ' ')} campaigns at the moment.`}
          </p>
        </div>
      )}
    </div>
  )
}

export default AccessReviewCampaignsTab
