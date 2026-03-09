/**
 * BranchPreview — Preview condition as JSON and describe in human-readable format.
 */

import { useState } from 'react'
import { Code, Type } from 'lucide-react'
import type { BranchCondition, LeafCondition } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface BranchPreviewProps {
  condition: BranchCondition
}

function isLeaf(c: BranchCondition): c is LeafCondition {
  return 'field' in c
}

function describeCondition(c: BranchCondition, depth = 0): string {
  if (isLeaf(c)) {
    const extras: string[] = []
    if (c.step_id) extras.push(`step=${c.step_id}`)
    if (c.quiz_id) extras.push(`quiz=${c.quiz_id}`)
    if (c.key) extras.push(`key=${c.key}`)
    const extraStr = extras.length > 0 ? ` (${extras.join(', ')})` : ''
    return `${c.field} ${c.operator} ${JSON.stringify(c.value)}${extraStr}`
  }

  const type = 'all' in c ? 'ALL' : 'ANY'
  const children = ('all' in c ? c.all : c.any) as BranchCondition[]
  if (children.length === 0) return `${type} (empty)`

  const indent = '  '.repeat(depth + 1)
  const lines = children.map((child) => `${indent}• ${describeCondition(child, depth + 1)}`)
  return `${type} of:\n${lines.join('\n')}`
}

function validateCondition(c: BranchCondition): string[] {
  const errors: string[] = []
  if (isLeaf(c)) {
    if (!c.field) errors.push('Missing field')
    if (!c.operator) errors.push('Missing operator')
    if (c.value === '' || c.value === null || c.value === undefined) errors.push('Missing value')
  } else {
    const children = ('all' in c ? c.all : c.any) as BranchCondition[]
    if (children.length === 0) errors.push('Empty condition group')
    children.forEach((child) => errors.push(...validateCondition(child)))
  }
  return errors
}

export function BranchPreview({ condition }: BranchPreviewProps) {
  const [mode, setMode] = useState<'description' | 'json'>('description')
  const errors = validateCondition(condition)

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setMode('description')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            mode === 'description'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Type className="h-3 w-3" />
          Description
        </button>
        <button
          onClick={() => setMode('json')}
          className={cn(
            'flex items-center gap-1 rounded px-2 py-1 text-xs',
            mode === 'json'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <Code className="h-3 w-3" />
          JSON
        </button>
        {errors.length > 0 && (
          <span className="ml-auto text-xs text-red-500">
            {errors.length} validation issue{errors.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {mode === 'description' ? (
        <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 font-mono">
          {describeCondition(condition)}
        </pre>
      ) : (
        <pre className="whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300 font-mono max-h-48 overflow-auto">
          {JSON.stringify(condition, null, 2)}
        </pre>
      )}

      {errors.length > 0 && (
        <div className="mt-2 space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-500">
              • {err}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
