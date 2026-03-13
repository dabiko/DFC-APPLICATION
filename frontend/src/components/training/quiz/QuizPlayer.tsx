/**
 * QuizPlayer — Main quiz interface orchestrating timer, question navigation,
 * answer collection, submission, and results display.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Loader2,
  AlertTriangle,
  HelpCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Send,
} from 'lucide-react'
import {
  startQuiz,
  submitQuiz,
  type QuizAttemptResponse,
  type SubmitQuizResult,
} from '@/services/trainingService'
import apiClient from '@/services/apiClient'
import { QuizTimer } from './QuizTimer'
import { QuizProgress } from './QuizProgress'
import { QuestionDisplay } from './QuestionDisplay'
import { QuizResultsPanel } from './QuizResultsPanel'
import type { VersionQuiz, QuestionAnswer } from '../types'

interface QuizPlayerProps {
  attemptId: string
  quizId: string
}

export function QuizPlayer({ attemptId, quizId }: QuizPlayerProps) {
  const navigate = useNavigate()

  const [quiz, setQuiz] = useState<VersionQuiz | null>(null)
  const [quizAttempt, setQuizAttempt] = useState<QuizAttemptResponse | null>(null)
  const [answers, setAnswers] = useState<Record<string, QuestionAnswer>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [correctAnswers, setCorrectAnswers] = useState<Record<string, string[]> | null>(null)
  const [maxAttemptsInfo, setMaxAttemptsInfo] = useState<{
    bestScore: number | null
    passed: boolean
    attemptsUsed: number
    maxAttempts: number
  } | null>(null)

  const loadQuiz = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMaxAttemptsInfo(null)
    try {
      const quizRes = await apiClient.get(`/procedures/version-quizzes/${quizId}/`)
      const quizData: VersionQuiz = quizRes.data
      setQuiz(quizData)

      const attempt = await startQuiz(attemptId, quizData.id)
      setQuizAttempt(attempt)

      if (quizData.time_limit_minutes) {
        setTimeRemaining(quizData.time_limit_minutes * 60)
      }

      const initialAnswers: Record<string, QuestionAnswer> = {}
      quizData.questions.forEach((q) => {
        initialAnswers[q.id] = {
          version_question_id: q.id,
          selected_option_ids: [],
          text_answer: '',
          ordering_answer: q.options.map((o) => o.id),
        }
      })
      setAnswers(initialAnswers)
    } catch (err: any) {
      const data = err?.response?.data
      if (data?.max_attempts_reached) {
        setMaxAttemptsInfo({
          bestScore: data.best_score,
          passed: data.passed,
          attemptsUsed: data.attempts_used,
          maxAttempts: data.max_attempts,
        })
      } else {
        setError(data?.error || data?.detail || 'Failed to load quiz')
      }
    } finally {
      setLoading(false)
    }
  }, [attemptId, quizId])

  useEffect(() => {
    loadQuiz()
  }, [loadQuiz])

  // Timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || submitted) return
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeRemaining, submitted])

  const currentQuestion = quiz?.questions[currentQuestionIndex] || null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null

  const handleSelectOption = (questionId: string, optionId: string, multiSelect: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId]
      if (!current) return prev
      let selected = current.selected_option_ids || []
      if (multiSelect) {
        selected = selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
      } else {
        selected = [optionId]
      }
      return { ...prev, [questionId]: { ...current, selected_option_ids: selected } }
    })
  }

  const handleTextAnswer = (questionId: string, text: string) => {
    setAnswers((prev) => {
      const current = prev[questionId]
      if (!current) return prev
      return { ...prev, [questionId]: { ...current, text_answer: text } }
    })
  }

  const handleReorderOption = (questionId: string, fromIndex: number, toIndex: number) => {
    setAnswers((prev) => {
      const current = prev[questionId]
      if (!current || !current.ordering_answer) return prev
      const newOrder = [...current.ordering_answer]
      const [moved] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, moved)
      return { ...prev, [questionId]: { ...current, ordering_answer: newOrder } }
    })
  }

  const handleSubmit = async () => {
    if (!quizAttempt || !quiz) return
    setSubmitting(true)
    try {
      const responses = quiz.questions.map((q) => {
        const answer = answers[q.id]
        return {
          version_question_id: q.id,
          selected_option_ids: answer?.selected_option_ids || [],
          text_answer: answer?.text_answer || '',
          ordering_answer: answer?.ordering_answer || [],
        }
      })
      const { quizAttempt: attemptResult, correctAnswers: corrects } = await submitQuiz(
        attemptId,
        quizAttempt.id,
        responses
      )
      setQuizAttempt(attemptResult)
      setCorrectAnswers(corrects)
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = quiz
    ? quiz.questions.filter((q) => {
        const a = answers[q.id]
        if (!a) return false
        if (q.question_type === 'short_answer') return !!a.text_answer?.trim()
        return (a.selected_option_ids?.length || 0) > 0
      }).length
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
        <span className="ml-2 text-sm text-gray-500">Loading quiz...</span>
      </div>
    )
  }

  if (maxAttemptsInfo) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/30">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Maximum Attempts Reached
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          You've used all {maxAttemptsInfo.maxAttempts} attempt
          {maxAttemptsInfo.maxAttempts > 1 ? 's' : ''} for this quiz.
        </p>
        {maxAttemptsInfo.bestScore !== null && (
          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-6 py-3 text-center dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">Best Score</p>
            <p
              className={`text-2xl font-bold ${maxAttemptsInfo.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {maxAttemptsInfo.bestScore}%
            </p>
            <p
              className={`text-xs font-medium ${maxAttemptsInfo.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {maxAttemptsInfo.passed ? 'Passed' : 'Failed'}
            </p>
          </div>
        )}
        <button
          onClick={() => navigate(`/training/${attemptId}`)}
          className="mt-6 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Training
        </button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <button
          onClick={() => navigate(`/training/${attemptId}`)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Back to training
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/training/${attemptId}`)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {quiz?.title || 'Quiz'}
              </h1>
              <p className="text-xs text-gray-500">
                {submitted
                  ? `Score: ${quizAttempt?.score_percent ?? 0}% — ${quizAttempt?.passed ? 'Passed' : 'Failed'}`
                  : `Question ${currentQuestionIndex + 1} of ${quiz?.questions.length || 0}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <QuizTimer timeRemaining={timeRemaining} submitted={submitted} />
            <span className="text-xs text-gray-500">
              {answeredCount}/{quiz?.questions.length || 0} answered
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {submitted && quiz && quizAttempt ? (
            <QuizResultsPanel
              quiz={enrichQuizWithAnswers(quiz, correctAnswers)}
              quizAttempt={quizAttempt}
              onBack={() => navigate(`/training/${attemptId}`)}
            />
          ) : currentQuestion && quiz ? (
            <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
              <QuizProgress
                questions={quiz.questions}
                answers={answers}
                currentIndex={currentQuestionIndex}
                onNavigate={setCurrentQuestionIndex}
              />

              <div className="p-6">
                <QuestionDisplay
                  question={currentQuestion}
                  answer={currentAnswer}
                  onSelectOption={handleSelectOption}
                  onTextAnswer={handleTextAnswer}
                  onReorder={handleReorderOption}
                />
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex((i) => i + 1)}
                    className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Submit Quiz
                  </button>
                )}

                <button
                  onClick={() =>
                    setCurrentQuestionIndex((i) =>
                      Math.min((quiz?.questions.length || 1) - 1, i + 1)
                    )
                  }
                  disabled={currentQuestionIndex >= (quiz?.questions.length || 1) - 1}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Enrich quiz options with is_correct from backend correct_answers map. */
function enrichQuizWithAnswers(
  quiz: VersionQuiz,
  correctAnswers: Record<string, string[]> | null
): VersionQuiz {
  if (!correctAnswers) return quiz
  return {
    ...quiz,
    questions: quiz.questions.map((q) => {
      const correctIds = correctAnswers[q.id] || []
      return {
        ...q,
        options: q.options.map((opt) => ({
          ...opt,
          is_correct: correctIds.includes(opt.id),
        })),
      }
    }),
  }
}
