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
type AnomalyType =
  | 'unusual_access_time'
  | 'unusual_location'
  | 'excessive_downloads'
  | 'privilege_escalation'
  | 'dormant_account_activity'
  | 'bulk_data_access'
  | 'failed_authentication'
  | 'unusual_permission_change'
type AlertStatus = 'new' | 'investigating' | 'resolved' | 'false_positive' | 'escalated'
type RiskLevel = 'critical' | 'high' | 'medium' | 'low'

interface AnomalyAlert {
  id: string
  type: AnomalyType
  title: string
  description: string
  user_id: string
  user_name: string
  user_email: string
  user_department: string
  risk_level: RiskLevel
  status: AlertStatus
  detected_at: string
  resolved_at?: string
  resolved_by?: string
  resolution_notes?: string
  details: {
    normal_pattern?: string
    detected_pattern?: string
    deviation_score?: number
    affected_resources?: string[]
    ip_address?: string
    location?: string
    device?: string
  }
  related_alerts?: string[]
}

interface AnomalyRule {
  id: string
  name: string
  description: string
  type: AnomalyType
  is_active: boolean
  threshold: number
  timeframe_hours: number
  alert_count_24h: number
  last_triggered?: string
}

interface AnomalyStats {
  total_alerts_24h: number
  critical_alerts: number
  high_alerts: number
  investigating: number
  resolved_today: number
  false_positive_rate: number
  avg_resolution_time_hours: number
  top_anomaly_type: AnomalyType
}

// Mock Data
const mockAlerts: AnomalyAlert[] = [
  {
    id: 'a1',
    type: 'unusual_access_time',
    title: 'After-Hours Access to Confidential Files',
    description:
      'User accessed confidential financial documents at 2:34 AM, outside normal working hours (9 AM - 6 PM)',
    user_id: 'u1',
    user_name: 'John Smith',
    user_email: 'john.smith@company.com',
    user_department: 'Finance',
    risk_level: 'high',
    status: 'investigating',
    detected_at: '2024-10-15T02:34:00Z',
    details: {
      normal_pattern: '9:00 AM - 6:00 PM weekdays',
      detected_pattern: '2:34 AM Sunday',
      deviation_score: 85,
      affected_resources: [
        '/Confidential/Finance/Q3-Report.xlsx',
        '/Confidential/Finance/Budget-2025.docx',
      ],
      ip_address: '192.168.1.45',
      location: 'Unknown VPN',
      device: 'Personal Laptop',
    },
  },
  {
    id: 'a2',
    type: 'excessive_downloads',
    title: 'Bulk Download of Customer Data',
    description:
      'User downloaded 2,347 customer records in 15 minutes, exceeding normal threshold of 100 records/hour',
    user_id: 'u2',
    user_name: 'Jane Doe',
    user_email: 'jane.doe@company.com',
    user_department: 'Sales',
    risk_level: 'critical',
    status: 'new',
    detected_at: '2024-10-15T10:15:00Z',
    details: {
      normal_pattern: '< 100 records/hour',
      detected_pattern: '2,347 records in 15 minutes',
      deviation_score: 98,
      affected_resources: ['Customer Database', 'CRM Export'],
      ip_address: '10.0.0.123',
      location: 'Office - Floor 3',
      device: 'Work Desktop',
    },
  },
  {
    id: 'a3',
    type: 'privilege_escalation',
    title: 'Unauthorized Admin Access Attempt',
    description:
      'User attempted to access admin console without proper authorization, multiple failed attempts detected',
    user_id: 'u3',
    user_name: 'Bob Wilson',
    user_email: 'bob.wilson@company.com',
    user_department: 'Marketing',
    risk_level: 'critical',
    status: 'escalated',
    detected_at: '2024-10-15T09:45:00Z',
    details: {
      normal_pattern: 'Standard user access',
      detected_pattern: '5 admin access attempts in 10 minutes',
      deviation_score: 95,
      affected_resources: ['Admin Console', 'User Management'],
      ip_address: '10.0.0.89',
      location: 'Office - Floor 2',
      device: 'Work Desktop',
    },
  },
  {
    id: 'a4',
    type: 'unusual_location',
    title: 'Login from Unusual Geographic Location',
    description: 'User logged in from a country not previously associated with their account',
    user_id: 'u4',
    user_name: 'Alice Brown',
    user_email: 'alice.brown@company.com',
    user_department: 'Engineering',
    risk_level: 'medium',
    status: 'resolved',
    detected_at: '2024-10-14T18:20:00Z',
    resolved_at: '2024-10-14T19:30:00Z',
    resolved_by: 'Security Team',
    resolution_notes: 'Confirmed legitimate access - user on business trip',
    details: {
      normal_pattern: 'USA (New York)',
      detected_pattern: 'Germany (Berlin)',
      deviation_score: 70,
      ip_address: '85.214.123.45',
      location: 'Berlin, Germany',
      device: 'Work Laptop',
    },
  },
  {
    id: 'a5',
    type: 'dormant_account_activity',
    title: 'Activity on Dormant Account',
    description: 'Account inactive for 90+ days suddenly accessed multiple sensitive resources',
    user_id: 'u5',
    user_name: 'Charlie Davis',
    user_email: 'charlie.davis@company.com',
    user_department: 'IT',
    risk_level: 'high',
    status: 'investigating',
    detected_at: '2024-10-15T07:30:00Z',
    details: {
      normal_pattern: 'No activity for 94 days',
      detected_pattern: 'Accessed 12 resources in 30 minutes',
      deviation_score: 88,
      affected_resources: ['Server Configs', 'Network Diagrams', 'Security Policies'],
      ip_address: '172.16.0.55',
      location: 'Remote Access',
      device: 'Unknown Device',
    },
  },
  {
    id: 'a6',
    type: 'failed_authentication',
    title: 'Multiple Failed Login Attempts',
    description: 'User account experienced 15 failed login attempts from multiple IP addresses',
    user_id: 'u6',
    user_name: 'Eva Martinez',
    user_email: 'eva.martinez@company.com',
    user_department: 'Legal',
    risk_level: 'high',
    status: 'new',
    detected_at: '2024-10-15T11:00:00Z',
    details: {
      normal_pattern: '< 3 failed attempts/day',
      detected_pattern: '15 failed attempts in 1 hour',
      deviation_score: 82,
      ip_address: 'Multiple IPs detected',
      location: 'Various locations',
    },
  },
]

const mockRules: AnomalyRule[] = [
  {
    id: 'r1',
    name: 'After-Hours Access Detection',
    description: 'Detects access to sensitive resources outside normal business hours',
    type: 'unusual_access_time',
    is_active: true,
    threshold: 2,
    timeframe_hours: 24,
    alert_count_24h: 3,
    last_triggered: '2024-10-15T02:34:00Z',
  },
  {
    id: 'r2',
    name: 'Bulk Data Download',
    description: 'Alerts when users download excessive amounts of data',
    type: 'excessive_downloads',
    is_active: true,
    threshold: 100,
    timeframe_hours: 1,
    alert_count_24h: 2,
    last_triggered: '2024-10-15T10:15:00Z',
  },
  {
    id: 'r3',
    name: 'Privilege Escalation Monitor',
    description: 'Monitors for unauthorized privilege escalation attempts',
    type: 'privilege_escalation',
    is_active: true,
    threshold: 3,
    timeframe_hours: 24,
    alert_count_24h: 1,
    last_triggered: '2024-10-15T09:45:00Z',
  },
  {
    id: 'r4',
    name: 'Geographic Anomaly Detection',
    description: 'Detects logins from unusual geographic locations',
    type: 'unusual_location',
    is_active: true,
    threshold: 1,
    timeframe_hours: 24,
    alert_count_24h: 1,
    last_triggered: '2024-10-14T18:20:00Z',
  },
  {
    id: 'r5',
    name: 'Dormant Account Activation',
    description: 'Alerts when inactive accounts show sudden activity',
    type: 'dormant_account_activity',
    is_active: true,
    threshold: 90,
    timeframe_hours: 24,
    alert_count_24h: 1,
    last_triggered: '2024-10-15T07:30:00Z',
  },
  {
    id: 'r6',
    name: 'Brute Force Detection',
    description: 'Detects multiple failed authentication attempts',
    type: 'failed_authentication',
    is_active: true,
    threshold: 5,
    timeframe_hours: 1,
    alert_count_24h: 2,
    last_triggered: '2024-10-15T11:00:00Z',
  },
]

// Helper Functions
const getRiskColor = (level: RiskLevel): string => {
  switch (level) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getStatusColor = (status: AlertStatus): string => {
  switch (status) {
    case 'new':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'investigating':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'resolved':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'false_positive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'escalated':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getTypeIcon = (type: AnomalyType): JSX.Element => {
  switch (type) {
    case 'unusual_access_time':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'unusual_location':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )
    case 'excessive_downloads':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )
    case 'privilege_escalation':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      )
    case 'dormant_account_activity':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )
    case 'failed_authentication':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      )
  }
}

const getTypeLabel = (type: AnomalyType): string => {
  switch (type) {
    case 'unusual_access_time':
      return 'Unusual Access Time'
    case 'unusual_location':
      return 'Unusual Location'
    case 'excessive_downloads':
      return 'Excessive Downloads'
    case 'privilege_escalation':
      return 'Privilege Escalation'
    case 'dormant_account_activity':
      return 'Dormant Account'
    case 'bulk_data_access':
      return 'Bulk Data Access'
    case 'failed_authentication':
      return 'Failed Auth'
    case 'unusual_permission_change':
      return 'Permission Change'
    default:
      return type
  }
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getRelativeTime = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

// Alert Card Component
const AlertCard: React.FC<{
  alert: AnomalyAlert
  onInvestigate: () => void
  onResolve: () => void
  onEscalate: () => void
}> = ({ alert, onInvestigate, onResolve, onEscalate }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div
            className={`p-2 rounded-lg ${
              alert.risk_level === 'critical'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : alert.risk_level === 'high'
                  ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                  : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {getTypeIcon(alert.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{alert.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRiskColor(alert.risk_level)}`}
                  >
                    {alert.risk_level}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(alert.status)}`}
                  >
                    {alert.status.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getRelativeTime(alert.detected_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{alert.description}</p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-medium text-blue-700 dark:text-blue-400">
                  {alert.user_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{alert.user_name}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {alert.user_department}
              </span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-4 mb-4">
              {alert.details.normal_pattern && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Normal Pattern</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {alert.details.normal_pattern}
                  </p>
                </div>
              )}
              {alert.details.detected_pattern && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Detected Pattern</p>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {alert.details.detected_pattern}
                  </p>
                </div>
              )}
              {alert.details.ip_address && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">IP Address</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                    {alert.details.ip_address}
                  </p>
                </div>
              )}
              {alert.details.location && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {alert.details.location}
                  </p>
                </div>
              )}
              {alert.details.device && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Device</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{alert.details.device}</p>
                </div>
              )}
              {alert.details.deviation_score && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Deviation Score</p>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {alert.details.deviation_score}%
                  </p>
                </div>
              )}
            </div>
            {alert.details.affected_resources && alert.details.affected_resources.length > 0 && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Affected Resources</p>
                <div className="flex flex-wrap gap-2">
                  {alert.details.affected_resources.map((resource, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {resource}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {alert.resolution_notes && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                  Resolution Notes
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {alert.resolution_notes}
                </p>
                {alert.resolved_by && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    Resolved by {alert.resolved_by} on {formatDateTime(alert.resolved_at!)}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {alert.status !== 'resolved' && alert.status !== 'false_positive' && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
          {alert.status === 'new' && (
            <button
              onClick={onInvestigate}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              Investigate
            </button>
          )}
          <button
            onClick={onResolve}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
          >
            Resolve
          </button>
          {alert.status !== 'escalated' && (
            <button
              onClick={onEscalate}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
            >
              Escalate
            </button>
          )}
          <button className="px-3 py-1.5 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Mark as False Positive
          </button>
        </div>
      )}
    </div>
  )
}

// Rule Card Component
const RuleCard: React.FC<{
  rule: AnomalyRule
  onToggle: () => void
}> = ({ rule, onToggle }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            {getTypeIcon(rule.type)}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{rule.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{getTypeLabel(rule.type)}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            rule.is_active ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              rule.is_active ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{rule.description}</p>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <span className="text-gray-500 dark:text-gray-400">
            Threshold:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">{rule.threshold}</span>
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            Timeframe:{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {rule.timeframe_hours}h
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full font-medium">
            {rule.alert_count_24h} alerts
          </span>
        </div>
      </div>
    </div>
  )
}

// Main Component
const AnomalyDetectionTab: React.FC = () => {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([])
  const [rules, setRules] = useState<AnomalyRule[]>([])
  const [activeView, setActiveView] = useState<'alerts' | 'rules'>('alerts')
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all')

  const filteredAlerts = alerts.filter((alert) => {
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter
    const matchesRisk = riskFilter === 'all' || alert.risk_level === riskFilter
    return matchesStatus && matchesRisk
  })

  const stats: AnomalyStats = {
    total_alerts_24h: alerts.length,
    critical_alerts: alerts.filter((a) => a.risk_level === 'critical').length,
    high_alerts: alerts.filter((a) => a.risk_level === 'high').length,
    investigating: alerts.filter((a) => a.status === 'investigating').length,
    resolved_today: alerts.filter((a) => a.status === 'resolved').length,
    false_positive_rate: 12,
    avg_resolution_time_hours: 2.5,
    top_anomaly_type: 'excessive_downloads',
  }

  const handleInvestigate = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'investigating' as AlertStatus } : a))
    )
  }, [])

  const handleResolve = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: 'resolved' as AlertStatus,
              resolved_at: new Date().toISOString(),
              resolved_by: 'Current User',
            }
          : a
      )
    )
  }, [])

  const handleEscalate = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: 'escalated' as AlertStatus } : a))
    )
  }, [])

  const handleToggleRule = useCallback((ruleId: string) => {
    setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, is_active: !r.is_active } : r)))
  }, [])

  const handleExport = useCallback(
    (format: 'pdf' | 'excel' | 'csv') => {
      const exportData: ExportData = {
        columns: [
          { field: 'title', label: 'Alert' },
          { field: 'type', label: 'Type' },
          { field: 'risk_level', label: 'Risk Level' },
          { field: 'status', label: 'Status' },
          { field: 'user_name', label: 'User' },
          { field: 'department', label: 'Department' },
          { field: 'detected_at', label: 'Detected At' },
        ],
        rows: alerts.map((a) => ({
          title: a.title,
          type: getTypeLabel(a.type),
          risk_level: a.risk_level,
          status: a.status.replace('_', ' '),
          user_name: a.user_name,
          department: a.user_department,
          detected_at: formatDateTime(a.detected_at),
        })),
        title: 'Anomaly Detection Report',
        generatedAt: new Date().toISOString(),
        summary: {
          'Total Alerts (24h)': stats.total_alerts_24h,
          'Critical Alerts': stats.critical_alerts,
          'High Alerts': stats.high_alerts,
          'Currently Investigating': stats.investigating,
          'Resolved Today': stats.resolved_today,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `Anomaly_Detection_Report_${new Date().toISOString().split('T')[0]}`,
        title: 'Anomaly Detection Report',
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      const chartData: ChartData[] = [
        {
          type: 'pie',
          title: 'Alerts by Risk Level',
          data: [
            { label: 'Critical', value: stats.critical_alerts, color: '#ef4444' },
            { label: 'High', value: stats.high_alerts, color: '#f97316' },
            {
              label: 'Medium',
              value: alerts.filter((a) => a.risk_level === 'medium').length,
              color: '#f59e0b',
            },
            {
              label: 'Low',
              value: alerts.filter((a) => a.risk_level === 'low').length,
              color: '#22c55e',
            },
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
    [alerts, stats]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anomaly Detection</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Monitor and respond to unusual access patterns and security anomalies
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
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Alerts (24h)</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total_alerts_24h}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {stats.critical_alerts}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">High</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {stats.high_alerts}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Investigating</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {stats.investigating}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Resolved Today</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
            {stats.resolved_today}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg Resolution</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats.avg_resolution_time_hours}h
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveView('alerts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'alerts'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Active Alerts
          <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            {alerts.filter((a) => a.status !== 'resolved' && a.status !== 'false_positive').length}
          </span>
        </button>
        <button
          onClick={() => setActiveView('rules')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeView === 'rules'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Detection Rules
        </button>
      </div>

      {/* Content */}
      {activeView === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
              <option value="false_positive">False Positive</option>
            </select>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </span>
          </div>
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onInvestigate={() => handleInvestigate(alert.id)}
                onResolve={() => handleResolve(alert.id)}
                onEscalate={() => handleEscalate(alert.id)}
              />
            ))}
          </div>
          {filteredAlerts.length === 0 && (
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No alerts found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                No anomalies matching your filters were detected.
              </p>
            </div>
          )}
        </div>
      )}

      {activeView === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onToggle={() => handleToggleRule(rule.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

export default AnomalyDetectionTab
