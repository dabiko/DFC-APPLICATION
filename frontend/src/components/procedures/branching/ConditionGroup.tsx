/**
 * ConditionGroup — ALL/ANY group with nested conditions.
 */

import { Plus, Trash2 } from 'lucide-react'
import { ConditionRow } from './ConditionRow'
import type { BranchCondition, LeafCondition } from '@/types/procedure'

interface ConditionGroupProps {
  groupType: 'all' | 'any'
  conditions: BranchCondition[]
  onChange: (groupType: 'all' | 'any', conditions: BranchCondition[]) => void
  onRemove?: () => void
  depth?: number
}

function isLeaf(c: BranchCondition): c is LeafCondition {
  return 'field' in c
}

export function ConditionGroup({
  groupType,
  conditions,
  onChange,
  onRemove,
  depth = 0,
}: ConditionGroupProps) {
  const toggleGroupType = () => {
    onChange(groupType === 'all' ? 'any' : 'all', conditions)
  }

  const addCondition = () => {
    const newLeaf: LeafCondition = { field: '', operator: '', value: '' }
    onChange(groupType, [...conditions, newLeaf])
  }

  const addNestedGroup = () => {
    const nested: BranchCondition = { all: [] }
    onChange(groupType, [...conditions, nested])
  }

  const updateCondition = (index: number, updated: BranchCondition) => {
    const newConditions = [...conditions]
    newConditions[index] = updated
    onChange(groupType, newConditions)
  }

  const removeCondition = (index: number) => {
    onChange(
      groupType,
      conditions.filter((_, i) => i !== index)
    )
  }

  const borderColor =
    depth === 0
      ? 'border-blue-200 dark:border-blue-800'
      : 'border-purple-200 dark:border-purple-800'
  const bgColor =
    depth === 0 ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'bg-purple-50/50 dark:bg-purple-900/10'

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleGroupType}
            className="rounded-full bg-white px-3 py-0.5 text-xs font-bold shadow-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          >
            {groupType.toUpperCase()}
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {groupType === 'all' ? 'All conditions must match' : 'Any condition must match'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={addCondition}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
          >
            <Plus className="h-3 w-3" />
            Condition
          </button>
          {depth < 2 && (
            <button
              onClick={addNestedGroup}
              className="flex items-center gap-1 rounded px-2 py-1 text-xs text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              <Plus className="h-3 w-3" />
              Group
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 rounded text-gray-400 hover:text-red-500"
              aria-label="Remove group"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {conditions.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2 text-center">
          No conditions. Add one above.
        </p>
      )}

      {conditions.map((cond, idx) => {
        if (isLeaf(cond)) {
          return (
            <ConditionRow
              key={idx}
              condition={cond}
              onChange={(updated) => updateCondition(idx, updated)}
              onRemove={() => removeCondition(idx)}
            />
          )
        }
        // Nested group
        const nestedType = 'all' in cond ? 'all' : 'any'
        const nestedConditions = ('all' in cond ? cond.all : cond.any) as BranchCondition[]
        return (
          <ConditionGroup
            key={idx}
            groupType={nestedType}
            conditions={nestedConditions}
            onChange={(newType, newConditions) => {
              updateCondition(idx, { [newType]: newConditions } as BranchCondition)
            }}
            onRemove={() => removeCondition(idx)}
            depth={depth + 1}
          />
        )
      })}
    </div>
  )
}
