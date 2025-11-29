/**
 * WorkflowDesigner Component
 *
 * Main component for the visual workflow designer.
 * Combines canvas, palette, and configuration panels.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  Save,
  Upload,
  Settings,
  Undo,
  Redo,
  Eye,
  AlertCircle,
  CheckCircle,
  X,
  ArrowLeft,
} from 'lucide-react'
import { useDesignerState } from './useDesignerState'
import type { DesignerTemplate, DesignerStep } from './types'
import { validateTemplate } from './types'
import WorkflowCanvas from './WorkflowCanvas'
import ReactFlowCanvas from './ReactFlowCanvas'
import StepPalette from './StepPalette'
import StepConfigPanel from './StepConfigPanel'
import TemplateSettingsPanel from './TemplateSettingsPanel'
import WorkflowPreview from './WorkflowPreview'
import TemplateGallery from './TemplateGallery'
import type { WorkflowTemplate, WorkflowStep } from '../../services/workflowService'
import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  getWorkflowTemplate,
} from '../../services/workflowService'

interface WorkflowDesignerProps {
  templateId?: string
  onSave?: (template: WorkflowTemplate) => void
  onClose?: () => void
}

export default function WorkflowDesigner({ templateId, onSave, onClose }: WorkflowDesignerProps) {
  const designer = useDesignerState()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfigPanel, setShowConfigPanel] = useState(true)
  const [showTemplateGallery, setShowTemplateGallery] = useState(!templateId)
  const [useReactFlow] = useState(true) // Use React Flow canvas by default

  // Load existing template if editing
  useEffect(() => {
    if (templateId) {
      loadTemplate(templateId)
    }
  }, [templateId])

  const loadTemplate = async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const template = await getWorkflowTemplate(id)
      const designerTemplate = convertToDesignerTemplate(template)
      designer.setTemplate(designerTemplate)
    } catch (err) {
      setError('Failed to load template')
      console.error('Error loading template:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Convert API template to designer format
  const convertToDesignerTemplate = (template: WorkflowTemplate): DesignerTemplate => {
    const steps: DesignerStep[] = (template.steps || []).map((step, index) => ({
      id: step.id,
      name: step.name,
      description: step.description,
      order: step.order,
      step_type: step.step_type,
      approval_type: step.approval_type,
      approval_percentage: step.approval_percentage,
      assigned_users: step.assigned_users,
      assigned_role: step.assigned_role,
      assigned_department: step.assigned_department,
      sla_hours: step.sla_hours,
      escalation_hours: step.escalation_hours,
      escalate_to: step.escalate_to,
      conditions: Object.entries(step.conditions || {}).map(([key, value], i) => ({
        id: `cond-${i}`,
        field: key,
        operator: 'equals' as const,
        value: value as string,
      })),
      auto_approve_if_same_user: step.auto_approve_if_same_user,
      require_comment: step.require_comment,
      position: {
        x: 100 + (index % 3) * 250,
        y: 100 + Math.floor(index / 3) * 150,
      },
    }))

    // Create connections based on step order
    const connections = steps.slice(0, -1).map((step, index) => ({
      id: `conn-${index}`,
      sourceStepId: step.id,
      targetStepId: steps[index + 1].id,
      isConditional: false,
    }))

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      default_priority: template.default_priority,
      default_due_days: template.default_due_days,
      applicable_document_types: template.applicable_document_types,
      is_active: template.is_active,
      steps,
      connections,
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    }
  }

  // Convert designer template to API format
  const convertToApiTemplate = (template: DesignerTemplate): Partial<WorkflowTemplate> => {
    const steps: Partial<WorkflowStep>[] = template.steps.map((step) => ({
      id: step.id.startsWith('step-') ? undefined : step.id,
      name: step.name,
      description: step.description,
      order: step.order,
      step_type: step.step_type,
      approval_type: step.approval_type,
      approval_percentage: step.approval_percentage,
      assigned_users: step.assigned_users,
      assigned_role: step.assigned_role,
      assigned_department: step.assigned_department,
      sla_hours: step.sla_hours,
      escalation_hours: step.escalation_hours,
      escalate_to: step.escalate_to,
      conditions: step.conditions.reduce(
        (acc, cond) => ({
          ...acc,
          [cond.field]: cond.value,
        }),
        {}
      ),
      auto_approve_if_same_user: step.auto_approve_if_same_user,
      require_comment: step.require_comment,
    }))

    return {
      name: template.name,
      description: template.description,
      category: template.category,
      default_priority: template.default_priority,
      default_due_days: template.default_due_days,
      applicable_document_types: template.applicable_document_types,
      is_active: template.is_active,
      steps: steps as WorkflowStep[],
    }
  }

  // Handle save
  const handleSave = async (publish: boolean = false) => {
    setError(null)
    setSuccess(null)

    // Validate template
    const validation = validateTemplate(designer.template)
    if (!validation.isValid) {
      setError(validation.errors.join('\n'))
      return
    }

    setIsSaving(true)
    try {
      const templateData = convertToApiTemplate(designer.template)
      if (publish) {
        templateData.is_active = true
      }

      let savedTemplate: WorkflowTemplate
      if (designer.template.id) {
        savedTemplate = await updateWorkflowTemplate(designer.template.id, templateData)
      } else {
        savedTemplate = await createWorkflowTemplate(
          templateData as Parameters<typeof createWorkflowTemplate>[0]
        )
      }

      designer.markClean()
      setSuccess(publish ? 'Template published successfully!' : 'Template saved successfully!')
      onSave?.(savedTemplate)

      // Update designer with saved template ID
      if (!designer.template.id) {
        designer.updateTemplateSettings({ id: savedTemplate.id })
      }

      // Auto-hide success message
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Failed to save template')
      console.error('Error saving template:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle step double click (open config panel)
  const handleStepDoubleClick = useCallback(
    (step: DesignerStep) => {
      designer.selectStep(step.id)
      setShowConfigPanel(true)
    },
    [designer]
  )

  // Handle template selection from gallery
  const handleSelectTemplate = useCallback(
    (template: DesignerTemplate) => {
      designer.setTemplate(template)
      setShowTemplateGallery(false)
    },
    [designer]
  )

  // Handle unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (designer.isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [designer.isDirty])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading template...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          )}

          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {designer.template.id ? 'Edit Workflow Template' : 'Create Workflow Template'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {designer.template.name}
              {designer.isDirty && <span className="ml-2 text-orange-500">*</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={designer.undo}
              disabled={!designer.canUndo}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={designer.redo}
              disabled={!designer.canRedo}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Shift+Z)"
            >
              <Redo className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>

          {/* Preview */}
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>

          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

          {/* Save */}
          <button
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>

          {/* Publish */}
          <button
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-red-700 dark:text-red-400 whitespace-pre-line">{error}</p>
            </div>
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left - Step Palette */}
        <StepPalette />

        {/* Center - Canvas */}
        {useReactFlow ? (
          <ReactFlowCanvas designer={designer} onStepDoubleClick={handleStepDoubleClick} />
        ) : (
          <WorkflowCanvas designer={designer} onStepDoubleClick={handleStepDoubleClick} />
        )}

        {/* Right - Config Panel */}
        {showConfigPanel && (
          <StepConfigPanel
            step={designer.selectedStep}
            onUpdate={(updates) => {
              if (designer.selectedStepId) {
                designer.updateStep(designer.selectedStepId, updates)
              }
            }}
            onDelete={() => {
              if (designer.selectedStepId) {
                designer.deleteStep(designer.selectedStepId)
              }
            }}
            onClose={() => {
              designer.selectStep(null)
              setShowConfigPanel(false)
            }}
          />
        )}
      </div>

      {/* Template Settings Modal */}
      <TemplateSettingsPanel
        template={designer.template}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={(settings) => designer.updateTemplateSettings(settings)}
      />

      {/* Preview Modal */}
      {showPreview && (
        <WorkflowPreview template={designer.template} onClose={() => setShowPreview(false)} />
      )}

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </div>
  )
}
