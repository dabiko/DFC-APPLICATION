/**
 * CrossDepartmentAccessModal Component
 * Modal for requesting and managing cross-department access
 */

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Building2,
  Users,
  Shield,
  Clock,
  AlertCircle,
  Check,
  XCircle,
  Loader2,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchNavigation,
  fetchRoles,
  createAccessRequest,
  selectNavigation,
  selectAvailableRoles,
  selectAccessLoading,
  selectDepartmentError,
} from '@/store/slices/departmentSlice'
import type { Department, DepartmentRole, CreateAccessRequestData } from '@/types/department'
import { cn } from '@/utils/cn'

interface CrossDepartmentAccessModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedDepartmentId?: number | string | null
}

export function CrossDepartmentAccessModal({
  isOpen,
  onClose,
  preSelectedDepartmentId,
}: CrossDepartmentAccessModalProps) {
  const dispatch = useAppDispatch()

  // Redux state
  const navigation = useAppSelector(selectNavigation)
  const roles = useAppSelector(selectAvailableRoles)
  const loading = useAppSelector(selectAccessLoading)
  const error = useAppSelector(selectDepartmentError)

  // Local state
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | string | null>(
    preSelectedDepartmentId || null
  )
  const [selectedRoleId, setSelectedRoleId] = useState<number | string | null>(null)
  const [reason, setReason] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Get departments user doesn't have access to
  const availableDepartments = navigation
    .filter((n) => !n.isAccessible || n.accessType === 'none')
    .map((n) => n.department)

  // Get all departments for display
  const allDepartments = navigation.map((n) => n.department)

  // Fetch roles on mount
  useEffect(() => {
    if (isOpen && roles.length === 0) {
      dispatch(fetchRoles())
    }
  }, [isOpen, dispatch, roles.length])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDepartmentId(preSelectedDepartmentId || null)
      setSelectedRoleId(null)
      setReason('')
      setSubmitError(null)
      setSubmitSuccess(false)
    }
  }, [isOpen, preSelectedDepartmentId])

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setSubmitError(null)

      if (!selectedDepartmentId) {
        setSubmitError('Please select a department')
        return
      }

      if (!selectedRoleId) {
        setSubmitError('Please select an access level')
        return
      }

      if (!reason.trim()) {
        setSubmitError('Please provide a reason for your request')
        return
      }

      try {
        const data: CreateAccessRequestData = {
          departmentId: selectedDepartmentId,
          requestedRoleId: selectedRoleId,
          reason: reason.trim(),
        }

        await dispatch(createAccessRequest(data)).unwrap()
        setSubmitSuccess(true)

        // Close modal after brief delay to show success
        setTimeout(() => {
          onClose()
          // Refresh navigation to show pending request
          dispatch(fetchNavigation())
        }, 1500)
      } catch (err: any) {
        setSubmitError(err || 'Failed to submit access request')
      }
    },
    [dispatch, selectedDepartmentId, selectedRoleId, reason, onClose]
  )

  // Get selected department details
  const selectedDepartment = allDepartments.find((d) => d.id === selectedDepartmentId)

  // Get selected role details
  const selectedRole = roles.find((r) => r.id === selectedRoleId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Request Department Access
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Request access to view folders in another department
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {submitSuccess && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Request Submitted
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your access request has been submitted and is pending approval.
            </p>
          </div>
        )}

        {/* Form */}
        {!submitSuccess && (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Error Message */}
              {(submitError || error) && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{submitError || error}</p>
                </div>
              )}

              {/* Department Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Department
                </label>
                <div className="space-y-2">
                  {allDepartments.map((dept) => {
                    const navItem = navigation.find((n) => n.department.id === dept.id)
                    const hasAccess = navItem?.isAccessible && navItem?.accessType !== 'none'

                    return (
                      <button
                        key={dept.id}
                        type="button"
                        disabled={hasAccess}
                        onClick={() => setSelectedDepartmentId(dept.id)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          hasAccess
                            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                            : selectedDepartmentId === dept.id
                              ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                        )}
                      >
                        <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {dept.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {dept.code}
                          </div>
                        </div>
                        {hasAccess && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                            {navItem?.accessType === 'own' ? 'Your Department' : 'Access Granted'}
                          </span>
                        )}
                        {selectedDepartmentId === dept.id && !hasAccess && (
                          <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Access Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setSelectedRoleId(role.id)}
                      className={cn(
                        'flex flex-col items-start p-3 rounded-lg border transition-colors text-left',
                        selectedRoleId === role.id
                          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {role.displayName || role.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {role.canView && 'View'} {role.canDownload && '• Download'}{' '}
                        {role.canUpload && '• Upload'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Access
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why you need access to this department's folders..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Your request will be reviewed by a department manager
                </p>
              </div>

              {/* Summary */}
              {selectedDepartment && selectedRole && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Request Summary
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      <span>{selectedDepartment.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>{selectedRole.displayName || selectedRole.name} access</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !selectedDepartmentId || !selectedRoleId || !reason.trim()}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  loading || !selectedDepartmentId || !selectedRoleId || !reason.trim()
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                )}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit Request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default CrossDepartmentAccessModal
