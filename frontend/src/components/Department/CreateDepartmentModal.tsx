/**
 * CreateDepartmentModal Component
 * Modal for creating new departments (admin only)
 */

import { useState, useCallback } from 'react'
import { X, Building2, Loader2 } from 'lucide-react'
import { useAppDispatch } from '@/store'
import departmentService from '@/services/departmentService'
import { fetchNavigation } from '@/store/slices/departmentSlice'
import { toast } from '@/utils/toast'
import type { CreateDepartmentData } from '@/types/department'
import { cn } from '@/utils/cn'

interface CreateDepartmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateDepartmentModal({ isOpen, onClose, onSuccess }: CreateDepartmentModalProps) {
  const dispatch = useAppDispatch()

  // Form state
  const [formData, setFormData] = useState<CreateDepartmentData>({
    name: '',
    code: '',
    description: '',
    storageQuotaGb: 100,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle input change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'storageQuotaGb' ? parseInt(value) || 0 : value,
      }))
      setError(null)
    },
    []
  )

  // Auto-generate code from name
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    setFormData((prev) => ({
      ...prev,
      name,
      // Auto-generate code if not manually edited
      code:
        prev.code === '' || prev.code === generateCode(prev.name) ? generateCode(name) : prev.code,
    }))
    setError(null)
  }, [])

  // Generate department code from name
  const generateCode = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '')
      .split(/\s+/)
      .map((word) => word.slice(0, 3))
      .join('')
      .slice(0, 10)
  }

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      // Validation
      if (!formData.name.trim()) {
        setError('Department name is required')
        return
      }
      if (!formData.code.trim()) {
        setError('Department code is required')
        return
      }
      if (formData.code.length > 20) {
        setError('Department code must be 20 characters or less')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const departmentName = formData.name
        await departmentService.createDepartment(formData)
        // Refresh navigation to show new department
        dispatch(fetchNavigation())
        // Reset form
        setFormData({
          name: '',
          code: '',
          description: '',
          storageQuotaGb: 100,
        })
        toast.success(`Department "${departmentName}" created successfully`)
        onSuccess?.()
        onClose()
      } catch (err: any) {
        // Parse error message - handle Django REST Framework validation errors
        let errorMessage = 'Failed to create department'

        if (err.response?.data) {
          const data = err.response.data

          // Handle field-level validation errors: {"name": ["error message"]}
          if (typeof data === 'object' && !data.message && !data.detail) {
            const fieldErrors: string[] = []
            for (const [, messages] of Object.entries(data)) {
              if (Array.isArray(messages)) {
                fieldErrors.push(...messages.map((msg) => String(msg)))
              } else if (typeof messages === 'string') {
                fieldErrors.push(messages)
              }
            }
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join('. ')
            }
          } else if (data.message) {
            errorMessage = data.message
          } else if (data.detail) {
            errorMessage = data.detail
          }
        } else if (err.message) {
          errorMessage = err.message
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [formData, dispatch, onSuccess, onClose]
  )

  // Handle close
  const handleClose = useCallback(() => {
    if (!loading) {
      setFormData({
        name: '',
        code: '',
        description: '',
        storageQuotaGb: 100,
      })
      setError(null)
      onClose()
    }
  }, [loading, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create Department
            </h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Department Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Department Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g., Human Resources"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* Department Code */}
          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Department Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="code"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="e.g., HR"
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Short unique identifier (max 20 characters)
            </p>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description of the department"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Storage Quota */}
          <div>
            <label
              htmlFor="storageQuotaGb"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Storage Quota (GB)
            </label>
            <input
              type="number"
              id="storageQuotaGb"
              name="storageQuotaGb"
              value={formData.storageQuotaGb}
              onChange={handleChange}
              min={1}
              max={10000}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Maximum storage allocation for this department
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2',
                loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateDepartmentModal
