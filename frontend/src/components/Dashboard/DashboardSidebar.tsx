/**
 * DashboardSidebar Component
 * Enterprise-standard folder-focused sidebar
 * Layout: Logo + Quick Access + Folder Tree + Storage + Toggle
 */

import { NavLink } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { LayoutDashboard, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { FolderSidebar, SmartFolderItem } from '@components/Folder'
import { getSmartFolders } from '@/utils/smartFolders'
import { cn } from '@utils/cn'

// Navigation links (non-smart folder items)
const navLinks = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/search', icon: Search, label: 'Global Search' },
]

interface DashboardSidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function DashboardSidebar({
  isCollapsed: externalCollapsed,
  onToggle: externalToggle,
}: DashboardSidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    // Load saved state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved ? JSON.parse(saved) : false
  })

  // Get smart folders (My Documents, Shared with Me, Recent, Favorites, Trash)
  const smartFolders = useMemo(() => getSmartFolders(), [])

  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed
  const toggleSidebar = externalToggle || (() => setInternalCollapsed((prev) => !prev))

  // Save state to localStorage whenever it changes (only for internal state)
  useEffect(() => {
    if (externalCollapsed === undefined) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(internalCollapsed))
    }
  }, [internalCollapsed, externalCollapsed])

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

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
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

      {/* Quick Access Section */}
      <div
        className={cn(
          'border-b border-gray-200 dark:border-gray-800',
          isCollapsed ? 'py-2' : 'px-3 py-3'
        )}
      >
        {!isCollapsed && (
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
            QUICK ACCESS
          </div>
        )}
        <div className="space-y-1">
          {/* Navigation links (Dashboard, Global Search) */}
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

          {/* Smart folders (My Documents, Shared with Me, Recent, Favorites, Trash) - with counts */}
          {smartFolders.map((smartFolder) => (
            <SmartFolderItem
              key={smartFolder.id}
              folder={smartFolder}
              isSelected={false}
              onClick={() => {}}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>

      {/* Folder Tree Section - Takes majority of space */}
      <div className="flex-1 overflow-hidden">
        <FolderSidebar isCollapsed={isCollapsed} />
      </div>

      {/* Storage Usage */}
      <div
        className={cn(
          'border-t border-gray-200 dark:border-gray-800 transition-all',
          isCollapsed ? 'px-3 py-4' : 'px-6 py-4'
        )}
      >
        {isCollapsed ? (
          <div className="flex flex-col items-center gap-2 group relative">
            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">65%</span>
            </div>

            {/* Tooltip for collapsed state */}
            <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              <div className="font-medium mb-1">Storage Used</div>
              <div>325 GB of 500 GB used</div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Storage Used
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
              <div
                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: '65%' }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">325 GB of 500 GB used</div>
          </>
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
    </aside>
  )
}
