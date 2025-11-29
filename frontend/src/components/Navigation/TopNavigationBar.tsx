/**
 * TopNavigationBar Component
 * Enterprise-standard top navigation for app-level actions
 * Contains: Users, Audit, Compliance, Settings, etc.
 */

import { NavLink } from 'react-router-dom'
import {
  Shield,
  Users,
  BarChart3,
  Archive,
  Zap,
  GitBranch,
  Settings,
  Plug2,
  CreditCard,
  ServerCog,
} from 'lucide-react'
import { cn } from '@utils/cn'

const navigationItems = [
  { path: '/users', icon: Users, label: 'Users & Roles' },
  { path: '/audit', icon: BarChart3, label: 'Audit Logs' },
  { path: '/retention', icon: Archive, label: 'Retention' },
  { path: '/compliance', icon: Shield, label: 'Compliance' },
  { path: '/workflows', icon: GitBranch, label: 'Workflows' },
  { path: '/automation', icon: Zap, label: 'Automation' },
  { path: '/integrations', icon: Plug2, label: 'Integrations' },
  { path: '/billing', icon: CreditCard, label: 'Billing' },
]

export function TopNavigationBar() {
  return (
    <nav className="hidden lg:flex items-center gap-1 px-4">
      {navigationItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )
          }
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </NavLink>
      ))}

      {/* Right-aligned items */}
      <div className="flex items-center gap-1 ml-auto">
        {/* System Admin (Super Admin only) */}
        <NavLink
          to="/admin/system"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )
          }
        >
          <ServerCog className="w-4 h-4" />
          <span>System</span>
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )
          }
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
