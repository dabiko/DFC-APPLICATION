/**
 * HoldNotificationCenter Component
 * Manages notifications for legal holds including templates, history,
 * and bulk notification operations
 */

import { useState, useCallback, useMemo } from 'react'
import {
  Bell,
  Mail,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  FileText,
  Users,
  Calendar,
  RefreshCw,
  Eye,
  Copy,
  Edit,
  Trash2,
  Plus,
  Filter,
  Download,
  ChevronRight,
  MailOpen,
} from 'lucide-react'
import type { LegalHold, HoldNotification } from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface NotificationTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: 'initial' | 'reminder' | 'release' | 'acknowledgment_request' | 'custom'
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationHistoryEntry {
  id: string
  holdId: string
  holdName: string
  templateId?: string
  templateName?: string
  recipientIds: string[]
  recipientCount: number
  subject: string
  sentAt: string
  sentBy: string
  status: 'sent' | 'delivered' | 'failed' | 'partial'
  deliveredCount: number
  failedCount: number
  openedCount?: number
  acknowledgedCount?: number
}

export interface HoldNotificationCenterProps {
  hold: LegalHold
  notifications: HoldNotification[]
  history: NotificationHistoryEntry[]
  templates: NotificationTemplate[]
  onSendNotification: (
    templateId: string,
    recipientIds: string[],
    customMessage?: string
  ) => Promise<void>
  onCreateTemplate: (
    template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>
  onEditTemplate: (templateId: string, template: Partial<NotificationTemplate>) => Promise<void>
  onDeleteTemplate: (templateId: string) => Promise<void>
  onResendNotification: (historyId: string) => Promise<void>
  onExportHistory: () => void
  loading?: boolean
  canManageTemplates?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationTemplate['type'],
  { label: string; description: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  initial: {
    label: 'Initial Notice',
    description: 'First notification about the legal hold',
    icon: Mail,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  reminder: {
    label: 'Reminder',
    description: 'Reminder to preserve documents',
    icon: Bell,
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  },
  release: {
    label: 'Release Notice',
    description: 'Notification that hold has been released',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  acknowledgment_request: {
    label: 'Acknowledgment Request',
    description: 'Request to acknowledge the hold',
    icon: FileText,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  custom: {
    label: 'Custom',
    description: 'Custom notification',
    icon: Edit,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
}

const DEFAULT_TEMPLATES: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Initial Legal Hold Notice',
    subject: 'Legal Hold Notice - {{case_name}} ({{case_number}})',
    body: `Dear {{recipient_name}},

You are receiving this notice because you have been identified as a custodian in connection with the legal matter referenced above.

LEGAL HOLD DETAILS:
- Case Name: {{case_name}}
- Case Number: {{case_number}}
- Effective Date: {{effective_date}}
- Reason: {{reason}}

PRESERVATION REQUIREMENTS:
You must immediately preserve all documents, records, and electronically stored information (ESI) that may be relevant to this matter. This includes, but is not limited to:
- Emails and attachments
- Documents and spreadsheets
- Calendar entries
- Instant messages and text messages
- Voicemails
- Any other electronic or physical records

DO NOT delete, destroy, modify, or alter any potentially relevant information.

ACKNOWLEDGMENT REQUIRED:
Please acknowledge receipt of this notice by clicking the link below within 5 business days.

If you have any questions, please contact the Legal Department.

Thank you for your cooperation.`,
    type: 'initial',
    isDefault: true,
  },
  {
    name: 'Reminder Notice',
    subject: 'REMINDER: Legal Hold - {{case_name}} ({{case_number}})',
    body: `Dear {{recipient_name}},

This is a reminder that you are subject to a legal hold in connection with the matter referenced above.

Please ensure that you continue to preserve all potentially relevant documents and ESI.

If you have not already done so, please acknowledge receipt of the original legal hold notice.

If you have any questions, please contact the Legal Department.`,
    type: 'reminder',
    isDefault: true,
  },
  {
    name: 'Release Notice',
    subject: 'Legal Hold RELEASED - {{case_name}} ({{case_number}})',
    body: `Dear {{recipient_name}},

This notice is to inform you that the legal hold referenced above has been released as of {{release_date}}.

You are no longer required to preserve documents specifically for this matter. However, please continue to follow standard document retention policies.

If you have any questions, please contact the Legal Department.

Thank you for your cooperation during this legal hold period.`,
    type: 'release',
    isDefault: true,
  },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function HoldNotificationCenter({
  hold,
  notifications,
  history,
  templates,
  onSendNotification,
  onCreateTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onResendNotification,
  onExportHistory,
  loading = false,
  canManageTemplates = true,
}: HoldNotificationCenterProps) {
  // State
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates'>('send')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [customMessage, setCustomMessage] = useState('')
  const [showTemplateEditor, setShowTemplateEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null)

  // Filter history
  const [historyFilter, setHistoryFilter] = useState<'all' | 'sent' | 'failed'>('all')

  // Mock recipients (would come from custodians in real implementation)
  const recipients = useMemo(() => {
    const custodianIds = hold.custodians || []
    return custodianIds.map((id, index) => ({
      id,
      name: `Custodian ${index + 1}`,
      email: `custodian${index + 1}@example.com`,
      acknowledged: notifications.some((n) => n.recipientId === id && n.acknowledgedAt),
    }))
  }, [hold.custodians, notifications])

  // Filter history entries
  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history
    if (historyFilter === 'sent')
      return history.filter((h) => h.status === 'sent' || h.status === 'delivered')
    return history.filter((h) => h.status === 'failed' || h.status === 'partial')
  }, [history, historyFilter])

  // Stats
  const stats = useMemo(() => {
    const totalNotifications = history.length
    const totalSent = history.reduce((sum, h) => sum + h.deliveredCount, 0)
    const totalFailed = history.reduce((sum, h) => sum + h.failedCount, 0)
    const acknowledgedCount = notifications.filter((n) => n.acknowledgedAt).length

    return { totalNotifications, totalSent, totalFailed, acknowledgedCount }
  }, [history, notifications])

  // Handlers
  const handleSelectAllRecipients = useCallback(() => {
    if (selectedRecipients.size === recipients.length) {
      setSelectedRecipients(new Set())
    } else {
      setSelectedRecipients(new Set(recipients.map((r) => r.id)))
    }
  }, [recipients, selectedRecipients])

  const handleToggleRecipient = useCallback((recipientId: string) => {
    setSelectedRecipients((prev) => {
      const next = new Set(prev)
      if (next.has(recipientId)) {
        next.delete(recipientId)
      } else {
        next.add(recipientId)
      }
      return next
    })
  }, [])

  const handleSendNotification = useCallback(async () => {
    if (!selectedTemplateId || selectedRecipients.size === 0) return

    setIsProcessing(true)
    try {
      await onSendNotification(
        selectedTemplateId,
        Array.from(selectedRecipients),
        customMessage || undefined
      )
      setSelectedRecipients(new Set())
      setCustomMessage('')
      setActiveTab('history')
    } finally {
      setIsProcessing(false)
    }
  }, [selectedTemplateId, selectedRecipients, customMessage, onSendNotification])

  const handleSaveTemplate = useCallback(
    async (templateData: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
      setIsProcessing(true)
      try {
        if (editingTemplate) {
          await onEditTemplate(editingTemplate.id, templateData)
        } else {
          await onCreateTemplate(templateData)
        }
        setShowTemplateEditor(false)
        setEditingTemplate(null)
      } finally {
        setIsProcessing(false)
      }
    },
    [editingTemplate, onCreateTemplate, onEditTemplate]
  )

  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (!confirm('Are you sure you want to delete this template?')) return
      setIsProcessing(true)
      try {
        await onDeleteTemplate(templateId)
      } finally {
        setIsProcessing(false)
      }
    },
    [onDeleteTemplate]
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Render tabs
  const renderSendTab = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Select Template
        </label>
        <div className="grid grid-cols-2 gap-3">
          {templates.map((template) => {
            const typeConfig = NOTIFICATION_TYPE_CONFIG[template.type]
            const TypeIcon = typeConfig.icon

            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                className={cn(
                  'p-4 border rounded-lg text-left transition-all',
                  selectedTemplateId === template.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {typeConfig.label}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewTemplate(template)
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recipients Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Select Recipients ({selectedRecipients.size} selected)
          </label>
          <button
            onClick={handleSelectAllRecipients}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedRecipients.size === recipients.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
          {recipients.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No recipients available
            </div>
          ) : (
            recipients.map((recipient) => (
              <label
                key={recipient.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selectedRecipients.has(recipient.id)}
                  onChange={() => handleToggleRecipient(recipient.id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {recipient.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{recipient.email}</p>
                </div>
                {recipient.acknowledged && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Acknowledged
                  </span>
                )}
              </label>
            ))
          )}
        </div>
      </div>

      {/* Custom Message (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Message (Optional)
        </label>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Add a personalized message to the notification..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white text-sm"
        />
      </div>

      {/* Send Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSendNotification}
          disabled={!selectedTemplateId || selectedRecipients.size === 0 || isProcessing}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Notification
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderHistoryTab = () => (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={historyFilter}
            onChange={(e) => setHistoryFilter(e.target.value as typeof historyFilter)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Notifications</option>
            <option value="sent">Sent Successfully</option>
            <option value="failed">Failed / Partial</option>
          </select>
        </div>
        <button
          onClick={onExportHistory}
          className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notification history</p>
          </div>
        ) : (
          filteredHistory.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {entry.subject}
                    </h4>
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        entry.status === 'sent' || entry.status === 'delivered'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : entry.status === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      )}
                    >
                      {entry.status === 'partial' ? 'Partial' : entry.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.sentAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {entry.recipientCount} recipients
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {entry.deliveredCount} delivered
                    </span>
                    {entry.failedCount > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        {entry.failedCount} failed
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onResendNotification(entry.id)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Resend notification"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderTemplatesTab = () => (
    <div className="space-y-4">
      {/* Actions */}
      {canManageTemplates && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setEditingTemplate(null)
              setShowTemplateEditor(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      )}

      {/* Templates List */}
      <div className="space-y-3">
        {templates.map((template) => {
          const typeConfig = NOTIFICATION_TYPE_CONFIG[template.type]
          const TypeIcon = typeConfig.icon

          return (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-4">
                <div className={cn('p-2 rounded-lg', typeConfig.color)}>
                  <TypeIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </h4>
                    {template.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {typeConfig.label} • Subject: {template.subject}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {canManageTemplates && !template.isDefault && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTemplate(template)
                          setShowTemplateEditor(true)
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalNotifications}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Sent</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSent}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Delivered</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MailOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.acknowledgedCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledged</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalFailed}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex">
            {[
              { id: 'send', label: 'Send Notification', icon: Send },
              { id: 'history', label: 'History', icon: Clock },
              { id: 'templates', label: 'Templates', icon: FileText },
            ].map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'send' && renderSendTab()}
          {activeTab === 'history' && renderHistoryTab()}
          {activeTab === 'templates' && renderTemplatesTab()}
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Template Preview
              </h3>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Subject
                </label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {previewTemplate.subject}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Body
                </label>
                <pre className="mt-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                  {previewTemplate.body}
                </pre>
              </div>
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
      {showTemplateEditor && (
        <TemplateEditorModal
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowTemplateEditor(false)
            setEditingTemplate(null)
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  )
}

// ============================================================================
// TEMPLATE EDITOR MODAL
// ============================================================================

interface TemplateEditorModalProps {
  template: NotificationTemplate | null
  onSave: (template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  onClose: () => void
  isProcessing: boolean
}

function TemplateEditorModal({
  template,
  onSave,
  onClose,
  isProcessing,
}: TemplateEditorModalProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body || '',
    type: template?.type || ('custom' as NotificationTemplate['type']),
    isDefault: template?.isDefault || false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {template ? 'Edit Template' : 'Create Template'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as NotificationTemplate['type'],
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="initial">Initial Notice</option>
                  <option value="reminder">Reminder</option>
                  <option value="release">Release Notice</option>
                  <option value="acknowledgment_request">Acknowledgment Request</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Use {{variable}} for dynamic content"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Message Body
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={12}
                placeholder="Use {{variable}} for dynamic content"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Available variables: {'{{recipient_name}}'}, {'{{case_name}}'}, {'{{case_number}}'},{' '}
                {'{{effective_date}}'}, {'{{reason}}'}, {'{{release_date}}'}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HoldNotificationCenter
