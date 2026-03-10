/**
 * QuizResultsPanel — Score display after quiz submission.
 */

import { CheckCircle, AlertTriangle } from 'lucide-react'
import type { QuizAttemptResponse } from '@/services/trainingService'
import type { VersionQuiz } from '../types'
import { cn } from '@/utils/cn'

interface QuizResultsPanelProps {
  quiz: VersionQuiz
  quizAttempt: QuizAttemptResponse
  onBack: () => void
}

export function QuizResultsPanel({ quiz, quizAttempt, onBack }: QuizResultsPanelProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800 text-center">
      <div
        className={cn(
          'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
          quizAttempt.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
        )}
      >
        {quizAttempt.passed ? (
          <CheckCircle className="h-8 w-8 text-green-600" />
        ) : (
          <AlertTriangle className="h-8 w-8 text-red-600" />
        )}
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {quizAttempt.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
      </h2>
      <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {quizAttempt.score ?? 0}%
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Passing score: {quiz.passing_score_percent ?? 70}%
      </p>

      {quiz.show_correct_answers_after && quizAttempt.responses && (
        <div className="text-left space-y-4 mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          {quiz.questions.map((q, idx) => {
            const response = quizAttempt.responses.find((r) => r.version_question === q.id)
            return (
              <div
                key={q.id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                  {idx + 1}. {q.text}
                </p>
                <p
                  className={cn(
                    'text-xs',
                    response?.is_correct ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {response?.is_correct ? 'Correct' : 'Incorrect'} — {response?.points_awarded ?? 0}
                  /{q.points} pts
                </p>
                {q.explanation && <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>}
              </div>
            )
          })}
        </div>
      )}

      <button
        onClick={onBack}
        className="mt-6 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
      >
        Back to Training
      </button>
    </div>
  )
}
