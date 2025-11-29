/**
 * TemplateSettingsPanel Component
 *
 * Modal/panel for configuring workflow template settings.
 */

import { useState, useEffect } from 'react'
import { X, Save, FileText, Tag, Calendar, AlertCircle, Flag } from 'lucide-react'
import type { DesignerTemplate, WorkflowPriority } from './types'

interface TemplateSettingsPanelProps {
  template: DesignerTemplate
  isOpen: boolean
  onClose: () => void
  onSave: (settings: Partial<DesignerTemplate>) => void
}

const PRIORITIES: { value: WorkflowPriority; label: string; color: string }[] = [
  { value: 'LOW', label: 'Low', color: 'bg-gray-100 text-gray-700' },
  { value: 'MEDIUM', label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  { value: 'HIGH', label: 'High', color: 'bg-orange-100 text-orange-700' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 text-red-700' },
]

const CATEGORIES = [
  'general',
  'document_approval',
  'contract_review',
  'financial',
  'compliance',
  'hr',
  'it_request',
  'legal',
  'procurement',
  'custom',
]

const DOCUMENT_TYPES = [
  'Invoice',
  'Contract',
  'Report',
  'Proposal',
  'Policy',
  'Memo',
  'Purchase Order',
  'Financial Statement',
  'Legal Document',
  'Compliance Report',
  'HR Document',
  'Technical Spec',
]

export default function TemplateSettingsPanel({
  template,
  isOpen,
  onClose,
  onSave,
}: TemplateSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState({
    name: template.name,
    description: template.description,
    category: template.category,
    default_priority: template.default_priority,
    default_due_days: template.default_due_days,
    applicable_document_types: template.applicable_document_types,
    is_active: template.is_active,
  })

  const [errors, setErrors] = useState<string[]>([])

  // Sync with template when it changes
  useEffect(() => {
    setLocalSettings({
      name: template.name,
      description: template.description,
      category: template.category,
      default_priority: template.default_priority,
      default_due_days: template.default_due_days,
      applicable_document_types: template.applicable_document_types,
      is_active: template.is_active,
    })
  }, [template])

  const handleChange = (field: string, value: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [field]: value }))
    setErrors([])
  }

  const handleDocTypeToggle = (docType: string) => {
    const current = localSettings.applicable_document_types
    const updated = current.includes(docType)
      ? current.filter((t) => t !== docType)
      : [...current, docType]
    handleChange('applicable_document_types', updated)
  }

  const handleSave = () => {
    // Validate
    const newErrors: string[] = []
    if (!localSettings.name.trim()) {
      newErrors.push('Template name is required')
    }
    if (localSettings.default_due_days < 1) {
      newErrors.push('Default due days must be at least 1')
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    onSave(localSettings)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Template Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <div>
                  {errors.map((error, i) => (
                    <p key={i} className="text-sm text-red-700 dark:text-red-400">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Information
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={localSettings.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={localSettings.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Describe what this workflow template is for"
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Category
              </h3>

              <select
                value={localSettings.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Default Settings
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Priority
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIORITIES.map((priority) => (
                      <button
                        key={priority.value}
                        onClick={() => handleChange('default_priority', priority.value)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          localSettings.default_priority === priority.value
                            ? priority.color + ' ring-2 ring-offset-2 ring-blue-500'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {priority.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Default Due Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={localSettings.default_due_days}
                    onChange={(e) =>
                      handleChange('default_due_days', parseInt(e.target.value) || 7)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Applicable Document Types */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Applicable Document Types
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select which document types this workflow can be applied to. Leave empty for all
                types.
              </p>

              <div className="flex flex-wrap gap-2">
                {DOCUMENT_TYPES.map((docType) => (
                  <button
                    key={docType}
                    onClick={() => handleDocTypeToggle(docType)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      localSettings.applicable_document_types.includes(docType)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {docType}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Status
              </h3>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.is_active}
                  onChange={(e) => handleChange('is_active', e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Active Template
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only active templates can be used to start new workflows
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
