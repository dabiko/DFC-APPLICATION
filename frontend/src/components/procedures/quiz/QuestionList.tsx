/**
 * QuestionList — Sortable question list with add/reorder.
 */

import { Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { QuestionEditor } from './QuestionEditor'
import { QuestionType } from '@/types/procedure'
import type { Question } from '@/types/procedure'

interface QuestionListProps {
  questions: Question[]
  onChange: (questions: Question[]) => void
}

export function QuestionList({ questions, onChange }: QuestionListProps) {
  const addQuestion = () => {
    const newQ: Question = {
      id: `temp-${Date.now()}`,
      quiz: '',
      question_type: QuestionType.MULTIPLE_CHOICE,
      text: '',
      explanation: '',
      order: questions.length,
      points: 1,
      is_mandatory: true,
      auto_grade_keywords: null,
      options: [
        {
          id: `temp-a-${Date.now()}`,
          question: '',
          text: '',
          is_correct: false,
          correct_order: null,
          order: 0,
        },
        {
          id: `temp-b-${Date.now() + 1}`,
          question: '',
          text: '',
          is_correct: false,
          correct_order: null,
          order: 1,
        },
      ],
    }
    onChange([...questions, newQ])
  }

  const updateQuestion = (index: number, data: Partial<Question>) => {
    onChange(questions.map((q, i) => (i === index ? { ...q, ...data } : q)))
  }

  const deleteQuestion = (index: number) => {
    onChange(questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= questions.length) return
    const updated = [...questions]
    ;[updated[index], updated[target]] = [updated[target], updated[index]]
    onChange(updated.map((q, i) => ({ ...q, order: i })))
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 && (
        <div className="text-center py-8 text-sm text-gray-400">
          No questions yet. Add one to get started.
        </div>
      )}

      {questions.map((q, idx) => (
        <div key={q.id} className="relative">
          {/* Reorder buttons */}
          <div className="absolute -left-8 top-3 flex flex-col gap-0.5">
            <button
              onClick={() => moveQuestion(idx, 'up')}
              disabled={idx === 0}
              className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-0"
              aria-label="Move question up"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              onClick={() => moveQuestion(idx, 'down')}
              disabled={idx >= questions.length - 1}
              className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-0"
              aria-label="Move question down"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>

          <QuestionEditor
            question={q}
            index={idx}
            onChange={(data) => updateQuestion(idx, data)}
            onDelete={() => deleteQuestion(idx)}
          />
        </div>
      ))}

      <button
        onClick={addQuestion}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors dark:border-gray-600 dark:text-gray-400"
      >
        <Plus className="h-4 w-4" />
        Add Question
      </button>
    </div>
  )
}
