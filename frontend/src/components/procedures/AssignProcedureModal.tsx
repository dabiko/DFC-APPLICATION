/**
 * AssignProcedureModal — Modal for assigning a published procedure version to users,
 * departments, or roles with a due date.
 */

import { useState, useEffect } from 'react'
import {
  X,
  Users,
  Building2,
  Shield,
  CalendarDays,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Search,
  Check,
} from 'lucide-react'
import { createAssignments } from '@/services/assignmentService'
import { getUsers } from '@/services/userManagementService'
import type { UserBasic } from '@/services/userManagementService'
import { departmentService } from '@/services/departmentService'
import { DatePicker } from '@/components/DatePicker'
import type { ProcedureVersionListItem, ProcedureAssignmentInfo } from '@/types/procedure'

interface AssignProcedureModalProps {
  isOpen: boolean
  procedureTitle: string
  versions: ProcedureVersionListItem[]
  existingAssignments: ProcedureAssignmentInfo[]
  onClose: () => void
  onAssigned: () => void
}

export function AssignProcedureModal({
  isOpen,
  procedureTitle,
  versions,
  existingAssignments,
  onClose,
  onAssigned,
}: AssignProcedureModalProps) {
  const [selectedVersionId, setSelectedVersionId] = useState('')
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [selectedDeptIds, setSelectedDeptIds] = useState<number[]>([])
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [users, setUsers] = useState<(UserBasic & { department?: number | null })[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [deptSearch, setDeptSearch] = useState('')

  // Auto-select the active version
  const activeVersions = versions.filter((v) => v.is_active)

  useEffect(() => {
    if (!isOpen) return
    // Reset form
    setSelectedUserIds([])
    setSelectedDeptIds([])
    setDueDate('')
    setError(null)
    setSuccess(null)
    setUserSearch('')
    setDeptSearch('')
    setSelectedVersionId(activeVersions.length > 0 ? activeVersions[0].id : versions[0]?.id || '')

    // Load users and departments
    getUsers({ page_size: 200 })
      .then((res) =>
        setUsers(res.results as unknown as (UserBasic & { department?: number | null })[])
      )
      .catch(() => {})
    departmentService
      .getDepartments()
      .then((res: any[]) => setDepartments(res.map((d: any) => ({ id: d.id, name: d.name }))))
      .catch(() => {})
  }, [isOpen])

  const filteredUsers = userSearch
    ? users.filter(
        (u) =>
          u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
          (u.first_name + ' ' + u.last_name).toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users

  const filteredDepts = deptSearch
    ? departments.filter((d) => d.name.toLowerCase().includes(deptSearch.toLowerCase()))
    : departments

  // Users already actively assigned to the selected version
  const selectedVersion = versions.find((v) => v.id === selectedVersionId)
  const alreadyAssignedUserIds = new Set(
    existingAssignments
      .filter(
        (a) =>
          a.version_number === selectedVersion?.version_number &&
          ['assigned', 'in_progress'].includes(a.status)
      )
      .map((a) => a.assignee_id)
  )

  // Department-level assignment status
  const deptAssignmentStatus = (deptId: number) => {
    const deptUsers = users.filter((u) => u.department === deptId)
    if (deptUsers.length === 0) return { total: 0, assigned: 0, allAssigned: false }
    const assigned = deptUsers.filter((u) => alreadyAssignedUserIds.has(Number(u.id))).length
    return {
      total: deptUsers.length,
      assigned,
      allAssigned: assigned === deptUsers.length && assigned > 0,
    }
  }

  const toggleUser = (id: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    )
  }

  const toggleDept = (id: number) => {
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((did) => did !== id) : [...prev, id]
    )
  }

  const hasSelection = selectedUserIds.length > 0 || selectedDeptIds.length > 0

  const handleSubmit = async () => {
    if (!selectedVersionId || !dueDate || !hasSelection) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await createAssignments({
        procedure_version_id: selectedVersionId,
        assignees: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        departments: selectedDeptIds.length > 0 ? selectedDeptIds : undefined,
        due_date: dueDate,
      })
      const count = (result as any)?.created ?? selectedUserIds.length + selectedDeptIds.length
      setSuccess(`${count} assignment(s) created successfully!`)
      setTimeout(() => {
        onAssigned()
        onClose()
      }, 3000)
    } catch (err: any) {
      setSubmitting(false)
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          'Failed to create assignments'
      )
    }
  }

  if (!isOpen) return null

  const dueDateValue = dueDate ? new Date(dueDate + 'T12:00:00') : undefined
  const handleDueDateChange = (date: Date | undefined) => {
    if (date) {
      const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      setDueDate(formatted)
    } else {
      setDueDate('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Assign Procedure
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{procedureTitle}</p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Success state */}
          {success ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Assignments Created
              </h3>
              <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{success}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Assignees have been notified.
              </p>
            </div>
          ) : (
            <>
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400 border-b border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Version selector */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Version
                  </label>
                  <select
                    value={selectedVersionId}
                    onChange={(e) => setSelectedVersionId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    {versions
                      .filter((v) => v.is_active)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version_number} — {v.title} (Active)
                        </option>
                      ))}
                    {versions
                      .filter((v) => !v.is_active)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version_number} — {v.title}
                        </option>
                      ))}
                  </select>
                  {selectedVersion && (
                    <p className="mt-1 text-xs text-gray-400">
                      {selectedVersion.step_count} steps &middot; Published{' '}
                      {new Date(selectedVersion.published_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Due date */}
                <div>
                  <DatePicker
                    label="Due Date"
                    required
                    value={dueDateValue}
                    onChange={handleDueDateChange}
                    minDate={new Date()}
                    placeholder="Select due date"
                    dateFormat="PP"
                  />
                </div>

                {/* Assign to Users */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Users className="h-4 w-4" />
                    Assign to Users
                    {selectedUserIds.length > 0 && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {selectedUserIds.length}
                      </span>
                    )}
                  </label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search users by name, username, or email..."
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    {filteredUsers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                    ) : (
                      filteredUsers.map((u) => {
                        const selected = selectedUserIds.includes(Number(u.id))
                        const alreadyAssigned = alreadyAssignedUserIds.has(Number(u.id))
                        return (
                          <label
                            key={u.id}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                              alreadyAssigned
                                ? 'cursor-not-allowed opacity-60'
                                : `cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                    selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }`
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                alreadyAssigned
                                  ? 'border-green-500 bg-green-500 dark:border-green-400 dark:bg-green-400'
                                  : selected
                                    ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                                    : 'border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-800'
                              }`}
                            >
                              {(selected || alreadyAssigned) && (
                                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                              )}
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => !alreadyAssigned && toggleUser(Number(u.id))}
                              disabled={alreadyAssigned}
                              className="sr-only"
                            />
                            <span
                              className={`flex-1 ${alreadyAssigned ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
                            >
                              {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                            </span>
                            {alreadyAssigned ? (
                              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                Assigned
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">{u.email}</span>
                            )}
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Assign to Departments */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Building2 className="h-4 w-4" />
                    Assign to Departments
                    {selectedDeptIds.length > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        {selectedDeptIds.length}
                      </span>
                    )}
                  </label>
                  <p className="text-xs text-gray-400 mb-2">
                    All active users in selected departments will be assigned.
                  </p>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={deptSearch}
                      onChange={(e) => setDeptSearch(e.target.value)}
                      placeholder="Search departments..."
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                    />
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                    {filteredDepts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-400">
                        No departments found
                      </div>
                    ) : (
                      filteredDepts.map((d) => {
                        const selected = selectedDeptIds.includes(d.id)
                        const status = deptAssignmentStatus(d.id)
                        const fullyAssigned = status.allAssigned
                        return (
                          <label
                            key={d.id}
                            className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                              fullyAssigned
                                ? 'cursor-not-allowed opacity-60'
                                : `cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                                    selected ? 'bg-green-50 dark:bg-green-900/20' : ''
                                  }`
                            }`}
                          >
                            <span
                              className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                                fullyAssigned
                                  ? 'border-green-500 bg-green-500 dark:border-green-400 dark:bg-green-400'
                                  : selected
                                    ? 'border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500'
                                    : 'border-gray-300 bg-white dark:border-gray-500 dark:bg-gray-800'
                              }`}
                            >
                              {(selected || fullyAssigned) && (
                                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                              )}
                            </span>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => !fullyAssigned && toggleDept(d.id)}
                              disabled={fullyAssigned}
                              className="sr-only"
                            />
                            <span
                              className={`flex-1 ${fullyAssigned ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}
                            >
                              {d.name}
                            </span>
                            {fullyAssigned ? (
                              <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                All Assigned
                              </span>
                            ) : status.assigned > 0 ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                {status.assigned}/{status.total} Assigned
                              </span>
                            ) : status.total > 0 ? (
                              <span className="text-xs text-gray-400">
                                {status.total} user{status.total !== 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </label>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t px-5 py-4 dark:border-gray-700">
                <p className="text-xs text-gray-400">
                  {selectedUserIds.length} user(s), {selectedDeptIds.length} department(s) selected
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting || !selectedVersionId || !dueDate || !hasSelection}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                    Assign
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
