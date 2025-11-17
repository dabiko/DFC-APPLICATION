import React, { useState, useMemo } from 'react'
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UserIcon,
  UserGroupIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import type { User, UserGroup, UserSearchSelectorProps } from '@/types/sharing'

export const UserSearchSelector: React.FC<UserSearchSelectorProps> = ({
  selectedUsers,
  selectedGroups,
  onSelectUser,
  onDeselectUser,
  onSelectGroup,
  onDeselectGroup,
  availableUsers = [],
  availableGroups = [],
  maxSelections,
  placeholder = 'Search users or groups...',
  allowGroups = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users')

  const totalSelections = selectedUsers.length + selectedGroups.length

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return availableUsers
    const query = searchQuery.toLowerCase()
    return availableUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query)
    )
  }, [availableUsers, searchQuery])

  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return availableGroups
    const query = searchQuery.toLowerCase()
    return availableGroups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
    )
  }, [availableGroups, searchQuery])

  const isUserSelected = (userId: string) =>
    selectedUsers.some((u) => u.id === userId)

  const isGroupSelected = (groupId: string) =>
    selectedGroups.some((g) => g.id === groupId)

  const canSelectMore = !maxSelections || totalSelections < maxSelections

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      {/* Selected Items */}
      {(selectedUsers.length > 0 || selectedGroups.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <div
              key={user.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm"
            >
              <UserIcon className="w-4 h-4" />
              <span>{user.name}</span>
              <button
                onClick={() => onDeselectUser(user.id)}
                className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {selectedGroups.map((group) => (
            <div
              key={group.id}
              className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm"
            >
              <UserGroupIcon className="w-4 h-4" />
              <span>{group.name}</span>
              <span className="text-xs">({group.memberCount})</span>
              <button
                onClick={() => onDeselectGroup(group.id)}
                className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      {allowGroups && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-1" />
            Users ({filteredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'groups'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <UserGroupIcon className="w-4 h-4 inline mr-1" />
            Groups ({filteredGroups.length})
          </button>
        </div>
      )}

      {/* Results List */}
      <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        {activeTab === 'users' ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const selected = isUserSelected(user.id)
                const disabled = !selected && !canSelectMore

                return (
                  <button
                    key={user.id}
                    onClick={() => (selected ? onDeselectUser(user.id) : onSelectUser(user))}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </div>
                      {user.department && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {user.department}
                        </div>
                      )}
                    </div>
                    {selected && (
                      <CheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No groups found
              </div>
            ) : (
              filteredGroups.map((group) => {
                const selected = isGroupSelected(group.id)
                const disabled = !selected && !canSelectMore

                return (
                  <button
                    key={group.id}
                    onClick={() => (selected ? onDeselectGroup(group.id) : onSelectGroup(group))}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                      selected
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <UserGroupIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {group.name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {group.memberCount} members
                      </div>
                      {group.description && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                          {group.description}
                        </div>
                      )}
                    </div>
                    {selected && (
                      <CheckIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Selection Limit Warning */}
      {maxSelections && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Selected: {totalSelections} / {maxSelections}
          {totalSelections >= maxSelections && (
            <span className="text-orange-600 dark:text-orange-400 ml-2">
              (Maximum reached)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
