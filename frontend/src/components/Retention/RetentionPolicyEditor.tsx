import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CheckIcon,
  ClockIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BellIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import type {
  RetentionPolicy,
  RetentionPolicyEditorProps,
  RetentionPeriod,
  RetentionAction,
  PolicyTrigger,
} from '@/types/retention'
import { getDefaultRetentionPolicy, formatRetentionPeriod } from '@/types/retention'

export const RetentionPolicyEditor: React.FC<RetentionPolicyEditorProps> = ({
  policy,
  templates,
  onSave,
  onCancel,
  saving = false,
  mode = 'create',
}) => {
  const [formData, setFormData] = useState<Partial<RetentionPolicy>>(
    policy || getDefaultRetentionPolicy()
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<
    'basic' | 'scope' | 'actions' | 'compliance'
  >('basic')

  useEffect(() => {
    if (policy) {
      setFormData(policy)
    }
  }, [policy])

  const handleInputChange = (field: keyof RetentionPolicy, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleRetentionPeriodChange = (field: keyof RetentionPeriod, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      retentionPeriod: {
        ...prev.retentionPeriod!,
        [field]: value,
      },
    }))
  }

  const applyTemplate = (templateId: string) => {
    const template = templates?.find((t) => t.id === templateId)
    if (template) {
      setFormData((prev) => ({
        ...prev,
        name: template.name,
        description: template.description,
        retentionPeriod: template.retentionPeriod,
        primaryAction: template.action,
        complianceStandards: template.complianceStandards,
      }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Policy name is required'
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required'
    }
    if (!formData.retentionPeriod?.value || formData.retentionPeriod.value <= 0) {
      newErrors.retentionPeriod = 'Retention period must be greater than 0'
    }
    if (!formData.documentTypes || formData.documentTypes.length === 0) {
      newErrors.documentTypes = 'At least one document type is required'
    }
    if (!formData.departments || formData.departments.length === 0) {
      newErrors.departments = 'At least one department is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onSave(formData)
    }
  }

  const documentTypeOptions = [
    'Invoice',
    'Contract',
    'Report',
    'Email',
    'Presentation',
    'Spreadsheet',
    'Customer Record',
    'Financial Statement',
    'Legal Document',
    'HR Document',
  ]

  const departmentOptions = [
    'Accounting',
    'Legal',
    'HR',
    'IT',
    'Sales',
    'Marketing',
    'Operations',
    'Finance',
    'Compliance',
    'All Departments',
  ]

  const securityLevelOptions = ['Public', 'Internal', 'Confidential', 'Highly Confidential']

  const complianceOptions = [
    'GDPR',
    'HIPAA',
    'SOX',
    'PCI-DSS',
    'ISO-27001',
    'FIPS-140-3',
    'SOC 2',
  ]

  const renderBasicTab = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      {mode === 'create' && templates && templates.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <LightBulbIcon className="w-4 h-4 inline mr-1" />
            Start from Template (Optional)
          </label>
          <select
            onChange={(e) => e.target.value && applyTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select a template...</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({formatRetentionPeriod(template.retentionPeriod)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Policy Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Policy Name *
        </label>
        <input
          type="text"
          value={formData.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="e.g., Financial Records Retention"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
            errors.name
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          disabled={mode === 'view'}
        />
        {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe what this policy covers and its purpose..."
          rows={3}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
            errors.description
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          disabled={mode === 'view'}
        />
        {errors.description && (
          <p className="text-sm text-red-600 mt-1">{errors.description}</p>
        )}
      </div>

      {/* Retention Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <ClockIcon className="w-4 h-4 inline mr-1" />
          Retention Period *
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="number"
              min="1"
              value={formData.retentionPeriod?.value || ''}
              onChange={(e) =>
                handleRetentionPeriodChange('value', parseInt(e.target.value) || 0)
              }
              placeholder="Duration"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white ${
                errors.retentionPeriod
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
              disabled={mode === 'view'}
            />
          </div>
          <div>
            <select
              value={formData.retentionPeriod?.unit || 'years'}
              onChange={(e) =>
                handleRetentionPeriodChange('unit', e.target.value as RetentionPeriod['unit'])
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              disabled={mode === 'view'}
            >
              <option value="days">Days</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
        {errors.retentionPeriod && (
          <p className="text-sm text-red-600 mt-1">{errors.retentionPeriod}</p>
        )}
      </div>

      {/* Trigger */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Retention Starts From
        </label>
        <select
          value={formData.trigger || 'creation'}
          onChange={(e) => handleInputChange('trigger', e.target.value as PolicyTrigger)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        >
          <option value="creation">Document Creation Date</option>
          <option value="modification">Last Modification Date</option>
          <option value="closure">Document Closure/Completion</option>
          <option value="custom">Custom Date Field</option>
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Status
        </label>
        <select
          value={formData.status || 'draft'}
          onChange={(e) => handleInputChange('status', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
      </div>
    </div>
  )

  const renderScopeTab = () => (
    <div className="space-y-6">
      {/* Document Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <DocumentTextIcon className="w-4 h-4 inline mr-1" />
          Document Types *
        </label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
          {documentTypeOptions.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.documentTypes?.includes(type) || false}
                onChange={(e) => {
                  const current = formData.documentTypes || []
                  handleInputChange(
                    'documentTypes',
                    e.target.checked
                      ? [...current, type]
                      : current.filter((t) => t !== type)
                  )
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={mode === 'view'}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
            </label>
          ))}
        </div>
        {errors.documentTypes && (
          <p className="text-sm text-red-600 mt-1">{errors.documentTypes}</p>
        )}
      </div>

      {/* Departments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Departments *
        </label>
        <div className="grid grid-cols-2 gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
          {departmentOptions.map((dept) => (
            <label key={dept} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.departments?.includes(dept) || false}
                onChange={(e) => {
                  const current = formData.departments || []
                  handleInputChange(
                    'departments',
                    e.target.checked ? [...current, dept] : current.filter((d) => d !== dept)
                  )
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={mode === 'view'}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{dept}</span>
            </label>
          ))}
        </div>
        {errors.departments && (
          <p className="text-sm text-red-600 mt-1">{errors.departments}</p>
        )}
      </div>

      {/* Security Levels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
          Security Levels (Optional)
        </label>
        <div className="grid grid-cols-2 gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
          {securityLevelOptions.map((level) => (
            <label key={level} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.securityLevels?.includes(level) || false}
                onChange={(e) => {
                  const current = formData.securityLevels || []
                  handleInputChange(
                    'securityLevels',
                    e.target.checked ? [...current, level] : current.filter((s) => s !== level)
                  )
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={mode === 'view'}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{level}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderActionsTab = () => (
    <div className="space-y-6">
      {/* Primary Action */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Primary Action After Retention Period
        </label>
        <select
          value={formData.primaryAction || 'archive'}
          onChange={(e) =>
            handleInputChange('primaryAction', e.target.value as RetentionAction)
          }
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        >
          <option value="archive">Archive</option>
          <option value="delete">Delete</option>
          <option value="review">Review</option>
          <option value="notify">Notify Owner</option>
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This action will be triggered when documents reach the end of their retention period
        </p>
      </div>

      {/* Grace Period */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Grace Period (Optional)
        </label>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            min="0"
            value={formData.gracePeriod?.value || ''}
            onChange={(e) =>
              handleInputChange('gracePeriod', {
                value: parseInt(e.target.value) || 0,
                unit: formData.gracePeriod?.unit || 'days',
              })
            }
            placeholder="Duration"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={mode === 'view'}
          />
          <select
            value={formData.gracePeriod?.unit || 'days'}
            onChange={(e) =>
              handleInputChange('gracePeriod', {
                value: formData.gracePeriod?.value || 0,
                unit: e.target.value,
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            disabled={mode === 'view'}
          >
            <option value="days">Days</option>
            <option value="months">Months</option>
          </select>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Additional time before executing the primary action
        </p>
      </div>

      {/* Notifications */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <BellIcon className="w-4 h-4 inline mr-1" />
          Notify Before (Days)
        </label>
        <input
          type="number"
          min="0"
          value={formData.notifyBeforeDays || ''}
          onChange={(e) =>
            handleInputChange('notifyBeforeDays', parseInt(e.target.value) || 0)
          }
          placeholder="30"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Send notification to document owners this many days before action
        </p>
      </div>

      {/* Require Approval */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.requireApproval || false}
            onChange={(e) => handleInputChange('requireApproval', e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={mode === 'view'}
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Require approval before executing actions
          </span>
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
          Actions will require manual approval from designated approvers
        </p>
      </div>
    </div>
  )

  const renderComplianceTab = () => (
    <div className="space-y-6">
      {/* Compliance Standards */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
          Compliance Standards
        </label>
        <div className="grid grid-cols-2 gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-3">
          {complianceOptions.map((standard) => (
            <label key={standard} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.complianceStandards?.includes(standard) || false}
                onChange={(e) => {
                  const current = formData.complianceStandards || []
                  handleInputChange(
                    'complianceStandards',
                    e.target.checked
                      ? [...current, standard]
                      : current.filter((s) => s !== standard)
                  )
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={mode === 'view'}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{standard}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Legal Basis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Legal Basis (Optional)
        </label>
        <textarea
          value={formData.legalBasis || ''}
          onChange={(e) => handleInputChange('legalBasis', e.target.value)}
          placeholder="Describe the legal requirements or basis for this retention period..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        />
      </div>

      {/* Regulatory Reference */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Regulatory Reference (Optional)
        </label>
        <input
          type="text"
          value={formData.regulatoryReference || ''}
          onChange={(e) => handleInputChange('regulatoryReference', e.target.value)}
          placeholder="e.g., 29 CFR 1627.3, GDPR Article 5"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          disabled={mode === 'view'}
        />
      </div>
    </div>
  )

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mode === 'create' && 'Create Retention Policy'}
            {mode === 'edit' && 'Edit Retention Policy'}
            {mode === 'view' && 'View Retention Policy'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {mode === 'view'
              ? 'Review policy details'
              : 'Define how long documents should be retained and what happens when they expire'}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex px-6">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'scope', label: 'Scope' },
              { id: 'actions', label: 'Actions' },
              { id: 'compliance', label: 'Compliance' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'basic' && renderBasicTab()}
          {activeTab === 'scope' && renderScopeTab()}
          {activeTab === 'actions' && renderActionsTab()}
          {activeTab === 'compliance' && renderComplianceTab()}
        </div>

        {/* Footer */}
        {mode !== 'view' && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  {mode === 'create' ? 'Create Policy' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
