/**
 * QuestionEditor — Per-type question editor with rich type selector and styled controls.
 */

import {
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  CircleDot,
  CheckSquare,
  ToggleLeft,
  Type,
  ListOrdered,
  MessageSquare,
  Star,
  ShieldCheck,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { MultipleChoiceEditor } from './MultipleChoiceEditor'
import { MultiSelectEditor } from './MultiSelectEditor'
import { TrueFalseEditor } from './TrueFalseEditor'
import { ShortAnswerEditor } from './ShortAnswerEditor'
import { OrderingEditor } from './OrderingEditor'
import { QuestionType } from '@/types/procedure'
import type { Question, AnswerOption } from '@/types/procedure'
import { cn } from '@/utils/cn'

interface QuestionEditorProps {
  question: Question
  index: number
  onChange: (data: Partial<Question>) => void
  onDelete: () => void
}

const questionTypeOptions = [
  {
    value: QuestionType.MULTIPLE_CHOICE,
    label: 'Multiple Choice',
    description: 'Single correct answer from options',
    icon: CircleDot,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    value: QuestionType.MULTI_SELECT,
    label: 'Multi-Select',
    description: 'Multiple correct answers allowed',
    icon: CheckSquare,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    value: QuestionType.TRUE_FALSE,
    label: 'True / False',
    description: 'Simple true or false question',
    icon: ToggleLeft,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  {
    value: QuestionType.SHORT_ANSWER,
    label: 'Short Answer',
    description: 'Free-text response with keyword grading',
    icon: Type,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    value: QuestionType.ORDERING,
    label: 'Ordering',
    description: 'Arrange items in the correct sequence',
    icon: ListOrdered,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-900/20',
  },
]

function QuestionTypeDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = questionTypeOptions.find((o) => o.value === value) || questionTypeOptions[0]
  const SelectedIcon = selected.icon

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
          open
            ? 'border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400'
        )}
      >
        <SelectedIcon className={cn('h-3.5 w-3.5', selected.color)} />
        <span className="text-gray-800 dark:text-gray-200">{selected.label}</span>
        <ChevronDown
          className={cn('h-3 w-3 text-gray-400 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden">
          <div className="p-1.5">
            {questionTypeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-start gap-2.5 rounded-lg p-2.5 text-left transition-colors',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  )}
                >
                  <div className={cn('mt-0.5 rounded-md p-1.5', option.bg)}>
                    <Icon className={cn('h-3.5 w-3.5', option.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {option.label}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [expanded, setExpanded] = useState(true)

  const handleTypeChange = (newType: string) => {
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

  const currentType =
    questionTypeOptions.find((o) => o.value === question.question_type) || questionTypeOptions[0]

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
        {/* Question number badge */}
        <div
          className={cn(
            'flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold',
            currentType.bg,
            currentType.color
          )}
        >
          {index + 1}
        </div>

        {/* Type dropdown */}
        <QuestionTypeDropdown value={question.question_type} onChange={handleTypeChange} />

        <div className="flex-1" />

        {/* Points */}
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <input
            type="number"
            min={1}
            value={question.points}
            onChange={(e) => onChange({ points: Number(e.target.value) })}
            className="w-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-center font-medium text-gray-700 dark:text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-[11px] text-gray-400">pts</span>
        </div>

        {/* Required toggle */}
        <button
          type="button"
          onClick={() => onChange({ is_mandatory: !question.is_mandatory })}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border',
            question.is_mandatory
              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {question.is_mandatory ? 'Required' : 'Optional'}
        </button>

        {/* Collapse/expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Question text */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Question Text
            </label>
            <textarea
              value={question.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={2}
              placeholder="Enter your question here..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 resize-none transition-colors"
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
            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Explanation
              <span className="text-gray-400 font-normal">(shown after answer)</span>
            </label>
            <input
              type="text"
              value={question.explanation || ''}
              onChange={(e) => onChange({ explanation: e.target.value })}
              placeholder="Explain why this is the correct answer..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  )
}
