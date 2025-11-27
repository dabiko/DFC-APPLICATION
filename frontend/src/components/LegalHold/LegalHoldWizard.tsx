/**
 * LegalHoldWizard Component
 * Multi-step wizard for creating legal holds with comprehensive configuration
 * Steps: Basic Info → Scope → Custodians → Documents → Review & Create
 */

import { useState, useCallback, useMemo } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Scale,
  FileText,
  Users,
  FolderSearch,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Building2,
  Tag,
  Search,
  Plus,
  Trash2,
  Loader2,
  Info,
} from 'lucide-react'
import type { LegalHold, HoldReason } from '@/types/retention'
import { getDefaultLegalHold } from '@/types/retention'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

export interface LegalHoldWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (hold: Partial<LegalHold>) => Promise<void>
  existingHold?: LegalHold
  availableDepartments?: string[]
  availableDocumentTypes?: string[]
  availableUsers?: Array<{ id: string; name: string; email: string; department?: string }>
}

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.FC<{ className?: string }>
  isComplete: boolean
  isValid: boolean
}

interface CustodianEntry {
  id: string
  name: string
  email: string
  department?: string
  role: 'custodian' | 'legal_counsel' | 'reviewer'
  notificationSent?: boolean
  acknowledged?: boolean
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOLD_REASONS: Array<{ value: HoldReason; label: string; description: string }> = [
  {
    value: 'litigation',
    label: 'Litigation',
    description: 'Active or anticipated legal proceedings',
  },
  {
    value: 'investigation',
    label: 'Investigation',
    description: 'Internal or external investigation',
  },
  {
    value: 'audit',
    label: 'Audit',
    description: 'Regulatory or financial audit requirements',
  },
  {
    value: 'regulatory',
    label: 'Regulatory',
    description: 'Regulatory compliance requirements',
  },
  {
    value: 'compliance',
    label: 'Compliance',
    description: 'General compliance preservation',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other business or legal reason',
  },
]

const DEFAULT_DEPARTMENTS = [
  'Accounting',
  'Legal',
  'HR',
  'IT',
  'Sales',
  'Marketing',
  'Operations',
  'Finance',
  'Compliance',
  'Risk',
  'Audit',
  'Executive',
]

const DEFAULT_DOCUMENT_TYPES = [
  'Email',
  'Contract',
  'Invoice',
  'Report',
  'Presentation',
  'Spreadsheet',
  'Customer Record',
  'Financial Statement',
  'Legal Document',
  'HR Document',
  'Correspondence',
  'Meeting Minutes',
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function LegalHoldWizard({
  isOpen,
  onClose,
  onComplete,
  existingHold,
  availableDepartments = DEFAULT_DEPARTMENTS,
  availableDocumentTypes = DEFAULT_DOCUMENT_TYPES,
  availableUsers = [],
}: LegalHoldWizardProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<LegalHold>>(() => {
    if (existingHold) {
      return { ...existingHold }
    }
    return {
      ...getDefaultLegalHold(),
      effectiveDate: new Date().toISOString().split('T')[0],
    }
  })

  // Custodians state
  const [custodians, setCustodians] = useState<CustodianEntry[]>([])
  const [newCustodianSearch, setNewCustodianSearch] = useState('')

  // Keywords state
  const [newKeyword, setNewKeyword] = useState('')

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Validation functions
  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const newErrors: Record<string, string> = {}

      switch (stepIndex) {
        case 0: // Basic Info
          if (!formData.caseName?.trim()) {
            newErrors.caseName = 'Case name is required'
          }
          if (!formData.caseNumber?.trim()) {
            newErrors.caseNumber = 'Case number is required'
          }
          if (!formData.reason) {
            newErrors.reason = 'Hold reason is required'
          }
          if (!formData.description?.trim()) {
            newErrors.description = 'Description is required'
          }
          break

        case 1: // Scope
          if (!formData.departments || formData.departments.length === 0) {
            newErrors.departments = 'Select at least one department'
          }
          break

        case 2: // Custodians
          if (custodians.length === 0) {
            newErrors.custodians = 'Add at least one custodian'
          }
          break

        case 3: // Documents (optional step, no required validation)
          break

        case 4: // Review (validate all)
          if (!formData.caseName?.trim()) newErrors.caseName = 'Required'
          if (!formData.caseNumber?.trim()) newErrors.caseNumber = 'Required'
          if (!formData.reason) newErrors.reason = 'Required'
          if (!formData.departments || formData.departments.length === 0)
            newErrors.departments = 'Required'
          if (custodians.length === 0) newErrors.custodians = 'Required'
          break
      }

      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    },
    [formData, custodians]
  )

  // Step definitions
  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'basic',
        title: 'Basic Information',
        description: 'Define the legal hold case details',
        icon: Scale,
        isComplete: currentStep > 0,
        isValid: !!(formData.caseName && formData.caseNumber && formData.reason),
      },
      {
        id: 'scope',
        title: 'Scope Definition',
        description: 'Define departments and document types',
        icon: Building2,
        isComplete: currentStep > 1,
        isValid: (formData.departments?.length || 0) > 0,
      },
      {
        id: 'custodians',
        title: 'Custodians',
        description: 'Assign custodians and legal counsel',
        icon: Users,
        isComplete: currentStep > 2,
        isValid: custodians.length > 0,
      },
      {
        id: 'documents',
        title: 'Document Search',
        description: 'Define search criteria for documents',
        icon: FolderSearch,
        isComplete: currentStep > 3,
        isValid: true, // Optional step
      },
      {
        id: 'review',
        title: 'Review & Create',
        description: 'Review and create the legal hold',
        icon: CheckCircle,
        isComplete: false,
        isValid: true,
      },
    ],
    [currentStep, formData, custodians]
  )

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    }
  }, [currentStep, validateStep, steps.length])

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
    setErrors({})
  }, [])

  const handleStepClick = useCallback(
    (stepIndex: number) => {
      if (stepIndex < currentStep) {
        setCurrentStep(stepIndex)
        setErrors({})
      } else if (stepIndex === currentStep + 1 && validateStep(currentStep)) {
        setCurrentStep(stepIndex)
      }
    },
    [currentStep, validateStep]
  )

  // Form handlers
  const updateFormData = useCallback((field: keyof LegalHold, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])

  const toggleDepartment = useCallback((dept: string) => {
    setFormData((prev) => {
      const current = prev.departments || []
      const updated = current.includes(dept)
        ? current.filter((d) => d !== dept)
        : [...current, dept]
      return { ...prev, departments: updated }
    })
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors.departments
      return newErrors
    })
  }, [])

  const toggleDocumentType = useCallback((type: string) => {
    setFormData((prev) => {
      const current = prev.documentTypes || []
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type]
      return { ...prev, documentTypes: updated }
    })
  }, [])

  const addKeyword = useCallback(() => {
    if (newKeyword.trim()) {
      setFormData((prev) => ({
        ...prev,
        keywords: [...(prev.keywords || []), newKeyword.trim()],
      }))
      setNewKeyword('')
    }
  }, [newKeyword])

  const removeKeyword = useCallback((keyword: string) => {
    setFormData((prev) => ({
      ...prev,
      keywords: (prev.keywords || []).filter((k) => k !== keyword),
    }))
  }, [])

  const addCustodian = useCallback(
    (user: { id: string; name: string; email: string; department?: string }) => {
      if (!custodians.find((c) => c.id === user.id)) {
        setCustodians((prev) => [
          ...prev,
          {
            ...user,
            role: 'custodian',
            notificationSent: false,
            acknowledged: false,
          },
        ])
        setNewCustodianSearch('')
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors.custodians
          return newErrors
        })
      }
    },
    [custodians]
  )

  const removeCustodian = useCallback((custodianId: string) => {
    setCustodians((prev) => prev.filter((c) => c.id !== custodianId))
  }, [])

  const updateCustodianRole = useCallback((custodianId: string, role: CustodianEntry['role']) => {
    setCustodians((prev) => prev.map((c) => (c.id === custodianId ? { ...c, role } : c)))
  }, [])

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!validateStep(4)) return

    setIsSubmitting(true)
    try {
      const holdData: Partial<LegalHold> = {
        ...formData,
        custodians: custodians.filter((c) => c.role === 'custodian').map((c) => c.id),
        legalCounsel: custodians.filter((c) => c.role === 'legal_counsel').map((c) => c.id),
        reviewers: custodians.filter((c) => c.role === 'reviewer').map((c) => c.id),
        status: 'active',
        createdAt: new Date().toISOString(),
      }

      await onComplete(holdData)
      onClose()
    } catch (error) {
      console.error('Failed to create legal hold:', error)
      setErrors({ submit: 'Failed to create legal hold. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, custodians, validateStep, onComplete, onClose])

  // Filter available users based on search
  const filteredUsers = useMemo(() => {
    if (!newCustodianSearch.trim()) return availableUsers.slice(0, 10)
    const search = newCustodianSearch.toLowerCase()
    return availableUsers
      .filter(
        (u) =>
          u.name.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          u.department?.toLowerCase().includes(search)
      )
      .slice(0, 10)
  }, [availableUsers, newCustodianSearch])

  if (!isOpen) return null

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderBasicInfoStep()
      case 1:
        return renderScopeStep()
      case 2:
        return renderCustodiansStep()
      case 3:
        return renderDocumentsStep()
      case 4:
        return renderReviewStep()
      default:
        return null
    }
  }

  const renderBasicInfoStep = () => (
    <div className="space-y-6">
      {/* Case Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Case Number *
        </label>
        <input
          type="text"
          value={formData.caseNumber || ''}
          onChange={(e) => updateFormData('caseNumber', e.target.value)}
          placeholder="e.g., LH-2025-001"
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white',
            errors.caseNumber
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        />
        {errors.caseNumber && <p className="text-sm text-red-600 mt-1">{errors.caseNumber}</p>}
      </div>

      {/* Case Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Case Name *
        </label>
        <input
          type="text"
          value={formData.caseName || ''}
          onChange={(e) => updateFormData('caseName', e.target.value)}
          placeholder="e.g., Smith vs. Acme Corp Investigation"
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white',
            errors.caseName
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        />
        {errors.caseName && <p className="text-sm text-red-600 mt-1">{errors.caseName}</p>}
      </div>

      {/* Hold Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Hold Reason *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {HOLD_REASONS.map((reason) => (
            <button
              key={reason.value}
              type="button"
              onClick={() => updateFormData('reason', reason.value)}
              className={cn(
                'p-3 border rounded-lg text-left transition-colors',
                formData.reason === reason.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <div className="font-medium text-sm text-gray-900 dark:text-white">
                {reason.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{reason.description}</div>
            </button>
          ))}
        </div>
        {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Describe the legal matter and reason for the hold..."
          rows={4}
          className={cn(
            'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white',
            errors.description
              ? 'border-red-500 dark:border-red-500'
              : 'border-gray-300 dark:border-gray-600'
          )}
        />
        {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Effective Date *
          </label>
          <input
            type="date"
            value={formData.effectiveDate?.split('T')[0] || ''}
            onChange={(e) => updateFormData('effectiveDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Expected End Date (Optional)
          </label>
          <input
            type="date"
            value={formData.expiryDate?.split('T')[0] || ''}
            onChange={(e) => updateFormData('expiryDate', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Court/Jurisdiction (Optional) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Court (Optional)
          </label>
          <input
            type="text"
            value={formData.court || ''}
            onChange={(e) => updateFormData('court', e.target.value)}
            placeholder="e.g., US District Court"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Jurisdiction (Optional)
          </label>
          <input
            type="text"
            value={formData.jurisdiction || ''}
            onChange={(e) => updateFormData('jurisdiction', e.target.value)}
            placeholder="e.g., Southern District of NY"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>
    </div>
  )

  const renderScopeStep = () => (
    <div className="space-y-6">
      {/* Departments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Departments *
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Select departments whose documents should be preserved
        </p>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          {availableDepartments.map((dept) => (
            <label
              key={dept}
              className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
            >
              <input
                type="checkbox"
                checked={formData.departments?.includes(dept) || false}
                onChange={() => toggleDepartment(dept)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{dept}</span>
            </label>
          ))}
        </div>
        {errors.departments && <p className="text-sm text-red-600 mt-1">{errors.departments}</p>}
        {(formData.departments?.length || 0) > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {formData.departments?.length} department(s) selected
          </p>
        )}
      </div>

      {/* Document Types */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FileText className="w-4 h-4 inline mr-1" />
          Document Types (Optional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Leave empty to include all document types
        </p>
        <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          {availableDocumentTypes.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded"
            >
              <input
                type="checkbox"
                checked={formData.documentTypes?.includes(type) || false}
                onChange={() => toggleDocumentType(type)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
            </label>
          ))}
        </div>
        {(formData.documentTypes?.length || 0) > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {formData.documentTypes?.length} document type(s) selected
          </p>
        )}
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Document Date Range (Optional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Only preserve documents within this date range
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">From</label>
            <input
              type="date"
              value={formData.dateRange?.from || ''}
              onChange={(e) =>
                updateFormData('dateRange', {
                  ...formData.dateRange,
                  from: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">To</label>
            <input
              type="date"
              value={formData.dateRange?.to || ''}
              onChange={(e) =>
                updateFormData('dateRange', {
                  ...formData.dateRange,
                  to: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  )

  const renderCustodiansStep = () => (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">About Custodians</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Custodians are individuals who may have relevant documents. They will receive
            notification about the legal hold and are responsible for preserving their documents.
          </p>
        </div>
      </div>

      {/* Add Custodian */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Add Custodians *
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={newCustodianSearch}
            onChange={(e) => setNewCustodianSearch(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        {/* User suggestions */}
        {newCustodianSearch && filteredUsers.length > 0 && (
          <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg max-h-40 overflow-y-auto">
            {filteredUsers.map((user) => {
              const isAdded = custodians.some((c) => c.id === user.id)
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => !isAdded && addCustodian(user)}
                  disabled={isAdded}
                  className={cn(
                    'w-full flex items-center justify-between p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700',
                    isAdded && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                      {user.department && ` • ${user.department}`}
                    </div>
                  </div>
                  {isAdded ? (
                    <span className="text-xs text-green-600 dark:text-green-400">Added</span>
                  ) : (
                    <Plus className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Manual entry hint */}
        {availableUsers.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            No user directory available. Custodians will be added by email after creation.
          </p>
        )}

        {errors.custodians && <p className="text-sm text-red-600 mt-1">{errors.custodians}</p>}
      </div>

      {/* Custodian List */}
      {custodians.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selected Custodians ({custodians.length})
          </label>
          <div className="space-y-2">
            {custodians.map((custodian) => (
              <div
                key={custodian.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {custodian.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {custodian.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {custodian.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={custodian.role}
                    onChange={(e) =>
                      updateCustodianRole(custodian.id, e.target.value as CustodianEntry['role'])
                    }
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="custodian">Custodian</option>
                    <option value="legal_counsel">Legal Counsel</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCustodian(custodian.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      {/* Info */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Document Search Criteria
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Define keywords and search criteria to identify relevant documents. You can also
            manually add specific documents after the hold is created.
          </p>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          Keywords (Optional)
        </label>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
          Add keywords to help identify relevant documents
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
            placeholder="Enter keyword and press Enter..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={addKeyword}
            disabled={!newKeyword.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Keyword tags */}
        {(formData.keywords?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {formData.keywords?.map((keyword) => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-full"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  className="hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional Notes (Optional)
        </label>
        <textarea
          value={formData.notes || ''}
          onChange={(e) => updateFormData('notes', e.target.value)}
          placeholder="Add any additional notes about document collection criteria..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Criteria Summary
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Departments: {formData.departments?.join(', ') || 'All'}</li>
          <li>
            • Document Types:{' '}
            {formData.documentTypes?.length ? formData.documentTypes.join(', ') : 'All'}
          </li>
          <li>
            • Date Range:{' '}
            {formData.dateRange?.from && formData.dateRange?.to
              ? `${formData.dateRange.from} to ${formData.dateRange.to}`
              : 'No restriction'}
          </li>
          <li>
            • Keywords:{' '}
            {formData.keywords?.length ? formData.keywords.join(', ') : 'None specified'}
          </li>
        </ul>
      </div>
    </div>
  )

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {formData.caseName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Case #{formData.caseNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Reason:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">
              {formData.reason}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Effective:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-white">
              {formData.effectiveDate?.split('T')[0]}
            </span>
          </div>
          {formData.court && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Court:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {formData.court}
              </span>
            </div>
          )}
          {formData.jurisdiction && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Jurisdiction:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-white">
                {formData.jurisdiction}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">{formData.description}</p>
      </div>

      {/* Scope */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Scope</h4>
        <div className="space-y-3">
          <div>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
              Departments ({formData.departments?.length || 0})
            </span>
            <div className="flex flex-wrap gap-1 mt-1">
              {formData.departments?.map((dept) => (
                <span
                  key={dept}
                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded"
                >
                  {dept}
                </span>
              ))}
            </div>
          </div>
          {(formData.documentTypes?.length || 0) > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Document Types ({formData.documentTypes?.length})
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.documentTypes?.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(formData.keywords?.length || 0) > 0 && (
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Keywords ({formData.keywords?.length})
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {formData.keywords?.map((keyword) => (
                  <span
                    key={keyword}
                    className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custodians */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Custodians ({custodians.length})
        </h4>
        <div className="space-y-2">
          {custodians.map((custodian) => (
            <div key={custodian.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {custodian.name.charAt(0)}
                  </span>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">{custodian.name}</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {custodian.role.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Important Notice
          </p>
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Once created, this legal hold will immediately prevent deletion of matching documents.
            Custodians will be notified via email to preserve their relevant documents.
          </p>
        </div>
      </div>

      {errors.submit && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {existingHold ? 'Edit Legal Hold' : 'Create Legal Hold'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {steps[currentStep].description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = index === currentStep
              const isComplete = index < currentStep
              const isClickable = index < currentStep || (index === currentStep + 1 && step.isValid)

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => isClickable && handleStepClick(index)}
                    disabled={!isClickable}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                      isActive && 'bg-blue-100 dark:bg-blue-900/30',
                      isComplete && 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700',
                      !isClickable && !isActive && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        isActive && 'bg-blue-600 text-white',
                        isComplete && 'bg-green-600 text-white',
                        !isActive && !isComplete && 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                      )}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium hidden md:block',
                        isActive && 'text-blue-700 dark:text-blue-300',
                        isComplete && 'text-green-700 dark:text-green-300',
                        !isActive && !isComplete && 'text-gray-500 dark:text-gray-400'
                      )}
                    >
                      {step.title}
                    </span>
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        'w-8 h-0.5 mx-1',
                        index < currentStep ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'
                      )}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderStepContent()}</div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={currentStep === 0 ? onClose : handleBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {currentStep === 0 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Create Legal Hold
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default LegalHoldWizard
