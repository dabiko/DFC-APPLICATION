import React, { useState, useCallback } from 'react'
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportData,
  type ExportOptions,
  type ChartData,
} from '../../utils/reportExport'

// Types
type MFAStatus = 'enabled' | 'disabled' | 'pending' | 'expired'
type MFAMethod = 'totp' | 'sms' | 'email' | 'hardware_token' | 'push_notification'
type EnforcementLevel = 'required' | 'optional' | 'conditional'

interface MFAUser {
  id: string
  name: string
  email: string
  department: string
  role: string
  mfa_status: MFAStatus
  mfa_method?: MFAMethod
  mfa_enabled_at?: string
  last_mfa_verification?: string
  failed_attempts: number
  is_admin: boolean
  is_privileged: boolean
  risk_level: 'low' | 'medium' | 'high' | 'critical'
}

interface MFAPolicy {
  id: string
  name: string
  description: string
  enforcement_level: EnforcementLevel
  target_groups: string[]
  allowed_methods: MFAMethod[]
  grace_period_days: number
  reminder_frequency: 'daily' | 'weekly' | 'none'
  is_active: boolean
  created_at: string
}

interface MFAStats {
  total_users: number
  mfa_enabled: number
  mfa_disabled: number
  mfa_pending: number
  compliance_rate: number
  admin_compliance_rate: number
  privileged_compliance_rate: number
  methods_distribution: Array<{ method: MFAMethod; count: number }>
}

// Mock Data
const mockUsers: MFAUser[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    department: 'IT',
    role: 'System Administrator',
    mfa_status: 'enabled',
    mfa_method: 'totp',
    mfa_enabled_at: '2024-01-15T10:00:00Z',
    last_mfa_verification: '2024-10-15T08:30:00Z',
    failed_attempts: 0,
    is_admin: true,
    is_privileged: true,
    risk_level: 'low',
  },
  {
    id: '2',
    name: 'Jane Doe',
    email: 'jane.doe@company.com',
    department: 'Finance',
    role: 'Financial Analyst',
    mfa_status: 'enabled',
    mfa_method: 'push_notification',
    mfa_enabled_at: '2024-02-20T14:00:00Z',
    last_mfa_verification: '2024-10-14T09:15:00Z',
    failed_attempts: 1,
    is_admin: false,
    is_privileged: false,
    risk_level: 'low',
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob.wilson@company.com',
    department: 'HR',
    role: 'HR Manager',
    mfa_status: 'disabled',
    failed_attempts: 0,
    is_admin: false,
    is_privileged: true,
    risk_level: 'high',
  },
  {
    id: '4',
    name: 'Alice Brown',
    email: 'alice.brown@company.com',
    department: 'Legal',
    role: 'Legal Counsel',
    mfa_status: 'pending',
    failed_attempts: 0,
    is_admin: false,
    is_privileged: true,
    risk_level: 'medium',
  },
  {
    id: '5',
    name: 'Charlie Davis',
    email: 'charlie.davis@company.com',
    department: 'Engineering',
    role: 'Senior Developer',
    mfa_status: 'enabled',
    mfa_method: 'hardware_token',
    mfa_enabled_at: '2024-03-10T11:00:00Z',
    last_mfa_verification: '2024-10-15T07:45:00Z',
    failed_attempts: 0,
    is_admin: false,
    is_privileged: true,
    risk_level: 'low',
  },
  {
    id: '6',
    name: 'Diana Martinez',
    email: 'diana.martinez@company.com',
    department: 'IT',
    role: 'Database Administrator',
    mfa_status: 'enabled',
    mfa_method: 'totp',
    mfa_enabled_at: '2024-01-20T09:00:00Z',
    last_mfa_verification: '2024-10-13T16:20:00Z',
    failed_attempts: 2,
    is_admin: true,
    is_privileged: true,
    risk_level: 'medium',
  },
  {
    id: '7',
    name: 'Edward Lee',
    email: 'edward.lee@company.com',
    department: 'Marketing',
    role: 'Marketing Specialist',
    mfa_status: 'disabled',
    failed_attempts: 0,
    is_admin: false,
    is_privileged: false,
    risk_level: 'medium',
  },
  {
    id: '8',
    name: 'Fiona Garcia',
    email: 'fiona.garcia@company.com',
    department: 'Finance',
    role: 'CFO',
    mfa_status: 'enabled',
    mfa_method: 'hardware_token',
    mfa_enabled_at: '2024-01-05T08:00:00Z',
    last_mfa_verification: '2024-10-15T09:00:00Z',
    failed_attempts: 0,
    is_admin: true,
    is_privileged: true,
    risk_level: 'low',
  },
]

const mockPolicies: MFAPolicy[] = [
  {
    id: '1',
    name: 'Admin MFA Policy',
    description: 'Mandatory MFA for all administrative accounts',
    enforcement_level: 'required',
    target_groups: ['Administrators', 'Super Admins'],
    allowed_methods: ['totp', 'hardware_token'],
    grace_period_days: 0,
    reminder_frequency: 'daily',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2',
    name: 'Privileged User Policy',
    description: 'MFA required for users with privileged access',
    enforcement_level: 'required',
    target_groups: ['Privileged Users'],
    allowed_methods: ['totp', 'push_notification', 'hardware_token'],
    grace_period_days: 7,
    reminder_frequency: 'daily',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: '3',
    name: 'Standard User Policy',
    description: 'Optional MFA for standard users with conditional enforcement',
    enforcement_level: 'conditional',
    target_groups: ['All Users'],
    allowed_methods: ['totp', 'sms', 'email', 'push_notification'],
    grace_period_days: 30,
    reminder_frequency: 'weekly',
    is_active: true,
    created_at: '2024-02-01T00:00:00Z',
  },
]

// Helper Functions
const getStatusColor = (status: MFAStatus): string => {
  switch (status) {
    case 'enabled':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'disabled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'expired':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getRiskColor = (level: string): string => {
  switch (level) {
    case 'critical':
      return 'text-red-600 dark:text-red-400'
    case 'high':
      return 'text-orange-600 dark:text-orange-400'
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'low':
      return 'text-green-600 dark:text-green-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

const getMethodLabel = (method: MFAMethod): string => {
  switch (method) {
    case 'totp':
      return 'Authenticator App'
    case 'sms':
      return 'SMS'
    case 'email':
      return 'Email'
    case 'hardware_token':
      return 'Hardware Token'
    case 'push_notification':
      return 'Push Notification'
    default:
      return method
  }
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
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Stats Component
const ComplianceGauge: React.FC<{ percentage: number; label: string; sublabel?: string }> = ({
  percentage,
  label,
  sublabel,
}) => {
  const getColor = (pct: number) => {
    if (pct >= 90) return 'text-green-500'
    if (pct >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(percentage / 100) * 352} 352`}
            className={getColor(percentage)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${getColor(percentage)}`}>{percentage}%</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
    </div>
  )
}

// Method Distribution Chart
const MethodDistributionChart: React.FC<{ data: Array<{ method: MFAMethod; count: number }> }> = ({
  data,
}) => {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  const colors = {
    totp: 'bg-blue-500',
    sms: 'bg-green-500',
    email: 'bg-yellow-500',
    hardware_token: 'bg-purple-500',
    push_notification: 'bg-pink-500',
  }

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.method}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getMethodLabel(item.method)}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {item.count} ({Math.round((item.count / total) * 100)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors[item.method]} rounded-full`}
              style={{ width: `${(item.count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// User Table Component
const UserTable: React.FC<{
  users: MFAUser[]
  onEnableMFA: (userId: string) => void
  onSendReminder: (userId: string) => void
}> = ({ users, onEnableMFA, onSendReminder }) => {
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
                Department
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                MFA Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Method
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Last Verification
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Risk
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-medium text-blue-700 dark:text-blue-400">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {user.name}
                        {user.is_admin && (
                          <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                            Admin
                          </span>
                        )}
                        {user.is_privileged && !user.is_admin && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                            Privileged
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-900 dark:text-white">{user.department}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{user.role}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${getStatusColor(user.mfa_status)}`}
                  >
                    {user.mfa_status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user.mfa_method ? getMethodLabel(user.mfa_method) : '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {user.last_mfa_verification
                      ? formatDateTime(user.last_mfa_verification)
                      : 'Never'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-sm font-medium capitalize ${getRiskColor(user.risk_level)}`}
                  >
                    {user.risk_level}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1">
                    {user.mfa_status === 'disabled' && (
                      <button
                        onClick={() => onEnableMFA(user.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Enable MFA"
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
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </button>
                    )}
                    {(user.mfa_status === 'disabled' || user.mfa_status === 'pending') && (
                      <button
                        onClick={() => onSendReminder(user.id)}
                        className="p-1.5 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                        title="Send Reminder"
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
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="View Details"
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Policy Card Component
const PolicyCard: React.FC<{ policy: MFAPolicy }> = ({ policy }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{policy.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{policy.description}</p>
        </div>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            policy.is_active
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {policy.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Enforcement</span>
          <span className="font-medium text-gray-900 dark:text-white capitalize">
            {policy.enforcement_level}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Grace Period</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {policy.grace_period_days} days
          </span>
        </div>
        <div>
          <span className="text-sm text-gray-500 dark:text-gray-400">Allowed Methods</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {policy.allowed_methods.map((method) => (
              <span
                key={method}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {getMethodLabel(method)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Component
const MFAComplianceTab: React.FC = () => {
  const [users, setUsers] = useState<MFAUser[]>([])
  const [policies] = useState<MFAPolicy[]>([])
  const [filterStatus, setFilterStatus] = useState<MFAStatus | 'all'>('all')
  const [filterRisk, setFilterRisk] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredUsers = users.filter((user) => {
    const matchesStatus = filterStatus === 'all' || user.mfa_status === filterStatus
    const matchesRisk = filterRisk === 'all' || user.risk_level === filterRisk
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesRisk && matchesSearch
  })

  // Calculate stats
  const stats: MFAStats = {
    total_users: users.length,
    mfa_enabled: users.filter((u) => u.mfa_status === 'enabled').length,
    mfa_disabled: users.filter((u) => u.mfa_status === 'disabled').length,
    mfa_pending: users.filter((u) => u.mfa_status === 'pending').length,
    compliance_rate: Math.round(
      (users.filter((u) => u.mfa_status === 'enabled').length / users.length) * 100
    ),
    admin_compliance_rate: Math.round(
      (users.filter((u) => u.is_admin && u.mfa_status === 'enabled').length /
        users.filter((u) => u.is_admin).length) *
        100
    ),
    privileged_compliance_rate: Math.round(
      (users.filter((u) => u.is_privileged && u.mfa_status === 'enabled').length /
        users.filter((u) => u.is_privileged).length) *
        100
    ),
    methods_distribution: [
      { method: 'totp' as MFAMethod, count: users.filter((u) => u.mfa_method === 'totp').length },
      {
        method: 'push_notification' as MFAMethod,
        count: users.filter((u) => u.mfa_method === 'push_notification').length,
      },
      {
        method: 'hardware_token' as MFAMethod,
        count: users.filter((u) => u.mfa_method === 'hardware_token').length,
      },
      { method: 'sms' as MFAMethod, count: users.filter((u) => u.mfa_method === 'sms').length },
      { method: 'email' as MFAMethod, count: users.filter((u) => u.mfa_method === 'email').length },
    ].filter((d) => d.count > 0),
  }

  const handleEnableMFA = useCallback((userId: string) => {
    setUsers((prev) =>
      prev.map((user) =>
        user.id === userId ? { ...user, mfa_status: 'pending' as MFAStatus } : user
      )
    )
  }, [])

  const handleSendReminder = useCallback((userId: string) => {
    // In a real app, this would send an email reminder
    alert(`Reminder sent to user ${userId}`)
  }, [])

  const handleExport = useCallback(
    (format: 'pdf' | 'excel' | 'csv') => {
      const exportData: ExportData = {
        columns: [
          { field: 'name', label: 'User Name' },
          { field: 'email', label: 'Email' },
          { field: 'department', label: 'Department' },
          { field: 'role', label: 'Role' },
          { field: 'mfa_status', label: 'MFA Status' },
          { field: 'mfa_method', label: 'Method' },
          { field: 'risk_level', label: 'Risk Level' },
          { field: 'last_verification', label: 'Last Verification' },
        ],
        rows: users.map((u) => ({
          name: u.name,
          email: u.email,
          department: u.department,
          role: u.role,
          mfa_status: u.mfa_status,
          mfa_method: u.mfa_method ? getMethodLabel(u.mfa_method) : 'N/A',
          risk_level: u.risk_level,
          last_verification: u.last_mfa_verification
            ? formatDateTime(u.last_mfa_verification)
            : 'Never',
        })),
        title: 'MFA Compliance Report',
        generatedAt: new Date().toISOString(),
        summary: {
          'Total Users': stats.total_users,
          'MFA Enabled': stats.mfa_enabled,
          'MFA Disabled': stats.mfa_disabled,
          'Compliance Rate': `${stats.compliance_rate}%`,
          'Admin Compliance': `${stats.admin_compliance_rate}%`,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `MFA_Compliance_Report_${new Date().toISOString().split('T')[0]}`,
        title: 'MFA Compliance Report',
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      const chartData: ChartData[] = [
        {
          type: 'pie',
          title: 'MFA Status Distribution',
          data: [
            { label: 'Enabled', value: stats.mfa_enabled, color: '#22c55e' },
            { label: 'Disabled', value: stats.mfa_disabled, color: '#ef4444' },
            { label: 'Pending', value: stats.mfa_pending, color: '#f59e0b' },
          ],
        },
      ]

      switch (format) {
        case 'csv':
          exportToCSV(exportData, exportOptions)
          break
        case 'excel':
          exportToExcel(exportData, exportOptions)
          break
        case 'pdf':
          exportToPDF(exportData, exportOptions, chartData)
          break
      }
    },
    [users, stats]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">MFA Compliance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and enforce multi-factor authentication across your organization
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
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
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            Send Bulk Reminder
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            Compliance Overview
          </h3>
          <div className="flex items-center justify-around">
            <ComplianceGauge
              percentage={stats.compliance_rate}
              label="Overall"
              sublabel={`${stats.mfa_enabled}/${stats.total_users} users`}
            />
            <ComplianceGauge percentage={stats.admin_compliance_rate} label="Admins" />
            <ComplianceGauge percentage={stats.privileged_compliance_rate} label="Privileged" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
            MFA Methods Distribution
          </h3>
          <MethodDistributionChart data={stats.methods_distribution} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Users without MFA</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {stats.mfa_disabled}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Setup</span>
              <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {stats.mfa_pending}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                High Risk without MFA
              </span>
              <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {users.filter((u) => u.risk_level === 'high' && u.mfa_status !== 'enabled').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Policies</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {policies.filter((p) => p.is_active).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Policies Section */}
      <div>
        <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">MFA Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {policies.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} />
          ))}
        </div>
      </div>

      {/* Users Table Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-900 dark:text-white">User MFA Status</h3>
          <div className="flex items-center gap-3">
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
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as MFAStatus | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="pending">Pending</option>
            </select>
            <select
              value={filterRisk}
              onChange={(e) => setFilterRisk(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        <UserTable
          users={filteredUsers}
          onEnableMFA={handleEnableMFA}
          onSendReminder={handleSendReminder}
        />
      </div>
    </div>
  )
}

export default MFAComplianceTab
