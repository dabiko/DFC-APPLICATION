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
} from 'lucide-react'
import { createAssignments } from '@/services/assignmentService'
import { getUsers } from '@/services/userManagementService'
import type { UserBasic } from '@/services/userManagementService'
import { departmentService } from '@/services/departmentService'
import type { ProcedureVersionListItem } from '@/types/procedure'

interface AssignProcedureModalProps {
  isOpen: boolean
  procedureTitle: string
  versions: ProcedureVersionListItem[]
  onClose: () => void
  onAssigned: () => void
}

export function AssignProcedureModal({
  isOpen,
  procedureTitle,
  versions,
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

  const [users, setUsers] = useState<UserBasic[]>([])
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([])
  const [userSearch, setUserSearch] = useState('')

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
    setSelectedVersionId(activeVersions.length > 0 ? activeVersions[0].id : versions[0]?.id || '')

    // Load users and departments
    getUsers({ page_size: 200 })
      .then((res) => setUsers(res.results as unknown as UserBasic[]))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVersionId || !dueDate || !hasSelection) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await createAssignments({
        procedure_version_id: selectedVersionId,
        assignees: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        departments: selectedDeptIds.length > 0 ? selectedDeptIds : undefined,
        due_date: dueDate,
      })
      setSuccess('Assignments created successfully!')
      setTimeout(() => {
        onAssigned()
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.response?.data?.non_field_errors?.[0] ||
          'Failed to create assignments'
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedVersion = versions.find((v) => v.id === selectedVersionId)

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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
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
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <CalendarDays className="h-4 w-4" />
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name, username, or email..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                {filteredUsers.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400">No users found</div>
                ) : (
                  filteredUsers.map((u) => {
                    const selected = selectedUserIds.includes(Number(u.id))
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleUser(Number(u.id))}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1 text-gray-900 dark:text-gray-100">
                          {u.full_name || `${u.first_name} ${u.last_name}`.trim() || u.username}
                        </span>
                        <span className="text-xs text-gray-400">{u.email}</span>
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
              <div className="max-h-32 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                {departments.length === 0 ? (
                  <div className="p-3 text-center text-xs text-gray-400">No departments found</div>
                ) : (
                  departments.map((d) => {
                    const selected = selectedDeptIds.includes(d.id)
                    return (
                      <label
                        key={d.id}
                        className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                          selected ? 'bg-green-50 dark:bg-green-900/20' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleDept(d.id)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-900 dark:text-gray-100">{d.name}</span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Success */}
            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                {error}
              </div>
            )}
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
                type="submit"
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
        </form>
      </div>
    </div>
  )
}
