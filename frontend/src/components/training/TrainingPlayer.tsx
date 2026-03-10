/**
 * TrainingPlayer — Main training container orchestrating step navigation,
 * content display, gates, and completion.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertTriangle, PlayCircle, ArrowLeft } from 'lucide-react'
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
import { StepSidebar } from './StepSidebar'
import { StepContent } from './StepContent'
import { StepProgressBar } from './StepProgressBar'
import { TrainingCompletionModal } from './TrainingCompletionModal'
import type { VersionStep } from './types'

interface TrainingPlayerProps {
  attemptId: string
}

export function TrainingPlayer({ attemptId }: TrainingPlayerProps) {
  const navigate = useNavigate()

  const [attempt, setAttempt] = useState<TrainingAttemptResponse | null>(null)
  const [steps, setSteps] = useState<VersionStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [currentCompletion, setCurrentCompletion] = useState<StepCompletionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionResult, setCompletionResult] = useState<{
    passed: boolean
    score: number | null
  } | null>(null)

  const loadAttempt = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get(`/procedures/training/${attemptId}/`)
      const attemptData: TrainingAttemptResponse = res.data
      setAttempt(attemptData)

      const versionRes = await apiClient.get(`/procedures/versions/${attemptData.version}/`)
      setSteps(versionRes.data.steps || [])

      if (attemptData.step_completions.length === 0 && versionRes.data.steps?.length > 0) {
        const firstStep = versionRes.data.steps[0]
        const completion = await startStep(attemptId, firstStep.id)
        setCurrentCompletion(completion)
        setAttempt((prev) => (prev ? { ...prev, step_completions: [completion] } : prev))
      } else {
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

  const updateCompletionInAttempt = (updated: StepCompletionResponse) => {
    setAttempt((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        step_completions: prev.step_completions.map((c) => (c.id === updated.id ? updated : c)),
      }
    })
  }

  const handleNavigateStep = async (index: number) => {
    if (!steps[index]) return
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
    if (!currentCompletion) return
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
    if (!currentCompletion) return
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
    if (!currentCompletion) return
    setActionLoading(true)
    try {
      const result = await completeStep(attemptId, currentCompletion.id)
      if (result.can_advance) {
        const updated = await viewStep(attemptId, currentStep!.id)
        setCurrentCompletion(updated)
        updateCompletionInAttempt(updated)
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
    setCompleting(true)
    try {
      const result = await completeTraining(attemptId)
      setCompletionResult({
        passed: result.status === 'passed' || result.status === 'completed',
        score: result.score,
      })
      setShowCompletionModal(true)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to complete training')
    } finally {
      setCompleting(false)
    }
  }

  const completedCount =
    attempt?.step_completions.filter((c) => c.status === 'completed').length || 0
  const allStepsCompleted =
    steps.length > 0 &&
    steps.every((s) => {
      const c = getStepCompletion(s.id)
      return c?.status === 'completed'
    })
  const isStepCompleted = currentCompletion?.status === 'completed'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
        <span className="ml-2 text-sm text-gray-500">Loading training...</span>
      </div>
    )
  }

  if (error) {
    return (
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
    )
  }

  return (
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
          <StepProgressBar completedCount={completedCount} totalCount={steps.length} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          <StepSidebar
            steps={steps}
            currentStepIndex={currentStepIndex}
            getStepCompletion={getStepCompletion}
            onNavigate={handleNavigateStep}
          />

          {currentStep && (
            <StepContent
              step={currentStep}
              completion={currentCompletion}
              currentStepIndex={currentStepIndex}
              totalSteps={steps.length}
              isStepCompleted={isStepCompleted}
              allStepsCompleted={allStepsCompleted}
              actionLoading={actionLoading}
              completing={completing}
              attemptId={attemptId}
              onPrevious={() => handleNavigateStep(currentStepIndex - 1)}
              onNext={() => handleNavigateStep(currentStepIndex + 1)}
              onCompleteStep={handleCompleteStep}
              onFinishTraining={handleCompleteTraining}
              onMarkManualOpened={handleMarkManualOpened}
              onMarkMediaCompleted={handleMarkMediaCompleted}
              onTakeQuiz={() => navigate(`/training/${attemptId}/quiz/${currentStep.id}`)}
            />
          )}
        </div>
      </div>

      <TrainingCompletionModal
        isOpen={showCompletionModal}
        passed={completionResult?.passed ?? false}
        score={completionResult?.score ?? null}
        onClose={() => setShowCompletionModal(false)}
        onBackToTraining={() => navigate('/my-training')}
      />
    </div>
  )
}
