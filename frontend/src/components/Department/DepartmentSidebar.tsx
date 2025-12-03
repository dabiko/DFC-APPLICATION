/**
 * DepartmentSidebar Component
 * Displays department navigation with folders organized by department
 * Part of Department-as-Root architecture
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  RefreshCw,
  Search,
  X,
  Users,
  Settings,
  MoreHorizontal,
  UserPlus,
  Link2,
  Eye,
  UserCog,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store'
import {
  fetchNavigation,
  selectNavigation,
  selectSelectedDepartmentId,
  selectNavigationLoading,
  selectDepartmentError,
  selectDepartment,
  toggleDepartmentExpansion,
  selectExpandedDepartmentIds,
} from '@/store/slices/departmentSlice'
import {
  fetchFolders,
  selectFolders,
  selectSelectedFolder,
  selectFolder,
  createFolder,
} from '@/store/slices/folderSlice'
import { FolderTree } from '@/components/Folder/FolderTree'
import { CreateFolderModal } from '@/components/Folder/CreateFolderModal'
import type { DepartmentNavigationItem } from '@/types/department'
import type { Folder, FolderOperation, CreateFolderData } from '@/types/folder'
import { cn } from '@/utils/cn'

interface DepartmentSidebarProps {
  isCollapsed?: boolean
  className?: string
  onRequestAccess?: (departmentId: number | string) => void
  onCreateDepartment?: () => void
  /** Hide the header section when embedded in parent component */
  hideHeader?: boolean
}

export function DepartmentSidebar({
  isCollapsed = false,
  className,
  onRequestAccess,
  onCreateDepartment,
  hideHeader = false,
}: DepartmentSidebarProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  // Redux state
  const navigation = useAppSelector(selectNavigation)
  const selectedDepartmentId = useAppSelector(selectSelectedDepartmentId)
  const expandedDepartmentIds = useAppSelector(selectExpandedDepartmentIds)
  const navigationLoading = useAppSelector(selectNavigationLoading)
  const error = useAppSelector(selectDepartmentError)
  const folders = useAppSelector(selectFolders)
  const selectedFolder = useAppSelector(selectSelectedFolder)

  // Local state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createParentFolder, setCreateParentFolder] = useState<Folder | null>(null)
  const [showContextMenu, setShowContextMenu] = useState(false)

  // Department context menu state
  const [deptContextMenu, setDeptContextMenu] = useState<{
    isOpen: boolean
    x: number
    y: number
    department: DepartmentNavigationItem | null
  }>({ isOpen: false, x: 0, y: 0, department: null })

  // Fetch navigation on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
    if (token) {
      dispatch(fetchNavigation())
    }
  }, [dispatch])

  // Fetch folders when department is selected
  useEffect(() => {
    if (selectedDepartmentId) {
      dispatch(fetchFolders({ filters: { parentId: undefined } }))
    }
  }, [dispatch, selectedDepartmentId])

  // Filter navigation items by search
  const filteredNavigation = useMemo(() => {
    if (!searchQuery) return navigation
    const query = searchQuery.toLowerCase()
    return navigation.filter(
      (item) =>
        item.department.name.toLowerCase().includes(query) ||
        item.department.code.toLowerCase().includes(query)
    )
  }, [navigation, searchQuery])

  // Group departments by access type (using filtered navigation for search)
  const { isAdmin, ownDepartment, grantedDepartments, adminDepartments } = useMemo(() => {
    // Check if user has admin access (any department with 'admin' accessType)
    const hasAdminAccess = filteredNavigation.some((n) => n.accessType === 'admin')

    if (hasAdminAccess) {
      // Admin sees all departments in one list
      return {
        isAdmin: true,
        ownDepartment: null,
        grantedDepartments: [],
        adminDepartments: filteredNavigation.filter((n) => n.isAccessible),
      }
    }

    // Regular users see own department and granted departments separately
    const own = filteredNavigation.find((n) => n.accessType === 'own')
    const granted = filteredNavigation.filter((n) => n.accessType === 'granted' && n.isAccessible)
    return {
      isAdmin: false,
      ownDepartment: own,
      grantedDepartments: granted,
      adminDepartments: [],
    }
  }, [filteredNavigation])

  // Get selected department's navigation item for permission checking
  const selectedDepartmentNav = useMemo(() => {
    if (!selectedDepartmentId) return null
    return navigation.find(
      (n) =>
        n.department.id === selectedDepartmentId ||
        String(n.department.id) === String(selectedDepartmentId)
    )
  }, [navigation, selectedDepartmentId])

  // Check if user can create folders in selected department
  // Admin: always can, Own department: always can, Granted: check role permissions
  const canCreateFolderInSelected = useMemo(() => {
    if (!selectedDepartmentNav) return false

    // Admins can always create
    if (selectedDepartmentNav.accessType === 'admin') return true

    // Own department - can create
    if (selectedDepartmentNav.accessType === 'own') return true

    // Granted access - check if role allows upload/edit
    if (selectedDepartmentNav.accessType === 'granted') {
      const role = selectedDepartmentNav.grantedRole?.toUpperCase()
      // VIEWER cannot create, EDITOR/MANAGER/ADMIN can
      return role !== 'VIEWER' && role !== undefined
    }

    return false
  }, [selectedDepartmentNav])

  // Filter folders for selected department
  const departmentFolders = useMemo(() => {
    if (!selectedDepartmentId) return []
    return folders.filter(
      (f) =>
        f.departmentId === selectedDepartmentId ||
        String(f.departmentId) === String(selectedDepartmentId)
    )
  }, [folders, selectedDepartmentId])

  // Handle department selection
  const handleDepartmentSelect = useCallback(
    (departmentId: number | string) => {
      dispatch(selectDepartment(departmentId))
      // Expand the department to show folders
      if (!expandedDepartmentIds.includes(departmentId)) {
        dispatch(toggleDepartmentExpansion(departmentId))
      }
    },
    [dispatch, expandedDepartmentIds]
  )

  // Handle department expansion toggle
  const handleDepartmentToggle = useCallback(
    (departmentId: number | string) => {
      dispatch(toggleDepartmentExpansion(departmentId))
    },
    [dispatch]
  )

  // Handle folder selection
  const handleFolderSelect = useCallback(
    (folder: Folder) => {
      dispatch(selectFolder(folder.id))
      navigate(`/dashboard?folder=${folder.id}`)
    },
    [dispatch, navigate]
  )

  // Handle folder operations
  const handleFolderOperation = useCallback((operation: FolderOperation, folder: Folder) => {
    if (operation === 'create') {
      setCreateParentFolder(folder)
      setCreateModalOpen(true)
    }
    // Other operations handled by parent component
  }, [])

  // Handle create folder
  const handleCreateFolder = useCallback(
    async (data: CreateFolderData) => {
      try {
        await dispatch(createFolder(data)).unwrap()
        setCreateModalOpen(false)
        setCreateParentFolder(null)
      } catch (err) {
        console.error('Failed to create folder:', err)
      }
    },
    [dispatch]
  )

  // Handle refresh
  const handleRefresh = useCallback(() => {
    dispatch(fetchNavigation())
    if (selectedDepartmentId) {
      dispatch(fetchFolders({}))
    }
  }, [dispatch, selectedDepartmentId])

  // Open create folder modal for department root
  const openCreateRootFolder = useCallback(() => {
    setCreateParentFolder(null)
    setCreateModalOpen(true)
  }, [])

  // Handle department right-click context menu
  const handleDepartmentContextMenu = useCallback(
    (e: React.MouseEvent, item: DepartmentNavigationItem) => {
      e.preventDefault()
      e.stopPropagation()
      setDeptContextMenu({
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        department: item,
      })
    },
    []
  )

  // Close department context menu
  const closeDeptContextMenu = useCallback(() => {
    setDeptContextMenu({ isOpen: false, x: 0, y: 0, department: null })
  }, [])

  // Handle copy department link
  const handleCopyDeptLink = useCallback(() => {
    if (deptContextMenu.department) {
      const url = `${window.location.origin}/dashboard?department=${deptContextMenu.department.department.id}`
      navigator.clipboard.writeText(url)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, closeDeptContextMenu])

  // Handle view department details
  const handleViewDeptDetails = useCallback(() => {
    if (deptContextMenu.department) {
      navigate(`/departments/${deptContextMenu.department.department.id}`)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, navigate, closeDeptContextMenu])

  // Handle create folder in department from context menu
  const handleCreateFolderInDept = useCallback(() => {
    if (deptContextMenu.department) {
      handleDepartmentSelect(deptContextMenu.department.department.id)
      setCreateParentFolder(null)
      setCreateModalOpen(true)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, handleDepartmentSelect, closeDeptContextMenu])

  // Handle manage members (admin only)
  const handleManageMembers = useCallback(() => {
    if (deptContextMenu.department) {
      navigate(`/departments/${deptContextMenu.department.department.id}/members`)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, navigate, closeDeptContextMenu])

  // Handle department settings (admin only)
  const handleDeptSettings = useCallback(() => {
    if (deptContextMenu.department) {
      navigate(`/departments/${deptContextMenu.department.department.id}/settings`)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, navigate, closeDeptContextMenu])

  // Handle request access from context menu
  const handleRequestAccessFromMenu = useCallback(() => {
    if (deptContextMenu.department && onRequestAccess) {
      onRequestAccess(deptContextMenu.department.department.id)
      closeDeptContextMenu()
    }
  }, [deptContextMenu.department, onRequestAccess, closeDeptContextMenu])

  // Render department item
  const renderDepartmentItem = (item: DepartmentNavigationItem) => {
    const isExpanded = expandedDepartmentIds.includes(item.department.id)
    const isSelected = selectedDepartmentId === item.department.id

    return (
      <div key={item.department.id} className="mb-1">
        {/* Department Header */}
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group',
            isSelected
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
          )}
          onClick={() => handleDepartmentSelect(item.department.id)}
          onContextMenu={(e) => handleDepartmentContextMenu(e, item)}
        >
          {/* Expand/Collapse Arrow */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleDepartmentToggle(item.department.id)
            }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>

          {/* Department Icon */}
          <Building2 className="w-4 h-4 flex-shrink-0" />

          {/* Department Name */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{item.department.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {item.department.code}
              {item.accessType === 'granted' && item.grantedRole && (
                <span className="ml-1">({item.grantedRole})</span>
              )}
            </div>
          </div>

          {/* Folder Count Badge */}
          {item.folderCount !== undefined && item.folderCount > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
              {item.folderCount}
            </span>
          )}

          {/* Access Type Indicator */}
          {item.accessType === 'granted' && (
            <Users className="w-3.5 h-3.5 text-gray-400" title="Cross-department access" />
          )}
          {item.accessType === 'admin' && (
            <Settings className="w-3.5 h-3.5 text-amber-500" title="Administrator access" />
          )}
        </div>

        {/* Expanded Content - Folders */}
        {isExpanded && isSelected && (
          <div className="ml-4 mt-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
            {departmentFolders.length > 0 ? (
              <FolderTree
                folders={departmentFolders}
                selectedFolderId={selectedFolder?.id || null}
                onFolderSelect={handleFolderSelect}
                onFolderOperation={handleFolderOperation}
                searchQuery={searchQuery}
                enableDragDrop={true}
                enableContextMenu={true}
                showDocumentCount={true}
                showLockIndicator={true}
                showConfidentiality={true}
              />
            ) : (
              <div className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">
                No folders yet.
                {canCreateFolderInSelected && (
                  <>
                    {' '}
                    <button
                      onClick={openCreateRootFolder}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create one
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Collapsed view
  if (isCollapsed) {
    return (
      <div className={cn('flex flex-col items-center py-4 gap-3', className)}>
        {/* Smart Create Button - Collapsed */}
        {isAdmin && onCreateDepartment && (
          <button
            onClick={onCreateDepartment}
            className="p-2 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors group relative"
            title="New Department"
          >
            <Building2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              New Department
            </div>
          </button>
        )}

        {selectedDepartmentId && canCreateFolderInSelected && (
          <button
            onClick={openCreateRootFolder}
            className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group relative"
            title="New Folder"
          >
            <FolderPlus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              New Folder
            </div>
          </button>
        )}

        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
          title="Refresh"
        >
          <RefreshCw
            className={cn(
              'w-5 h-5 text-gray-600 dark:text-gray-400',
              navigationLoading && 'animate-spin'
            )}
          />
          <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
            Refresh
          </div>
        </button>

        {/* Department Icons */}
        {navigation.slice(0, 5).map((item) => (
          <button
            key={item.department.id}
            onClick={() => handleDepartmentSelect(item.department.id)}
            className={cn(
              'p-2 rounded-lg transition-colors group relative',
              selectedDepartmentId === item.department.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
            )}
            title={item.department.name}
          >
            <Building2 className="w-5 h-5" />
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              {item.department.name}
            </div>
          </button>
        ))}

        <CreateFolderModal
          isOpen={createModalOpen}
          parentFolder={createParentFolder}
          onClose={() => {
            setCreateModalOpen(false)
            setCreateParentFolder(null)
          }}
          onCreate={handleCreateFolder}
        />
      </div>
    )
  }

  // Expanded view
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Error Message */}
      {error && (
        <div className="mx-3 mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Header - Only show if not hidden */}
      {!hideHeader && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              DEPARTMENTS
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Search departments"
              >
                <Search className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Smart Create Button - Context Aware */}
              {isAdmin && !selectedDepartmentId && onCreateDepartment ? (
                // Admin with no department selected - show "New Department"
                <button
                  onClick={onCreateDepartment}
                  className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                  title="New Department"
                >
                  <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </button>
              ) : selectedDepartmentId && canCreateFolderInSelected ? (
                // Department selected and user can create folders
                <button
                  onClick={openCreateRootFolder}
                  className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  title={`New folder in ${selectedDepartmentNav?.department.name || 'department'}`}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </button>
              ) : isAdmin && onCreateDepartment ? (
                // Admin with department selected - show both options
                <>
                  <button
                    onClick={onCreateDepartment}
                    className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    title="New Department"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  </button>
                  <button
                    onClick={openCreateRootFolder}
                    className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    title={`New folder in ${selectedDepartmentNav?.department.name || 'department'}`}
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  </button>
                </>
              ) : null}

              <button
                onClick={handleRefresh}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Refresh"
                disabled={navigationLoading}
              >
                <RefreshCw
                  className={cn(
                    'w-3.5 h-3.5 text-gray-500 dark:text-gray-400',
                    navigationLoading && 'animate-spin'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="px-3 mb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search departments..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact toolbar when header is hidden */}
      {hideHeader && (
        <div className="flex items-center justify-between px-3 py-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Search departments"
            >
              <Search className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Refresh"
              disabled={navigationLoading}
            >
              <RefreshCw
                className={cn(
                  'w-3.5 h-3.5 text-gray-500 dark:text-gray-400',
                  navigationLoading && 'animate-spin'
                )}
              />
            </button>
          </div>
          <div className="flex items-center gap-1">
            {/* Smart Create Buttons */}
            {isAdmin && onCreateDepartment && (
              <button
                onClick={onCreateDepartment}
                className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                title="New Department"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </button>
            )}
            {selectedDepartmentId && canCreateFolderInSelected && (
              <button
                onClick={openCreateRootFolder}
                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                title={`New folder in ${selectedDepartmentNav?.department.name || 'department'}`}
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </button>
            )}
            {/* Context Menu */}
            <div className="relative">
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              </button>
              {/* Dropdown Menu */}
              {showContextMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowContextMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {onRequestAccess && (
                      <button
                        onClick={() => {
                          onRequestAccess(0)
                          setShowContextMenu(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <UserPlus className="w-4 h-4 text-blue-500" />
                        Request Department Access
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar when header is hidden */}
      {hideHeader && showSearch && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search departments..."
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Department List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3">
        {/* Admin View - All Departments */}
        {isAdmin && adminDepartments.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 mb-1 flex items-center gap-1">
              <Settings className="w-3 h-3 text-amber-500" />
              ALL DEPARTMENTS
            </div>
            {adminDepartments.map(renderDepartmentItem)}
          </div>
        )}

        {/* My Department Section (for non-admins) */}
        {!isAdmin && ownDepartment && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 mb-1">
              MY DEPARTMENT
            </div>
            {renderDepartmentItem(ownDepartment)}
          </div>
        )}

        {/* Granted Access Section (for non-admins) */}
        {!isAdmin && grantedDepartments.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 mb-1">
              SHARED WITH ME
            </div>
            {grantedDepartments.map(renderDepartmentItem)}
          </div>
        )}

        {/* No departments message */}
        {navigation.length === 0 && !navigationLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No departments available</p>
          </div>
        )}

        {/* Loading state */}
        {navigationLoading && navigation.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Department Context Menu */}
      {deptContextMenu.isOpen && deptContextMenu.department && (
        <>
          {/* Backdrop to close menu */}
          <div className="fixed inset-0 z-40" onClick={closeDeptContextMenu} />
          <div
            className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[200px]"
            style={{
              left: Math.min(deptContextMenu.x, window.innerWidth - 220),
              top: Math.min(deptContextMenu.y, window.innerHeight - 300),
            }}
          >
            {/* Department name header */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {deptContextMenu.department.department.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {deptContextMenu.department.department.code}
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              {/* View Details */}
              <button
                onClick={handleViewDeptDetails}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Eye className="w-4 h-4 text-gray-500" />
                View Details
              </button>

              {/* Create Folder - only if user has permission */}
              {(deptContextMenu.department.accessType === 'admin' ||
                deptContextMenu.department.accessType === 'own' ||
                (deptContextMenu.department.accessType === 'granted' &&
                  deptContextMenu.department.grantedRole?.toUpperCase() !== 'VIEWER')) && (
                <button
                  onClick={handleCreateFolderInDept}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <FolderPlus className="w-4 h-4 text-blue-500" />
                  Create Folder
                </button>
              )}

              {/* Copy Link */}
              <button
                onClick={handleCopyDeptLink}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Link2 className="w-4 h-4 text-gray-500" />
                Copy Link
              </button>

              {/* Request Access - only if user doesn't have full access */}
              {deptContextMenu.department.accessType === 'none' && onRequestAccess && (
                <button
                  onClick={handleRequestAccessFromMenu}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserPlus className="w-4 h-4 text-green-500" />
                  Request Access
                </button>
              )}

              {/* Admin-only options */}
              {deptContextMenu.department.accessType === 'admin' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={handleManageMembers}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <UserCog className="w-4 h-4 text-amber-500" />
                    Manage Members
                  </button>
                  <button
                    onClick={handleDeptSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-amber-500" />
                    Department Settings
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={createModalOpen}
        parentFolder={createParentFolder}
        onClose={() => {
          setCreateModalOpen(false)
          setCreateParentFolder(null)
        }}
        onCreate={handleCreateFolder}
      />
    </div>
  )
}

export default DepartmentSidebar
