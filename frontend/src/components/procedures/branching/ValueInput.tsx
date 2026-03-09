/**
 * ValueInput — Dynamic input based on field/operator.
 */

interface ValueInputProps {
  field: string
  value: unknown
  onChange: (value: unknown) => void
}

export function ValueInput({ field, value, onChange }: ValueInputProps) {
  if (field === 'quiz_passed' || field === 'step_completed') {
    return (
      <select
        value={String(value ?? true)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        aria-label="Condition value"
      >
        <option value="true">True</option>
        <option value="false">False</option>
      </select>
    )
  }

  if (field === 'quiz_score' || field === 'time_elapsed' || field === 'attempt_count') {
    return (
      <input
        type="number"
        value={(value as number) ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
        placeholder="Value"
        className="w-24 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        aria-label="Condition value"
      />
    )
  }

  if (field === 'role') {
    return (
      <select
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        aria-label="Condition value"
      >
        <option value="">Select...</option>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="manager">Manager</option>
        <option value="admin">Admin</option>
      </select>
    )
  }

  return (
    <input
      type="text"
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="w-32 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
      aria-label="Condition value"
    />
  )
}
