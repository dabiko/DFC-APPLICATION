/**
 * QuizResultsPanel — Score display and answer review after quiz submission.
 * Shows correct answers, user selections, and explanations when enabled.
 */

import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react'
import type { QuizAttemptResponse } from '@/services/trainingService'
import type { VersionQuiz, VersionQuestion, VersionOption } from '../types'
import { cn } from '@/utils/cn'

interface QuizResultsPanelProps {
  quiz: VersionQuiz
  quizAttempt: QuizAttemptResponse
  onBack: () => void
}

export function QuizResultsPanel({ quiz, quizAttempt, onBack }: QuizResultsPanelProps) {
  const correctCount = quizAttempt.responses?.filter((r) => r.is_correct).length ?? 0
  const totalQuestions = quiz.questions.length

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Score header */}
      <div className="p-8 text-center border-b border-gray-200 dark:border-gray-700">
        <div
          className={cn(
            'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
            quizAttempt.passed
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
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
        <p className="text-sm text-gray-500">
          Passing score: {quiz.passing_score_percent ?? 70}%{' · '}
          {correctCount}/{totalQuestions} correct
        </p>
      </div>

      {/* Answer review */}
      {quiz.show_correct_answers_after && quizAttempt.responses && (
        <div className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Answer Review
          </h3>

          {quiz.questions.map((q, idx) => {
            const response = quizAttempt.responses.find((r) => r.version_question === q.id)
            const isCorrect = response?.is_correct ?? false

            return (
              <QuestionReviewCard
                key={q.id}
                index={idx + 1}
                question={q}
                selectedOptionIds={response?.selected_option_ids || []}
                textAnswer={response?.text_answer || ''}
                isCorrect={isCorrect}
                pointsAwarded={response?.points_awarded ?? 0}
              />
            )
          })}
        </div>
      )}

      <div className="p-6 border-t border-gray-200 dark:border-gray-700 text-center">
        <button
          onClick={onBack}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Back to Training
        </button>
      </div>
    </div>
  )
}

function QuestionReviewCard({
  index,
  question,
  selectedOptionIds,
  textAnswer,
  isCorrect,
  pointsAwarded,
}: {
  index: number
  question: VersionQuestion
  selectedOptionIds: string[]
  textAnswer: string
  isCorrect: boolean
  pointsAwarded: number
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isCorrect
          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10'
      )}
    >
      {/* Question header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {index}. {question.text}
        </p>
        <span
          className={cn(
            'flex items-center gap-1 text-xs font-medium shrink-0 rounded-full px-2 py-0.5',
            isCorrect
              ? 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30'
              : 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30'
          )}
        >
          {isCorrect ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {pointsAwarded}/{question.points} pts
        </span>
      </div>

      {/* Options with correct/incorrect indicators */}
      {question.question_type === 'short_answer' ? (
        <div className="ml-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your answer:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700">
            {textAnswer || <span className="italic text-gray-400">No answer</span>}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 ml-4">
          {question.options.map((opt) => {
            const wasSelected = selectedOptionIds.includes(opt.id)
            const isCorrectOption = opt.is_correct === true
            return (
              <OptionRow
                key={opt.id}
                option={opt}
                wasSelected={wasSelected}
                isCorrectOption={isCorrectOption}
              />
            )
          })}
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div className="mt-3 ml-4 rounded bg-blue-50 dark:bg-blue-900/20 px-3 py-2 border border-blue-200 dark:border-blue-800">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-0.5">Explanation</p>
          <p className="text-xs text-blue-600 dark:text-blue-400">{question.explanation}</p>
        </div>
      )}
    </div>
  )
}

function OptionRow({
  option,
  wasSelected,
  isCorrectOption,
}: {
  option: VersionOption
  wasSelected: boolean
  isCorrectOption: boolean
}) {
  // Determine the visual state
  const isCorrectlySelected = wasSelected && isCorrectOption
  const isIncorrectlySelected = wasSelected && !isCorrectOption
  const isMissedCorrect = !wasSelected && isCorrectOption

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded px-3 py-1.5 text-sm',
        isCorrectlySelected && 'bg-green-100 dark:bg-green-900/30',
        isIncorrectlySelected && 'bg-red-100 dark:bg-red-900/30',
        isMissedCorrect && 'bg-amber-50 dark:bg-amber-900/20',
        !wasSelected && !isCorrectOption && 'bg-white dark:bg-gray-800'
      )}
    >
      {/* Indicator */}
      <span className="shrink-0">
        {isCorrectlySelected ? (
          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
        ) : isIncorrectlySelected ? (
          <XCircle className="h-3.5 w-3.5 text-red-500" />
        ) : isMissedCorrect ? (
          <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <span className="inline-block h-3.5 w-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
        )}
      </span>

      {/* Option text */}
      <span
        className={cn(
          'text-sm',
          isCorrectlySelected && 'text-green-800 dark:text-green-300 font-medium',
          isIncorrectlySelected && 'text-red-700 dark:text-red-300 line-through',
          isMissedCorrect && 'text-amber-700 dark:text-amber-300 font-medium',
          !wasSelected && !isCorrectOption && 'text-gray-600 dark:text-gray-400'
        )}
      >
        {option.text}
      </span>

      {/* Labels */}
      {isCorrectlySelected && (
        <span className="text-[10px] font-medium text-green-600 dark:text-green-400 ml-auto">
          Your answer (correct)
        </span>
      )}
      {isIncorrectlySelected && (
        <span className="text-[10px] font-medium text-red-500 dark:text-red-400 ml-auto">
          Your answer
        </span>
      )}
      {isMissedCorrect && (
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 ml-auto">
          Correct answer
        </span>
      )}
    </div>
  )
}
