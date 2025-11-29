/**
 * WorkflowStepNode Component
 *
 * Represents a single step in the workflow designer canvas.
 * Supports dragging, selection, and connection handles.
 */

import React, { useRef, useState, useCallback } from 'react'
import {
  CheckCircle,
  Eye,
  PenTool,
  Bell,
  GitBranch,
  GripVertical,
  AlertCircle,
  Circle,
  Clock,
  Users,
} from 'lucide-react'
import type { DesignerStep, Position } from './types'

interface WorkflowStepNodeProps {
  step: DesignerStep
  isSelected: boolean
  isConnecting: boolean
  onSelect: () => void
  onDrag: (position: Position) => void
  onDragEnd: () => void
  onConnectStart: () => void
  onConnectEnd: () => void
  onDoubleClick: () => void
  zoom: number
}

const STEP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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
    icon: 'text-green-600 dark:text-green-400',
  },
  REVIEW: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-500',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  SIGN_OFF: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-500',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  NOTIFICATION: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-500',
    icon: 'text-yellow-600 dark:text-yellow-400',
  },
  PARALLEL: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-500',
    icon: 'text-orange-600 dark:text-orange-400',
  },
}

export default function WorkflowStepNode({
  step,
  isSelected,
  isConnecting,
  onSelect,
  onDrag,
  onDragEnd,
  onConnectStart,
  onConnectEnd,
  onDoubleClick,
  zoom,
}: WorkflowStepNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 })

  const Icon = STEP_ICONS[step.step_type] || Circle
  const colors = STEP_COLORS[step.step_type] || STEP_COLORS.APPROVAL

  const hasErrors = step.validationErrors && step.validationErrors.length > 0
  const hasAssignment =
    step.assigned_users.length > 0 || step.assigned_role || step.assigned_department

  // Handle drag start
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Only left click
      e.stopPropagation()

      // Check if clicking on connection handle
      if ((e.target as HTMLElement).closest('.connection-handle')) {
        return
      }

      onSelect()

      if (!nodeRef.current) return

      const rect = nodeRef.current.getBoundingClientRect()
      setDragOffset({
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      })
      setIsDragging(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!nodeRef.current?.parentElement) return

        const parentRect = nodeRef.current.parentElement.getBoundingClientRect()
        const x = (moveEvent.clientX - parentRect.left) / zoom - dragOffset.x
        const y = (moveEvent.clientY - parentRect.top) / zoom - dragOffset.y

        onDrag({ x: Math.max(0, x), y: Math.max(0, y) })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        onDragEnd()
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [onSelect, onDrag, onDragEnd, zoom, dragOffset]
  )

  // Handle connection handle click
  const handleConnectHandleClick = useCallback(
    (e: React.MouseEvent, isSource: boolean) => {
      e.stopPropagation()
      if (isSource) {
        onConnectStart()
      } else if (isConnecting) {
        onConnectEnd()
      }
    },
    [isConnecting, onConnectStart, onConnectEnd]
  )

  return (
    <div
      ref={nodeRef}
      className={`absolute select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: step.position.x,
        top: step.position.y,
        width: 200,
        zIndex: isSelected ? 100 : isDragging ? 50 : 10,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick()
      }}
    >
      {/* Top connection handle (target) */}
      <div
        className={`connection-handle absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair transition-all z-20
          ${
            isConnecting
              ? 'bg-purple-500 border-purple-600 scale-125'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-purple-500 hover:scale-110'
          }`}
        onClick={(e) => handleConnectHandleClick(e, false)}
        title="Drop connection here"
      />

      {/* Main node card */}
      <div
        className={`relative rounded-lg border-2 shadow-sm transition-all
          ${colors.bg}
          ${isSelected ? 'border-blue-500 shadow-lg ring-2 ring-blue-500/20' : colors.border}
          ${isDragging ? 'shadow-xl scale-105' : ''}
          ${hasErrors ? 'border-red-500' : ''}
        `}
      >
        {/* Step order badge */}
        <div className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-gray-800 dark:bg-gray-600 text-white text-xs font-bold flex items-center justify-center shadow-md">
          {step.order}
        </div>

        {/* Error indicator */}
        {hasErrors && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md">
            <AlertCircle className="h-3 w-3" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700">
          <div className={`p-1.5 rounded-md ${colors.bg}`}>
            <Icon className={`h-4 w-4 ${colors.icon}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {step.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {step.step_type.toLowerCase().replace('_', ' ')}
            </p>
          </div>
          <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
        </div>

        {/* Body */}
        <div className="p-3 space-y-2">
          {/* Assignment info */}
          {hasAssignment && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Users className="h-3 w-3" />
              <span className="truncate">
                {step.assigned_users.length > 0
                  ? `${step.assigned_users.length} user(s)`
                  : step.assigned_role || 'Department assigned'}
              </span>
            </div>
          )}

          {/* SLA info */}
          {step.sla_hours && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{step.sla_hours}h SLA</span>
            </div>
          )}

          {/* Approval type badge */}
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {step.approval_type}
              {step.approval_type === 'PERCENTAGE' && step.approval_percentage && (
                <span className="ml-1">{step.approval_percentage}%</span>
              )}
            </span>
            {step.require_comment && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                Comment
              </span>
            )}
          </div>

          {/* Conditions indicator */}
          {step.conditions.length > 0 && (
            <div className="text-xs text-purple-600 dark:text-purple-400">
              {step.conditions.length} condition(s)
            </div>
          )}
        </div>
      </div>

      {/* Bottom connection handle (source) */}
      <div
        className={`connection-handle absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 cursor-crosshair transition-all z-20
          ${
            isDragging
              ? 'opacity-50'
              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:scale-110'
          }`}
        onClick={(e) => handleConnectHandleClick(e, true)}
        title="Drag to connect"
      />
    </div>
  )
}
