/**
 * StepConfigPanel Component
 *
 * Right sidebar panel for configuring selected workflow step properties.
 */

import React, { useState, useEffect } from 'react'
import {
  X,
  Settings,
  Users,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Filter,
} from 'lucide-react'
import type {
  DesignerStep,
  StepCondition,
  ConditionOperator,
  WorkflowStepType,
  WorkflowApprovalType,
} from './types'
import { CONDITION_FIELDS, CONDITION_OPERATORS, validateStep } from './types'

interface StepConfigPanelProps {
  step: DesignerStep | null
  onUpdate: (updates: Partial<DesignerStep>) => void
  onDelete: () => void
  onClose: () => void
  className?: string
}

const STEP_TYPES: { value: WorkflowStepType; label: string }[] = [
  { value: 'APPROVAL', label: 'Approval' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'SIGN_OFF', label: 'Sign Off' },
  { value: 'NOTIFICATION', label: 'Notification' },
  { value: 'PARALLEL', label: 'Parallel' },
]

const APPROVAL_TYPES: { value: WorkflowApprovalType; label: string; description: string }[] = [
  { value: 'ANY', label: 'Any', description: 'Any one assignee can approve' },
  { value: 'ALL', label: 'All', description: 'All assignees must approve' },
  { value: 'MAJORITY', label: 'Majority', description: 'More than 50% must approve' },
  { value: 'PERCENTAGE', label: 'Percentage', description: 'Custom percentage required' },
]

export default function StepConfigPanel({
  step,
  onUpdate,
  onDelete,
  onClose,
  className = '',
}: StepConfigPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    assignment: true,
    sla: false,
    conditions: false,
    options: false,
  })

  const [localStep, setLocalStep] = useState<DesignerStep | null>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Sync local state with prop
  useEffect(() => {
    setLocalStep(step)
    if (step) {
      setValidationErrors(validateStep(step))
    }
  }, [step])

  if (!step || !localStep) {
    return (
      <div
        className={`w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex items-center justify-center ${className}`}
      >
        <div className="text-center p-6">
          <Settings className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Select a step to configure</p>
        </div>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const handleChange = (field: keyof DesignerStep, value: unknown) => {
    const updates = { [field]: value }
    setLocalStep((prev) => (prev ? { ...prev, ...updates } : null))
    onUpdate(updates)
  }

  const addCondition = () => {
    const newCondition: StepCondition = {
      id: `cond-${Date.now()}`,
      field: 'document_type',
      operator: 'equals',
      value: '',
      logic: 'AND',
    }
    handleChange('conditions', [...localStep.conditions, newCondition])
  }

  const updateCondition = (conditionId: string, updates: Partial<StepCondition>) => {
    const updatedConditions = localStep.conditions.map((cond) =>
      cond.id === conditionId ? { ...cond, ...updates } : cond
    )
    handleChange('conditions', updatedConditions)
  }

  const removeCondition = (conditionId: string) => {
    handleChange(
      'conditions',
      localStep.conditions.filter((c) => c.id !== conditionId)
    )
  }

  return (
    <div
      className={`w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Step Configuration</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <X className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-red-700 dark:text-red-400">
              {validationErrors.map((error, i) => (
                <p key={i}>{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Basic Settings */}
        <Section
          title="Basic Settings"
          icon={<Settings className="h-4 w-4" />}
          isExpanded={expandedSections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Step Name *
              </label>
              <input
                type="text"
                value={localStep.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter step name"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={localStep.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Step Type
              </label>
              <select
                value={localStep.step_type}
                onChange={(e) => handleChange('step_type', e.target.value as WorkflowStepType)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STEP_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Assignment Settings */}
        <Section
          title="Assignment"
          icon={<Users className="h-4 w-4" />}
          isExpanded={expandedSections.assignment}
          onToggle={() => toggleSection('assignment')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Approval Type
              </label>
              <select
                value={localStep.approval_type}
                onChange={(e) =>
                  handleChange('approval_type', e.target.value as WorkflowApprovalType)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {APPROVAL_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {APPROVAL_TYPES.find((t) => t.value === localStep.approval_type)?.description}
              </p>
            </div>

            {localStep.approval_type === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Required Percentage
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localStep.approval_percentage || 51}
                  onChange={(e) => handleChange('approval_percentage', parseInt(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned Role
              </label>
              <input
                type="text"
                value={localStep.assigned_role}
                onChange={(e) => handleChange('assigned_role', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Manager, Approver"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Specific users can be assigned when creating workflow instances.
            </p>
          </div>
        </Section>

        {/* SLA Settings */}
        <Section
          title="SLA & Escalation"
          icon={<Clock className="h-4 w-4" />}
          isExpanded={expandedSections.sla}
          onToggle={() => toggleSection('sla')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                SLA Hours
              </label>
              <input
                type="number"
                min="0"
                value={localStep.sla_hours || ''}
                onChange={(e) =>
                  handleChange('sla_hours', e.target.value ? parseInt(e.target.value) : undefined)
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hours to complete"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Escalation Delay (hours)
              </label>
              <input
                type="number"
                min="0"
                value={localStep.escalation_hours || ''}
                onChange={(e) =>
                  handleChange(
                    'escalation_hours',
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Hours after SLA breach"
              />
            </div>
          </div>
        </Section>

        {/* Conditions */}
        <Section
          title="Conditions"
          icon={<Filter className="h-4 w-4" />}
          isExpanded={expandedSections.conditions}
          onToggle={() => toggleSection('conditions')}
          badge={localStep.conditions.length > 0 ? localStep.conditions.length : undefined}
        >
          <div className="space-y-3">
            {localStep.conditions.map((condition, index) => (
              <ConditionRow
                key={condition.id}
                condition={condition}
                index={index}
                onChange={(updates) => updateCondition(condition.id, updates)}
                onRemove={() => removeCondition(condition.id)}
              />
            ))}

            <button
              onClick={addCondition}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Condition
            </button>
          </div>
        </Section>

        {/* Options */}
        <Section
          title="Options"
          icon={<Settings className="h-4 w-4" />}
          isExpanded={expandedSections.options}
          onToggle={() => toggleSection('options')}
        >
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localStep.require_comment}
                onChange={(e) => handleChange('require_comment', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Require comment</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localStep.auto_approve_if_same_user}
                onChange={(e) => handleChange('auto_approve_if_same_user', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Auto-approve if same user
              </span>
            </label>
          </div>
        </Section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Step
        </button>
      </div>
    </div>
  )
}

// Section component
interface SectionProps {
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: () => void
  badge?: number
  children: React.ReactNode
}

function Section({ title, icon, isExpanded, onToggle, badge, children }: SectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-gray-500">{icon}</span>
        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">{title}</span>
        {badge !== undefined && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
            {badge}
          </span>
        )}
      </button>
      {isExpanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// Condition row component
interface ConditionRowProps {
  condition: StepCondition
  index: number
  onChange: (updates: Partial<StepCondition>) => void
  onRemove: () => void
}

function ConditionRow({ condition, index, onChange, onRemove }: ConditionRowProps) {
  const selectedField = CONDITION_FIELDS.find((f) => f.id === condition.field)
  const availableOperators = CONDITION_OPERATORS.filter(
    (op) => selectedField && op.types.includes(selectedField.type)
  )

  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-2">
      {index > 0 && (
        <select
          value={condition.logic || 'AND'}
          onChange={(e) => onChange({ logic: e.target.value as 'AND' | 'OR' })}
          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
      )}

      <select
        value={condition.field}
        onChange={(e) => onChange({ field: e.target.value, value: '' })}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {CONDITION_FIELDS.map((field) => (
          <option key={field.id} value={field.id}>
            {field.label}
          </option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onChange({ operator: e.target.value as ConditionOperator })}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      >
        {availableOperators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {!['is_empty', 'is_not_empty'].includes(condition.operator) &&
        (selectedField?.options ? (
          <select
            value={condition.value as string}
            onChange={(e) => onChange({ value: e.target.value })}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select value...</option>
            {selectedField.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={selectedField?.type === 'number' ? 'number' : 'text'}
            value={condition.value as string}
            onChange={(e) =>
              onChange({
                value: selectedField?.type === 'number' ? Number(e.target.value) : e.target.value,
              })
            }
            className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter value..."
          />
        ))}

      <button
        onClick={onRemove}
        className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
      >
        <Trash2 className="h-3 w-3" />
        Remove
      </button>
    </div>
  )
}
