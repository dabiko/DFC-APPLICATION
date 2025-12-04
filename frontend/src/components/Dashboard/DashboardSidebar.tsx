/**
 * DashboardSidebar Component
 * Enterprise-standard sidebar with collapsible sections for better UX
 * Layout: Logo + Navigation + Smart System Folders (collapsible) + Departments (collapsible) + Toggle
 */

import { NavLink } from 'react-router-dom'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  LayoutDashboard,
  FolderSearch,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building2,
  FolderHeart,
  Cloud,
} from 'lucide-react'
import { SmartFolderItem } from '@components/Folder'
import {
  DepartmentSidebar,
  CrossDepartmentAccessModal,
  CreateDepartmentModal,
} from '@/components/Department'
import { getSmartFolders } from '@/utils/smartFolders'
import { cn } from '@utils/cn'

// Navigation links
const navLinks = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/smart-folders', icon: FolderSearch, label: 'Smart Folders' },
]

interface DashboardSidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
  useDepartmentNavigation?: boolean
}

export function DashboardSidebar({
  isCollapsed: externalCollapsed,
  onToggle: externalToggle,
  useDepartmentNavigation = true,
}: DashboardSidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Collapsible section states - persist in localStorage
  const [smartFoldersExpanded, setSmartFoldersExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-smart-folders-expanded')
    return saved ? JSON.parse(saved) : true
  })
  const [departmentsExpanded, setDepartmentsExpanded] = useState(() => {
    const saved = localStorage.getItem('sidebar-departments-expanded')
    return saved ? JSON.parse(saved) : true
  })

  // State for cross-department access modal
  const [accessModalOpen, setAccessModalOpen] = useState(false)
  const [accessModalDepartmentId, setAccessModalDepartmentId] = useState<number | string | null>(
    null
  )

  // State for create department modal
  const [createDepartmentModalOpen, setCreateDepartmentModalOpen] = useState(false)

  // Get smart folders (My Documents, Shared with Me, Recent, Favorites, Trash)
  const smartFolders = useMemo(() => getSmartFolders(), [])

  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const toggleSidebar = externalToggle || (() => setInternalCollapsed((prev: boolean) => !prev))

  // Save states to localStorage
  useEffect(() => {
    if (externalCollapsed === undefined) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(internalCollapsed))
    }
  }, [internalCollapsed, externalCollapsed])

  useEffect(() => {
    localStorage.setItem('sidebar-smart-folders-expanded', JSON.stringify(smartFoldersExpanded))
  }, [smartFoldersExpanded])

  useEffect(() => {
    localStorage.setItem('sidebar-departments-expanded', JSON.stringify(departmentsExpanded))
  }, [departmentsExpanded])

  // Keyboard shortcut (Ctrl+B / Cmd+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        toggleSidebar()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleSidebar])

  // Toggle handlers
  const toggleSmartFolders = useCallback(() => {
    setSmartFoldersExpanded((prev: boolean) => !prev)
  }, [])

  const toggleDepartments = useCallback(() => {
    setDepartmentsExpanded((prev: boolean) => !prev)
  }, [])

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        isCollapsed ? 'w-16 overflow-hidden' : 'w-64'
      )}
    >
      {/* Logo and Toggle Button */}
      <div
        className={cn(
          'flex items-center border-b border-gray-200 dark:border-gray-800 h-16',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
        )}
      >
        {/* Logo */}
        <div className={cn('flex items-center gap-3', isCollapsed && 'hidden')}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">DFC</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              Digital Filing Cabinet
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Document Management</p>
          </div>
        </div>

        {/* Collapsed Logo */}
        {isCollapsed && (
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">DFC</span>
          </div>
        )}

        {/* Toggle Button - only visible when expanded */}
        {!isCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar (Ctrl+B)"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Expand button below logo when collapsed */}
      {isCollapsed && (
        <div className="flex justify-center py-2 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar (Ctrl+B)"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div
        className={cn(
          'flex-1 overflow-x-hidden',
          // Only enable scrolling when expanded, hide overflow when collapsed
          isCollapsed ? 'overflow-hidden' : 'overflow-y-auto'
        )}
      >
        {/* Navigation Links Section */}
        <div className={cn('py-2', isCollapsed ? '' : 'px-3')}>
          <div className="space-y-1">
            {/* Dashboard */}
            {navLinks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors group relative',
                    isCollapsed ? 'justify-center p-2 mx-2' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )
                }
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="flex-1">{item.label}</span>}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Smart System Folders - Collapsible */}
        <div
          className={cn('border-t border-gray-200 dark:border-gray-800', isCollapsed ? 'py-2' : '')}
        >
          {!isCollapsed ? (
            <>
              {/* Section Header - Clickable to expand/collapse */}
              <button
                onClick={toggleSmartFolders}
                className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FolderHeart className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    SMART SYSTEM FOLDERS
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    !smartFoldersExpanded && '-rotate-90'
                  )}
                />
              </button>

              {/* Smart Folders List */}
              {smartFoldersExpanded && (
                <div className="px-3 pb-2 space-y-1">
                  {smartFolders.map((smartFolder) => (
                    <SmartFolderItem
                      key={smartFolder.id}
                      folder={smartFolder}
                      isSelected={false}
                      onClick={() => {}}
                      isCollapsed={false}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Collapsed view - show icon with tooltip */
            <div className="flex justify-center">
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
                title="Smart System Folders"
              >
                <FolderHeart className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Smart System Folders
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Departments - Collapsible */}
        <div
          className={cn('border-t border-gray-200 dark:border-gray-800', isCollapsed ? 'py-2' : '')}
        >
          {!isCollapsed ? (
            <>
              {/* Section Header - Clickable to expand/collapse */}
              <button
                onClick={toggleDepartments}
                className="w-full flex items-center justify-between px-6 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    DEPARTMENTS
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-gray-400 transition-transform duration-200',
                    !departmentsExpanded && '-rotate-90'
                  )}
                />
              </button>

              {/* Departments List */}
              {departmentsExpanded && (
                <div className="flex-1">
                  {useDepartmentNavigation ? (
                    <DepartmentSidebar
                      isCollapsed={false}
                      onRequestAccess={(deptId) => {
                        setAccessModalDepartmentId(deptId)
                        setAccessModalOpen(true)
                      }}
                      onCreateDepartment={() => setCreateDepartmentModalOpen(true)}
                      hideHeader={true}
                    />
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No departments available
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Collapsed view - show icon with tooltip */
            <div className="flex justify-center">
              <button
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
                title="Departments"
              >
                <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  Departments
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Storage Usage - Google Drive Style */}
      <div
        className={cn(
          'border-t border-gray-200 dark:border-gray-800',
          isCollapsed ? 'px-2 py-3' : 'px-4 py-3'
        )}
      >
        {isCollapsed ? (
          /* Collapsed: Just icon with tooltip */
          <div className="flex justify-center">
            <button
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group relative"
              title="Storage"
            >
              <Cloud className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                <div className="font-medium">325 GB of 500 GB used</div>
              </div>
            </button>
          </div>
        ) : (
          /* Expanded: Google Drive style */
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Storage</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-1 rounded-full transition-all"
                style={{ width: '65%' }}
              />
            </div>
            {/* Usage text */}
            <p className="text-xs text-gray-500 dark:text-gray-400">325 GB of 500 GB used</p>
          </div>
        )}
      </div>

      {/* Bottom Toggle Button - only visible when expanded */}
      {!isCollapsed && (
        <div className="flex items-center justify-end border-t border-gray-200 dark:border-gray-800 p-2">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar (Ctrl+B)"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Cross-Department Access Modal */}
      <CrossDepartmentAccessModal
        isOpen={accessModalOpen}
        onClose={() => {
          setAccessModalOpen(false)
          setAccessModalDepartmentId(null)
        }}
        preSelectedDepartmentId={accessModalDepartmentId}
      />

      {/* Create Department Modal (Admin Only) */}
      <CreateDepartmentModal
        isOpen={createDepartmentModalOpen}
        onClose={() => setCreateDepartmentModalOpen(false)}
      />
    </aside>
  )
}
