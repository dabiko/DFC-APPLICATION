/**
 * QuizTakingPage — Quiz-taking interface during training.
 *
 * Route: /training/:attemptId/quiz/:quizId
 * Presents quiz questions, collects answers, submits for grading.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  HelpCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Send,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import { startQuiz, submitQuiz, type QuizAttemptResponse } from '@/services/trainingService'
import apiClient from '@/services/apiClient'
import { cn } from '@/utils/cn'

interface VersionQuiz {
  id: string
  title: string
  description: string
  quiz_type: string
  passing_score_percent: number
  max_attempts: number
  time_limit_minutes: number | null
  shuffle_questions: boolean
  shuffle_answers: boolean
  show_correct_answers_after: boolean
  questions: VersionQuestion[]
}

interface VersionQuestion {
  id: string
  question_type: string
  text: string
  explanation: string
  order: number
  points: number
  is_mandatory: boolean
  options: VersionOption[]
}

interface VersionOption {
  id: string
  text: string
  order: number
  correct_order: number | null
}

interface QuestionAnswer {
  version_question_id: string
  selected_option_ids?: string[]
  text_answer?: string
  ordering_answer?: string[]
}

export function QuizTakingPage() {
  const { attemptId, quizId } = useParams<{ attemptId: string; quizId: string }>()
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

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadQuiz = useCallback(async () => {
    if (!attemptId || !quizId) return
    setLoading(true)
    setError(null)
    try {
      // Load the quiz data
      const quizRes = await apiClient.get(`/procedures/version-quizzes/${quizId}/`)
      const quizData: VersionQuiz = quizRes.data
      setQuiz(quizData)

      // Start the quiz attempt
      const attempt = await startQuiz(attemptId, quizData.id)
      setQuizAttempt(attempt)

      if (quizData.time_limit_minutes) {
        setTimeRemaining(quizData.time_limit_minutes * 60)
      }

      // Initialize empty answers
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
      setError(err?.response?.data?.detail || 'Failed to load quiz')
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
    if (!attemptId || !quizAttempt || !quiz) return
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
      const result = await submitQuiz(attemptId, quizAttempt.id, responses)
      setQuizAttempt(result)
      setSubmitted(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const answeredCount = quiz
    ? quiz.questions.filter((q) => {
        const a = answers[q.id]
        if (!a) return false
        if (q.question_type === 'short_answer') return !!a.text_answer?.trim()
        return (a.selected_option_ids?.length || 0) > 0
      }).length
    : 0

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={() => {}} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={
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
                      ? `Score: ${quizAttempt?.score ?? 0}% — ${quizAttempt?.passed ? 'Passed' : 'Failed'}`
                      : `Question ${currentQuestionIndex + 1} of ${quiz?.questions.length || 0}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {timeRemaining !== null && !submitted && (
                  <span
                    className={cn(
                      'flex items-center gap-1 text-sm font-mono',
                      timeRemaining < 60 ? 'text-red-600' : 'text-gray-600'
                    )}
                  >
                    <Clock className="h-4 w-4" />
                    {formatTime(timeRemaining)}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {answeredCount}/{quiz?.questions.length || 0} answered
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-2xl mx-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                  <span className="ml-2 text-sm text-gray-500">Loading quiz...</span>
                </div>
              ) : error ? (
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
              ) : submitted ? (
                /* Results */
                <div className="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800 text-center">
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-16 h-16 rounded-full mb-4',
                      quizAttempt?.passed
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-red-100 dark:bg-red-900/30'
                    )}
                  >
                    {quizAttempt?.passed ? (
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {quizAttempt?.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}
                  </h2>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    {quizAttempt?.score ?? 0}%
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Passing score: {quiz?.passing_score_percent ?? 70}%
                  </p>

                  {quiz?.show_correct_answers_after && quizAttempt?.responses && (
                    <div className="text-left space-y-4 mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
                      {quiz.questions.map((q, idx) => {
                        const response = quizAttempt.responses.find(
                          (r) => r.version_question === q.id
                        )
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
                              {response?.is_correct ? 'Correct' : 'Incorrect'} —{' '}
                              {response?.points_awarded ?? 0}/{q.points} pts
                            </p>
                            {q.explanation && (
                              <p className="text-xs text-gray-500 mt-1">{q.explanation}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/training/${attemptId}`)}
                    className="mt-6 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Back to Training
                  </button>
                </div>
              ) : currentQuestion ? (
                /* Question */
                <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                  {/* Question navigation dots */}
                  <div className="flex gap-1.5 p-4 border-b border-gray-200 dark:border-gray-700 flex-wrap">
                    {quiz?.questions.map((q, idx) => {
                      const a = answers[q.id]
                      const hasAnswer =
                        q.question_type === 'short_answer'
                          ? !!a?.text_answer?.trim()
                          : (a?.selected_option_ids?.length || 0) > 0
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentQuestionIndex(idx)}
                          className={cn(
                            'w-7 h-7 rounded-full text-xs font-medium transition-colors',
                            idx === currentQuestionIndex
                              ? 'bg-green-600 text-white'
                              : hasAnswer
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
                          )}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-xs text-gray-400">Q{currentQuestionIndex + 1}</span>
                      {currentQuestion.is_mandatory && (
                        <span className="text-xs text-red-500">*Required</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {currentQuestion.points} pts
                      </span>
                    </div>
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                      {currentQuestion.text}
                    </h3>

                    {/* Answer input based on type */}
                    {(currentQuestion.question_type === 'multiple_choice' ||
                      currentQuestion.question_type === 'true_false') && (
                      <div className="space-y-2">
                        {currentQuestion.options.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id, false)}
                            className={cn(
                              'w-full text-left rounded-lg border p-3 text-sm transition-colors',
                              currentAnswer?.selected_option_ids?.includes(opt.id)
                                ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                            )}
                          >
                            {opt.text}
                          </button>
                        ))}
                      </div>
                    )}

                    {currentQuestion.question_type === 'multi_select' && (
                      <div className="space-y-2">
                        {currentQuestion.options.map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(currentQuestion.id, opt.id, true)}
                            className={cn(
                              'w-full text-left rounded-lg border p-3 text-sm transition-colors flex items-center gap-2',
                              currentAnswer?.selected_option_ids?.includes(opt.id)
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50'
                            )}
                          >
                            <div
                              className={cn(
                                'w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center',
                                currentAnswer?.selected_option_ids?.includes(opt.id)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300 dark:border-gray-600'
                              )}
                            >
                              {currentAnswer?.selected_option_ids?.includes(opt.id) && (
                                <CheckCircle className="h-3 w-3 text-white" />
                              )}
                            </div>
                            <span className="text-gray-700 dark:text-gray-300">{opt.text}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentQuestion.question_type === 'short_answer' && (
                      <textarea
                        value={currentAnswer?.text_answer || ''}
                        onChange={(e) => handleTextAnswer(currentQuestion.id, e.target.value)}
                        rows={4}
                        placeholder="Type your answer..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      />
                    )}

                    {currentQuestion.question_type === 'ordering' && (
                      <div className="space-y-2">
                        {(currentAnswer?.ordering_answer || []).map((optId, idx) => {
                          const opt = currentQuestion.options.find((o) => o.id === optId)
                          if (!opt) return null
                          return (
                            <div
                              key={optId}
                              className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                            >
                              <span className="text-xs font-bold text-gray-400 w-5">
                                {idx + 1}.
                              </span>
                              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                                {opt.text}
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() =>
                                    handleReorderOption(currentQuestion.id, idx, idx - 1)
                                  }
                                  disabled={idx === 0}
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <ChevronLeft className="h-4 w-4 rotate-90" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleReorderOption(currentQuestion.id, idx, idx + 1)
                                  }
                                  disabled={
                                    idx === (currentAnswer?.ordering_answer?.length || 0) - 1
                                  }
                                  className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                >
                                  <ChevronRight className="h-4 w-4 rotate-90" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
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

                    {currentQuestionIndex < (quiz?.questions.length || 0) - 1 ? (
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
      }
    />
  )
}

export default QuizTakingPage
