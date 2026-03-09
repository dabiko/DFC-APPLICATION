/**
 * ReviewerSelector — Pick reviewers when submitting a procedure for review.
 */

import { useState, useEffect } from 'react'
import { Search, X, User, Loader2 } from 'lucide-react'
import apiClient from '@/services/apiClient'

interface ReviewerSelectorProps {
  selected: string[]
  onChange: (userIds: string[]) => void
}

interface UserOption {
  id: string
  first_name: string
  last_name: string
  email: string
}

export function ReviewerSelector({ selected, onChange }: ReviewerSelectorProps) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (search.length < 2) {
      setUsers([])
      return
    }
    const debounce = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await apiClient.get('/users/', { params: { search, role: 'manager' } })
        setUsers(response.data.results || response.data || [])
      } catch {
        setUsers([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [search])

  const toggleUser = (userId: string) => {
    if (selected.includes(userId)) {
      onChange(selected.filter((id) => id !== userId))
    } else {
      onChange([...selected, userId])
    }
  }

  const selectedUsers = users.filter((u) => selected.includes(u.id))
  const availableUsers = users.filter((u) => !selected.includes(u.id))

  return (
    <div className="space-y-3">
      {/* Selected reviewers */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedUsers.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            >
              <User className="h-3 w-3" />
              {u.first_name} {u.last_name}
              <button onClick={() => toggleUser(u.id)} className="hover:text-red-500">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reviewers by name..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Results */}
      {availableUsers.length > 0 && (
        <div className="max-h-32 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600">
          {availableUsers.map((u) => (
            <button
              key={u.id}
              onClick={() => toggleUser(u.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <User className="h-4 w-4 text-gray-400" />
              <span>
                {u.first_name} {u.last_name}
              </span>
              <span className="text-xs text-gray-400 ml-auto">{u.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
