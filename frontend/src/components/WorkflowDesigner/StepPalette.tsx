/**
 * StepPalette Component
 *
 * Left sidebar with draggable step types for the workflow designer.
 */

import React from 'react'
import { CheckCircle, Eye, PenTool, Bell, GitBranch, GripVertical } from 'lucide-react'
import type { StepPaletteItem } from './types'
import { STEP_PALETTE_ITEMS } from './types'

interface StepPaletteProps {
  className?: string
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CheckCircle,
  Eye,
  PenTool,
  Bell,
  GitBranch,
}

function PaletteItem({ item }: { item: StepPaletteItem }) {
  const Icon = ICONS[item.icon] || CheckCircle

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('workflow/step-type', item.type)
    e.dataTransfer.effectAllowed = 'copy'

    // Create custom drag image
    const dragImage = document.createElement('div')
    dragImage.className =
      'fixed pointer-events-none bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 border-2 border-blue-500'
    dragImage.innerHTML = `
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 ${item.color} rounded-lg flex items-center justify-center">
          <svg class="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
        <span class="text-sm font-medium text-gray-900 dark:text-white">${item.label}</span>
      </div>
    `
    dragImage.style.transform = 'translate(-50%, -50%)'
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 60, 25)

    // Clean up drag image
    setTimeout(() => document.body.removeChild(dragImage), 0)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 cursor-grab hover:border-blue-500 hover:shadow-md transition-all group"
    >
      <GripVertical className="h-4 w-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 flex-shrink-0" />
      <div
        className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.description}</p>
      </div>
    </div>
  )
}

export default function StepPalette({ className = '' }: StepPaletteProps) {
  return (
    <div
      className={`w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Step Types</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Drag steps to the canvas</p>
      </div>

      {/* Palette items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {STEP_PALETTE_ITEMS.map((item) => (
          <PaletteItem key={item.type} item={item} />
        ))}
      </div>

      {/* Help text */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-2">Tips</h4>
        <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Double-click a step to edit</li>
          <li>• Click connection handles to link steps</li>
          <li>• Use Ctrl+Z to undo changes</li>
          <li>• Hold Alt and drag to pan canvas</li>
        </ul>
      </div>
    </div>
  )
}
