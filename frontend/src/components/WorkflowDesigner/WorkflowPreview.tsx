/**
 * WorkflowPreview Component
 *
 * Modal to preview workflow template before publishing.
 * Shows a read-only view of the workflow steps and flow.
 */

import React from 'react'
import {
  X,
  CheckCircle,
  Eye,
  PenTool,
  Bell,
  GitBranch,
  ArrowDown,
  Clock,
  Users,
  AlertCircle,
  FileText,
  Tag,
  Calendar,
  Flag,
} from 'lucide-react'
import type { DesignerTemplate } from './types'
import { validateTemplate } from './types'

interface WorkflowPreviewProps {
  template: DesignerTemplate
  onClose: () => void
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  APPROVAL: CheckCircle,
  REVIEW: Eye,
  SIGN_OFF: PenTool,
  NOTIFICATION: Bell,
  PARALLEL: GitBranch,
}

const STEP_COLORS: Record<string, string> = {
  APPROVAL: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SIGN_OFF: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  NOTIFICATION: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  PARALLEL: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export default function WorkflowPreview({ template, onClose }: WorkflowPreviewProps) {
  const validation = validateTemplate(template)
  const sortedSteps = [...template.steps].sort((a, b) => a.order - b.order)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Template Preview
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Review your workflow before publishing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Validation Status */}
          {!validation.isValid && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Validation Errors
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Template Info */}
          <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {template.category.replace('_', ' ')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Flag className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Default Priority</p>
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLORS[template.default_priority]}`}
                  >
                    {template.default_priority}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Default Due Days</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {template.default_due_days} days
                  </p>
                </div>
              </div>
            </div>

            {template.description && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{template.description}</p>
              </div>
            )}

            {template.applicable_document_types.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  Applicable Document Types
                </p>
                <div className="flex flex-wrap gap-2">
                  {template.applicable_document_types.map((type) => (
                    <span
                      key={type}
                      className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded"
                    >
                      {type}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Workflow Steps ({sortedSteps.length})
            </h3>

            <div className="space-y-4">
              {sortedSteps.map((step, index) => {
                const Icon = STEP_ICONS[step.step_type] || CheckCircle
                const colorClass = STEP_COLORS[step.step_type] || STEP_COLORS.APPROVAL

                return (
                  <React.Fragment key={step.id}>
                    {/* Step Card */}
                    <div className="flex gap-4">
                      {/* Step number */}
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-600 text-white text-sm font-bold flex items-center justify-center">
                          {step.order}
                        </div>
                        {index < sortedSteps.length - 1 && (
                          <div className="flex-1 w-0.5 bg-gray-300 dark:bg-gray-600 my-2" />
                        )}
                      </div>

                      {/* Step content */}
                      <div className="flex-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                {step.name}
                              </h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {step.step_type.toLowerCase().replace('_', ' ')}
                              </p>
                            </div>
                          </div>

                          <span className={`px-2 py-1 text-xs font-medium rounded ${colorClass}`}>
                            {step.approval_type}
                            {step.approval_type === 'PERCENTAGE' &&
                              ` (${step.approval_percentage}%)`}
                          </span>
                        </div>

                        {step.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {step.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                          {(step.assigned_users.length > 0 || step.assigned_role) && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {step.assigned_role || `${step.assigned_users.length} user(s)`}
                            </div>
                          )}

                          {step.sla_hours && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {step.sla_hours}h SLA
                            </div>
                          )}

                          {step.require_comment && (
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                              Comment Required
                            </span>
                          )}

                          {step.conditions.length > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded">
                              {step.conditions.length} Condition(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Connection arrow */}
                    {index < sortedSteps.length - 1 && (
                      <div className="flex items-center ml-4">
                        <ArrowDown className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          {/* Empty state */}
          {sortedSteps.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                No Steps Defined
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add steps to your workflow before previewing
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">
                  Template is valid and ready to publish
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600 dark:text-red-400">
                  Please fix validation errors before publishing
                </span>
              </>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
