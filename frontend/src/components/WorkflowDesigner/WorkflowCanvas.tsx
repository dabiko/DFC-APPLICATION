/**
 * WorkflowCanvas Component
 *
 * The main canvas for the visual workflow designer.
 * Handles drag-and-drop, panning, zooming, and rendering steps/connections.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Move, Grid3X3 } from 'lucide-react'
import type { DesignerStep, Connection, Position } from './types'
import { createEmptyStep } from './types'
import type { DesignerStateReturn } from './useDesignerState'
import WorkflowStepNode from './WorkflowStepNode'
import ConnectionLine from './ConnectionLine'

interface WorkflowCanvasProps {
  designer: DesignerStateReturn
  onStepDoubleClick?: (step: DesignerStep) => void
}

const GRID_SIZE = 20
const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.1

export default function WorkflowCanvas({ designer, onStepDoubleClick }: WorkflowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Position>({ x: 0, y: 0 })
  const [showGrid, setShowGrid] = useState(true)
  const [dragPreview, setDragPreview] = useState<{ position: Position; type: string } | null>(null)
  const [connectingLine, setConnectingLine] = useState<{ from: Position; to: Position } | null>(
    null
  )

  const { viewport } = designer.template

  // Handle zoom
  const handleZoom = useCallback(
    (delta: number) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom + delta))
      designer.setViewport({ ...viewport, zoom: newZoom })
    },
    [viewport, designer]
  )

  const handleZoomIn = useCallback(() => handleZoom(ZOOM_STEP), [handleZoom])
  const handleZoomOut = useCallback(() => handleZoom(-ZOOM_STEP), [handleZoom])

  const handleFitToScreen = useCallback(() => {
    if (!canvasRef.current || designer.template.steps.length === 0) return

    const steps = designer.template.steps
    const minX = Math.min(...steps.map((s) => s.position.x))
    const maxX = Math.max(...steps.map((s) => s.position.x + 200))
    const minY = Math.min(...steps.map((s) => s.position.y))
    const maxY = Math.max(...steps.map((s) => s.position.y + 100))

    const contentWidth = maxX - minX + 100
    const contentHeight = maxY - minY + 100

    const canvas = canvasRef.current
    const canvasWidth = canvas.clientWidth
    const canvasHeight = canvas.clientHeight

    const scaleX = canvasWidth / contentWidth
    const scaleY = canvasHeight / contentHeight
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY) * 0.9))

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    designer.setViewport({
      zoom: newZoom,
      pan: {
        x: canvasWidth / 2 - centerX * newZoom,
        y: canvasHeight / 2 - centerY * newZoom,
      },
    })
  }, [designer])

  // Handle wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
        handleZoom(delta)
      }
    },
    [handleZoom]
  )

  // Handle panning
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault()
        setIsPanning(true)
        setPanStart({ x: e.clientX - viewport.pan.x, y: e.clientY - viewport.pan.y })
      } else if (e.button === 0 && e.target === canvasRef.current) {
        // Click on empty canvas area - deselect
        designer.selectStep(null)
        designer.selectConnection(null)
      }
    },
    [viewport.pan, designer]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        designer.setViewport({
          ...viewport,
          pan: {
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
          },
        })
      }

      // Update connecting line preview
      if (designer.isConnecting && designer.connectingFrom) {
        const sourceStep = designer.template.steps.find((s) => s.id === designer.connectingFrom)
        if (sourceStep && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect()
          setConnectingLine({
            from: {
              x: sourceStep.position.x + 100, // Center of step
              y: sourceStep.position.y + 40, // Bottom of step
            },
            to: {
              x: (e.clientX - rect.left - viewport.pan.x) / viewport.zoom,
              y: (e.clientY - rect.top - viewport.pan.y) / viewport.zoom,
            },
          })
        }
      }
    },
    [isPanning, panStart, viewport, designer]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (designer.isConnecting) {
      designer.endConnecting()
      setConnectingLine(null)
    }
  }, [designer])

  // Handle drop from palette
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'

      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        const x = (e.clientX - rect.left - viewport.pan.x) / viewport.zoom
        const y = (e.clientY - rect.top - viewport.pan.y) / viewport.zoom

        // Snap to grid
        const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE
        const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE

        const stepType = e.dataTransfer.types.includes('workflow/step-type') ? 'step' : null

        if (stepType) {
          setDragPreview({ position: { x: snappedX, y: snappedY }, type: stepType })
        }
      }
    },
    [viewport]
  )

  const handleDragLeave = useCallback(() => {
    setDragPreview(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragPreview(null)

      const stepType = e.dataTransfer.getData('workflow/step-type')
      if (!stepType || !canvasRef.current) return

      const rect = canvasRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left - viewport.pan.x) / viewport.zoom
      const y = (e.clientY - rect.top - viewport.pan.y) / viewport.zoom

      // Snap to grid
      const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE
      const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE

      const newStep = createEmptyStep(designer.template.steps.length + 1, {
        x: snappedX - 100,
        y: snappedY - 40,
      })
      newStep.step_type = stepType as DesignerStep['step_type']
      newStep.name = `${stepType.charAt(0) + stepType.slice(1).toLowerCase()} Step`

      designer.addStep(newStep)
    },
    [viewport, designer]
  )

  // Handle step drag
  const handleStepDrag = useCallback(
    (stepId: string, position: Position) => {
      // Snap to grid
      const snappedX = Math.round(position.x / GRID_SIZE) * GRID_SIZE
      const snappedY = Math.round(position.y / GRID_SIZE) * GRID_SIZE
      designer.moveStep(stepId, { x: snappedX, y: snappedY })
    },
    [designer]
  )

  const handleStepDragEnd = useCallback(() => {
    // Reorder steps after drag ends
    designer.reorderSteps()
  }, [designer])

  // Handle connection creation
  const handleConnectStart = useCallback(
    (stepId: string) => {
      designer.startConnecting(stepId)
    },
    [designer]
  )

  const handleConnectEnd = useCallback(
    (targetStepId: string) => {
      if (designer.connectingFrom && designer.connectingFrom !== targetStepId) {
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          sourceStepId: designer.connectingFrom,
          targetStepId,
          isConditional: false,
        }
        designer.addConnection(newConnection)
      }
      setConnectingLine(null)
    },
    [designer]
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          designer.redo()
        } else {
          designer.undo()
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && designer.selectedStepId) {
        e.preventDefault()
        designer.copyStep(designer.selectedStepId)
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && designer.clipboard) {
        e.preventDefault()
        const pastePosition = {
          x: (viewport.pan.x * -1 + 200) / viewport.zoom,
          y: (viewport.pan.y * -1 + 200) / viewport.zoom,
        }
        designer.pasteStep(pastePosition)
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (designer.selectedStepId) {
          e.preventDefault()
          designer.deleteStep(designer.selectedStepId)
        } else if (designer.selectedConnectionId) {
          e.preventDefault()
          designer.deleteConnection(designer.selectedConnectionId)
        }
      }

      if (e.key === 'Escape') {
        designer.selectStep(null)
        designer.selectConnection(null)
        designer.endConnecting()
        setConnectingLine(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [designer, viewport])

  // Grid pattern
  const gridPattern = useMemo(() => {
    const scaledSize = GRID_SIZE * viewport.zoom
    return `
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent ${scaledSize - 1}px,
        rgba(0, 0, 0, 0.05) ${scaledSize - 1}px,
        rgba(0, 0, 0, 0.05) ${scaledSize}px
      ),
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent ${scaledSize - 1}px,
        rgba(0, 0, 0, 0.05) ${scaledSize - 1}px,
        rgba(0, 0, 0, 0.05) ${scaledSize}px
      )
    `
  }, [viewport.zoom])

  return (
    <div className="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Canvas Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
        <span className="px-2 text-sm font-medium text-gray-600 dark:text-gray-300 min-w-[60px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />
        <button
          onClick={handleFitToScreen}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Fit to Screen"
        >
          <Maximize2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-md transition-colors ${
            showGrid
              ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
          title="Toggle Grid"
        >
          <Grid3X3 className="h-4 w-4" />
        </button>
      </div>

      {/* Pan indicator */}
      {isPanning && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-blue-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
          <Move className="h-4 w-4" />
          <span className="text-sm font-medium">Panning</span>
        </div>
      )}

      {/* Connecting indicator */}
      {designer.isConnecting && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-purple-500 text-white px-3 py-1.5 rounded-lg shadow-lg">
          <span className="text-sm font-medium">Click a step to connect</span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{
          backgroundImage: showGrid ? gridPattern : 'none',
          backgroundPosition: `${viewport.pan.x}px ${viewport.pan.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Transformed content */}
        <div
          className="absolute"
          style={{
            transform: `translate(${viewport.pan.x}px, ${viewport.pan.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG for connections */}
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width: '10000px', height: '10000px', overflow: 'visible' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="currentColor"
                  className="text-gray-400 dark:text-gray-500"
                />
              </marker>
              <marker
                id="arrowhead-selected"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
              </marker>
            </defs>

            {/* Existing connections */}
            {designer.template.connections.map((connection) => {
              const sourceStep = designer.template.steps.find(
                (s) => s.id === connection.sourceStepId
              )
              const targetStep = designer.template.steps.find(
                (s) => s.id === connection.targetStepId
              )
              if (!sourceStep || !targetStep) return null

              return (
                <ConnectionLine
                  key={connection.id}
                  connection={connection}
                  sourcePosition={{
                    x: sourceStep.position.x + 100,
                    y: sourceStep.position.y + 80,
                  }}
                  targetPosition={{
                    x: targetStep.position.x + 100,
                    y: targetStep.position.y,
                  }}
                  isSelected={designer.selectedConnectionId === connection.id}
                  onClick={() => designer.selectConnection(connection.id)}
                  onDelete={() => designer.deleteConnection(connection.id)}
                />
              )
            })}

            {/* Connecting line preview */}
            {connectingLine && (
              <path
                d={`M ${connectingLine.from.x} ${connectingLine.from.y}
                    C ${connectingLine.from.x} ${connectingLine.from.y + 50},
                      ${connectingLine.to.x} ${connectingLine.to.y - 50},
                      ${connectingLine.to.x} ${connectingLine.to.y}`}
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                markerEnd="url(#arrowhead)"
              />
            )}
          </svg>

          {/* Step nodes */}
          {designer.template.steps.map((step) => (
            <WorkflowStepNode
              key={step.id}
              step={step}
              isSelected={designer.selectedStepId === step.id}
              isConnecting={designer.isConnecting}
              onSelect={() => designer.selectStep(step.id)}
              onDrag={(position) => handleStepDrag(step.id, position)}
              onDragEnd={handleStepDragEnd}
              onConnectStart={() => handleConnectStart(step.id)}
              onConnectEnd={() => handleConnectEnd(step.id)}
              onDoubleClick={() => onStepDoubleClick?.(step)}
              zoom={viewport.zoom}
            />
          ))}

          {/* Drop preview */}
          {dragPreview && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: dragPreview.position.x - 100,
                top: dragPreview.position.y - 40,
              }}
            >
              <div className="w-[200px] h-[80px] border-2 border-dashed border-blue-500 rounded-lg bg-blue-50/50 dark:bg-blue-900/20" />
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {designer.template.steps.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <Grid3X3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              Start Building Your Workflow
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Drag steps from the palette on the left and drop them here to create your workflow
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
