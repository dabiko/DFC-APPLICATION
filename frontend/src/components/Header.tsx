import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useTheme } from '@hooks/useTheme'

export const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const adminMenuRef = useRef<HTMLDivElement>(null)

  // Check if user has admin privileges
  const isAdmin =
    user?.role === 'admin' || user?.role === 'manager' || user?.is_staff || user?.is_superuser

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false)
      }
    }

    if (showUserMenu || showAdminMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu, showAdminMenu])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U'
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()
  }

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400',
      manager: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400',
      editor: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
      viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    }
    return colors[role as keyof typeof colors] || colors.viewer
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-600 dark:bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <div className="ml-3">
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Digital Filing Cabinet
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">CCC PLC</p>
            </div>
          </div>
        </div>

        {/* Right Section - Theme Toggle, Admin Menu & User Menu */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>

          {/* Admin Menu - Only visible for admins/managers */}
          {isAdmin && (
            <div className="relative" ref={adminMenuRef}>
              <button
                onClick={() => {
                  setShowAdminMenu(!showAdminMenu)
                  setShowUserMenu(false)
                }}
                className={`p-2 rounded-lg transition-colors ${
                  showAdminMenu
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                aria-label="Administration menu"
                title="Administration"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              {/* Admin Dropdown Menu */}
              {showAdminMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Administration
                    </p>
                  </div>

                  {/* Admin Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/users')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      <span>Users & Roles</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/departments')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                      <span>Departments</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/audit-logs')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                      <span>Audit Logs</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/retention')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Retention Policies</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/legal-holds')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                        />
                      </svg>
                      <span>Legal Holds</span>
                    </button>
                  </div>

                  {/* System Settings Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/settings')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                        />
                      </svg>
                      <span>System Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAdminMenu(false)
                        navigate('/admin/billing')
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                    >
                      <svg
                        className="w-4 h-4 text-gray-500 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      <span>Billing & Usage</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu)
                setShowAdminMenu(false)
              }}
              className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="User menu"
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary-600 dark:bg-primary-500 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {getInitials(user?.firstName, user?.lastName)}
                  </span>
                )}
              </div>

              {/* User Info */}
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.department}</p>
              </div>

              {/* Dropdown Icon */}
              <svg
                className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user?.email}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleBadgeColor(
                        user?.role || 'viewer'
                      )}`}
                    >
                      {user?.role}
                    </span>
                    {user?.mfaEnabled && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 font-medium">
                        MFA Enabled
                      </span>
                    )}
                  </div>
                </div>

                {/* Personal Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      navigate('/profile')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      navigate('/settings/preferences')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                      />
                    </svg>
                    <span>Preferences</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      navigate('/settings/notifications')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    <span>Notifications</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      navigate('/settings/security')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-3"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <span>Security</span>
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 flex items-center space-x-3"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
