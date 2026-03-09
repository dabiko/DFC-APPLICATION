/**
 * OperatorSelector — Dropdown filtered by field type.
 */

interface OperatorSelectorProps {
  field: string
  value: string
  onChange: (value: string) => void
}

const OPERATORS_BY_FIELD: Record<string, { value: string; label: string }[]> = {
  role: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'In List' },
  ],
  department: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'in', label: 'In List' },
  ],
  step_completed: [{ value: 'eq', label: 'Is' }],
  quiz_score: [
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'eq', label: '=' },
  ],
  quiz_passed: [{ value: 'eq', label: 'Is' }],
  custom_field: [
    { value: 'eq', label: 'Equals' },
    { value: 'neq', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
  ],
  time_elapsed: [
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
  ],
  attempt_count: [
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'eq', label: '=' },
  ],
  assignment_source: [
    { value: 'eq', label: 'Equals' },
    { value: 'in', label: 'In List' },
  ],
}

const DEFAULT_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
]

export function OperatorSelector({ field, value, onChange }: OperatorSelectorProps) {
  const operators = OPERATORS_BY_FIELD[field] || DEFAULT_OPERATORS

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      aria-label="Condition operator"
    >
      <option value="">Op...</option>
      {operators.map((op) => (
        <option key={op.value} value={op.value}>
          {op.label}
        </option>
      ))}
    </select>
  )
}
