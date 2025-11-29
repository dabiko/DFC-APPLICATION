/**
 * Workflow Designer Components
 *
 * Visual workflow template designer with drag-and-drop support.
 */

export { default as WorkflowDesigner } from './WorkflowDesigner'
export { default as WorkflowCanvas } from './WorkflowCanvas'
export { default as ReactFlowCanvas } from './ReactFlowCanvas'
export { default as WorkflowStepNode } from './WorkflowStepNode'
export { default as ConnectionLine } from './ConnectionLine'
export { default as StepPalette } from './StepPalette'
export { default as StepConfigPanel } from './StepConfigPanel'
export { default as TemplateSettingsPanel } from './TemplateSettingsPanel'
export { default as WorkflowPreview } from './WorkflowPreview'
export { default as TemplateGallery } from './TemplateGallery'

export { useDesignerState } from './useDesignerState'
export type { DesignerStateReturn } from './useDesignerState'

export type {
  Position,
  Size,
  CanvasViewport,
  DesignerStep,
  StepCondition,
  ConditionOperator,
  Connection,
  DesignerTemplate,
  DesignerState,
  DesignerAction,
  StepPaletteItem,
  ConditionField,
  WorkflowStepType,
  WorkflowApprovalType,
  WorkflowPriority,
} from './types'

export {
  STEP_PALETTE_ITEMS,
  CONDITION_FIELDS,
  CONDITION_OPERATORS,
  createEmptyStep,
  createEmptyTemplate,
  validateStep,
  validateTemplate,
  getStepColor,
  getStepIcon,
} from './types'
