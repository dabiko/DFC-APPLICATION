/**
 * Workflow Designer Types
 *
 * Type definitions for the visual workflow designer components.
 */

// Re-define types locally to avoid circular import issues
export type WorkflowStepType = 'APPROVAL' | 'REVIEW' | 'SIGN_OFF' | 'NOTIFICATION' | 'PARALLEL'
export type WorkflowApprovalType = 'ALL' | 'ANY' | 'MAJORITY' | 'PERCENTAGE'
export type WorkflowPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// =============================================================================
// Canvas Types
// =============================================================================

export interface Position {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface CanvasViewport {
  zoom: number
  pan: Position
}

// =============================================================================
// Designer Step Types
// =============================================================================

export interface DesignerStep {
  id: string
  name: string
  description: string
  order: number
  step_type: WorkflowStepType
  approval_type: WorkflowApprovalType
  approval_percentage?: number
  assigned_users: number[]
  assigned_role: string
  assigned_department?: number
  sla_hours?: number
  escalation_hours?: number
  escalate_to?: number
  conditions: StepCondition[]
  auto_approve_if_same_user: boolean
  require_comment: boolean
  // Visual properties
  position: Position
  isSelected?: boolean
  isValid?: boolean
  validationErrors?: string[]
}

export interface StepCondition {
  id: string
  field: string
  operator: ConditionOperator
  value: string | number | boolean
  logic?: 'AND' | 'OR'
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'

// =============================================================================
// Connection Types
// =============================================================================

export interface Connection {
  id: string
  sourceStepId: string
  targetStepId: string
  sourceHandle?: 'bottom' | 'right'
  targetHandle?: 'top' | 'left'
  label?: string
  condition?: StepCondition
  isConditional: boolean
}

// =============================================================================
// Template Types
// =============================================================================

export interface DesignerTemplate {
  id?: string
  name: string
  description: string
  category: string
  default_priority: WorkflowPriority
  default_due_days: number
  applicable_document_types: string[]
  is_active: boolean
  steps: DesignerStep[]
  connections: Connection[]
  // Canvas state
  viewport: CanvasViewport
}

// =============================================================================
// Designer State Types
// =============================================================================

export interface DesignerState {
  template: DesignerTemplate
  selectedStepId: string | null
  selectedConnectionId: string | null
  isDragging: boolean
  isConnecting: boolean
  connectingFrom: string | null
  clipboard: DesignerStep | null
  history: DesignerTemplate[]
  historyIndex: number
  isDirty: boolean
}

export type DesignerAction =
  | { type: 'SET_TEMPLATE'; payload: DesignerTemplate }
  | { type: 'ADD_STEP'; payload: DesignerStep }
  | { type: 'UPDATE_STEP'; payload: { id: string; updates: Partial<DesignerStep> } }
  | { type: 'DELETE_STEP'; payload: string }
  | { type: 'MOVE_STEP'; payload: { id: string; position: Position } }
  | { type: 'SELECT_STEP'; payload: string | null }
  | { type: 'ADD_CONNECTION'; payload: Connection }
  | { type: 'UPDATE_CONNECTION'; payload: { id: string; updates: Partial<Connection> } }
  | { type: 'DELETE_CONNECTION'; payload: string }
  | { type: 'SELECT_CONNECTION'; payload: string | null }
  | { type: 'SET_VIEWPORT'; payload: CanvasViewport }
  | { type: 'START_CONNECTING'; payload: string }
  | { type: 'END_CONNECTING' }
  | { type: 'COPY_STEP'; payload: string }
  | { type: 'PASTE_STEP'; payload: Position }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_CLEAN' }
  | { type: 'UPDATE_TEMPLATE_SETTINGS'; payload: Partial<DesignerTemplate> }
  | { type: 'REORDER_STEPS' }

// =============================================================================
// Step Palette Types
// =============================================================================

export interface StepPaletteItem {
  type: WorkflowStepType
  label: string
  description: string
  icon: string
  color: string
}

export const STEP_PALETTE_ITEMS: StepPaletteItem[] = [
  {
    type: 'APPROVAL',
    label: 'Approval',
    description: 'Requires approval from assigned users',
    icon: 'CheckCircle',
    color: 'bg-green-500',
  },
  {
    type: 'REVIEW',
    label: 'Review',
    description: 'Review step without formal approval',
    icon: 'Eye',
    color: 'bg-blue-500',
  },
  {
    type: 'SIGN_OFF',
    label: 'Sign Off',
    description: 'Final sign-off step',
    icon: 'PenTool',
    color: 'bg-purple-500',
  },
  {
    type: 'NOTIFICATION',
    label: 'Notification',
    description: 'Notify users without requiring action',
    icon: 'Bell',
    color: 'bg-yellow-500',
  },
  {
    type: 'PARALLEL',
    label: 'Parallel',
    description: 'Execute multiple steps in parallel',
    icon: 'GitBranch',
    color: 'bg-orange-500',
  },
]

// =============================================================================
// Condition Field Options
// =============================================================================

export interface ConditionField {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  options?: { value: string; label: string }[]
}

export const CONDITION_FIELDS: ConditionField[] = [
  { id: 'document_type', label: 'Document Type', type: 'select' },
  {
    id: 'confidentiality',
    label: 'Confidentiality Level',
    type: 'select',
    options: [
      { value: 'PUBLIC', label: 'Public' },
      { value: 'INTERNAL', label: 'Internal' },
      { value: 'CONFIDENTIAL', label: 'Confidential' },
      { value: 'HIGHLY_CONFIDENTIAL', label: 'Highly Confidential' },
    ],
  },
  { id: 'department', label: 'Department', type: 'select' },
  { id: 'file_size', label: 'File Size (MB)', type: 'number' },
  { id: 'has_attachments', label: 'Has Attachments', type: 'boolean' },
  {
    id: 'priority',
    label: 'Priority',
    type: 'select',
    options: [
      { value: 'LOW', label: 'Low' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'HIGH', label: 'High' },
      { value: 'URGENT', label: 'Urgent' },
    ],
  },
  { id: 'amount', label: 'Amount/Value', type: 'number' },
  {
    id: 'previous_step_outcome',
    label: 'Previous Step Outcome',
    type: 'select',
    options: [
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
  },
]

export const CONDITION_OPERATORS: { value: ConditionOperator; label: string; types: string[] }[] = [
  { value: 'equals', label: 'Equals', types: ['string', 'number', 'boolean', 'select'] },
  {
    value: 'not_equals',
    label: 'Does not equal',
    types: ['string', 'number', 'boolean', 'select'],
  },
  { value: 'contains', label: 'Contains', types: ['string'] },
  { value: 'not_contains', label: 'Does not contain', types: ['string'] },
  { value: 'greater_than', label: 'Greater than', types: ['number'] },
  { value: 'less_than', label: 'Less than', types: ['number'] },
  { value: 'greater_than_or_equal', label: 'Greater than or equal', types: ['number'] },
  { value: 'less_than_or_equal', label: 'Less than or equal', types: ['number'] },
  { value: 'is_empty', label: 'Is empty', types: ['string'] },
  { value: 'is_not_empty', label: 'Is not empty', types: ['string'] },
  { value: 'in', label: 'Is one of', types: ['string', 'select'] },
  { value: 'not_in', label: 'Is not one of', types: ['string', 'select'] },
]

// =============================================================================
// Utility Functions
// =============================================================================

export function createEmptyStep(order: number, position: Position): DesignerStep {
  return {
    id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Step ${order}`,
    description: '',
    order,
    step_type: 'APPROVAL',
    approval_type: 'ANY',
    assigned_users: [],
    assigned_role: '',
    conditions: [],
    auto_approve_if_same_user: false,
    require_comment: false,
    position,
    isValid: true,
    validationErrors: [],
  }
}

export function createEmptyTemplate(): DesignerTemplate {
  return {
    name: 'New Workflow Template',
    description: '',
    category: 'general',
    default_priority: 'MEDIUM',
    default_due_days: 7,
    applicable_document_types: [],
    is_active: false,
    steps: [],
    connections: [],
    viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  }
}

export function validateStep(step: DesignerStep): string[] {
  const errors: string[] = []

  if (!step.name.trim()) {
    errors.push('Step name is required')
  }

  if (step.assigned_users.length === 0 && !step.assigned_role && !step.assigned_department) {
    errors.push('At least one assignee (user, role, or department) is required')
  }

  if (
    step.approval_type === 'PERCENTAGE' &&
    (!step.approval_percentage || step.approval_percentage <= 0 || step.approval_percentage > 100)
  ) {
    errors.push('Valid approval percentage (1-100) is required')
  }

  if (step.sla_hours !== undefined && step.sla_hours < 0) {
    errors.push('SLA hours must be positive')
  }

  return errors
}

export function validateTemplate(template: DesignerTemplate): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!template.name.trim()) {
    errors.push('Template name is required')
  }

  if (template.steps.length === 0) {
    errors.push('At least one step is required')
  }

  // Validate each step
  template.steps.forEach((step, index) => {
    const stepErrors = validateStep(step)
    stepErrors.forEach((error) => {
      errors.push(`Step ${index + 1} (${step.name}): ${error}`)
    })
  })

  // Check for disconnected steps (except first step)
  const connectedStepIds = new Set<string>()
  connectedStepIds.add(template.steps[0]?.id) // First step is always connected
  template.connections.forEach((conn) => {
    connectedStepIds.add(conn.targetStepId)
  })

  template.steps.slice(1).forEach((step) => {
    if (!connectedStepIds.has(step.id)) {
      errors.push(`Step "${step.name}" is not connected to the workflow`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export function getStepColor(stepType: WorkflowStepType): string {
  const item = STEP_PALETTE_ITEMS.find((p) => p.type === stepType)
  return item?.color || 'bg-gray-500'
}

export function getStepIcon(stepType: WorkflowStepType): string {
  const item = STEP_PALETTE_ITEMS.find((p) => p.type === stepType)
  return item?.icon || 'Circle'
}
