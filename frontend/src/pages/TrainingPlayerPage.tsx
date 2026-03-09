/**
 * TrainingPlayerPage — Step-by-step training delivery player.
 *
 * Route: /training/:attemptId
 * Guides trainee through each step, tracks completion gates, handles branching.
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  Video,
  HelpCircle,
  FileText,
  Paperclip,
  Clock,
  ArrowLeft,
  Trophy,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  startStep,
  viewStep,
  markManualOpened,
  markMediaCompleted,
  completeStep,
  completeTraining,
  type TrainingAttemptResponse,
  type StepCompletionResponse,
} from '@/services/trainingService'
import apiClient from '@/services/apiClient'
import { cn } from '@/utils/cn'

interface VersionStep {
  id: string
  title: string
  description: string
  order: number
  estimated_duration_minutes: number | null
  require_manual_open: boolean
  require_media_completion: boolean
  require_quiz_pass: boolean
  attachments: {
    id: string
    attachment_type: string
    title: string
    file: string
    file_name: string
    file_size: number
  }[]
}

export function TrainingPlayerPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState<TrainingAttemptResponse | null>(null)
  const [steps, setSteps] = useState<VersionStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [currentCompletion, setCurrentCompletion] = useState<StepCompletionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const loadAttempt = useCallback(async () => {
    if (!attemptId) return
    setLoading(true)
    setError(null)
    try {
      // Load attempt details
      const res = await apiClient.get(`/procedures/training/${attemptId}/`)
      const attemptData: TrainingAttemptResponse = res.data
      setAttempt(attemptData)

      // Load version steps
      const versionRes = await apiClient.get(`/procedures/versions/${attemptData.version}/`)
      setSteps(versionRes.data.steps || [])

      // Start the first step if needed
      if (attemptData.step_completions.length === 0 && versionRes.data.steps?.length > 0) {
        const firstStep = versionRes.data.steps[0]
        const completion = await startStep(attemptId, firstStep.id)
        setCurrentCompletion(completion)
        setAttempt((prev) => (prev ? { ...prev, step_completions: [completion] } : prev))
      } else {
        // Find the last incomplete step
        const completions = attemptData.step_completions
        const lastIncomplete = completions.findIndex((c) => c.status !== 'completed')
        const idx = lastIncomplete >= 0 ? lastIncomplete : completions.length - 1
        setCurrentStepIndex(Math.max(0, idx))
        setCurrentCompletion(completions[idx] || null)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load training session')
    } finally {
      setLoading(false)
    }
  }, [attemptId])

  useEffect(() => {
    loadAttempt()
  }, [loadAttempt])

  const currentStep = steps[currentStepIndex] || null

  const getStepCompletion = (stepId: string): StepCompletionResponse | undefined => {
    return attempt?.step_completions.find((c) => c.version_step === stepId)
  }

  const handleNavigateStep = async (index: number) => {
    if (!attemptId || !steps[index]) return
    setCurrentStepIndex(index)
    const step = steps[index]
    const existing = getStepCompletion(step.id)
    if (existing) {
      setCurrentCompletion(existing)
    } else {
      setActionLoading(true)
      try {
        const completion = await startStep(attemptId, step.id)
        setCurrentCompletion(completion)
        setAttempt((prev) =>
          prev ? { ...prev, step_completions: [...prev.step_completions, completion] } : prev
        )
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to start step')
      } finally {
        setActionLoading(false)
      }
    }
  }

  const handleMarkManualOpened = async () => {
    if (!attemptId || !currentCompletion) return
    setActionLoading(true)
    try {
      const updated = await markManualOpened(attemptId, currentCompletion.id)
      setCurrentCompletion(updated)
      updateCompletionInAttempt(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to mark manual as opened')
    } finally {
      setActionLoading(false)
    }
  }

  const handleMarkMediaCompleted = async () => {
    if (!attemptId || !currentCompletion) return
    setActionLoading(true)
    try {
      const updated = await markMediaCompleted(attemptId, currentCompletion.id)
      setCurrentCompletion(updated)
      updateCompletionInAttempt(updated)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to mark media as completed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteStep = async () => {
    if (!attemptId || !currentCompletion) return
    setActionLoading(true)
    try {
      const result = await completeStep(attemptId, currentCompletion.id)
      if (result.can_advance) {
        // Refresh the completion
        const updated = await viewStep(attemptId, currentStep!.id)
        setCurrentCompletion(updated)
        updateCompletionInAttempt(updated)

        // Auto-advance to next step
        if (currentStepIndex < steps.length - 1) {
          await handleNavigateStep(currentStepIndex + 1)
        }
      } else {
        setError(`Cannot advance: ${result.reasons.join(', ')}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to complete step')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteTraining = async () => {
    if (!attemptId) return
    setCompleting(true)
    try {
      await completeTraining(attemptId)
      navigate('/my-training')
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to complete training')
    } finally {
      setCompleting(false)
    }
  }

  const updateCompletionInAttempt = (updated: StepCompletionResponse) => {
    setAttempt((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        step_completions: prev.step_completions.map((c) => (c.id === updated.id ? updated : c)),
      }
    })
  }

  const allStepsCompleted = steps.every((s) => {
    const c = getStepCompletion(s.id)
    return c?.status === 'completed'
  })

  const isStepCompleted = currentCompletion?.status === 'completed'

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
                  onClick={() => navigate('/my-training')}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-500" />
                </button>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <PlayCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Training Session
                  </h1>
                  <p className="text-xs text-gray-500">
                    Step {currentStepIndex + 1} of {steps.length}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${steps.length > 0 ? ((attempt?.step_completions.filter((c) => c.status === 'completed').length || 0) / steps.length) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {attempt?.step_completions.filter((c) => c.status === 'completed').length || 0}/
                  {steps.length}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                <span className="ml-2 text-sm text-gray-500">Loading training...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <AlertTriangle className="h-8 w-8 text-red-400" />
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto p-6">
                {/* Step navigation sidebar */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {steps.map((s, idx) => {
                    const completion = getStepCompletion(s.id)
                    const isDone = completion?.status === 'completed'
                    const isCurrent = idx === currentStepIndex
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleNavigateStep(idx)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                          isCurrent
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : isDone
                              ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              : 'bg-white text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                        )}
                      >
                        {isDone ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border border-current flex items-center justify-center text-[8px]">
                            {idx + 1}
                          </span>
                        )}
                        {s.title || `Step ${idx + 1}`}
                      </button>
                    )
                  })}
                </div>

                {/* Current Step Content */}
                {currentStep && (
                  <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <div className="p-6">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {currentStep.title}
                      </h2>
                      {currentStep.estimated_duration_minutes && (
                        <p className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                          <Clock className="h-3 w-3" />
                          Estimated: {currentStep.estimated_duration_minutes} min
                        </p>
                      )}
                      {currentStep.description && (
                        <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {currentStep.description}
                          </p>
                        </div>
                      )}

                      {/* Attachments */}
                      {currentStep.attachments.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                            Attachments
                          </h3>
                          <div className="space-y-2">
                            {currentStep.attachments.map((att) => (
                              <a
                                key={att.id}
                                href={att.file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                              >
                                {att.attachment_type === 'video' ? (
                                  <Video className="h-4 w-4 text-purple-500" />
                                ) : att.attachment_type === 'document' ||
                                  att.attachment_type === 'manual' ? (
                                  <FileText className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Paperclip className="h-4 w-4 text-gray-500" />
                                )}
                                <span className="flex-1 text-gray-700 dark:text-gray-300">
                                  {att.title || att.file_name}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Completion Gates */}
                      <div className="space-y-3 mb-6">
                        {currentStep.require_manual_open && (
                          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              <BookOpen className="h-4 w-4 text-blue-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                Open manual/document
                              </span>
                            </div>
                            {currentCompletion?.manual_opened_at ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" /> Done
                              </span>
                            ) : (
                              <button
                                onClick={handleMarkManualOpened}
                                disabled={actionLoading}
                                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                              >
                                Mark as opened
                              </button>
                            )}
                          </div>
                        )}

                        {currentStep.require_media_completion && (
                          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              <Video className="h-4 w-4 text-purple-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                Complete media
                              </span>
                            </div>
                            {currentCompletion?.media_completed_at ? (
                              <span className="flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle className="h-3 w-3" /> Done
                              </span>
                            ) : (
                              <button
                                onClick={handleMarkMediaCompleted}
                                disabled={actionLoading}
                                className="text-xs text-purple-600 hover:underline disabled:opacity-50"
                              >
                                Mark as completed
                              </button>
                            )}
                          </div>
                        )}

                        {currentStep.require_quiz_pass && (
                          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm">
                              <HelpCircle className="h-4 w-4 text-green-500" />
                              <span className="text-gray-700 dark:text-gray-300">Pass quiz</span>
                            </div>
                            <button
                              onClick={() =>
                                navigate(`/training/${attemptId}/quiz/${currentStep.id}`)
                              }
                              className="text-xs text-green-600 hover:underline"
                            >
                              Take quiz
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Step Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleNavigateStep(currentStepIndex - 1)}
                          disabled={currentStepIndex === 0}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </button>

                        <div className="flex items-center gap-2">
                          {!isStepCompleted && (
                            <button
                              onClick={handleCompleteStep}
                              disabled={actionLoading}
                              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="h-4 w-4" />
                              )}
                              Complete Step
                            </button>
                          )}

                          {isStepCompleted && currentStepIndex < steps.length - 1 && (
                            <button
                              onClick={() => handleNavigateStep(currentStepIndex + 1)}
                              className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                              Next Step
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          )}

                          {allStepsCompleted && (
                            <button
                              onClick={handleCompleteTraining}
                              disabled={completing}
                              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {completing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trophy className="h-4 w-4" />
                              )}
                              Finish Training
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleNavigateStep(currentStepIndex + 1)}
                          disabled={currentStepIndex >= steps.length - 1}
                          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-30 dark:text-gray-400"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      }
    />
  )
}

export default TrainingPlayerPage
