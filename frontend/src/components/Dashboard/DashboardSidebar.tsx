import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  Folder,
  Search,
  FileText,
  Shield,
  Users,
  Settings,
  Archive,
  Share2,
  Clock,
  BarChart3,
  Lock,
  Zap,
  StarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@utils/cn'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/folders', icon: Folder, label: 'Folders' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/shared', icon: Share2, label: 'Shared with Me' },
  { path: '/recent', icon: Clock, label: 'Recent' },
  { path: '/favorite', icon: StarIcon, label: 'Favorite' },
]

const managementItems = [
  { path: '/users', icon: Users, label: 'Users & Roles' },
  { path: '/permissions', icon: Lock, label: 'Permissions' },
  { path: '/audit', icon: BarChart3, label: 'Audit Logs' },
  { path: '/retention', icon: Archive, label: 'Retention' },
  { path: '/compliance', icon: Shield, label: 'Compliance' },
  { path: '/workflows', icon: Zap, label: 'Workflows' },
]

interface DashboardSidebarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export function DashboardSidebar({ isCollapsed: externalCollapsed, onToggle: externalToggle }: DashboardSidebarProps = {}) {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    // Load saved state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed')
    return saved ? JSON.parse(saved) : false
  })

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
      {/* Toggle Button */}
      <div className={cn('flex items-center justify-end p-3 border-b border-gray-200 dark:border-gray-800')}>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {/* MAIN Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
              MAIN
            </div>
          )}
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors group relative',
                  isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* MANAGEMENT Section */}
        <div className="mt-6 space-y-1">
          {!isCollapsed && (
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
              MANAGEMENT
            </div>
          )}
          {managementItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-lg text-sm font-medium transition-colors group relative',
                  isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )
              }
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Settings */}
        <div className="mt-6">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-lg text-sm font-medium transition-colors group relative',
                isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
            title={isCollapsed ? 'Settings' : undefined}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Settings</span>}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                Settings
              </div>
            )}
          </NavLink>
        </div>
      </nav>

      {/* Storage Usage */}
      <div className={cn('border-t border-gray-200 dark:border-gray-800 transition-all', isCollapsed ? 'px-3 py-4' : 'px-6 py-4')}>
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
              <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all" style={{ width: '65%' }} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">325 GB of 500 GB used</div>
          </>
        )}
      </div>

      {/* Bottom Toggle Button */}
      <div className="border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center h-10 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>
    </aside>
  )
}
