/**
 * QuestionPreview — Preview a single question as the trainee sees it.
 */

import { QuestionType } from '@/types/procedure'
import type { Question } from '@/types/procedure'

interface QuestionPreviewProps {
  question: Question
  index: number
}

export function QuestionPreview({ question, index }: QuestionPreviewProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-2 mb-3">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex-shrink-0">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{question.text}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </span>
            {question.is_mandatory && <span className="text-xs text-red-500">Required</span>}
          </div>
        </div>
      </div>

      {/* Answer area */}
      <div className="ml-8 space-y-2">
        {question.question_type === QuestionType.MULTIPLE_CHOICE &&
          question.options?.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input type="radio" disabled className="h-4 w-4" />
              {opt.text}
            </label>
          ))}

        {question.question_type === QuestionType.MULTI_SELECT &&
          question.options?.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <input type="checkbox" disabled className="h-4 w-4 rounded" />
              {opt.text}
            </label>
          ))}

        {question.question_type === QuestionType.TRUE_FALSE && (
          <>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" disabled className="h-4 w-4" /> True
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="radio" disabled className="h-4 w-4" /> False
            </label>
          </>
        )}

        {question.question_type === QuestionType.SHORT_ANSWER && (
          <textarea
            disabled
            rows={2}
            placeholder="Type your answer here..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 dark:border-gray-600 dark:bg-gray-700/50"
          />
        )}

        {question.question_type === QuestionType.ORDERING &&
          question.options?.map((opt, idx) => (
            <div
              key={opt.id}
              className="flex items-center gap-2 rounded-md bg-gray-50 p-2 dark:bg-gray-700/50"
            >
              <span className="text-xs text-gray-400 w-4">{idx + 1}</span>
              <span className="text-sm text-gray-700 dark:text-gray-300">{opt.text}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
