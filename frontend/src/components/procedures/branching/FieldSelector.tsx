/**
 * FieldSelector — Dropdown for selecting a branch condition field.
 */

interface FieldSelectorProps {
  value: string
  onChange: (value: string) => void
}

const FIELD_OPTIONS = [
  { value: 'role', label: 'User Role', group: 'User' },
  { value: 'department', label: 'Department', group: 'User' },
  { value: 'step_completed', label: 'Step Completed', group: 'Step' },
  { value: 'quiz_score', label: 'Quiz Score', group: 'Quiz' },
  { value: 'quiz_passed', label: 'Quiz Passed', group: 'Quiz' },
  { value: 'custom_field', label: 'Custom Field', group: 'Custom' },
  { value: 'time_elapsed', label: 'Time Elapsed (min)', group: 'Time' },
  { value: 'attempt_count', label: 'Attempt Count', group: 'Training' },
  { value: 'assignment_source', label: 'Assignment Source', group: 'Training' },
]

export function FieldSelector({ value, onChange }: FieldSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      aria-label="Condition field"
    >
      <option value="">Select field...</option>
      {FIELD_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export { FIELD_OPTIONS }
