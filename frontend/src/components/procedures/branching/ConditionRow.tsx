/**
 * ConditionRow — Single leaf condition (field, operator, value).
 */

import { Trash2 } from 'lucide-react'
import { FieldSelector } from './FieldSelector'
import { OperatorSelector } from './OperatorSelector'
import { ValueInput } from './ValueInput'
import type { LeafCondition } from '@/types/procedure'

interface ConditionRowProps {
  condition: LeafCondition
  onChange: (condition: LeafCondition) => void
  onRemove: () => void
}

export function ConditionRow({ condition, onChange, onRemove }: ConditionRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-gray-50 p-2 dark:bg-gray-700/50">
      <FieldSelector
        value={condition.field}
        onChange={(field) => onChange({ ...condition, field, operator: '', value: '' })}
      />
      <OperatorSelector
        field={condition.field}
        value={condition.operator}
        onChange={(operator) => onChange({ ...condition, operator })}
      />
      <ValueInput
        field={condition.field}
        value={condition.value}
        onChange={(value) => onChange({ ...condition, value })}
      />

      {/* Extra fields for specific condition types */}
      {condition.field === 'quiz_score' && (
        <input
          type="text"
          value={condition.quiz_id || ''}
          onChange={(e) => onChange({ ...condition, quiz_id: e.target.value })}
          placeholder="Quiz ID"
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
      )}
      {condition.field === 'step_completed' && (
        <input
          type="text"
          value={condition.step_id || ''}
          onChange={(e) => onChange({ ...condition, step_id: e.target.value })}
          placeholder="Step ID"
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
      )}
      {condition.field === 'custom_field' && (
        <input
          type="text"
          value={condition.key || ''}
          onChange={(e) => onChange({ ...condition, key: e.target.value })}
          placeholder="Key"
          className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        />
      )}

      <button
        onClick={onRemove}
        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        aria-label="Remove condition"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
