/**
 * EmailTemplatesManager Component
 * Manages email templates for retention notifications
 */

import { useState, useMemo } from 'react'
import {
  Mail,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Send,
  Check,
  X,
  Code,
  FileText,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { EmailTemplate, EmailTemplateType } from '@/types/retention'
import { cn } from '@/utils/cn'
import { format } from 'date-fns'

// ============================================================================
// TYPES
// ============================================================================

export interface EmailTemplatesManagerProps {
  templates?: EmailTemplate[]
  selectedTemplateId?: string
  onSelectTemplate?: (templateId: string) => void
  onCreateTemplate?: () => void
  onEditTemplate?: (templateId: string) => void
  onDeleteTemplate?: (templateId: string) => void
  onDuplicateTemplate?: (templateId: string) => void
  onPreviewTemplate?: (templateId: string, previewData?: Record<string, string>) => void
  onSendTestEmail?: (templateId: string, recipientEmail: string) => void
  loading?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE_TYPE_LABELS: Record<EmailTemplateType, string> = {
  disposition_reminder: 'Disposition Reminder',
  disposition_due: 'Disposition Due',
  disposition_overdue: 'Disposition Overdue',
  legal_hold_notice: 'Legal Hold Notice',
  hold_acknowledgment: 'Hold Acknowledgment',
  hold_release: 'Hold Release',
  approval_request: 'Approval Request',
  approval_granted: 'Approval Granted',
  approval_rejected: 'Approval Rejected',
  weekly_digest: 'Weekly Digest',
  monthly_report: 'Monthly Report',
  custom: 'Custom',
}

const TEMPLATE_TYPE_COLORS: Record<EmailTemplateType, string> = {
  disposition_reminder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  disposition_due: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  disposition_overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  legal_hold_notice: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  hold_acknowledgment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  hold_release: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  approval_request: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  approval_granted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  approval_rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  weekly_digest: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  monthly_report: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
  custom: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TemplateCardProps {
  template: EmailTemplate
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
  onPreview: () => void
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onPreview,
}: TemplateCardProps) {
  const [showActions, setShowActions] = useState(false)

  return (
    <div
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {template.name}
            </h4>
            {template.isDefault && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                Default
              </span>
            )}
          </div>
          <span
            className={cn(
              'inline-block px-2 py-0.5 text-xs font-medium rounded',
              TEMPLATE_TYPE_COLORS[template.type]
            )}
          >
            {TEMPLATE_TYPE_LABELS[template.type]}
          </span>
        </div>

        {/* Actions dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowActions(!showActions)
            }}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onPreview()
                    setShowActions(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                    setShowActions(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDuplicate()
                    setShowActions(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                {!template.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete()
                      setShowActions(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Subject preview */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
        {template.subject}
      </p>

      {/* Status & metadata */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1',
              template.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
            )}
          >
            {template.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <span>Updated {format(new Date(template.updatedAt), 'MMM d, yyyy')}</span>
      </div>
    </div>
  )
}

interface TemplatePreviewProps {
  template: EmailTemplate
  onEdit: () => void
  onSendTest: (email: string) => void
  onClose: () => void
}

function TemplatePreview({ template, onEdit, onSendTest, onClose }: TemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<'html' | 'text' | 'code'>('html')
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)

  const handleSendTest = async () => {
    if (!testEmail) return
    setSending(true)
    try {
      await onSendTest(testEmail)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
          <span
            className={cn(
              'inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded',
              TEMPLATE_TYPE_COLORS[template.type]
            )}
          >
            {TEMPLATE_TYPE_LABELS[template.type]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Subject */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">Subject:</span>
          <span className="font-medium text-gray-900 dark:text-white">{template.subject}</span>
        </div>
      </div>

      {/* View mode tabs */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'html' as const, label: 'Preview', icon: Eye },
          { id: 'text' as const, label: 'Plain Text', icon: FileText },
          { id: 'code' as const, label: 'HTML Source', icon: Code },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
              viewMode === id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6 h-80 overflow-auto">
        {viewMode === 'html' && (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: template.bodyHtml }}
          />
        )}
        {viewMode === 'text' && (
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {template.bodyText}
          </pre>
        )}
        {viewMode === 'code' && (
          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto">
            {template.bodyHtml}
          </pre>
        )}
      </div>

      {/* Variables */}
      {template.variables.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Available Variables
          </h4>
          <div className="flex flex-wrap gap-2">
            {template.variables.map((variable) => (
              <span
                key={variable.name}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                title={variable.description}
              >
                {`{{${variable.name}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Test email */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter email to send test..."
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={handleSendTest}
            disabled={!testEmail || sending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EmailTemplatesManager({
  templates: propTemplates,
  selectedTemplateId,
  onSelectTemplate = () => {},
  onCreateTemplate = () => {},
  onEditTemplate = () => {},
  onDeleteTemplate = () => {},
  onDuplicateTemplate = () => {},
  onPreviewTemplate = () => {},
  onSendTestEmail = () => {},
  loading = false,
}: EmailTemplatesManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<EmailTemplateType | 'all'>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)

  // Default templates to empty array
  const templates: EmailTemplate[] = propTemplates || []

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.subject.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = filterType === 'all' || template.type === filterType
      return matchesSearch && matchesType
    })
  }, [templates, searchQuery, filterType])

  // Get selected template
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Group templates by type
  const templateTypes = useMemo(() => {
    const types = new Set(templates.map((t) => t.type))
    return Array.from(types)
  }, [templates])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Loading email templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Templates List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Email Templates
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {templates.length} template{templates.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onCreateTemplate}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Template
            </button>
          </div>

          {/* Search and filter */}
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as EmailTemplateType | 'all')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              {templateTypes.map((type) => (
                <option key={type} value={type}>
                  {TEMPLATE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Templates grid */}
        <div className="p-4 max-h-[600px] overflow-auto">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No templates found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={template.id === selectedTemplateId}
                  onSelect={() => onSelectTemplate(template.id)}
                  onEdit={() => onEditTemplate(template.id)}
                  onDelete={() => setShowDeleteConfirm(template.id)}
                  onDuplicate={() => onDuplicateTemplate(template.id)}
                  onPreview={() => onPreviewTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview */}
      <div>
        {selectedTemplate ? (
          <TemplatePreview
            template={selectedTemplate}
            onEdit={() => onEditTemplate(selectedTemplate.id)}
            onSendTest={(email) => onSendTestEmail(selectedTemplate.id, email)}
            onClose={() => onSelectTemplate('')}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Mail className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Select a Template
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Choose a template from the list to preview and edit
            </p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Delete Template?
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this template? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteTemplate(showDeleteConfirm)
                  setShowDeleteConfirm(null)
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EmailTemplatesManager
