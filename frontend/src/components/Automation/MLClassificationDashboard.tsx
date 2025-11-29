/**
 * MLClassificationDashboard Component
 *
 * Dashboard for ML-powered document classification.
 * Displays:
 * - Classification statistics
 * - Review queue for pending predictions
 * - Model management
 * - Settings configuration
 *
 * Phase 1: ML Classification with three-tier confidence system.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Brain,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Loader2,
  ChevronRight,
  FileText,
  Settings,
  Play,
  Zap,
  BarChart3,
  Edit3,
  Check,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getMLStats,
  getReviewQueue,
  getMLModels,
  reviewPrediction,
  trainModel,
  type MLClassificationStats,
  type ClassificationPrediction,
  type MLModel,
  type ReviewAction,
  getConfidenceLevelColor,
  getReviewStatusColor,
  getModelStatusColor,
  formatConfidence,
  formatAccuracy,
} from '@/services/classificationService'

// =============================================================================
// Sub-Components
// =============================================================================

interface StatsCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  subtitle?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
}

function StatsCard({ title, value, icon, subtitle, color = 'blue' }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-lg', colorClasses[color])}>{icon}</div>
      </div>
    </div>
  )
}

interface ReviewItemProps {
  prediction: ClassificationPrediction
  onReview: (predictionId: number, action: ReviewAction) => Promise<void>
  isLoading: boolean
}

function ReviewItem({ prediction, onReview, isLoading }: ReviewItemProps) {
  const [showCorrection, setShowCorrection] = useState(false)
  const [correction, setCorrection] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAction = async (action: 'confirm' | 'correct' | 'reject') => {
    if (action === 'correct' && !showCorrection) {
      setShowCorrection(true)
      return
    }

    setActionLoading(action)
    try {
      await onReview(prediction.id, {
        action,
        correction: action === 'correct' ? correction : undefined,
      })
      setShowCorrection(false)
      setCorrection('')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {prediction.document_title || prediction.document_file_name}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                getConfidenceLevelColor(prediction.confidence_level)
              )}
            >
              {formatConfidence(prediction.confidence_score)}
            </span>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {prediction.predicted_class}
            </span>
          </div>

          {prediction.class_probabilities &&
            Object.keys(prediction.class_probabilities).length > 1 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Other predictions:</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(prediction.class_probabilities)
                    .filter(([cls]) => cls !== prediction.predicted_class)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([cls, prob]) => (
                      <span
                        key={cls}
                        className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded"
                      >
                        {cls}: {formatConfidence(prob)}
                      </span>
                    ))}
                </div>
              </div>
            )}
        </div>

        <div className="flex flex-col gap-2">
          {!showCorrection ? (
            <>
              <button
                onClick={() => handleAction('confirm')}
                disabled={isLoading || actionLoading !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
              >
                {actionLoading === 'confirm' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Confirm
              </button>
              <button
                onClick={() => handleAction('correct')}
                disabled={isLoading || actionLoading !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50"
              >
                <Edit3 className="h-3 w-3" />
                Correct
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={isLoading || actionLoading !== null}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50"
              >
                {actionLoading === 'reject' ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                Reject
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
                placeholder="Correct classification"
                className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                autoFocus
              />
              <div className="flex gap-1">
                <button
                  onClick={() => handleAction('correct')}
                  disabled={!correction || actionLoading !== null}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'correct' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCorrection(false)
                    setCorrection('')
                  }}
                  className="flex-1 flex items-center justify-center px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Model: {prediction.model_name} v{prediction.model_version}
        </span>
        <span>{new Date(prediction.created_at).toLocaleString()}</span>
      </div>
    </div>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function MLClassificationDashboard() {
  const [stats, setStats] = useState<MLClassificationStats | null>(null)
  const [reviewQueue, setReviewQueue] = useState<ClassificationPrediction[]>([])
  const [models, setModels] = useState<MLModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTraining, setIsTraining] = useState(false)
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [statsData, queueData, modelsData] = await Promise.all([
        getMLStats(),
        getReviewQueue(
          confidenceFilter !== 'all' ? { confidence_level: confidenceFilter } : undefined
        ),
        getMLModels(),
      ])
      setStats(statsData)
      setReviewQueue(queueData)
      setModels(modelsData)
    } catch (err) {
      console.error('Failed to fetch classification data:', err)
      setError('Failed to load classification data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [confidenceFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const handleReview = async (predictionId: number, action: ReviewAction) => {
    await reviewPrediction(predictionId, action)
    // Remove from queue after review
    setReviewQueue((prev) => prev.filter((p) => p.id !== predictionId))
    // Refresh stats
    const newStats = await getMLStats()
    setStats(newStats)
  }

  const handleTrainModel = async () => {
    setIsTraining(true)
    try {
      await trainModel({
        classification_target: 'document_type',
        algorithm: 'multinomial_nb',
      })
      // Refresh after training starts
      await fetchData()
    } catch (err) {
      console.error('Failed to start training:', err)
    } finally {
      setIsTraining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  const activeModel = models.find((m) => m.status === 'active')

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Model"
          value={activeModel ? `v${activeModel.version}` : 'None'}
          subtitle={
            activeModel
              ? formatAccuracy(activeModel.accuracy) + ' accuracy'
              : 'Train a model to get started'
          }
          icon={<Brain className="h-6 w-6" />}
          color={activeModel ? 'green' : 'yellow'}
        />
        <StatsCard
          title="Pending Review"
          value={stats?.pending_review || 0}
          subtitle="Documents awaiting review"
          icon={<Clock className="h-6 w-6" />}
          color={stats?.pending_review && stats.pending_review > 0 ? 'yellow' : 'blue'}
        />
        <StatsCard
          title="Production Accuracy"
          value={stats?.production_accuracy ? formatAccuracy(stats.production_accuracy) : 'N/A'}
          subtitle={`${stats?.confirmed_predictions || 0} confirmed / ${stats?.corrected_predictions || 0} corrected`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="purple"
        />
        <StatsCard
          title="Total Predictions"
          value={stats?.total_predictions?.toLocaleString() || 0}
          subtitle={`${stats?.unused_feedback || 0} feedback items pending`}
          icon={<BarChart3 className="h-6 w-6" />}
          color="blue"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Review Queue
                {reviewQueue.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                    {reviewQueue.length}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(e.target.value as typeof confidenceFilter)}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="all">All Confidence</option>
                  <option value="low">Low Only</option>
                  <option value="medium">Medium Only</option>
                  <option value="high">High Only</option>
                </select>
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </button>
              </div>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {reviewQueue.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400">No predictions pending review</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  All classifications have been reviewed
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewQueue.map((prediction) => (
                  <ReviewItem
                    key={prediction.id}
                    prediction={prediction}
                    onReview={handleReview}
                    isLoading={isRefreshing}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Models & Quick Actions */}
        <div className="space-y-6">
          {/* Active Model */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Brain className="h-4 w-4" />
                ML Models
              </h3>
            </div>
            <div className="p-4">
              {models.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">No models trained yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {models.slice(0, 3).map((model) => (
                    <div
                      key={model.id}
                      className={cn(
                        'p-3 rounded-lg border',
                        model.status === 'active'
                          ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {model.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            v{model.version} - {model.algorithm}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded text-xs font-medium',
                            getModelStatusColor(model.status)
                          )}
                        >
                          {model.status_display}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span>Accuracy: {formatAccuracy(model.accuracy)}</span>
                        <span>{model.predictions_count} predictions</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isTraining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Train New Model
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Confidence Distribution */}
          {stats && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Confidence Distribution
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {(['high', 'medium', 'low'] as const).map((level) => {
                  const count = stats.predictions_by_confidence?.[level] || 0
                  const total = stats.total_predictions || 1
                  const percentage = (count / total) * 100

                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{level}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{count}</span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            level === 'high' && 'bg-green-500',
                            level === 'medium' && 'bg-yellow-500',
                            level === 'low' && 'bg-red-500'
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MLClassificationDashboard
