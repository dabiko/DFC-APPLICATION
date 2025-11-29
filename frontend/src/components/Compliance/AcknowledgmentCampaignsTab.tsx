import React, { useState, useEffect } from 'react'

// Types
type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'
type CampaignType =
  | 'policy_acknowledgment'
  | 'training_completion'
  | 'annual_review'
  | 'compliance_certification'
  | 'custom'
type ReminderFrequency = 'daily' | 'every_3_days' | 'weekly' | 'bi_weekly'
type AcknowledgmentStatus = 'pending' | 'acknowledged' | 'overdue' | 'exempted'

interface CampaignTarget {
  id: string
  type: 'user' | 'department' | 'role' | 'all'
  name: string
  user_count: number
}

interface UserAcknowledgment {
  id: string
  user_id: string
  user_name: string
  user_email: string
  department: string
  status: AcknowledgmentStatus
  acknowledged_at?: string
  reminder_count: number
  last_reminder_at?: string
  exemption_reason?: string
}

interface CampaignReminder {
  id: string
  sent_at: string
  recipient_count: number
  type: 'initial' | 'reminder' | 'escalation' | 'final'
}

interface Campaign {
  id: string
  name: string
  description: string
  type: CampaignType
  status: CampaignStatus
  policy_id?: string
  policy_title?: string
  targets: CampaignTarget[]
  start_date: string
  end_date: string
  reminder_frequency: ReminderFrequency
  reminder_enabled: boolean
  escalation_enabled: boolean
  escalation_after_days: number
  escalation_to: string[]
  total_recipients: number
  acknowledged_count: number
  pending_count: number
  overdue_count: number
  acknowledgments: UserAcknowledgment[]
  reminders_sent: CampaignReminder[]
  created_by: string
  created_at: string
  updated_at: string
}

// Mock data
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Q4 2024 Information Security Policy Acknowledgment',
    description: 'Annual acknowledgment campaign for the updated Information Security Policy',
    type: 'policy_acknowledgment',
    status: 'active',
    policy_id: 'pol-1',
    policy_title: 'Information Security Policy v3.0',
    targets: [{ id: 't1', type: 'all', name: 'All Employees', user_count: 245 }],
    start_date: '2024-10-01',
    end_date: '2024-10-31',
    reminder_frequency: 'weekly',
    reminder_enabled: true,
    escalation_enabled: true,
    escalation_after_days: 14,
    escalation_to: ['Department Managers', 'HR'],
    total_recipients: 245,
    acknowledged_count: 189,
    pending_count: 41,
    overdue_count: 15,
    acknowledgments: [
      {
        id: 'a1',
        user_id: 'u1',
        user_name: 'John Smith',
        user_email: 'john.smith@company.com',
        department: 'Engineering',
        status: 'acknowledged',
        acknowledged_at: '2024-10-05T10:30:00Z',
        reminder_count: 0,
      },
      {
        id: 'a2',
        user_id: 'u2',
        user_name: 'Jane Doe',
        user_email: 'jane.doe@company.com',
        department: 'Marketing',
        status: 'pending',
        reminder_count: 2,
        last_reminder_at: '2024-10-20T09:00:00Z',
      },
      {
        id: 'a3',
        user_id: 'u3',
        user_name: 'Bob Wilson',
        user_email: 'bob.wilson@company.com',
        department: 'Finance',
        status: 'overdue',
        reminder_count: 4,
        last_reminder_at: '2024-10-25T09:00:00Z',
      },
      {
        id: 'a4',
        user_id: 'u4',
        user_name: 'Alice Brown',
        user_email: 'alice.brown@company.com',
        department: 'HR',
        status: 'exempted',
        reminder_count: 0,
        exemption_reason: 'On extended leave',
      },
    ],
    reminders_sent: [
      { id: 'r1', sent_at: '2024-10-01T09:00:00Z', recipient_count: 245, type: 'initial' },
      { id: 'r2', sent_at: '2024-10-08T09:00:00Z', recipient_count: 120, type: 'reminder' },
      { id: 'r3', sent_at: '2024-10-15T09:00:00Z', recipient_count: 75, type: 'reminder' },
      { id: 'r4', sent_at: '2024-10-22T09:00:00Z', recipient_count: 56, type: 'escalation' },
    ],
    created_by: 'Compliance Team',
    created_at: '2024-09-25T14:00:00Z',
    updated_at: '2024-10-22T09:00:00Z',
  },
  {
    id: '2',
    name: 'Code of Conduct Annual Review',
    description: 'Yearly acknowledgment of the company Code of Conduct',
    type: 'annual_review',
    status: 'scheduled',
    policy_id: 'pol-2',
    policy_title: 'Code of Conduct v2.1',
    targets: [{ id: 't2', type: 'all', name: 'All Employees', user_count: 245 }],
    start_date: '2024-11-01',
    end_date: '2024-11-30',
    reminder_frequency: 'weekly',
    reminder_enabled: true,
    escalation_enabled: true,
    escalation_after_days: 21,
    escalation_to: ['HR Director'],
    total_recipients: 245,
    acknowledged_count: 0,
    pending_count: 245,
    overdue_count: 0,
    acknowledgments: [],
    reminders_sent: [],
    created_by: 'HR Department',
    created_at: '2024-10-15T10:00:00Z',
    updated_at: '2024-10-15T10:00:00Z',
  },
  {
    id: '3',
    name: 'GDPR Training Completion',
    description: 'Mandatory GDPR training completion for data handling staff',
    type: 'training_completion',
    status: 'completed',
    targets: [
      { id: 't3', type: 'department', name: 'Customer Service', user_count: 45 },
      { id: 't4', type: 'department', name: 'Sales', user_count: 32 },
    ],
    start_date: '2024-08-01',
    end_date: '2024-08-31',
    reminder_frequency: 'every_3_days',
    reminder_enabled: true,
    escalation_enabled: true,
    escalation_after_days: 14,
    escalation_to: ['Department Heads', 'Compliance Officer'],
    total_recipients: 77,
    acknowledged_count: 77,
    pending_count: 0,
    overdue_count: 0,
    acknowledgments: [],
    reminders_sent: [
      { id: 'r5', sent_at: '2024-08-01T09:00:00Z', recipient_count: 77, type: 'initial' },
      { id: 'r6', sent_at: '2024-08-04T09:00:00Z', recipient_count: 45, type: 'reminder' },
      { id: 'r7', sent_at: '2024-08-07T09:00:00Z', recipient_count: 22, type: 'reminder' },
      { id: 'r8', sent_at: '2024-08-10T09:00:00Z', recipient_count: 8, type: 'reminder' },
      { id: 'r9', sent_at: '2024-08-15T09:00:00Z', recipient_count: 3, type: 'escalation' },
    ],
    created_by: 'Compliance Team',
    created_at: '2024-07-20T11:00:00Z',
    updated_at: '2024-08-31T17:00:00Z',
  },
  {
    id: '4',
    name: 'IT Acceptable Use Policy Update',
    description: 'Acknowledgment required for updated IT acceptable use policy',
    type: 'policy_acknowledgment',
    status: 'draft',
    policy_id: 'pol-3',
    policy_title: 'IT Acceptable Use Policy v4.0',
    targets: [{ id: 't5', type: 'all', name: 'All Employees', user_count: 245 }],
    start_date: '2024-12-01',
    end_date: '2024-12-31',
    reminder_frequency: 'bi_weekly',
    reminder_enabled: true,
    escalation_enabled: false,
    escalation_after_days: 0,
    escalation_to: [],
    total_recipients: 245,
    acknowledged_count: 0,
    pending_count: 0,
    overdue_count: 0,
    acknowledgments: [],
    reminders_sent: [],
    created_by: 'IT Department',
    created_at: '2024-10-28T09:00:00Z',
    updated_at: '2024-10-28T09:00:00Z',
  },
]

// Helper functions
const getStatusColor = (status: CampaignStatus): string => {
  const colors: Record<CampaignStatus, string> = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status]
}

const getTypeColor = (type: CampaignType): string => {
  const colors: Record<CampaignType, string> = {
    policy_acknowledgment:
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    training_completion: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    annual_review: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    compliance_certification: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    custom: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[type]
}

const getAcknowledgmentStatusColor = (status: AcknowledgmentStatus): string => {
  const colors: Record<AcknowledgmentStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    acknowledged: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    exempted: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[status]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatTypeLabel = (type: CampaignType): string => {
  const labels: Record<CampaignType, string> = {
    policy_acknowledgment: 'Policy Acknowledgment',
    training_completion: 'Training Completion',
    annual_review: 'Annual Review',
    compliance_certification: 'Compliance Certification',
    custom: 'Custom Campaign',
  }
  return labels[type]
}

const formatReminderFrequency = (frequency: ReminderFrequency): string => {
  const labels: Record<ReminderFrequency, string> = {
    daily: 'Daily',
    every_3_days: 'Every 3 Days',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
  }
  return labels[frequency]
}

// Campaign Card Component
const CampaignCard: React.FC<{
  campaign: Campaign
  onView: () => void
  onEdit: () => void
  onActivate?: () => void
  onCancel?: () => void
  onSendReminder?: () => void
}> = ({ campaign, onView, onEdit, onActivate, onCancel, onSendReminder }) => {
  const completionRate =
    campaign.total_recipients > 0
      ? Math.round((campaign.acknowledged_count / campaign.total_recipients) * 100)
      : 0

  const isOverdue = new Date(campaign.end_date) < new Date() && campaign.status === 'active'
  const daysRemaining = Math.ceil(
    (new Date(campaign.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}
            >
              {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(campaign.type)}`}
            >
              {formatTypeLabel(campaign.type)}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
        </div>
        <div className="flex items-center gap-1">
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
          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
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

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {campaign.description}
      </p>

      {campaign.policy_title && (
        <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">Linked Policy</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {campaign.policy_title}
          </p>
        </div>
      )}

      {/* Progress Section */}
      {campaign.status !== 'draft' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Completion Progress</span>
            <span className="font-medium text-gray-900 dark:text-white">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completionRate === 100
                  ? 'bg-green-500'
                  : completionRate >= 75
                    ? 'bg-blue-500'
                    : completionRate >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{campaign.acknowledged_count} acknowledged</span>
            <span>{campaign.pending_count} pending</span>
            {campaign.overdue_count > 0 && (
              <span className="text-red-600 dark:text-red-400">
                {campaign.overdue_count} overdue
              </span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-4 text-sm mb-4">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">Start Date</p>
          <p className="font-medium text-gray-900 dark:text-white">
            {formatDate(campaign.start_date)}
          </p>
        </div>
        <div className="flex-1 border-t border-dashed border-gray-300 dark:border-gray-600" />
        <div className="text-right">
          <p className="text-gray-500 dark:text-gray-400 text-xs">End Date</p>
          <p
            className={`font-medium ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
          >
            {formatDate(campaign.end_date)}
          </p>
        </div>
      </div>

      {/* Status Alerts */}
      {campaign.status === 'active' && (
        <div
          className={`mb-4 p-2 rounded-lg text-sm ${
            isOverdue
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : daysRemaining <= 7
                ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          }`}
        >
          {isOverdue
            ? `Campaign ended ${Math.abs(daysRemaining)} days ago - ${campaign.pending_count + campaign.overdue_count} recipients incomplete`
            : daysRemaining <= 7
              ? `${daysRemaining} days remaining - ${campaign.pending_count} recipients pending`
              : `${daysRemaining} days remaining`}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        {campaign.status === 'draft' && onActivate && (
          <button
            onClick={onActivate}
            className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            Activate Campaign
          </button>
        )}
        {campaign.status === 'scheduled' && onActivate && (
          <button
            onClick={onActivate}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Now
          </button>
        )}
        {campaign.status === 'active' && onSendReminder && (
          <button
            onClick={onSendReminder}
            className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send Reminder
          </button>
        )}
        {(campaign.status === 'active' || campaign.status === 'scheduled') && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={onView}
          className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

// Campaign Detail Modal Component
const CampaignDetailModal: React.FC<{
  campaign: Campaign
  onClose: () => void
  onSendReminder: () => void
  onExportReport: () => void
}> = ({ campaign, onClose, onSendReminder, onExportReport }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'recipients' | 'reminders'>('overview')
  const [recipientFilter, setRecipientFilter] = useState<AcknowledgmentStatus | 'all'>('all')

  const completionRate =
    campaign.total_recipients > 0
      ? Math.round((campaign.acknowledged_count / campaign.total_recipients) * 100)
      : 0

  const filteredAcknowledgments = campaign.acknowledgments.filter(
    (ack) => recipientFilter === 'all' || ack.status === recipientFilter
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-4xl bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all my-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(campaign.status)}`}
                  >
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getTypeColor(campaign.type)}`}
                  >
                    {formatTypeLabel(campaign.type)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {campaign.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px px-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'recipients', label: 'Recipients' },
                { id: 'reminders', label: 'Reminders' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Progress Overview */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {campaign.total_recipients}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Recipients</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {campaign.acknowledged_count}
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">Acknowledged</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {campaign.pending_count}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">Pending</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {campaign.overdue_count}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">Overdue</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {completionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        completionRate === 100 ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Campaign Details */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Campaign Details
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Start Date</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(campaign.start_date)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">End Date</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(campaign.end_date)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Created By</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {campaign.created_by}
                        </dd>
                      </div>
                      {campaign.policy_title && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">
                            Linked Policy
                          </dt>
                          <dd className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {campaign.policy_title}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Reminder Settings
                    </h3>
                    <dl className="space-y-2">
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Reminders</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {campaign.reminder_enabled
                            ? formatReminderFrequency(campaign.reminder_frequency)
                            : 'Disabled'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-500 dark:text-gray-400">Escalation</dt>
                        <dd className="text-sm font-medium text-gray-900 dark:text-white">
                          {campaign.escalation_enabled
                            ? `After ${campaign.escalation_after_days} days`
                            : 'Disabled'}
                        </dd>
                      </div>
                      {campaign.escalation_enabled && campaign.escalation_to.length > 0 && (
                        <div className="flex justify-between">
                          <dt className="text-sm text-gray-500 dark:text-gray-400">Escalate To</dt>
                          <dd className="text-sm font-medium text-gray-900 dark:text-white">
                            {campaign.escalation_to.join(', ')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Target Groups */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Target Groups
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {campaign.targets.map((target) => (
                      <span
                        key={target.id}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                      >
                        {target.name} ({target.user_count} users)
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Description
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{campaign.description}</p>
                </div>
              </div>
            )}

            {activeTab === 'recipients' && (
              <div>
                {/* Filter */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
                  {(['all', 'acknowledged', 'pending', 'overdue', 'exempted'] as const).map(
                    (filter) => (
                      <button
                        key={filter}
                        onClick={() => setRecipientFilter(filter)}
                        className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          recipientFilter === filter
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    )
                  )}
                </div>

                {/* Recipients Table */}
                {filteredAcknowledgments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            User
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Department
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Status
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Acknowledged
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Reminders
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAcknowledgments.map((ack) => (
                          <tr
                            key={ack.id}
                            className="border-b border-gray-100 dark:border-gray-700/50"
                          >
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {ack.user_name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {ack.user_email}
                                </p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {ack.department}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getAcknowledgmentStatusColor(ack.status)}`}
                              >
                                {ack.status.charAt(0).toUpperCase() + ack.status.slice(1)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {ack.acknowledged_at ? formatDateTime(ack.acknowledged_at) : '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {ack.reminder_count > 0 ? `${ack.reminder_count} sent` : 'None'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">No recipients found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reminders' && (
              <div>
                {campaign.reminders_sent.length > 0 ? (
                  <div className="space-y-3">
                    {campaign.reminders_sent.map((reminder, index) => (
                      <div
                        key={reminder.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            reminder.type === 'initial'
                              ? 'bg-blue-100 dark:bg-blue-900/30'
                              : reminder.type === 'escalation'
                                ? 'bg-red-100 dark:bg-red-900/30'
                                : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}
                        >
                          <svg
                            className={`w-5 h-5 ${
                              reminder.type === 'initial'
                                ? 'text-blue-600 dark:text-blue-400'
                                : reminder.type === 'escalation'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-yellow-600 dark:text-yellow-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {reminder.type === 'initial'
                                ? 'Initial Notification'
                                : reminder.type === 'escalation'
                                  ? 'Escalation Notice'
                                  : reminder.type === 'final'
                                    ? 'Final Reminder'
                                    : 'Reminder'}
                            </p>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full ${
                                reminder.type === 'initial'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : reminder.type === 'escalation'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              #{index + 1}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Sent to {reminder.recipient_count} recipients
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-900 dark:text-white">
                            {formatDateTime(reminder.sent_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 mx-auto text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">No reminders sent yet</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={onExportReport}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export Report
            </button>
            <div className="flex items-center gap-2">
              {campaign.status === 'active' && (
                <button
                  onClick={onSendReminder}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Reminder
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Campaign Form Modal Component
const CampaignFormModal: React.FC<{
  campaign?: Campaign
  onClose: () => void
  onSave: (data: Partial<Campaign>) => void
}> = ({ campaign, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    type: campaign?.type || ('policy_acknowledgment' as CampaignType),
    policy_id: campaign?.policy_id || '',
    start_date: campaign?.start_date || '',
    end_date: campaign?.end_date || '',
    target_type: 'all' as 'all' | 'department' | 'role',
    target_departments: [] as string[],
    reminder_enabled: campaign?.reminder_enabled ?? true,
    reminder_frequency: campaign?.reminder_frequency || ('weekly' as ReminderFrequency),
    escalation_enabled: campaign?.escalation_enabled ?? true,
    escalation_after_days: campaign?.escalation_after_days || 14,
    escalation_to: campaign?.escalation_to || ([] as string[]),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as unknown as Partial<Campaign>)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all my-8">
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {campaign ? 'Edit Campaign' : 'Create New Campaign'}
              </h2>
            </div>

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto space-y-5">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Campaign Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as CampaignType })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="policy_acknowledgment">Policy Acknowledgment</option>
                    <option value="training_completion">Training Completion</option>
                    <option value="annual_review">Annual Review</option>
                    <option value="compliance_certification">Compliance Certification</option>
                    <option value="custom">Custom Campaign</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Target Audience *
                  </label>
                  <select
                    value={formData.target_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        target_type: e.target.value as 'all' | 'department' | 'role',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Employees</option>
                    <option value="department">Specific Departments</option>
                    <option value="role">Specific Roles</option>
                  </select>
                </div>
              </div>

              {/* Timeline */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Reminder Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Reminder Settings
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="reminder_enabled"
                    checked={formData.reminder_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, reminder_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="reminder_enabled"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Enable automatic reminders
                  </label>
                </div>

                {formData.reminder_enabled && (
                  <div className="ml-7">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Reminder Frequency
                    </label>
                    <select
                      value={formData.reminder_frequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reminder_frequency: e.target.value as ReminderFrequency,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="daily">Daily</option>
                      <option value="every_3_days">Every 3 Days</option>
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-Weekly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Escalation Settings */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Escalation Settings
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="escalation_enabled"
                    checked={formData.escalation_enabled}
                    onChange={(e) =>
                      setFormData({ ...formData, escalation_enabled: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="escalation_enabled"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Enable escalation for non-compliance
                  </label>
                </div>

                {formData.escalation_enabled && (
                  <div className="ml-7 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Escalate after (days)
                      </label>
                      <input
                        type="number"
                        value={formData.escalation_after_days}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            escalation_after_days: parseInt(e.target.value),
                          })
                        }
                        min={1}
                        max={90}
                        className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Escalate to
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {['Department Manager', 'HR', 'Compliance Officer', 'Executive'].map(
                          (role) => (
                            <label key={role} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={formData.escalation_to.includes(role)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      escalation_to: [...formData.escalation_to, role],
                                    })
                                  } else {
                                    setFormData({
                                      ...formData,
                                      escalation_to: formData.escalation_to.filter(
                                        (r) => r !== role
                                      ),
                                    })
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {role}
                              </span>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {campaign ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// Main Component
const AcknowledgmentCampaignsTab: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<CampaignType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    // In production, fetch campaigns from API
  }, [])

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    const matchesType = typeFilter === 'all' || campaign.type === typeFilter
    const matchesSearch =
      searchQuery === '' ||
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  // Stats
  const stats = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === 'active').length,
    scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
    totalPending: campaigns.reduce((acc, c) => acc + c.pending_count, 0),
    totalOverdue: campaigns.reduce((acc, c) => acc + c.overdue_count, 0),
  }

  const handleViewCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setShowDetailModal(true)
  }

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign)
    setShowFormModal(true)
  }

  const handleCreateCampaign = () => {
    setEditingCampaign(undefined)
    setShowFormModal(true)
  }

  const handleSaveCampaign = (data: Partial<Campaign>) => {
    if (editingCampaign) {
      setCampaigns(
        campaigns.map((c) =>
          c.id === editingCampaign.id ? { ...c, ...data, updated_at: new Date().toISOString() } : c
        )
      )
    } else {
      const newCampaign: Campaign = {
        id: `camp-${Date.now()}`,
        name: data.name || 'New Campaign',
        description: data.description || '',
        type: data.type || 'policy_acknowledgment',
        status: 'draft',
        targets: [{ id: 't-new', type: 'all', name: 'All Employees', user_count: 245 }],
        start_date: data.start_date || new Date().toISOString().split('T')[0],
        end_date:
          data.end_date ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reminder_frequency: data.reminder_frequency || 'weekly',
        reminder_enabled: data.reminder_enabled ?? true,
        escalation_enabled: data.escalation_enabled ?? true,
        escalation_after_days: data.escalation_after_days || 14,
        escalation_to: data.escalation_to || [],
        total_recipients: 245,
        acknowledged_count: 0,
        pending_count: 0,
        overdue_count: 0,
        acknowledgments: [],
        reminders_sent: [],
        created_by: 'Current User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setCampaigns([newCampaign, ...campaigns])
    }
    setShowFormModal(false)
    setEditingCampaign(undefined)
  }

  const handleActivateCampaign = (campaign: Campaign) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              status: 'active' as CampaignStatus,
              pending_count: c.total_recipients,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    )
  }

  const handleCancelCampaign = (campaign: Campaign) => {
    if (confirm('Are you sure you want to cancel this campaign?')) {
      setCampaigns(
        campaigns.map((c) =>
          c.id === campaign.id
            ? { ...c, status: 'cancelled' as CampaignStatus, updated_at: new Date().toISOString() }
            : c
        )
      )
    }
  }

  const handleSendReminder = (campaign: Campaign) => {
    const newReminder: CampaignReminder = {
      id: `r-${Date.now()}`,
      sent_at: new Date().toISOString(),
      recipient_count: campaign.pending_count + campaign.overdue_count,
      type: 'reminder',
    }
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaign.id
          ? {
              ...c,
              reminders_sent: [...c.reminders_sent, newReminder],
              updated_at: new Date().toISOString(),
            }
          : c
      )
    )
    alert(`Reminder sent to ${newReminder.recipient_count} recipients`)
  }

  const handleExportReport = () => {
    alert('Exporting campaign report...')
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Campaigns</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.scheduled}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.completed}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats.totalPending}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Acks</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.totalOverdue}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as CampaignStatus | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CampaignType | 'all')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="policy_acknowledgment">Policy Acknowledgment</option>
            <option value="training_completion">Training Completion</option>
            <option value="annual_review">Annual Review</option>
            <option value="compliance_certification">Compliance Certification</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <button
          onClick={handleCreateCampaign}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Campaign
        </button>
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onView={() => handleViewCampaign(campaign)}
              onEdit={() => handleEditCampaign(campaign)}
              onActivate={
                campaign.status === 'draft' || campaign.status === 'scheduled'
                  ? () => handleActivateCampaign(campaign)
                  : undefined
              }
              onCancel={
                campaign.status === 'active' || campaign.status === 'scheduled'
                  ? () => handleCancelCampaign(campaign)
                  : undefined
              }
              onSendReminder={
                campaign.status === 'active' ? () => handleSendReminder(campaign) : undefined
              }
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No campaigns found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'Try adjusting your filters to find campaigns'
              : 'Get started by creating your first acknowledgment campaign'}
          </p>
          <button
            onClick={handleCreateCampaign}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Campaign
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedCampaign && (
        <CampaignDetailModal
          campaign={selectedCampaign}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedCampaign(null)
          }}
          onSendReminder={() => handleSendReminder(selectedCampaign)}
          onExportReport={handleExportReport}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <CampaignFormModal
          campaign={editingCampaign}
          onClose={() => {
            setShowFormModal(false)
            setEditingCampaign(undefined)
          }}
          onSave={handleSaveCampaign}
        />
      )}
    </div>
  )
}

export default AcknowledgmentCampaignsTab
