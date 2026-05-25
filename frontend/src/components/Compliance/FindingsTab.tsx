/**
 * FindingsTab Component
 *
 * Manages compliance findings with severity tracking, remediation workflow, and status management.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  Loader2,
  ChevronRight,
  Calendar,
  User,
  FileText,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getFindings,
  getRegulations,
  createFinding,
  updateFinding,
  deleteFinding,
  updateFindingStatus,
  type Finding,
  type Regulation,
  type CreateFindingRequest,
  type FindingSeverity,
  type FindingStatus,
  type RiskRating,
} from '@/services/complianceService'

// ============================================================================
// CONSTANTS
// ============================================================================

const SEVERITY_OPTIONS: {
  value: FindingSeverity
  label: string
  color: string
  bgColor: string
}[] = [
  {
    value: 'critical',
    label: 'Critical',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  {
    value: 'high',
    label: 'High',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  {
    value: 'low',
    label: 'Low',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
]

const STATUS_OPTIONS: { value: FindingStatus; label: string; color: string }[] = [
  {
    value: 'open',
    label: 'Open',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'remediated',
    label: 'Remediated',
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    value: 'closed',
    label: 'Closed',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    value: 'accepted',
    label: 'Risk Accepted',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  {
    value: 'deferred',
    label: 'Deferred',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
]

const RISK_OPTIONS: { value: RiskRating; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getSeverityStyle = (severity: FindingSeverity) => {
  return SEVERITY_OPTIONS.find((s) => s.value === severity) || SEVERITY_OPTIONS[2]
}

const getStatusStyle = (status: FindingStatus) => {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || STATUS_OPTIONS[0].color
}

const getSeverityIcon = (severity: FindingSeverity) => {
  switch (severity) {
    case 'critical':
      return AlertCircle
    case 'high':
      return AlertTriangle
    case 'medium':
      return AlertTriangle
    case 'low':
      return CheckCircle
    default:
      return AlertTriangle
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface FindingCardProps {
  finding: Finding
  onView: (finding: Finding) => void
  onEdit: (finding: Finding) => void
  onDelete: (finding: Finding) => void
  onUpdateStatus: (finding: Finding) => void
}

function FindingCard({ finding, onView, onEdit, onDelete, onUpdateStatus }: FindingCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const severityStyle = getSeverityStyle(finding.severity)
  const SeverityIcon = getSeverityIcon(finding.severity)

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border-l-4 border border-gray-200 dark:border-gray-700 p-5',
        finding.severity === 'critical' && 'border-l-red-500',
        finding.severity === 'high' && 'border-l-orange-500',
        finding.severity === 'medium' && 'border-l-yellow-500',
        finding.severity === 'low' && 'border-l-green-500'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', severityStyle.bgColor)}>
            <SeverityIcon className={cn('w-4 h-4', severityStyle.color)} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{finding.finding_id}</p>
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {finding.title}
            </h3>
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
                    onView(finding)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> View Details
                </button>
                <button
                  onClick={() => {
                    onEdit(finding)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    onUpdateStatus(finding)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" /> Update Status
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onDelete(finding)
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

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            severityStyle.bgColor,
            severityStyle.color
          )}
        >
          {finding.severity}
        </span>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            getStatusStyle(finding.status)
          )}
        >
          {finding.status.replace('_', ' ')}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{finding.regulation_name}</span>
      </div>

      {/* Due Date */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-gray-400" />
          <span
            className={cn(
              'text-xs',
              finding.is_overdue
                ? 'text-red-600 dark:text-red-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {finding.remediation_due_date
              ? `Due: ${new Date(finding.remediation_due_date).toLocaleDateString()}`
              : 'No due date'}
            {finding.is_overdue && ' (Overdue)'}
          </span>
        </div>
        {finding.owner_name && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <User className="w-3 h-3" />
            <span>{finding.owner_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface FindingFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateFindingRequest) => Promise<void>
  regulations: Regulation[]
  initialData?: Finding
  isLoading?: boolean
}

function FindingFormModal({
  isOpen,
  onClose,
  onSubmit,
  regulations,
  initialData,
  isLoading,
}: FindingFormModalProps) {
  const [formData, setFormData] = useState<CreateFindingRequest>({
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    regulation: '',
    risk_rating: 'medium',
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        finding_id: initialData.finding_id,
        title: initialData.title,
        description: initialData.description || '',
        severity: initialData.severity,
        status: initialData.status,
        regulation: initialData.regulation,
        control: initialData.control || undefined,
        impact_description: initialData.impact_description || '',
        risk_rating: initialData.risk_rating,
        remediation_plan: initialData.remediation_plan || '',
        remediation_due_date: initialData.remediation_due_date?.split('T')[0] || '',
        department: initialData.department || '',
      })
    } else {
      setFormData({
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        regulation: regulations[0]?.id || '',
        risk_rating: 'medium',
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
            {initialData ? 'Edit Finding' : 'Add New Finding'}
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
                    {r.short_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Finding ID
              </label>
              <input
                type="text"
                value={formData.finding_id || ''}
                onChange={(e) => setFormData({ ...formData, finding_id: e.target.value })}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief description of the finding"
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
                Severity *
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as FindingSeverity })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {SEVERITY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as FindingStatus })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Risk Rating
              </label>
              <select
                value={formData.risk_rating}
                onChange={(e) =>
                  setFormData({ ...formData, risk_rating: e.target.value as RiskRating })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {RISK_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Impact Description
            </label>
            <textarea
              value={formData.impact_description || ''}
              onChange={(e) => setFormData({ ...formData, impact_description: e.target.value })}
              rows={2}
              placeholder="Describe the business impact..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remediation Plan
            </label>
            <textarea
              value={formData.remediation_plan || ''}
              onChange={(e) => setFormData({ ...formData, remediation_plan: e.target.value })}
              rows={2}
              placeholder="Steps to remediate this finding..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.remediation_due_date || ''}
                onChange={(e) => setFormData({ ...formData, remediation_due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <input
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., IT, Compliance"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface StatusUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (status: FindingStatus, notes: string) => Promise<void>
  finding: Finding | null
  isLoading?: boolean
}

function StatusUpdateModal({
  isOpen,
  onClose,
  onSubmit,
  finding,
  isLoading,
}: StatusUpdateModalProps) {
  const [status, setStatus] = useState<FindingStatus>('open')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (finding) {
      setStatus(finding.status)
      setNotes('')
    }
  }, [finding, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(status, notes)
  }

  if (!isOpen || !finding) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Update Finding Status
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
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {finding.finding_id}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{finding.title}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={cn(
                    'px-3 py-2 text-sm font-medium rounded-lg border-2 transition-colors',
                    status === s.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes about this status change..."
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Status
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

export function FindingsTab() {
  const [findings, setFindings] = useState<Finding[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null)
  const [statusFinding, setStatusFinding] = useState<Finding | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [findingsData, regulationsData] = await Promise.all([
        getFindings({
          severity: severityFilter !== 'all' ? severityFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchQuery || undefined,
        }),
        getRegulations(),
      ])
      setFindings(findingsData)
      setRegulations(regulationsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      setFindings([])
      setRegulations([])
    } finally {
      setIsLoading(false)
    }
  }, [severityFilter, statusFilter, searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleCreate = async (data: CreateFindingRequest) => {
    setIsSubmitting(true)
    try {
      await createFinding(data)
      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create finding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: CreateFindingRequest) => {
    if (!editingFinding) return
    setIsSubmitting(true)
    try {
      await updateFinding(editingFinding.id, data)
      await fetchData()
      setIsModalOpen(false)
      setEditingFinding(null)
    } catch (error) {
      console.error('Failed to update finding:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (finding: Finding) => {
    if (!confirm(`Are you sure you want to delete "${finding.finding_id}"?`)) return
    try {
      await deleteFinding(finding.id)
      await fetchData()
    } catch (error) {
      console.error('Failed to delete finding:', error)
    }
  }

  const handleStatusUpdate = async (status: FindingStatus, notes: string) => {
    if (!statusFinding) return
    setIsSubmitting(true)
    try {
      await updateFindingStatus(statusFinding.id, status, notes)
      await fetchData()
      setIsStatusModalOpen(false)
      setStatusFinding(null)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter findings
  const filteredFindings = findings.filter((f) => {
    const matchesSearch =
      f.finding_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSeverity = severityFilter === 'all' || f.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter
    return matchesSearch && matchesSeverity && matchesStatus
  })

  // Stats
  const stats = {
    total: findings.length,
    open: findings.filter((f) => f.status === 'open').length,
    critical: findings.filter((f) => f.severity === 'critical' && f.status !== 'closed').length,
    overdue: findings.filter((f) => f.is_overdue).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compliance Findings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track and remediate compliance gaps and audit findings
          </p>
        </div>
        <button
          onClick={() => {
            setEditingFinding(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Finding
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Findings</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.open}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Critical</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.critical}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.overdue}</p>
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
            placeholder="Search findings..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="all">All Severity</option>
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
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
      ) : filteredFindings.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No findings found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || severityFilter !== 'all' || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Great! No compliance findings to address'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFindings.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onView={(f) => console.log('View', f)}
              onEdit={(f) => {
                setEditingFinding(f)
                setIsModalOpen(true)
              }}
              onDelete={handleDelete}
              onUpdateStatus={(f) => {
                setStatusFinding(f)
                setIsStatusModalOpen(true)
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <FindingFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingFinding(null)
        }}
        onSubmit={editingFinding ? handleUpdate : handleCreate}
        regulations={regulations}
        initialData={editingFinding || undefined}
        isLoading={isSubmitting}
      />

      <StatusUpdateModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false)
          setStatusFinding(null)
        }}
        onSubmit={handleStatusUpdate}
        finding={statusFinding}
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default FindingsTab
