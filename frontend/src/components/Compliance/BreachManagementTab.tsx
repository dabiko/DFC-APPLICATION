/**
 * BreachManagementTab Component
 *
 * Data Breach Incident Management with:
 * - Breach incident tracking
 * - Severity classification
 * - Notification timeline management
 * - Investigation workflow
 * - Remediation tracking
 * - Regulatory reporting
 */

import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  AlertTriangle,
  AlertCircle,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  FileText,
  Eye,
  Edit2,
  User,
  Users,
  Calendar,
  X,
  Loader2,
  Bell,
  Send,
  Download,
  ExternalLink,
  Building,
  MapPin,
  Activity,
  Target,
  Zap,
  Lock,
  Unlock,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type BreachSeverity = 'low' | 'medium' | 'high' | 'critical'

type BreachStatus =
  | 'detected'
  | 'investigating'
  | 'contained'
  | 'eradicated'
  | 'recovering'
  | 'lessons_learned'
  | 'closed'

type BreachCategory =
  | 'unauthorized_access'
  | 'data_theft'
  | 'malware'
  | 'phishing'
  | 'insider_threat'
  | 'physical_breach'
  | 'accidental_disclosure'
  | 'ransomware'
  | 'system_vulnerability'
  | 'third_party'

interface AffectedData {
  category: string
  count: number
  sensitivity: 'low' | 'medium' | 'high' | 'critical'
}

interface NotificationRecord {
  id: string
  recipient_type: 'authority' | 'affected_individuals' | 'management' | 'legal' | 'media'
  recipient_name: string
  sent_at?: string
  due_by: string
  status: 'pending' | 'sent' | 'acknowledged' | 'overdue'
  notes?: string
}

interface BreachIncident {
  id: string
  reference_number: string
  title: string
  description: string
  category: BreachCategory
  severity: BreachSeverity
  status: BreachStatus
  detected_at: string
  reported_by: string
  occurred_at?: string
  contained_at?: string
  resolved_at?: string
  affected_systems: string[]
  affected_data: AffectedData[]
  affected_individuals_count: number
  root_cause?: string
  remediation_actions: string[]
  lessons_learned?: string
  assigned_to: string
  investigation_team: string[]
  notifications: NotificationRecord[]
  documents: string[]
  timeline: BreachTimelineEntry[]
}

interface BreachTimelineEntry {
  id: string
  action: string
  description: string
  performed_by: string
  timestamp: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_BREACHES: BreachIncident[] = [
  {
    id: '1',
    reference_number: 'BRH-2024-001',
    title: 'Unauthorized Access to Customer Database',
    description:
      'Suspicious access patterns detected in customer database. Initial investigation suggests potential unauthorized access via compromised credentials.',
    category: 'unauthorized_access',
    severity: 'high',
    status: 'investigating',
    detected_at: '2024-11-25T14:30:00Z',
    reported_by: 'Security Operations Center',
    occurred_at: '2024-11-24T22:00:00Z',
    affected_systems: ['Customer Database', 'CRM System', 'API Gateway'],
    affected_data: [
      { category: 'Names', count: 15000, sensitivity: 'medium' },
      { category: 'Email Addresses', count: 15000, sensitivity: 'medium' },
      { category: 'Phone Numbers', count: 8500, sensitivity: 'medium' },
    ],
    affected_individuals_count: 15000,
    remediation_actions: [
      'Credential reset initiated',
      'Additional monitoring deployed',
      'Forensic analysis in progress',
    ],
    assigned_to: 'Sarah Johnson',
    investigation_team: ['Sarah Johnson', 'Mike Chen', 'David Wilson'],
    notifications: [
      {
        id: '1',
        recipient_type: 'authority',
        recipient_name: 'Data Protection Authority',
        due_by: '2024-11-28T14:30:00Z',
        status: 'pending',
        notes: '72-hour notification deadline',
      },
      {
        id: '2',
        recipient_type: 'management',
        recipient_name: 'Executive Team',
        sent_at: '2024-11-25T15:00:00Z',
        due_by: '2024-11-25T16:00:00Z',
        status: 'sent',
      },
    ],
    documents: ['Initial Incident Report', 'Forensic Analysis Draft'],
    timeline: [
      {
        id: '1',
        action: 'Incident Detected',
        description: 'Anomalous access patterns identified by SIEM',
        performed_by: 'Security Operations Center',
        timestamp: '2024-11-25T14:30:00Z',
      },
      {
        id: '2',
        action: 'Initial Assessment',
        description: 'Confirmed unauthorized access, severity elevated to HIGH',
        performed_by: 'Sarah Johnson',
        timestamp: '2024-11-25T15:00:00Z',
      },
      {
        id: '3',
        action: 'Investigation Started',
        description: 'Forensic team engaged, evidence preservation initiated',
        performed_by: 'Mike Chen',
        timestamp: '2024-11-25T16:00:00Z',
      },
    ],
  },
  {
    id: '2',
    reference_number: 'BRH-2024-002',
    title: 'Phishing Attack on Finance Department',
    description:
      'Multiple employees in finance department received sophisticated phishing emails. Two employees clicked on malicious links before detection.',
    category: 'phishing',
    severity: 'medium',
    status: 'contained',
    detected_at: '2024-11-20T09:15:00Z',
    reported_by: 'IT Help Desk',
    occurred_at: '2024-11-20T08:30:00Z',
    contained_at: '2024-11-20T11:00:00Z',
    affected_systems: ['Email System', 'Finance Workstations'],
    affected_data: [{ category: 'Credentials', count: 2, sensitivity: 'high' }],
    affected_individuals_count: 2,
    root_cause: 'Sophisticated spear phishing attack targeting finance personnel',
    remediation_actions: [
      'Compromised credentials reset',
      'Malware scan completed',
      'Security awareness reminder sent',
      'Phishing indicators blocked',
    ],
    assigned_to: 'Mike Chen',
    investigation_team: ['Mike Chen'],
    notifications: [
      {
        id: '3',
        recipient_type: 'management',
        recipient_name: 'IT Director',
        sent_at: '2024-11-20T10:00:00Z',
        due_by: '2024-11-20T12:00:00Z',
        status: 'acknowledged',
      },
    ],
    documents: ['Phishing Email Analysis', 'Remediation Report'],
    timeline: [
      {
        id: '1',
        action: 'Incident Reported',
        description: 'Employee reported suspicious email',
        performed_by: 'IT Help Desk',
        timestamp: '2024-11-20T09:15:00Z',
      },
      {
        id: '2',
        action: 'Investigation',
        description: 'Identified 2 affected users',
        performed_by: 'Mike Chen',
        timestamp: '2024-11-20T09:45:00Z',
      },
      {
        id: '3',
        action: 'Containment',
        description: 'Credentials reset, workstations isolated',
        performed_by: 'Mike Chen',
        timestamp: '2024-11-20T11:00:00Z',
      },
    ],
  },
  {
    id: '3',
    reference_number: 'BRH-2024-003',
    title: 'Accidental Data Disclosure via Email',
    description:
      'Employee accidentally sent spreadsheet containing customer data to incorrect external recipient. Data included names, addresses, and account numbers.',
    category: 'accidental_disclosure',
    severity: 'medium',
    status: 'closed',
    detected_at: '2024-11-10T16:00:00Z',
    reported_by: 'Employee (Self-Report)',
    occurred_at: '2024-11-10T15:30:00Z',
    contained_at: '2024-11-10T16:30:00Z',
    resolved_at: '2024-11-15T12:00:00Z',
    affected_systems: ['Email System'],
    affected_data: [
      { category: 'Names', count: 250, sensitivity: 'medium' },
      { category: 'Addresses', count: 250, sensitivity: 'medium' },
      { category: 'Account Numbers', count: 250, sensitivity: 'high' },
    ],
    affected_individuals_count: 250,
    root_cause: 'Autofill suggested wrong recipient',
    remediation_actions: [
      'Recipient confirmed data deletion',
      'DLP rules updated',
      'Employee training scheduled',
      'Affected individuals notified',
    ],
    lessons_learned:
      'Implement mandatory confirmation for external emails containing sensitive data. Update autofill policies.',
    assigned_to: 'David Wilson',
    investigation_team: ['David Wilson'],
    notifications: [
      {
        id: '4',
        recipient_type: 'affected_individuals',
        recipient_name: 'Affected Customers',
        sent_at: '2024-11-12T10:00:00Z',
        due_by: '2024-11-13T16:00:00Z',
        status: 'sent',
      },
    ],
    documents: ['Incident Report', 'Notification Letter', 'Lessons Learned'],
    timeline: [
      {
        id: '1',
        action: 'Self-Reported',
        description: 'Employee immediately reported the error',
        performed_by: 'Employee',
        timestamp: '2024-11-10T16:00:00Z',
      },
      {
        id: '2',
        action: 'Recipient Contacted',
        description: 'External recipient confirmed deletion of data',
        performed_by: 'David Wilson',
        timestamp: '2024-11-10T16:30:00Z',
      },
      {
        id: '3',
        action: 'Notification Sent',
        description: 'Affected individuals notified via email',
        performed_by: 'David Wilson',
        timestamp: '2024-11-12T10:00:00Z',
      },
      {
        id: '4',
        action: 'Incident Closed',
        description: 'All remediation complete, lessons learned documented',
        performed_by: 'David Wilson',
        timestamp: '2024-11-15T12:00:00Z',
      },
    ],
  },
  {
    id: '4',
    reference_number: 'BRH-2024-004',
    title: 'Ransomware Attempt Blocked',
    description:
      'Ransomware attack attempted via malicious attachment. Attack was blocked by endpoint protection but investigation ongoing to ensure no lateral movement.',
    category: 'ransomware',
    severity: 'critical',
    status: 'eradicated',
    detected_at: '2024-11-22T03:45:00Z',
    reported_by: 'Endpoint Detection System',
    occurred_at: '2024-11-22T03:40:00Z',
    contained_at: '2024-11-22T04:00:00Z',
    affected_systems: ['Endpoint - WS-FIN-042'],
    affected_data: [],
    affected_individuals_count: 0,
    root_cause: 'Malicious email attachment bypassed email filter',
    remediation_actions: [
      'Endpoint isolated and reimaged',
      'Network-wide scan completed',
      'Email filter rules updated',
      'All endpoints patched',
    ],
    assigned_to: 'Sarah Johnson',
    investigation_team: ['Sarah Johnson', 'Mike Chen'],
    notifications: [
      {
        id: '5',
        recipient_type: 'management',
        recipient_name: 'CISO',
        sent_at: '2024-11-22T04:30:00Z',
        due_by: '2024-11-22T06:00:00Z',
        status: 'acknowledged',
      },
    ],
    documents: ['Malware Analysis Report', 'Network Scan Results'],
    timeline: [],
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getCategoryLabel = (category: BreachCategory): string => {
  const labels: Record<BreachCategory, string> = {
    unauthorized_access: 'Unauthorized Access',
    data_theft: 'Data Theft',
    malware: 'Malware',
    phishing: 'Phishing',
    insider_threat: 'Insider Threat',
    physical_breach: 'Physical Breach',
    accidental_disclosure: 'Accidental Disclosure',
    ransomware: 'Ransomware',
    system_vulnerability: 'System Vulnerability',
    third_party: 'Third Party Breach',
  }
  return labels[category]
}

const getSeverityColor = (severity: BreachSeverity): string => {
  const colors: Record<BreachSeverity, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[severity]
}

const getStatusColor = (status: BreachStatus): string => {
  const colors: Record<BreachStatus, string> = {
    detected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    investigating: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    contained: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    eradicated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    recovering: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    lessons_learned: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
    closed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[status]
}

const getStatusLabel = (status: BreachStatus): string => {
  const labels: Record<BreachStatus, string> = {
    detected: 'Detected',
    investigating: 'Investigating',
    contained: 'Contained',
    eradicated: 'Eradicated',
    recovering: 'Recovering',
    lessons_learned: 'Lessons Learned',
    closed: 'Closed',
  }
  return labels[status]
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

const getNotificationStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    acknowledged: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return colors[status] || colors.pending
}

const isNotificationOverdue = (notification: NotificationRecord): boolean => {
  if (notification.status === 'sent' || notification.status === 'acknowledged') return false
  return new Date(notification.due_by) < new Date()
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface BreachCardProps {
  breach: BreachIncident
  onClick: () => void
}

function BreachCard({ breach, onClick }: BreachCardProps) {
  const hasOverdueNotifications = breach.notifications.some(
    (n) => n.status === 'pending' && isNotificationOverdue(n)
  )

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md',
        breach.severity === 'critical'
          ? 'border-red-300 dark:border-red-700'
          : hasOverdueNotifications
            ? 'border-yellow-300 dark:border-yellow-700'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              {breach.reference_number}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                getSeverityColor(breach.severity)
              )}
            >
              {breach.severity}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{breach.title}</h3>
        </div>
        <span
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full',
            getStatusColor(breach.status)
          )}
        >
          {getStatusLabel(breach.status)}
        </span>
      </div>

      {/* Category */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {getCategoryLabel(breach.category)}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {breach.affected_systems.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Systems</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {breach.affected_individuals_count.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Individuals</p>
        </div>
        <div className="text-center p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {breach.notifications.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Notifications</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Detected: {formatDateTime(breach.detected_at)}</span>
        </div>
        {hasOverdueNotifications && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue notifications</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface BreachDetailModalProps {
  breach: BreachIncident
  onClose: () => void
  onUpdateStatus: (status: BreachStatus) => void
}

function BreachDetailModal({ breach, onClose, onUpdateStatus }: BreachDetailModalProps) {
  const [activeSection, setActiveSection] = useState<'overview' | 'notifications' | 'timeline'>(
    'overview'
  )

  const statusFlow: BreachStatus[] = [
    'detected',
    'investigating',
    'contained',
    'eradicated',
    'recovering',
    'lessons_learned',
    'closed',
  ]
  const currentStatusIndex = statusFlow.indexOf(breach.status)
  const nextStatus =
    currentStatusIndex < statusFlow.length - 1 ? statusFlow[currentStatusIndex + 1] : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                {breach.reference_number}
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                  getSeverityColor(breach.severity)
                )}
              >
                {breach.severity}
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-full',
                  getStatusColor(breach.status)
                )}
              >
                {getStatusLabel(breach.status)}
              </span>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{breach.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            {(['overview', 'notifications', 'timeline'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize',
                  activeSection === section
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {section}
                {section === 'notifications' &&
                  breach.notifications.some((n) => n.status === 'pending') && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                      {breach.notifications.filter((n) => n.status === 'pending').length}
                    </span>
                  )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Description */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                  <p className="text-gray-600 dark:text-gray-300">{breach.description}</p>
                </div>

                {/* Key Dates */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Key Dates</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Detected</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatDateTime(breach.detected_at)}
                      </span>
                    </div>
                    {breach.occurred_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Occurred</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatDateTime(breach.occurred_at)}
                        </span>
                      </div>
                    )}
                    {breach.contained_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Contained</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatDateTime(breach.contained_at)}
                        </span>
                      </div>
                    )}
                    {breach.resolved_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Resolved</span>
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatDateTime(breach.resolved_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Affected Systems */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Affected Systems
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {breach.affected_systems.map((system) => (
                      <span
                        key={system}
                        className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg"
                      >
                        {system}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Affected Data */}
                {breach.affected_data.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Affected Data
                    </h3>
                    <div className="space-y-2">
                      {breach.affected_data.map((data, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {data.category}
                            </span>
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded capitalize',
                                getSeverityColor(data.sensitivity)
                              )}
                            >
                              {data.sensitivity}
                            </span>
                          </div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {data.count.toLocaleString()} records
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Root Cause */}
                {breach.root_cause && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-5">
                    <h3 className="font-semibold text-orange-800 dark:text-orange-200 mb-2">
                      Root Cause
                    </h3>
                    <p className="text-orange-700 dark:text-orange-300">{breach.root_cause}</p>
                  </div>
                )}

                {/* Lessons Learned */}
                {breach.lessons_learned && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                      Lessons Learned
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300">{breach.lessons_learned}</p>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Investigation Team */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Investigation Team
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {breach.assigned_to}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Lead Investigator
                        </p>
                      </div>
                    </div>
                    {breach.investigation_team
                      .filter((m) => m !== breach.assigned_to)
                      .map((member) => (
                        <div key={member} className="flex items-center gap-3 p-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-500" />
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {member}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Remediation Actions */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                    Remediation Actions
                  </h3>
                  <div className="space-y-2">
                    {breach.remediation_actions.map((action, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Documents */}
                {breach.documents.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Documents</h3>
                    <div className="space-y-2">
                      {breach.documents.map((doc, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc}
                            </span>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Actions */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Actions</h3>
                  <div className="space-y-2">
                    {nextStatus && (
                      <button
                        onClick={() => onUpdateStatus(nextStatus)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                        Move to {getStatusLabel(nextStatus)}
                      </button>
                    )}
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Download className="w-4 h-4" />
                      Export Report
                    </button>
                    <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <Edit2 className="w-4 h-4" />
                      Edit Incident
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notification Records
                </h3>
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" />
                  Add Notification
                </button>
              </div>
              {breach.notifications.length > 0 ? (
                <div className="space-y-3">
                  {breach.notifications.map((notification) => {
                    const overdue = isNotificationOverdue(notification)
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'bg-white dark:bg-gray-800 rounded-xl border p-4',
                          overdue
                            ? 'border-red-300 dark:border-red-700'
                            : 'border-gray-200 dark:border-gray-700'
                        )}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {notification.recipient_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {notification.recipient_type.replace('_', ' ')}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'px-2.5 py-1 text-xs font-medium rounded-full capitalize',
                              overdue
                                ? getNotificationStatusColor('overdue')
                                : getNotificationStatusColor(notification.status)
                            )}
                          >
                            {overdue ? 'Overdue' : notification.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Due: {formatDateTime(notification.due_by)}</span>
                          </div>
                          {notification.sent_at && (
                            <div className="flex items-center gap-1">
                              <Send className="w-3.5 h-3.5" />
                              <span>Sent: {formatDateTime(notification.sent_at)}</span>
                            </div>
                          )}
                        </div>
                        {notification.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {notification.notes}
                          </p>
                        )}
                        {notification.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                              <Send className="w-3.5 h-3.5" />
                              Send Now
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No notifications recorded yet</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'timeline' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Incident Timeline</h3>
              {breach.timeline.length > 0 ? (
                <div className="space-y-4">
                  {breach.timeline.map((entry, index) => (
                    <div key={entry.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        {index < breach.timeline.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-300 dark:bg-gray-600 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {entry.action}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {entry.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <User className="w-3.5 h-3.5" />
                            <span>{entry.performed_by}</span>
                            <span>•</span>
                            <span>{formatDateTime(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No timeline entries yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface BreachFormModalProps {
  onClose: () => void
  onSubmit: (data: Partial<BreachIncident>) => void
}

function BreachFormModal({ onClose, onSubmit }: BreachFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'unauthorized_access' as BreachCategory,
    severity: 'medium' as BreachSeverity,
    reported_by: '',
    affected_systems: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      affected_systems: formData.affected_systems
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Report New Breach Incident
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
              Incident Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief title describing the incident"
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
                  setFormData({ ...formData, category: e.target.value as BreachCategory })
                }
                className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="unauthorized_access">Unauthorized Access</option>
                <option value="data_theft">Data Theft</option>
                <option value="malware">Malware</option>
                <option value="phishing">Phishing</option>
                <option value="insider_threat">Insider Threat</option>
                <option value="physical_breach">Physical Breach</option>
                <option value="accidental_disclosure">Accidental Disclosure</option>
                <option value="ransomware">Ransomware</option>
                <option value="system_vulnerability">System Vulnerability</option>
                <option value="third_party">Third Party Breach</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity *
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as BreachSeverity })
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
              placeholder="Detailed description of the incident..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reported By *
            </label>
            <input
              type="text"
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Name or system that detected/reported the incident"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Affected Systems
            </label>
            <input
              type="text"
              value={formData.affected_systems}
              onChange={(e) => setFormData({ ...formData, affected_systems: e.target.value })}
              className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Comma-separated list of affected systems"
            />
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
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Report Incident
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

export function BreachManagementTab() {
  const [breaches, setBreaches] = useState<BreachIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BreachStatus | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<BreachSeverity | 'all'>('all')
  const [selectedBreach, setSelectedBreach] = useState<BreachIncident | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)

  useEffect(() => {
    setIsLoading(false)
  }, [])

  const filteredBreaches = breaches.filter((breach) => {
    const matchesSearch =
      searchQuery === '' ||
      breach.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      breach.reference_number.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || breach.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || breach.severity === severityFilter
    return matchesSearch && matchesStatus && matchesSeverity
  })

  const handleCreateBreach = (data: Partial<BreachIncident>) => {
    const newBreach: BreachIncident = {
      id: String(breaches.length + 1),
      reference_number: `BRH-2024-${String(breaches.length + 1).padStart(3, '0')}`,
      title: data.title || '',
      description: data.description || '',
      category: data.category || 'unauthorized_access',
      severity: data.severity || 'medium',
      status: 'detected',
      detected_at: new Date().toISOString(),
      reported_by: data.reported_by || '',
      affected_systems: data.affected_systems || [],
      affected_data: [],
      affected_individuals_count: 0,
      remediation_actions: [],
      assigned_to: 'Current User',
      investigation_team: ['Current User'],
      notifications: [],
      documents: [],
      timeline: [
        {
          id: '1',
          action: 'Incident Reported',
          description: 'Breach incident created in system',
          performed_by: 'Current User',
          timestamp: new Date().toISOString(),
        },
      ],
    }
    setBreaches([newBreach, ...breaches])
    setShowFormModal(false)
  }

  const handleUpdateStatus = (status: BreachStatus) => {
    if (!selectedBreach) return
    setBreaches(
      breaches.map((b) =>
        b.id === selectedBreach.id
          ? {
              ...b,
              status,
              contained_at: status === 'contained' ? new Date().toISOString() : b.contained_at,
              resolved_at: status === 'closed' ? new Date().toISOString() : b.resolved_at,
              timeline: [
                ...b.timeline,
                {
                  id: String(b.timeline.length + 1),
                  action: `Status Changed to ${getStatusLabel(status)}`,
                  description: `Incident status updated`,
                  performed_by: 'Current User',
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : b
      )
    )
    setSelectedBreach(null)
  }

  // Stats
  const stats = {
    total: breaches.length,
    active: breaches.filter((b) => !['closed', 'lessons_learned'].includes(b.status)).length,
    critical: breaches.filter((b) => b.severity === 'critical' && b.status !== 'closed').length,
    pendingNotifications: breaches.reduce(
      (count, b) => count + b.notifications.filter((n) => n.status === 'pending').length,
      0
    ),
    closed: breaches.filter((b) => b.status === 'closed').length,
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
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Incidents</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
          <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pending Notifications</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pendingNotifications}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Closed</p>
          <p className="text-2xl font-bold text-green-600">{stats.closed}</p>
        </div>
      </div>

      {/* Critical Alert */}
      {stats.critical > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {stats.critical} critical incident{stats.critical !== 1 ? 's require' : ' requires'}{' '}
                immediate attention
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                Review and escalate as necessary per incident response procedures
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BreachStatus | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="detected">Detected</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="eradicated">Eradicated</option>
            <option value="recovering">Recovering</option>
            <option value="lessons_learned">Lessons Learned</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as BreachSeverity | 'all')}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Severity</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <button
            onClick={() => setShowFormModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Incident
          </button>
        </div>
      </div>

      {/* Breach Cards */}
      {filteredBreaches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBreaches.map((breach) => (
            <BreachCard key={breach.id} breach={breach} onClick={() => setSelectedBreach(breach)} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No breach incidents found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all' || severityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'No incidents have been reported'}
          </p>
          <button
            onClick={() => setShowFormModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Report Incident
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedBreach && (
        <BreachDetailModal
          breach={selectedBreach}
          onClose={() => setSelectedBreach(null)}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Form Modal */}
      {showFormModal && (
        <BreachFormModal onClose={() => setShowFormModal(false)} onSubmit={handleCreateBreach} />
      )}
    </div>
  )
}

export default BreachManagementTab
