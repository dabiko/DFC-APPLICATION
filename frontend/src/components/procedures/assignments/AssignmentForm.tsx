/**
 * AssignmentForm — User/dept/role picker + due date for creating assignments.
 */

import { useState } from 'react'
import { Plus, Loader2, X, Search } from 'lucide-react'
import { createAssignments, type CreateAssignmentData } from '@/services/assignmentService'

interface AssignmentFormProps {
  onCreated: () => void
  onCancel: () => void
}

export function AssignmentForm({ onCreated, onCancel }: AssignmentFormProps) {
  const [procedureId, setProcedureId] = useState('')
  const [versionId, setVersionId] = useState('')
  const [userIds, setUserIds] = useState<string[]>([])
  const [userInput, setUserInput] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddUser = () => {
    const trimmed = userInput.trim()
    if (trimmed && !userIds.includes(trimmed)) {
      setUserIds((prev) => [...prev, trimmed])
      setUserInput('')
    }
  }

  const handleRemoveUser = (id: string) => {
    setUserIds((prev) => prev.filter((u) => u !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!procedureId || !versionId || userIds.length === 0) return

    setSubmitting(true)
    setError(null)
    try {
      const data: CreateAssignmentData = {
        procedure_id: procedureId,
        version_id: versionId,
        user_ids: userIds,
        due_date: dueDate || null,
      }
      await createAssignments(data)
      onCreated()
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to create assignments')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Procedure ID
        </label>
        <input
          type="text"
          value={procedureId}
          onChange={(e) => setProcedureId(e.target.value)}
          placeholder="Enter procedure ID..."
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Version ID
        </label>
        <input
          type="text"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          placeholder="Enter version ID..."
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Assign To (User IDs)
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddUser()
                }
              }}
              placeholder="Enter user ID and press Enter..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUser}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {userIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {userIds.map((id) => (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {id}
                <button
                  type="button"
                  onClick={() => handleRemoveUser(id)}
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
          Due Date (optional)
        </label>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || !procedureId || !versionId || userIds.length === 0}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Assignments
        </button>
      </div>
    </form>
  )
}
