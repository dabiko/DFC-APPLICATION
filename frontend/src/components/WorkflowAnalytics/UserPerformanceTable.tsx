/**
 * UserPerformanceTable Component
 *
 * Displays user performance metrics in a sortable table format.
 */

import React, { useState, useMemo } from 'react'
import {
  Users,
  Medal,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Search,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { UserPerformance } from './types'

interface UserPerformanceTableProps {
  data: UserPerformance[]
  isLoading?: boolean
}

type SortField =
  | 'userName'
  | 'tasksCompleted'
  | 'completionRate'
  | 'avgResponseTime'
  | 'slaCompliance'
type SortOrder = 'asc' | 'desc'

export default function UserPerformanceTable({ data, isLoading }: UserPerformanceTableProps) {
  const [sortField, setSortField] = useState<SortField>('tasksCompleted')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')

  const sortedData = useMemo(() => {
    let filtered = data

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = data.filter(
        (user) =>
          user.userName.toLowerCase().includes(query) ||
          user.userEmail.toLowerCase().includes(query) ||
          user.department.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc'
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number)
    })
  }, [data, sortField, sortOrder, searchQuery])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium">
          <Medal className="w-3 h-3" />
          Top
        </span>
      )
    }
    if (rank <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
          #{rank}
        </span>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">User Performance</h3>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No users found matching your search' : 'No performance data available'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <button
                    onClick={() => handleSort('userName')}
                    className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    User
                    <SortIcon field="userName" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Assigned
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <button
                    onClick={() => handleSort('tasksCompleted')}
                    className="flex items-center justify-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 w-full"
                  >
                    Completed
                    <SortIcon field="tasksCompleted" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <button
                    onClick={() => handleSort('completionRate')}
                    className="flex items-center justify-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 w-full"
                  >
                    Rate
                    <SortIcon field="completionRate" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <button
                    onClick={() => handleSort('avgResponseTime')}
                    className="flex items-center justify-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 w-full"
                  >
                    Avg Time
                    <SortIcon field="avgResponseTime" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  <button
                    onClick={() => handleSort('slaCompliance')}
                    className="flex items-center justify-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 w-full"
                  >
                    SLA
                    <SortIcon field="slaCompliance" />
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Overdue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.map((user, index) => (
                <tr key={user.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                        {user.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.userName}
                          </span>
                          {user.rank && getRankBadge(user.rank)}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {user.department}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {user.tasksAssigned}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.tasksCompleted}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          user.completionRate >= 90
                            ? 'text-green-600 dark:text-green-400'
                            : user.completionRate >= 70
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {user.completionRate.toFixed(0)}%
                      </span>
                      {user.completionRate >= 90 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                      ) : user.completionRate < 70 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDuration(user.avgResponseTime)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                        user.slaCompliance >= 90
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : user.slaCompliance >= 75
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {user.slaCompliance >= 90 ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : user.slaCompliance < 75 ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : null}
                      {user.slaCompliance.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        user.tasksOverdue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                      )}
                    >
                      {user.tasksOverdue}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary footer */}
      {sortedData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{sortedData.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {sortedData.reduce((sum, u) => sum + u.tasksCompleted, 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Completed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {sortedData.length > 0
                  ? (
                      sortedData.reduce((sum, u) => sum + u.completionRate, 0) / sortedData.length
                    ).toFixed(0)
                  : 0}
                %
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Completion Rate</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {sortedData.length > 0
                  ? formatDuration(
                      sortedData.reduce((sum, u) => sum + u.avgResponseTime, 0) / sortedData.length
                    )
                  : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Response Time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }
  const days = hours / 24
  return `${days.toFixed(1)}d`
}
