/**
 * DepartmentsTab Component
 *
 * Displays departments in grid/tree view with member counts,
 * allows CRUD operations based on user role.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Loader2,
  ChevronRight,
  FolderTree,
  Grid3X3,
  AlertTriangle,
  MoreVertical,
  User,
} from 'lucide-react'
import { getDepartments, deleteDepartment, type Department } from '@/services/userManagementService'
import { CreateDepartmentModal } from './CreateDepartmentModal'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

interface DepartmentsTabProps {
  onRefresh: () => void
}

type ViewMode = 'grid' | 'tree'

// ============================================================================
// DEPARTMENT CARD COMPONENT
// ============================================================================

interface DepartmentCardProps {
  department: Department
  onEdit: (dept: Department) => void
  onDelete: (dept: Department) => void
}

function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  const [showMenu, setShowMenu] = useState(false)

  const getColorClasses = (index: number) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
      'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
      'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    ]
    return colors[index % colors.length]
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2 rounded-lg', getColorClasses(department.name.charCodeAt(0)))}>
          <Building2 className="w-5 h-5" />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onEdit(department)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false)
                    onDelete(department)
                  }}
                  disabled={(department.member_count || 0) > 0}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm',
                    (department.member_count || 0) > 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  )}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
        {department.name}
      </h3>
      {department.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
          {department.description}
        </p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-sm">{department.member_count || 0} members</span>
        </div>
        {department.head && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[100px]">
              {department.head.first_name} {department.head.last_name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// DEPARTMENT TREE ITEM COMPONENT
// ============================================================================

interface DepartmentTreeItemProps {
  department: Department
  level: number
  onEdit: (dept: Department) => void
  onDelete: (dept: Department) => void
}

function DepartmentTreeItem({ department, level, onEdit, onDelete }: DepartmentTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasChildren = department.children && department.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform',
                isExpanded && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        <Building2 className="w-4 h-4 text-gray-400" />

        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{department.name}</span>

        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Users className="w-4 h-4" />
          <span className="text-xs">{department.member_count || 0}</span>
        </div>

        <div className="hidden group-hover:flex items-center gap-1">
          <button
            onClick={() => onEdit(department)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
          >
            <Edit2 className="w-3 h-3 text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(department)}
            disabled={(department.member_count || 0) > 0}
            className={cn(
              'p-1 rounded',
              (department.member_count || 0) > 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500'
            )}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {department.children!.map((child) => (
            <DepartmentTreeItem
              key={child.id}
              department={child}
              level={level + 1}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DepartmentsTab({ onRefresh }: DepartmentsTabProps) {
  // State
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await getDepartments()
      setDepartments(data)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  // Filter departments
  const filteredDepartments = departments.filter(
    (dept) =>
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Build tree structure for tree view
  const buildDepartmentTree = (depts: Department[]): Department[] => {
    const map = new Map<string, Department>()
    const roots: Department[] = []

    depts.forEach((dept) => {
      map.set(dept.id, { ...dept, children: [] })
    })

    depts.forEach((dept) => {
      const item = map.get(dept.id)!
      if (dept.parent_id && map.has(dept.parent_id)) {
        const parent = map.get(dept.parent_id)!
        if (!parent.children) parent.children = []
        parent.children.push(item)
      } else {
        roots.push(item)
      }
    })

    return roots
  }

  const departmentTree = buildDepartmentTree(filteredDepartments)

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment) return
    setIsDeleting(true)
    try {
      await deleteDepartment(deletingDepartment.id)
      setDepartments((prev) => prev.filter((d) => d.id !== deletingDepartment.id))
      setDeletingDepartment(null)
      onRefresh()
    } catch (error) {
      console.error('Failed to delete department:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateSuccess = () => {
    fetchDepartments()
    onRefresh()
  }

  // Stats
  const totalMembers = departments.reduce((sum, d) => sum + (d.member_count || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search departments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* View Toggle & Create Button */}
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={cn(
                  'p-1.5 rounded transition-colors',
                  viewMode === 'tree'
                    ? 'bg-white dark:bg-gray-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                <FolderTree className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Department
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total Departments: </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {departments.length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500 dark:text-gray-400">Total Members: </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{totalMembers}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredDepartments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              No departments found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : 'Create your first department to organize users'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Department
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDepartments.map((dept) => (
              <DepartmentCard
                key={dept.id}
                department={dept}
                onEdit={setEditingDepartment}
                onDelete={setDeletingDepartment}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2">
            {departmentTree.map((dept) => (
              <DepartmentTreeItem
                key={dept.id}
                department={dept}
                level={0}
                onEdit={setEditingDepartment}
                onDelete={setDeletingDepartment}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <CreateDepartmentModal
        isOpen={showCreateModal || !!editingDepartment}
        department={editingDepartment}
        departments={departments}
        onClose={() => {
          setShowCreateModal(false)
          setEditingDepartment(null)
        }}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deletingDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingDepartment(null)}
          />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Delete Department
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{deletingDepartment.name}"?
              {(deletingDepartment.member_count || 0) > 0 && (
                <span className="block mt-2 text-red-600 dark:text-red-400">
                  This department has {deletingDepartment.member_count} members. Please reassign
                  them first.
                </span>
              )}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingDepartment(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDepartment}
                disabled={isDeleting || (deletingDepartment.member_count || 0) > 0}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
                  isDeleting || (deletingDepartment.member_count || 0) > 0
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DepartmentsTab
