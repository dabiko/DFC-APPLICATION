/**
 * QuestionEditor — Per-type question editor with type selector.
 */

import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { MultipleChoiceEditor } from './MultipleChoiceEditor'
import { MultiSelectEditor } from './MultiSelectEditor'
import { TrueFalseEditor } from './TrueFalseEditor'
import { ShortAnswerEditor } from './ShortAnswerEditor'
import { OrderingEditor } from './OrderingEditor'
import { QuestionType } from '@/types/procedure'
import type { Question, AnswerOption } from '@/types/procedure'

interface QuestionEditorProps {
  question: Question
  index: number
  onChange: (data: Partial<Question>) => void
  onDelete: () => void
}

const questionTypeOptions = [
  { value: QuestionType.MULTIPLE_CHOICE, label: 'Multiple Choice' },
  { value: QuestionType.MULTI_SELECT, label: 'Multi-Select' },
  { value: QuestionType.TRUE_FALSE, label: 'True/False' },
  { value: QuestionType.SHORT_ANSWER, label: 'Short Answer' },
  { value: QuestionType.ORDERING, label: 'Ordering' },
]

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true)

  const handleTypeChange = (newType: string) => {
    // Reset options based on type
    let options: AnswerOption[] = []
    if (newType === QuestionType.TRUE_FALSE) {
      options = [
        {
          id: `temp-t-${Date.now()}`,
          question: '',
          text: 'True',
          is_correct: true,
          correct_order: null,
          order: 0,
        },
        {
          id: `temp-f-${Date.now()}`,
          question: '',
          text: 'False',
          is_correct: false,
          correct_order: null,
          order: 1,
        },
      ]
    } else if (newType === QuestionType.MULTIPLE_CHOICE || newType === QuestionType.MULTI_SELECT) {
      options = [
        {
          id: `temp-a-${Date.now()}`,
          question: '',
          text: '',
          is_correct: false,
          correct_order: null,
          order: 0,
        },
        {
          id: `temp-b-${Date.now()}`,
          question: '',
          text: '',
          is_correct: false,
          correct_order: null,
          order: 1,
        },
      ]
    }
    onChange({ question_type: newType as Question['question_type'], options })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-100 dark:border-gray-700">
        <span className="text-xs font-bold text-gray-400 w-6">Q{index + 1}</span>
        <select
          value={question.question_type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {questionTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 text-xs text-gray-500">
            Pts:
            <input
              type="number"
              min={1}
              value={question.points}
              onChange={(e) => onChange({ points: Number(e.target.value) })}
              className="w-12 rounded border border-gray-300 px-1.5 py-0.5 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </label>
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={question.is_mandatory}
            onChange={(e) => onChange({ is_mandatory: e.target.checked })}
            className="rounded border-gray-300 h-3 w-3"
          />
          Required
        </label>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button
          onClick={onDelete}
          className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Question Text
            </label>
            <textarea
              value={question.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={2}
              placeholder="Enter the question..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          {/* Type-specific editor */}
          {question.question_type === QuestionType.MULTIPLE_CHOICE && (
            <MultipleChoiceEditor
              options={question.options || []}
              onChange={(options) => onChange({ options })}
            />
          )}
          {question.question_type === QuestionType.MULTI_SELECT && (
            <MultiSelectEditor
              options={question.options || []}
              onChange={(options) => onChange({ options })}
            />
          )}
          {question.question_type === QuestionType.TRUE_FALSE && (
            <TrueFalseEditor
              correctAnswer={question.options?.find((o) => o.is_correct)?.text === 'True'}
              onChange={(correct) => {
                const opts = question.options?.map((o) => ({
                  ...o,
                  is_correct: correct ? o.text === 'True' : o.text === 'False',
                }))
                onChange({ options: opts })
              }}
            />
          )}
          {question.question_type === QuestionType.SHORT_ANSWER && (
            <ShortAnswerEditor
              keywords={question.auto_grade_keywords}
              onChange={(keywords) => onChange({ auto_grade_keywords: keywords })}
            />
          )}
          {question.question_type === QuestionType.ORDERING && (
            <OrderingEditor
              options={question.options || []}
              onChange={(options) => onChange({ options })}
            />
          )}

          {/* Explanation */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Explanation (shown after answer)
            </label>
            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => onChange({ explanation: e.target.value })}
              placeholder="Explain the correct answer..."
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}
