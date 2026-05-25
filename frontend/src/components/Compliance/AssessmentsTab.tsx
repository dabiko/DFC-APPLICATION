/**
 * AssessmentsTab Component
 *
 * Manages compliance assessments with workflow, scheduling, and tracking.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  RefreshCw,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Play,
  CheckCircle,
  Clock,
  Calendar,
  User,
  FileText,
  X,
  Loader2,
  AlertCircle,
  Target,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getAssessments,
  getRegulations,
  createAssessment,
  updateAssessment,
  deleteAssessment,
  startAssessment,
  completeAssessment,
  type Assessment,
  type Regulation,
  type CreateAssessmentRequest,
  type AssessmentType,
  type AssessmentStatus,
} from '@/services/complianceService'

// ============================================================================
// CONSTANTS
// ============================================================================

const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: 'internal', label: 'Internal Audit' },
  { value: 'external', label: 'External Audit' },
  { value: 'self_assessment', label: 'Self Assessment' },
  { value: 'certification', label: 'Certification' },
  { value: 'gap_analysis', label: 'Gap Analysis' },
]

const STATUS_OPTIONS: {
  value: AssessmentStatus
  label: string
  color: string
  icon: typeof Clock
}[] = [
  {
    value: 'planned',
    label: 'Planned',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    icon: Calendar,
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Play,
  },
  {
    value: 'completed',
    label: 'Completed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    icon: AlertCircle,
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusStyle = (status: AssessmentStatus) => {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
}

const getScoreColor = (score: number | undefined) => {
  if (!score) return 'text-gray-500'
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface AssessmentCardProps {
  assessment: Assessment
  onView: (assessment: Assessment) => void
  onEdit: (assessment: Assessment) => void
  onDelete: (assessment: Assessment) => void
  onStart: (assessment: Assessment) => void
  onComplete: (assessment: Assessment) => void
}

function AssessmentCard({
  assessment,
  onView,
  onEdit,
  onDelete,
  onStart,
  onComplete,
}: AssessmentCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const statusStyle = getStatusStyle(assessment.status)
  const StatusIcon = statusStyle.icon

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {assessment.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{assessment.regulation_name}</p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => {
                    onView(assessment)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => {
                    onEdit(assessment)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                {assessment.status === 'planned' && (
                  <button
                    onClick={() => {
                      onStart(assessment)
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start Assessment
                  </button>
                )}
                {assessment.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      onComplete(assessment)
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Complete
                  </button>
                )}
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onDelete(assessment)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status & Type */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1',
            statusStyle.color
          )}
        >
          <StatusIcon className="w-3 h-3" />
          {statusStyle.label}
        </span>
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded capitalize">
          {assessment.assessment_type.replace('_', ' ')}
        </span>
      </div>

      {/* Score (if completed) */}
      {assessment.overall_score !== undefined && assessment.overall_score !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500 dark:text-gray-400">Score</span>
            <span className={cn('text-lg font-bold', getScoreColor(assessment.overall_score))}>
              {assessment.overall_score}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                assessment.overall_score >= 80
                  ? 'bg-green-500'
                  : assessment.overall_score >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${assessment.overall_score}%` }}
            />
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            {assessment.scheduled_date
              ? `Scheduled: ${new Date(assessment.scheduled_date).toLocaleDateString()}`
              : 'Not scheduled'}
          </span>
        </div>
        {assessment.lead_assessor_name && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <User className="w-4 h-4" />
            <span>{assessment.lead_assessor_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <FileText className="w-4 h-4" />
          <span>{assessment.finding_count} findings</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {assessment.status === 'planned' && (
          <button
            onClick={() => onStart(assessment)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <Play className="w-4 h-4" /> Start
          </button>
        )}
        {assessment.status === 'in_progress' && (
          <button
            onClick={() => onComplete(assessment)}
            className="text-sm text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
          >
            <CheckCircle className="w-4 h-4" /> Complete
          </button>
        )}
        {(assessment.status === 'completed' || assessment.status === 'cancelled') && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {assessment.end_date
              ? `Ended: ${new Date(assessment.end_date).toLocaleDateString()}`
              : ''}
          </span>
        )}
        <button
          onClick={() => onView(assessment)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Details
        </button>
      </div>
    </div>
  )
}

interface AssessmentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateAssessmentRequest) => Promise<void>
  regulations: Regulation[]
  initialData?: Assessment
  isLoading?: boolean
}

function AssessmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  regulations,
  initialData,
  isLoading,
}: AssessmentFormModalProps) {
  const [formData, setFormData] = useState<CreateAssessmentRequest>({
    name: '',
    description: '',
    regulation: '',
    assessment_type: 'internal',
    status: 'planned',
    scheduled_date: new Date().toISOString().split('T')[0],
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        description: initialData.description || '',
        regulation: initialData.regulation,
        assessment_type: initialData.assessment_type,
        status: initialData.status,
        scheduled_date: initialData.scheduled_date?.split('T')[0] || '',
        start_date: initialData.start_date?.split('T')[0] || '',
        end_date: initialData.end_date?.split('T')[0] || '',
        overall_score: initialData.overall_score,
        summary: initialData.summary || '',
        assessor_organization: initialData.assessor_organization || '',
      })
    } else {
      setFormData({
        name: '',
        description: '',
        regulation: regulations[0]?.id || '',
        assessment_type: 'internal',
        status: 'planned',
        scheduled_date: new Date().toISOString().split('T')[0],
      })
    }
  }, [initialData, isOpen, regulations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Assessment' : 'Schedule New Assessment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Regulation *
              </label>
              <select
                value={formData.regulation}
                onChange={(e) => setFormData({ ...formData, regulation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select regulation</option>
                {regulations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.short_name} - {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assessment Type *
              </label>
              <select
                value={formData.assessment_type}
                onChange={(e) =>
                  setFormData({ ...formData, assessment_type: e.target.value as AssessmentType })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessment Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Q4 2024 KYC Assessment"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Scheduled Date *
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={formData.start_date || ''}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date || ''}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Assessor Organization
            </label>
            <input
              type="text"
              value={formData.assessor_organization || ''}
              onChange={(e) => setFormData({ ...formData, assessor_organization: e.target.value })}
              placeholder="e.g., Internal Audit, Deloitte, PwC"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          {initialData && initialData.status === 'completed' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Overall Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.overall_score || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, overall_score: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Summary
                </label>
                <textarea
                  value={formData.summary || ''}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface CompleteAssessmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (score: number, summary: string) => Promise<void>
  assessment: Assessment | null
  isLoading?: boolean
}

function CompleteAssessmentModal({
  isOpen,
  onClose,
  onSubmit,
  assessment,
  isLoading,
}: CompleteAssessmentModalProps) {
  const [score, setScore] = useState(0)
  const [summary, setSummary] = useState('')

  useEffect(() => {
    if (assessment) {
      setScore(assessment.overall_score || 0)
      setSummary(assessment.summary || '')
    }
  }, [assessment, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(score, summary)
  }

  if (!isOpen || !assessment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Complete Assessment
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{assessment.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{assessment.regulation_name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Overall Score (%) *
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              required
            />
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Summary
            </label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={4}
              placeholder="Summary of assessment findings and recommendations..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Complete Assessment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function AssessmentsTab() {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null)
  const [completingAssessment, setCompletingAssessment] = useState<Assessment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [assessmentsData, regulationsData] = await Promise.all([
        getAssessments({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery || undefined,
        }),
        getRegulations(),
      ])
      setAssessments(assessmentsData)
      setRegulations(regulationsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setAssessments([])
      setRegulations([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleCreate = async (data: CreateAssessmentRequest) => {
    setIsSubmitting(true)
    try {
      await createAssessment(data)
      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create assessment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: CreateAssessmentRequest) => {
    if (!editingAssessment) return
    setIsSubmitting(true)
    try {
      await updateAssessment(editingAssessment.id, data)
      await fetchData()
      setIsModalOpen(false)
      setEditingAssessment(null)
    } catch (error) {
      console.error('Failed to update assessment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (assessment: Assessment) => {
    if (!confirm(`Are you sure you want to delete "${assessment.name}"?`)) return
    try {
      await deleteAssessment(assessment.id)
      await fetchData()
    } catch (error) {
      console.error('Failed to delete assessment:', error)
    }
  }

  const handleStart = async (assessment: Assessment) => {
    try {
      await startAssessment(assessment.id)
      await fetchData()
    } catch (error) {
      console.error('Failed to start assessment:', error)
    }
  }

  const handleComplete = async (score: number, summary: string) => {
    if (!completingAssessment) return
    setIsSubmitting(true)
    try {
      await completeAssessment(completingAssessment.id, { overall_score: score, summary })
      await fetchData()
      setIsCompleteModalOpen(false)
      setCompletingAssessment(null)
    } catch (error) {
      console.error('Failed to complete assessment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter assessments
  const filteredAssessments = assessments.filter((a) => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    total: assessments.length,
    planned: assessments.filter((a) => a.status === 'planned').length,
    inProgress: assessments.filter((a) => a.status === 'in_progress').length,
    completed: assessments.filter((a) => a.status === 'completed').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compliance Assessments
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Schedule, conduct, and track compliance assessments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAssessment(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Assessment
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Planned</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.planned}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assessments..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredAssessments.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No assessments found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Schedule your first assessment'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onView={(a) => console.log('View', a)}
              onEdit={(a) => {
                setEditingAssessment(a)
                setIsModalOpen(true)
              }}
              onDelete={handleDelete}
              onStart={handleStart}
              onComplete={(a) => {
                setCompletingAssessment(a)
                setIsCompleteModalOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AssessmentFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingAssessment(null)
        }}
        onSubmit={editingAssessment ? handleUpdate : handleCreate}
        regulations={regulations}
        initialData={editingAssessment || undefined}
        isLoading={isSubmitting}
      />

      <CompleteAssessmentModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          setIsCompleteModalOpen(false)
          setCompletingAssessment(null)
        }}
        onSubmit={handleComplete}
        assessment={completingAssessment}
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default AssessmentsTab
