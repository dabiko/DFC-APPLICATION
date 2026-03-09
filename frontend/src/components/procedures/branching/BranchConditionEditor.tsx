/**
 * BranchConditionEditor — Visual condition builder for step branching.
 * Allows building AND/OR condition trees with nested groups.
 */

import { useState } from 'react'
import { GitBranch, X, Eye, EyeOff } from 'lucide-react'
import { ConditionGroup } from './ConditionGroup'
import { BranchPreview } from './BranchPreview'
import type { BranchCondition } from '@/types/procedure'

interface BranchConditionEditorProps {
  value: BranchCondition | null
  onChange: (value: BranchCondition | null) => void
}

export function BranchConditionEditor({ value, onChange }: BranchConditionEditorProps) {
  const [showPreview, setShowPreview] = useState(false)

  const handleEnable = () => {
    onChange({ all: [] })
  }

  const handleDisable = () => {
    onChange(null)
  }

  if (!value) {
    return (
      <button
        onClick={handleEnable}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-600 dark:text-gray-400"
      >
        <GitBranch className="h-3.5 w-3.5" />
        Add Branch Condition
      </button>
    )
  }

  const groupType: 'all' | 'any' = 'all' in value ? 'all' : 'any'
  const conditions = ('all' in value ? value.all : value.any) as BranchCondition[]

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Branch Condition
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button
            onClick={handleDisable}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>

      <ConditionGroup
        groupType={groupType}
        conditions={conditions}
        onChange={(newType, newConditions) => {
          onChange({ [newType]: newConditions } as BranchCondition)
        }}
      />

      {showPreview && <BranchPreview condition={value} />}
    </div>
  )
}
