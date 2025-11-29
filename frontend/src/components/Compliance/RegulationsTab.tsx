/**
 * RegulationsTab Component
 *
 * Manages regulatory frameworks with CRUD operations, controls, findings, and assessments.
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
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  Users,
  FileText,
  Shield,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getRegulations,
  createRegulation,
  updateRegulation,
  deleteRegulation,
  recalculateRegulationScore,
  type Regulation,
  type CreateRegulationRequest,
} from '@/services/complianceService'

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'list' | 'detail'
type RegulationStatus = 'active' | 'inactive' | 'draft' | 'archived'

interface RegulationFormData {
  name: string
  short_name: string
  description: string
  jurisdiction: string
  effective_date: string
  status: RegulationStatus
  next_assessment_date: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_OPTIONS: { value: RegulationStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

const JURISDICTION_OPTIONS = [
  'Global',
  'United States',
  'European Union',
  'United Kingdom',
  'Africa',
  'Asia Pacific',
  'Other',
]

const INITIAL_FORM_DATA: RegulationFormData = {
  name: '',
  short_name: '',
  description: '',
  jurisdiction: 'Global',
  effective_date: new Date().toISOString().split('T')[0],
  status: 'draft',
  next_assessment_date: '',
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    case 'draft':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'inactive':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    case 'archived':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
  }
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const getScoreIcon = (score: number) => {
  if (score >= 80) return CheckCircle
  if (score >= 60) return AlertTriangle
  return XCircle
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface RegulationCardProps {
  regulation: Regulation
  onView: (regulation: Regulation) => void
  onEdit: (regulation: Regulation) => void
  onDelete: (regulation: Regulation) => void
  onRecalculate: (regulation: Regulation) => void
}

function RegulationCard({
  regulation,
  onView,
  onEdit,
  onDelete,
  onRecalculate,
}: RegulationCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const ScoreIcon = getScoreIcon(regulation.compliance_score)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{regulation.short_name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{regulation.name}</p>
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
                    onView(regulation)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    onEdit(regulation)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onRecalculate(regulation)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Recalculate Score
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onDelete(regulation)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status & Score */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            getStatusColor(regulation.status)
          )}
        >
          {regulation.status}
        </span>
        <div className={cn('flex items-center gap-1', getScoreColor(regulation.compliance_score))}>
          <ScoreIcon className="w-4 h-4" />
          <span className="text-sm font-semibold">{regulation.compliance_score}%</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {regulation.control_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Controls</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {regulation.compliant_control_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Compliant</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {regulation.finding_count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Findings</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3" />
          <span>
            {regulation.next_assessment_date
              ? `Next: ${new Date(regulation.next_assessment_date).toLocaleDateString()}`
              : 'No assessment scheduled'}
          </span>
        </div>
        <button
          onClick={() => onView(regulation)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface RegulationFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: RegulationFormData) => Promise<void>
  initialData?: Regulation
  isLoading?: boolean
}

function RegulationFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading,
}: RegulationFormModalProps) {
  const [formData, setFormData] = useState<RegulationFormData>(INITIAL_FORM_DATA)

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        short_name: initialData.short_name,
        description: initialData.description || '',
        jurisdiction: initialData.jurisdiction || 'Global',
        effective_date: initialData.effective_date?.split('T')[0] || '',
        status: initialData.status as RegulationStatus,
        next_assessment_date: initialData.next_assessment_date?.split('T')[0] || '',
      })
    } else {
      setFormData(INITIAL_FORM_DATA)
    }
  }, [initialData, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {initialData ? 'Edit Regulation' : 'Add New Regulation'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Short Name *
            </label>
            <input
              type="text"
              value={formData.short_name}
              onChange={(e) => setFormData({ ...formData, short_name: e.target.value })}
              placeholder="e.g., GDPR, SOX, KYC"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., General Data Protection Regulation"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              placeholder="Brief description of the regulation..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jurisdiction
              </label>
              <select
                value={formData.jurisdiction}
                onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {JURISDICTION_OPTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
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
                  setFormData({ ...formData, status: e.target.value as RegulationStatus })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Effective Date
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Next Assessment
              </label>
              <input
                type="date"
                value={formData.next_assessment_date}
                onChange={(e) => setFormData({ ...formData, next_assessment_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
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

interface RegulationDetailViewProps {
  regulation: Regulation
  onBack: () => void
  onEdit: () => void
}

function RegulationDetailView({ regulation, onBack, onEdit }: RegulationDetailViewProps) {
  const ScoreIcon = getScoreIcon(regulation.compliance_score)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-gray-500 rotate-180" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {regulation.short_name}
              </h2>
              <span
                className={cn(
                  'px-2 py-1 text-xs font-medium rounded-full capitalize',
                  getStatusColor(regulation.status)
                )}
              >
                {regulation.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{regulation.name}</p>
          </div>
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
      </div>

      {/* Score Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Compliance Score</p>
            <div
              className={cn(
                'flex items-center gap-2 mt-1',
                getScoreColor(regulation.compliance_score)
              )}
            >
              <ScoreIcon className="w-6 h-6" />
              <span className="text-3xl font-bold">{regulation.compliance_score}%</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {regulation.control_count}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Controls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {regulation.compliant_control_count}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Compliant</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {regulation.finding_count}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Open Findings</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                regulation.compliance_score >= 80
                  ? 'bg-green-500'
                  : regulation.compliance_score >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              )}
              style={{ width: `${regulation.compliance_score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Jurisdiction</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {regulation.jurisdiction || 'Global'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Effective Date</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {regulation.effective_date
                  ? new Date(regulation.effective_date).toLocaleDateString()
                  : 'Not set'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Last Assessment</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {regulation.last_assessment_date
                  ? new Date(regulation.last_assessment_date).toLocaleDateString()
                  : 'Never'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500 dark:text-gray-400">Next Assessment</dt>
              <dd className="text-sm font-medium text-gray-900 dark:text-white">
                {regulation.next_assessment_date
                  ? new Date(regulation.next_assessment_date).toLocaleDateString()
                  : 'Not scheduled'}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Description</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {regulation.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">View Controls</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">View Findings</span>
        </button>
        <button className="flex items-center justify-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            View Assessments
          </span>
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RegulationsTab() {
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedRegulation, setSelectedRegulation] = useState<Regulation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRegulation, setEditingRegulation] = useState<Regulation | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch regulations
  const fetchRegulations = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: { status?: string; search?: string } = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchQuery) params.search = searchQuery

      const data = await getRegulations(params)
      setRegulations(data)
    } catch (error) {
      console.error('Failed to fetch regulations:', error)
      // Fallback mock data
      setRegulations([
        {
          id: '1',
          name: 'Know Your Customer',
          short_name: 'KYC',
          description:
            'Customer identification and verification requirements for financial institutions.',
          jurisdiction: 'Global',
          effective_date: '2020-01-01',
          status: 'active',
          compliance_score: 94,
          last_assessment_date: '2024-10-15',
          next_assessment_date: '2025-01-15',
          control_count: 32,
          compliant_control_count: 30,
          finding_count: 2,
          created_at: '2020-01-01',
          updated_at: '2024-10-15',
        },
        {
          id: '2',
          name: 'Anti-Money Laundering',
          short_name: 'AML',
          description: 'Regulations to prevent money laundering and terrorist financing.',
          jurisdiction: 'Global',
          effective_date: '2018-06-01',
          status: 'active',
          compliance_score: 89,
          last_assessment_date: '2024-09-20',
          next_assessment_date: '2025-03-20',
          control_count: 45,
          compliant_control_count: 40,
          finding_count: 3,
          created_at: '2018-06-01',
          updated_at: '2024-09-20',
        },
        {
          id: '3',
          name: 'General Data Protection Regulation',
          short_name: 'GDPR',
          description: 'EU regulation on data protection and privacy.',
          jurisdiction: 'European Union',
          effective_date: '2018-05-25',
          status: 'active',
          compliance_score: 78,
          last_assessment_date: '2024-08-10',
          next_assessment_date: '2025-02-10',
          control_count: 28,
          compliant_control_count: 22,
          finding_count: 5,
          created_at: '2018-05-25',
          updated_at: '2024-08-10',
        },
        {
          id: '4',
          name: 'Sarbanes-Oxley Act',
          short_name: 'SOX',
          description: 'US federal law mandating financial practices and corporate governance.',
          jurisdiction: 'United States',
          effective_date: '2002-07-30',
          status: 'active',
          compliance_score: 91,
          last_assessment_date: '2024-11-01',
          next_assessment_date: '2025-05-01',
          control_count: 19,
          compliant_control_count: 17,
          finding_count: 1,
          created_at: '2002-07-30',
          updated_at: '2024-11-01',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchRegulations()
  }, [fetchRegulations])

  // Handlers
  const handleCreate = async (data: RegulationFormData) => {
    setIsSubmitting(true)
    try {
      const request: CreateRegulationRequest = {
        name: data.name,
        short_name: data.short_name,
        description: data.description,
        jurisdiction: data.jurisdiction,
        effective_date: data.effective_date,
        status: data.status,
        next_assessment_date: data.next_assessment_date || undefined,
      }
      await createRegulation(request)
      await fetchRegulations()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create regulation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: RegulationFormData) => {
    if (!editingRegulation) return
    setIsSubmitting(true)
    try {
      await updateRegulation(editingRegulation.id, {
        name: data.name,
        short_name: data.short_name,
        description: data.description,
        jurisdiction: data.jurisdiction,
        effective_date: data.effective_date,
        status: data.status,
        next_assessment_date: data.next_assessment_date || undefined,
      })
      await fetchRegulations()
      setIsModalOpen(false)
      setEditingRegulation(null)
      if (selectedRegulation?.id === editingRegulation.id) {
        const updated = regulations.find((r) => r.id === editingRegulation.id)
        if (updated) setSelectedRegulation(updated)
      }
    } catch (error) {
      console.error('Failed to update regulation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (regulation: Regulation) => {
    if (!confirm(`Are you sure you want to delete "${regulation.short_name}"?`)) return
    try {
      await deleteRegulation(regulation.id)
      await fetchRegulations()
      if (selectedRegulation?.id === regulation.id) {
        setSelectedRegulation(null)
        setViewMode('list')
      }
    } catch (error) {
      console.error('Failed to delete regulation:', error)
    }
  }

  const handleRecalculate = async (regulation: Regulation) => {
    try {
      await recalculateRegulationScore(regulation.id)
      await fetchRegulations()
    } catch (error) {
      console.error('Failed to recalculate score:', error)
    }
  }

  const handleView = (regulation: Regulation) => {
    setSelectedRegulation(regulation)
    setViewMode('detail')
  }

  const handleEdit = (regulation: Regulation) => {
    setEditingRegulation(regulation)
    setIsModalOpen(true)
  }

  // Filter regulations
  const filteredRegulations = regulations.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Render detail view
  if (viewMode === 'detail' && selectedRegulation) {
    return (
      <RegulationDetailView
        regulation={selectedRegulation}
        onBack={() => {
          setViewMode('list')
          setSelectedRegulation(null)
        }}
        onEdit={() => handleEdit(selectedRegulation)}
      />
    )
  }

  // Render list view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Regulatory Frameworks
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage compliance regulations and track their status
          </p>
        </div>
        <button
          onClick={() => {
            setEditingRegulation(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Regulation
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search regulations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchRegulations}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading regulations...</p>
          </div>
        </div>
      ) : filteredRegulations.length === 0 ? (
        <div className="text-center py-16">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No regulations found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria'
              : 'Get started by adding your first regulation'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Regulation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRegulations.map((regulation) => (
            <RegulationCard
              key={regulation.id}
              regulation={regulation}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRecalculate={handleRecalculate}
            />
          ))}
        </div>
      )}

      {/* Form Modal */}
      <RegulationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingRegulation(null)
        }}
        onSubmit={editingRegulation ? handleUpdate : handleCreate}
        initialData={editingRegulation || undefined}
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default RegulationsTab
