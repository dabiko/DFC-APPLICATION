import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { cn } from '@utils/cn'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/folders', icon: Folder, label: 'Folders' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/shared', icon: Share2, label: 'Shared with Me' },
  { path: '/recent', icon: Clock, label: 'Recent' },
]

const managementItems = [
  { path: '/users', icon: Users, label: 'Users & Roles' },
  { path: '/permissions', icon: Lock, label: 'Permissions' },
  { path: '/audit', icon: BarChart3, label: 'Audit Logs' },
  { path: '/retention', icon: Archive, label: 'Retention' },
  { path: '/compliance', icon: Shield, label: 'Compliance' },
  { path: '/workflows', icon: Zap, label: 'Workflows' },
]

export function DashboardSidebar() {
  return (
    <aside className="h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
            MAIN
          </div>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-6 space-y-1">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 mb-2">
            MANAGEMENT
          </div>
          {managementItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="mt-6">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )
            }
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </NavLink>
        </div>
      </nav>

      {/* Storage Usage */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Storage Used
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
          <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: '65%' }} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">325 GB of 500 GB used</div>
      </div>
    </aside>
  )
}
