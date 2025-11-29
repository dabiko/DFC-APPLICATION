/**
 * Classification Service
 *
 * Handles API calls for ML-powered document classification.
 * Phase 1: ML Classification with three-tier confidence system.
 */

import apiClient from './apiClient'

// =============================================================================
// Types
// =============================================================================

export interface MLModel {
  id: number
  name: string
  model_type: 'document_type' | 'confidentiality' | 'department' | 'custom'
  model_type_display: string
  version: string
  status: 'training' | 'ready' | 'active' | 'deprecated' | 'failed'
  status_display: string
  algorithm: string
  accuracy: number | null
  f1_score: number | null
  predictions_count: number
  production_accuracy: number | null
  training_samples: number
  created_at: string
}

export interface MLModelDetail extends MLModel {
  hyperparameters: Record<string, unknown>
  feature_config: Record<string, unknown>
  training_classes: string[]
  training_started_at: string | null
  training_completed_at: string | null
  training_duration_seconds: number | null
  precision: number | null
  recall: number | null
  confusion_matrix: {
    labels: string[]
    matrix: number[][]
  }
  classification_report: Record<string, unknown>
  correct_predictions: number
  last_used_at: string | null
  created_by: number
  created_by_details: {
    id: number
    email: string
    first_name: string
    last_name: string
  }
}

export interface ClassificationPrediction {
  id: number
  document: string
  document_id: string
  document_title: string
  document_file_name: string
  model: number | null
  model_name: string
  model_version: string
  predicted_class: string
  confidence_score: number
  confidence_level: 'high' | 'medium' | 'low'
  confidence_level_display: string
  class_probabilities: Record<string, number>
  review_status: 'pending' | 'auto_applied' | 'confirmed' | 'corrected' | 'rejected'
  review_status_display: string
  user_correction: string
  reviewed_by: number | null
  reviewed_by_name: string
  reviewed_at: string | null
  actions_applied: Record<string, unknown>
  created_at: string
}

export interface TrainingFeedback {
  id: number
  document: string
  document_title: string
  prediction: number | null
  classification_target: string
  original_prediction: string
  corrected_class: string
  feedback_source: 'user_correction' | 'manual_classification' | 'batch_labeling' | 'rule_based'
  feedback_source_display: string
  provided_by: number | null
  provided_by_name: string
  used_in_training: boolean
  trained_model: number | null
  created_at: string
}

export interface ClassificationSettings {
  high_confidence_threshold: number
  medium_confidence_threshold: number
  auto_apply_enabled: boolean
  auto_apply_document_type: boolean
  auto_apply_confidentiality: boolean
  auto_apply_department: boolean
  auto_retrain_enabled: boolean
  retrain_threshold: number
  retrain_schedule: string
  min_training_samples: number
  notify_on_low_confidence: boolean
  notify_on_model_retrain: boolean
  max_text_length: number
  include_filename: boolean
  include_file_type: boolean
  updated_at: string
  updated_by: number | null
  updated_by_name: string
}

export interface MLClassificationStats {
  active_models: number
  total_models: number
  total_predictions: number
  predictions_by_status: Record<string, number>
  predictions_by_confidence: Record<string, number>
  production_accuracy: number | null
  confirmed_predictions: number
  corrected_predictions: number
  pending_review: number
  unused_feedback: number
}

export interface TrainModelRequest {
  classification_target: 'document_type' | 'confidentiality' | 'department'
  algorithm: 'multinomial_nb' | 'random_forest' | 'svm'
  max_features?: number
  ngram_range?: [number, number]
}

export interface ReviewAction {
  action: 'confirm' | 'correct' | 'reject'
  correction?: string
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Get list of ML models
 */
export async function getMLModels(params?: {
  model_type?: string
  status?: string
}): Promise<MLModel[]> {
  const response = await apiClient.get('/classification/ml/models/', { params })
  // Handle both paginated and non-paginated responses
  const data = response.data
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

/**
 * Get ML model details
 */
export async function getMLModelDetail(id: number): Promise<MLModelDetail> {
  const response = await apiClient.get(`/classification/ml/models/${id}/`)
  return response.data
}

/**
 * Activate an ML model
 */
export async function activateMLModel(
  id: number
): Promise<{ message: string; model: MLModelDetail }> {
  const response = await apiClient.post(`/classification/ml/models/${id}/activate/`)
  return response.data
}

/**
 * Train a new ML model
 */
export async function trainModel(request: TrainModelRequest): Promise<{
  message: string
  task_id: string
  classification_target: string
  algorithm: string
}> {
  const response = await apiClient.post('/classification/ml/train/', request)
  return response.data
}

/**
 * Get predictions pending review
 */
export async function getReviewQueue(params?: {
  confidence_level?: 'high' | 'medium' | 'low'
  model_type?: string
}): Promise<ClassificationPrediction[]> {
  const response = await apiClient.get('/classification/ml/review-queue/', { params })
  // Handle both paginated and non-paginated responses
  const data = response.data
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.results)) {
    return data.results
  }
  return []
}

/**
 * Review a prediction (confirm, correct, or reject)
 */
export async function reviewPrediction(
  predictionId: number,
  action: ReviewAction
): Promise<{ message: string; prediction: ClassificationPrediction }> {
  const response = await apiClient.post(
    `/classification/ml/predictions/${predictionId}/review/`,
    action
  )
  return response.data
}

/**
 * Classify a single document using ML
 */
export async function classifyDocumentML(
  documentId: string,
  options?: {
    classification_target?: string
    auto_apply?: boolean
  }
): Promise<{
  message: string
  task_id: string
  document_id: string
  classification_target: string
}> {
  const response = await apiClient.post(`/documents/${documentId}/classify-ml/`, options)
  return response.data
}

/**
 * Batch classify multiple documents using ML
 */
export async function batchClassifyML(
  documentIds: string[],
  options?: {
    classification_target?: string
    auto_apply?: boolean
  }
): Promise<{
  message: string
  task_id: string
  total_documents: number
  valid_documents: number
  classification_target: string
}> {
  const response = await apiClient.post('/classification/ml/batch-classify/', {
    document_ids: documentIds,
    ...options,
  })
  return response.data
}

/**
 * Get ML classification statistics
 */
export async function getMLStats(): Promise<MLClassificationStats> {
  const response = await apiClient.get('/classification/ml/stats/')
  return response.data
}

/**
 * Get classification settings
 */
export async function getClassificationSettings(): Promise<ClassificationSettings> {
  const response = await apiClient.get('/classification/settings/')
  return response.data
}

/**
 * Update classification settings
 */
export async function updateClassificationSettings(
  settings: Partial<ClassificationSettings>
): Promise<{ message: string; settings: ClassificationSettings }> {
  const response = await apiClient.put('/classification/settings/', settings)
  return response.data
}

/**
 * Get training feedback entries
 */
export async function getTrainingFeedback(params?: {
  used_in_training?: boolean
  classification_target?: string
}): Promise<TrainingFeedback[]> {
  const response = await apiClient.get('/classification/ml/feedback/', { params })
  return response.data
}

/**
 * Get prediction history for a document
 */
export async function getDocumentPredictions(
  documentId: string
): Promise<ClassificationPrediction[]> {
  const response = await apiClient.get(`/documents/${documentId}/predictions/`)
  return response.data
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get confidence level color
 */
export function getConfidenceLevelColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'medium':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'low':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

/**
 * Get review status color
 */
export function getReviewStatusColor(status: ClassificationPrediction['review_status']): string {
  switch (status) {
    case 'pending':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'auto_applied':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'confirmed':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'corrected':
      return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
    case 'rejected':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

/**
 * Get model status color
 */
export function getModelStatusColor(status: MLModel['status']): string {
  switch (status) {
    case 'training':
      return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
    case 'ready':
      return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30'
    case 'active':
      return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
    case 'deprecated':
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
    case 'failed':
      return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
    default:
      return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30'
  }
}

/**
 * Format confidence score as percentage
 */
export function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(1)}%`
}

/**
 * Format accuracy score as percentage
 */
export function formatAccuracy(score: number | null): string {
  if (score === null) return 'N/A'
  return `${(score * 100).toFixed(1)}%`
}
