/**
 * TrueFalseEditor — Auto-generated True/False answer editor.
 */

interface TrueFalseEditorProps {
  correctAnswer: boolean
  onChange: (correct: boolean) => void
}

export function TrueFalseEditor({ correctAnswer, onChange }: TrueFalseEditorProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400">Select the correct answer</p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name="true-false"
            checked={correctAnswer === true}
            onChange={() => onChange(true)}
            className="h-4 w-4 text-blue-600"
          />
          True
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name="true-false"
            checked={correctAnswer === false}
            onChange={() => onChange(false)}
            className="h-4 w-4 text-blue-600"
          />
          False
        </label>
      </div>
    </div>
  )
}
