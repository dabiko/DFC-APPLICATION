/**
 * UserSelectDropdown — Rich user selection dropdown with search, avatars, and descriptions.
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Check, Search, X, User } from 'lucide-react'
import type { UserBasic } from '@/services/userManagementService'
import { cn } from '@/utils/cn'

interface UserSelectDropdownProps {
  value: number | string | null | undefined
  onChange: (userId: number | null) => void
  users: UserBasic[]
  icon?: React.ReactNode
  label: string
  description?: string
  placeholder?: string
  currentName?: string | null
}

function getUserInitials(user: UserBasic): string {
  const first = user.first_name?.[0] || ''
  const last = user.last_name?.[0] || ''
  return (first + last).toUpperCase() || user.username?.[0]?.toUpperCase() || '?'
}

function getUserDisplayName(user: UserBasic): string {
  return user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.username
}

export function UserSelectDropdown({
  value,
  onChange,
  users,
  icon,
  label,
  description,
  placeholder = 'Select user...',
  currentName,
}: UserSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus()
    }
  }, [open])

  const handleOpen = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const dropdownHeight = 300 // approximate max height of dropdown
      const spaceBelow = window.innerHeight - rect.bottom
      setOpenUpward(spaceBelow < dropdownHeight)
    }
    setOpen(!open)
  }

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(value)),
    [users, value]
  )

  const filtered = useMemo(() => {
    if (!search) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) =>
        getUserDisplayName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
    )
  }, [users, search])

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
      </label>
      {description && <p className="text-[11px] text-gray-400 mb-1.5">{description}</p>}

      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
            open
              ? 'border-blue-400 ring-2 ring-blue-500/20 bg-white dark:bg-gray-800'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500'
          )}
        >
          {selectedUser ? (
            <>
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getUserInitials(selectedUser)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {getUserDisplayName(selectedUser)}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {selectedUser.email}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(null)
                }}
                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-gray-400" />
              </div>
              <span className="flex-1 text-sm text-gray-400">{placeholder}</span>
            </>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-gray-400 transition-transform flex-shrink-0',
              open && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            className={cn(
              'absolute z-50 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg overflow-hidden',
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            )}
          >
            {/* Search */}
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Options */}
            <div className="max-h-52 overflow-y-auto p-1.5">
              {/* Unassign option */}
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                  setSearch('')
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                  !value
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                  No one assigned
                </span>
                {!value && <Check className="h-3.5 w-3.5 text-blue-600 ml-auto flex-shrink-0" />}
              </button>

              {filtered.map((user) => {
                const isSelected = String(user.id) === String(value)
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => {
                      onChange(Number(user.id))
                      setOpen(false)
                      setSearch('')
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                        isSelected
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 text-gray-600 dark:text-gray-300'
                      )}
                    >
                      {getUserInitials(user)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-xs font-medium truncate',
                          isSelected
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {getUserDisplayName(user)}
                      </div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })}

              {filtered.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
