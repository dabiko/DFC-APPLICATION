/**
 * ShortAnswerQuestion — Text input for free-form answers.
 */

interface ShortAnswerQuestionProps {
  value: string
  onChange: (value: string) => void
}

export function ShortAnswerQuestion({ value, onChange }: ShortAnswerQuestionProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={4}
      placeholder="Type your answer..."
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
    />
  )
}
