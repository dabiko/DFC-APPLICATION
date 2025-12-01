/**
 * TopNavigationBar Component
 * Simplified top navigation - admin items moved to Admin dropdown in header
 */

import { NavLink } from 'react-router-dom'
import { cn } from '@utils/cn'

// Main app navigation - non-admin items only
// Admin items (Users, Audit, Retention, Compliance, etc.) are now in the Admin dropdown
const navigationItems: Array<{ path: string; label: string }> = [
  // Add any non-admin navigation items here if needed
  // For now, keeping it minimal as most navigation is via sidebar
]

export function TopNavigationBar() {
  // If no items, return empty nav (space is freed up)
  if (navigationItems.length === 0) {
    return <nav className="hidden lg:flex items-center gap-1 px-4" />
  }

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
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
