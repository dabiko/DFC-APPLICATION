/**
 * ReactFlowCanvas Component
 *
 * An enhanced workflow canvas using React Flow for a more polished UX.
 * Features: Minimap, controls, better edge routing, snap-to-grid.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  ConnectionLineType,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type NodeChange,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { CheckCircle, Eye, PenTool, Bell, GitBranch, Trash2, Settings } from 'lucide-react'
import type { DesignerStep, Connection as DesignerConnection } from './types'
import type { DesignerStateReturn } from './useDesignerState'

// =============================================================================
// Types
// =============================================================================

interface ReactFlowCanvasProps {
  designer: DesignerStateReturn
  onStepDoubleClick?: (step: DesignerStep) => void
}

interface StepNodeData {
  step: DesignerStep
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onConfigure: () => void
}

// =============================================================================
// Custom Node Component
// =============================================================================

const STEP_ICONS: Record<string, typeof CheckCircle> = {
  APPROVAL: CheckCircle,
  REVIEW: Eye,
  SIGN_OFF: PenTool,
  NOTIFICATION: Bell,
  PARALLEL: GitBranch,
}

const STEP_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  APPROVAL: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-500',
    icon: 'text-green-500',
  },
  REVIEW: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    icon: 'text-blue-500',
  },
  SIGN_OFF: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-500',
    icon: 'text-purple-500',
  },
  NOTIFICATION: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    icon: 'text-yellow-500',
  },
  PARALLEL: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-500',
    icon: 'text-orange-500',
  },
}

function StepNode({ data, selected }: { data: StepNodeData; selected: boolean }) {
  const { step, onSelect, onDelete, onConfigure } = data
  const Icon = STEP_ICONS[step.step_type] || CheckCircle
  const colors = STEP_COLORS[step.step_type] || STEP_COLORS.APPROVAL

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onConfigure}
      className={`
        relative min-w-[200px] rounded-lg border-2 shadow-sm transition-all cursor-pointer
        ${colors.bg} ${selected ? colors.border : 'border-gray-200 dark:border-gray-700'}
        ${selected ? 'shadow-lg ring-2 ring-blue-500/20' : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'}
      `}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 py-2 border-b ${selected ? colors.border : 'border-gray-200 dark:border-gray-700'}`}
      >
        <div className={`p-1.5 rounded-md ${colors.bg}`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {step.name}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {step.step_type.charAt(0) + step.step_type.slice(1).toLowerCase().replace('_', ' ')}
          </p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onConfigure()
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <Settings className="h-3.5 w-3.5 text-gray-500" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-3 py-2">
        {step.description && (
          <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-2">
            {step.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {step.assigned_role && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              {step.assigned_role}
            </span>
          )}
          {step.sla_hours && (
            <span className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
              {step.sla_hours}h SLA
            </span>
          )}
          {step.require_comment && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              Comment required
            </span>
          )}
        </div>
      </div>

      {/* Validation indicator */}
      {step.validationErrors && step.validationErrors.length > 0 && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">{step.validationErrors.length}</span>
        </div>
      )}

      {/* Connection handles are added by React Flow */}
    </div>
  )
}

// =============================================================================
// Node Types Registration
// =============================================================================

const nodeTypes: NodeTypes = {
  stepNode: StepNode,
}

// =============================================================================
// Main Component
// =============================================================================

export default function ReactFlowCanvas({ designer, onStepDoubleClick }: ReactFlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)

  // Convert designer steps to React Flow nodes
  const initialNodes: Node[] = useMemo(
    () =>
      designer.template.steps.map((step) => ({
        id: step.id,
        type: 'stepNode',
        position: step.position,
        data: {
          step,
          isSelected: designer.selectedStepId === step.id,
          onSelect: () => designer.selectStep(step.id),
          onDelete: () => designer.deleteStep(step.id),
          onConfigure: () => onStepDoubleClick?.(step),
        },
        selected: designer.selectedStepId === step.id,
      })),
    [designer.template.steps, designer.selectedStepId, onStepDoubleClick]
  )

  // Convert designer connections to React Flow edges
  const initialEdges: Edge[] = useMemo(
    () =>
      designer.template.connections.map((conn) => ({
        id: conn.id,
        source: conn.sourceStepId,
        target: conn.targetStepId,
        type: 'default',
        label: conn.label,
        animated: conn.isConditional,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { strokeWidth: 2 },
      })),
    [designer.template.connections]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Sync with designer state
  useEffect(() => {
    setNodes(initialNodes)
  }, [designer.template.steps, designer.selectedStepId, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [designer.template.connections, setEdges])

  // Handle node position changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes)

      // Update designer state with new positions
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          designer.moveStep(change.id, change.position)
        }
      })
    },
    [onNodesChange, designer]
  )

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newConnection: DesignerConnection = {
          id: `conn-${Date.now()}`,
          sourceStepId: connection.source,
          targetStepId: connection.target,
          isConditional: false,
        }
        designer.addConnection(newConnection)
      }
    },
    [designer]
  )

  // Handle drop from palette
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const stepType = event.dataTransfer.getData('workflow/step-type')
      if (!stepType || !reactFlowWrapper.current) return

      const bounds = reactFlowWrapper.current.getBoundingClientRect()
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 40,
      }

      // Snap to grid (20px)
      position.x = Math.round(position.x / 20) * 20
      position.y = Math.round(position.y / 20) * 20

      const newStep: DesignerStep = {
        id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: `${stepType.charAt(0) + stepType.slice(1).toLowerCase()} Step`,
        description: '',
        order: designer.template.steps.length + 1,
        step_type: stepType as DesignerStep['step_type'],
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

      designer.addStep(newStep)
    },
    [designer]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }, [])

  // Handle node selection
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      designer.selectStep(node.id)
    },
    [designer]
  )

  // Handle edge selection
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      designer.selectConnection(edge.id)
    },
    [designer]
  )

  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    designer.selectStep(null)
    designer.selectConnection(null)
  }, [designer])

  // Custom minimap node color
  const minimapNodeColor = useCallback((node: Node) => {
    const colors: Record<string, string> = {
      APPROVAL: '#22c55e',
      REVIEW: '#3b82f6',
      SIGN_OFF: '#a855f7',
      NOTIFICATION: '#eab308',
      PARALLEL: '#f97316',
    }
    const data = node.data as unknown as StepNodeData | undefined
    return colors[data?.step?.step_type ?? ''] || '#94a3b8'
  }, [])

  return (
    <div
      ref={reactFlowWrapper}
      className="flex-1 h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        attributionPosition="bottom-left"
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          className="bg-gray-50 dark:bg-gray-900"
        />
        <Controls
          position="top-left"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />
        <MiniMap
          position="bottom-right"
          nodeColor={minimapNodeColor}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        />

        {/* Empty state */}
        {designer.template.steps.length === 0 && (
          <Panel position="top-center" className="mt-20">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <GitBranch className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                Start Building Your Workflow
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Drag steps from the palette on the left and drop them here to create your workflow
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  )
}
