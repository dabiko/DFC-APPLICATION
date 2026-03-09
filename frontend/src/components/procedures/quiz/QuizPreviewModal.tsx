/**
 * QuizPreviewModal — Preview entire quiz as a trainee would see it.
 */

import { X, Clock, Hash, Target } from 'lucide-react'
import { QuestionPreview } from './QuestionPreview'
import type { Quiz } from '@/types/procedure'

interface QuizPreviewModalProps {
  quiz: Quiz
  onClose: () => void
}

export function QuizPreviewModal({ quiz, onClose }: QuizPreviewModalProps) {
  const totalPoints = (quiz.questions || []).reduce((sum, q) => sum + q.points, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Quiz Preview: {quiz.title}
            </h2>
            {quiz.description && <p className="text-sm text-gray-500 mt-0.5">{quiz.description}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close preview"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Quiz info bar */}
        <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Hash className="h-3.5 w-3.5" />
            {quiz.questions?.length || 0} questions
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3.5 w-3.5" />
            {quiz.passing_score_percent}% to pass ({totalPoints} total pts)
          </span>
          {quiz.time_limit_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {quiz.time_limit_minutes} min
            </span>
          )}
          <span>
            Max {quiz.max_attempts} attempt{quiz.max_attempts !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {(quiz.questions || []).map((q, idx) => (
            <QuestionPreview key={q.id} question={q} index={idx} />
          ))}
          {(!quiz.questions || quiz.questions.length === 0) && (
            <p className="text-center text-sm text-gray-400 py-8">No questions to preview.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  )
}
