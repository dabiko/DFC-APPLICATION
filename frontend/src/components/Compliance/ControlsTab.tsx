/**
 * ControlsTab Component
 *
 * Manages compliance controls with evidence tracking, testing, and status management.
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
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  FileText,
  Upload,
  X,
  Loader2,
  ChevronRight,
  Calendar,
  User,
  Paperclip,
  TestTube,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  getControls,
  getRegulations,
  createControl,
  updateControl,
  deleteControl,
  recordControlTest,
  getControlEvidence,
  addControlEvidence,
  type Control,
  type Regulation,
  type ControlEvidence,
  type CreateControlRequest,
  type ControlStatus,
  type ControlType,
  type Priority,
  type TestFrequency,
} from '@/services/complianceService'

// ============================================================================
// CONSTANTS
// ============================================================================

const CONTROL_TYPES: { value: ControlType; label: string }[] = [
  { value: 'preventive', label: 'Preventive' },
  { value: 'detective', label: 'Detective' },
  { value: 'corrective', label: 'Corrective' },
  { value: 'directive', label: 'Directive' },
  { value: 'compensating', label: 'Compensating' },
]

const STATUS_OPTIONS: { value: ControlStatus; label: string; color: string }[] = [
  {
    value: 'compliant',
    label: 'Compliant',
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    value: 'non_compliant',
    label: 'Non-Compliant',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'partial',
    label: 'Partial',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    value: 'not_assessed',
    label: 'Not Assessed',
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  {
    value: 'not_applicable',
    label: 'N/A',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
]

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-600 dark:text-red-400' },
  { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-400' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400' },
  { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-400' },
]

const TEST_FREQUENCY_OPTIONS: { value: TestFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'on_demand', label: 'On Demand' },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getStatusStyle = (status: ControlStatus) => {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || STATUS_OPTIONS[3].color
}

const getStatusIcon = (status: ControlStatus) => {
  switch (status) {
    case 'compliant':
      return CheckCircle
    case 'non_compliant':
      return XCircle
    case 'partial':
      return AlertTriangle
    default:
      return Clock
  }
}

const getPriorityStyle = (priority: Priority) => {
  return PRIORITY_OPTIONS.find((p) => p.value === priority)?.color || 'text-gray-600'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ControlRowProps {
  control: Control
  onView: (control: Control) => void
  onEdit: (control: Control) => void
  onDelete: (control: Control) => void
  onTest: (control: Control) => void
}

function ControlRow({ control, onView, onEdit, onDelete, onTest }: ControlRowProps) {
  const [showMenu, setShowMenu] = useState(false)
  const StatusIcon = getStatusIcon(control.status)

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              control.status === 'compliant'
                ? 'bg-green-100 dark:bg-green-900/30'
                : control.status === 'non_compliant'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            <StatusIcon
              className={cn(
                'w-4 h-4',
                control.status === 'compliant'
                  ? 'text-green-600 dark:text-green-400'
                  : control.status === 'non_compliant'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-500'
              )}
            />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{control.control_id}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
              {control.name}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-600 dark:text-gray-400">{control.regulation_name}</span>
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            getStatusStyle(control.status)
          )}
        >
          {control.status.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded capitalize">
          {control.control_type}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={cn('text-sm font-medium capitalize', getPriorityStyle(control.priority))}>
          {control.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <Paperclip className="w-3 h-3" />
          <span>{control.evidence_count}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {control.last_tested_date
            ? new Date(control.last_tested_date).toLocaleDateString()
            : 'Never'}
        </span>
      </td>
      <td className="px-4 py-3">
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
                    onView(control)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  View Details
                </button>
                <button
                  onClick={() => {
                    onEdit(control)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    onTest(control)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  Record Test
                </button>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <button
                  onClick={() => {
                    onDelete(control)
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
      </td>
    </tr>
  )
}

interface ControlFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateControlRequest) => Promise<void>
  regulations: Regulation[]
  initialData?: Control
  isLoading?: boolean
}

function ControlFormModal({
  isOpen,
  onClose,
  onSubmit,
  regulations,
  initialData,
  isLoading,
}: ControlFormModalProps) {
  const [formData, setFormData] = useState<CreateControlRequest>({
    regulation: '',
    control_id: '',
    name: '',
    description: '',
    control_type: 'preventive',
    status: 'not_assessed',
    priority: 'medium',
    test_frequency: 'quarterly',
    evidence_required: true,
  })

  useEffect(() => {
    if (initialData) {
      setFormData({
        regulation: initialData.regulation,
        control_id: initialData.control_id,
        name: initialData.name,
        description: initialData.description || '',
        control_type: initialData.control_type,
        status: initialData.status,
        priority: initialData.priority,
        test_frequency: initialData.test_frequency,
        evidence_required: initialData.evidence_required,
        implementation_notes: initialData.implementation_notes,
      })
    } else {
      setFormData({
        regulation: regulations[0]?.id || '',
        control_id: '',
        name: '',
        description: '',
        control_type: 'preventive',
        status: 'not_assessed',
        priority: 'medium',
        test_frequency: 'quarterly',
        evidence_required: true,
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
            {initialData ? 'Edit Control' : 'Add New Control'}
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
                Control ID *
              </label>
              <input
                type="text"
                value={formData.control_id}
                onChange={(e) => setFormData({ ...formData, control_id: e.target.value })}
                placeholder="e.g., GDPR-ART5-01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Control Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Data Processing Records"
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
                Control Type
              </label>
              <select
                value={formData.control_type}
                onChange={(e) =>
                  setFormData({ ...formData, control_type: e.target.value as ControlType })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {CONTROL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
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
                  setFormData({ ...formData, status: e.target.value as ControlStatus })
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
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Test Frequency
              </label>
              <select
                value={formData.test_frequency}
                onChange={(e) =>
                  setFormData({ ...formData, test_frequency: e.target.value as TestFrequency })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {TEST_FREQUENCY_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.evidence_required}
                  onChange={(e) =>
                    setFormData({ ...formData, evidence_required: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-gray-300"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Evidence Required</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Implementation Notes
            </label>
            <textarea
              value={formData.implementation_notes || ''}
              onChange={(e) => setFormData({ ...formData, implementation_notes: e.target.value })}
              rows={2}
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
              {initialData ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface TestControlModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (status: ControlStatus, notes: string) => Promise<void>
  control: Control | null
  isLoading?: boolean
}

function TestControlModal({
  isOpen,
  onClose,
  onSubmit,
  control,
  isLoading,
}: TestControlModalProps) {
  const [status, setStatus] = useState<ControlStatus>('compliant')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (control) {
      setStatus(control.status)
      setNotes('')
    }
  }, [control, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(status, notes)
  }

  if (!isOpen || !control) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Record Test Result
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
              {control.control_id}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{control.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Result *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.filter((s) => s.value !== 'not_assessed').map((s) => (
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
              Test Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Document your test observations..."
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
              Record Result
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

export function ControlsTab() {
  const [controls, setControls] = useState<Control[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regulationFilter, setRegulationFilter] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [editingControl, setEditingControl] = useState<Control | null>(null)
  const [testingControl, setTestingControl] = useState<Control | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [controlsData, regulationsData] = await Promise.all([
        getControls({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          regulation: regulationFilter !== 'all' ? regulationFilter : undefined,
          search: searchQuery || undefined,
        }),
        getRegulations(),
      ])
      setControls(controlsData)
      setRegulations(regulationsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
      // Mock data fallback
      setControls([
        {
          id: '1',
          control_id: 'KYC-001',
          name: 'Customer Identity Verification',
          description: 'Verify customer identity using government-issued ID',
          control_type: 'preventive',
          status: 'compliant',
          regulation: '1',
          regulation_name: 'KYC',
          owner: null,
          department: 'Compliance',
          evidence_required: true,
          test_frequency: 'quarterly',
          last_tested_date: '2024-10-15',
          next_test_date: '2025-01-15',
          priority: 'critical',
          evidence_count: 5,
          created_at: '2024-01-01',
          updated_at: '2024-10-15',
        },
        {
          id: '2',
          control_id: 'GDPR-ART5-01',
          name: 'Data Processing Records',
          description: 'Maintain records of all data processing activities',
          control_type: 'detective',
          status: 'partial',
          regulation: '3',
          regulation_name: 'GDPR',
          owner: null,
          department: 'IT',
          evidence_required: true,
          test_frequency: 'monthly',
          last_tested_date: '2024-11-01',
          next_test_date: '2024-12-01',
          priority: 'high',
          evidence_count: 3,
          created_at: '2024-01-01',
          updated_at: '2024-11-01',
        },
        {
          id: '3',
          control_id: 'AML-002',
          name: 'Transaction Monitoring',
          description: 'Monitor transactions for suspicious activity',
          control_type: 'detective',
          status: 'compliant',
          regulation: '2',
          regulation_name: 'AML',
          owner: null,
          department: 'Risk',
          evidence_required: true,
          test_frequency: 'daily',
          last_tested_date: '2024-11-20',
          next_test_date: '2024-11-21',
          priority: 'critical',
          evidence_count: 12,
          created_at: '2024-01-01',
          updated_at: '2024-11-20',
        },
      ])
      setRegulations([
        {
          id: '1',
          name: 'Know Your Customer',
          short_name: 'KYC',
          description: '',
          jurisdiction: 'Global',
          effective_date: '2020-01-01',
          status: 'active',
          compliance_score: 94,
          last_assessment_date: null,
          next_assessment_date: null,
          control_count: 32,
          compliant_control_count: 30,
          finding_count: 2,
          created_at: '',
          updated_at: '',
        },
        {
          id: '2',
          name: 'Anti-Money Laundering',
          short_name: 'AML',
          description: '',
          jurisdiction: 'Global',
          effective_date: '2018-06-01',
          status: 'active',
          compliance_score: 89,
          last_assessment_date: null,
          next_assessment_date: null,
          control_count: 45,
          compliant_control_count: 40,
          finding_count: 3,
          created_at: '',
          updated_at: '',
        },
        {
          id: '3',
          name: 'General Data Protection Regulation',
          short_name: 'GDPR',
          description: '',
          jurisdiction: 'European Union',
          effective_date: '2018-05-25',
          status: 'active',
          compliance_score: 78,
          last_assessment_date: null,
          next_assessment_date: null,
          control_count: 28,
          compliant_control_count: 22,
          finding_count: 5,
          created_at: '',
          updated_at: '',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, regulationFilter, searchQuery])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handlers
  const handleCreate = async (data: CreateControlRequest) => {
    setIsSubmitting(true)
    try {
      await createControl(data)
      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create control:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (data: CreateControlRequest) => {
    if (!editingControl) return
    setIsSubmitting(true)
    try {
      await updateControl(editingControl.id, data)
      await fetchData()
      setIsModalOpen(false)
      setEditingControl(null)
    } catch (error) {
      console.error('Failed to update control:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (control: Control) => {
    if (!confirm(`Are you sure you want to delete "${control.control_id}"?`)) return
    try {
      await deleteControl(control.id)
      await fetchData()
    } catch (error) {
      console.error('Failed to delete control:', error)
    }
  }

  const handleTest = async (status: ControlStatus, notes: string) => {
    if (!testingControl) return
    setIsSubmitting(true)
    try {
      await recordControlTest(testingControl.id, { status, notes })
      await fetchData()
      setIsTestModalOpen(false)
      setTestingControl(null)
    } catch (error) {
      console.error('Failed to record test:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter controls
  const filteredControls = controls.filter((c) => {
    const matchesSearch =
      c.control_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    const matchesRegulation = regulationFilter === 'all' || c.regulation === regulationFilter
    return matchesSearch && matchesStatus && matchesRegulation
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Compliance Controls
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage controls, track evidence, and record test results
          </p>
        </div>
        <button
          onClick={() => {
            setEditingControl(null)
            setIsModalOpen(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Control
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
            placeholder="Search controls..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={regulationFilter}
          onChange={(e) => setRegulationFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
        >
          <option value="all">All Regulations</option>
          {regulations.map((r) => (
            <option key={r.id} value={r.id}>
              {r.short_name}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Controls</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{controls.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Compliant</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {controls.filter((c) => c.status === 'compliant').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Non-Compliant</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {controls.filter((c) => c.status === 'non_compliant').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Not Assessed</p>
          <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {controls.filter((c) => c.status === 'not_assessed').length}
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredControls.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No controls found
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' || regulationFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first control'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Control
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Regulation
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Evidence
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Last Test
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredControls.map((control) => (
                  <ControlRow
                    key={control.id}
                    control={control}
                    onView={(c) => console.log('View', c)}
                    onEdit={(c) => {
                      setEditingControl(c)
                      setIsModalOpen(true)
                    }}
                    onDelete={handleDelete}
                    onTest={(c) => {
                      setTestingControl(c)
                      setIsTestModalOpen(true)
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ControlFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingControl(null)
        }}
        onSubmit={editingControl ? handleUpdate : handleCreate}
        regulations={regulations}
        initialData={editingControl || undefined}
        isLoading={isSubmitting}
      />

      <TestControlModal
        isOpen={isTestModalOpen}
        onClose={() => {
          setIsTestModalOpen(false)
          setTestingControl(null)
        }}
        onSubmit={handleTest}
        control={testingControl}
        isLoading={isSubmitting}
      />
    </div>
  )
}

export default ControlsTab
