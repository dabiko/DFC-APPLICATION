import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Wifi,
  WifiOff,
  Shield,
  Users,
  Building2,
  ClipboardList,
  Clock,
  Scale,
  Server,
  CreditCard,
  GitBranch,
  Zap,
  KeyRound,
  Search,
} from 'lucide-react'
import { TopNavigationBar } from '@components/Navigation/TopNavigationBar'
import { GlobalSearchCommand } from '@components/Search'
import { useTheme } from '@hooks/useTheme'
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'
import { useAuth } from '@hooks/useAuth'
import { useGlobalSearch } from '@hooks/useGlobalSearch'
import { cn } from '@utils/cn'

interface DashboardHeaderProps {
  user?: {
    firstName: string
    lastName: string
    email: string
    avatar?: string
    role?: 'admin' | 'manager' | 'editor' | 'viewer' | string
    is_staff?: boolean
    is_superuser?: boolean
    mfaEnabled?: boolean
  }
  notifications?: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }>
  onLogout?: () => void
}

const DEFAULT_USER = {
  firstName: 'User',
  lastName: '',
  email: '',
}

export function DashboardHeader({
  user = DEFAULT_USER,
  notifications = [],
  onLogout,
}: DashboardHeaderProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { isOnline, isSlow } = useNetworkStatus()
  const { user: authUser } = useAuth()
  const { isOpen: isSearchOpen, open: openSearch, close: closeSearch } = useGlobalSearch()

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const adminRef = useRef<HTMLDivElement>(null)

  // Check if user has admin privileges
  // authUser from useAuth() has 'role' field (admin, manager, editor, viewer)
  // user prop may have is_staff/is_superuser from backend
  const isAdmin =
    authUser?.role === 'admin' ||
    authUser?.role === 'manager' ||
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.is_staff === true ||
    user?.is_superuser === true

  const unreadCount = notifications.filter((n) => !n.read).length

  // Get user initials
  const initials =
    `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setShowThemeMenu(false)
      }
      if (adminRef.current && !adminRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="w-4 h-4" />
      case 'dark':
        return <Moon className="w-4 h-4" />
      case 'system':
        return <Monitor className="w-4 h-4" />
      default:
        return <Sun className="w-4 h-4" />
    }
  }

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 flex items-center justify-between gap-6">
      {/* Left Section - Global Search */}
      <div className="flex items-center gap-4">
        <button
          onClick={openSearch}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Global search"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Center - App Navigation */}
      <div className="flex-1">
        <TopNavigationBar />
      </div>

      {/* Right Section - Theme, Admin, Notifications, Profile */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <div className="relative" ref={themeRef}>
          <button
            onClick={() => {
              setShowThemeMenu(!showThemeMenu)
              setShowAdminMenu(false)
              setShowNotifications(false)
              setShowProfileMenu(false)
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
            aria-label="Toggle theme"
            title="Theme"
          >
            {getThemeIcon()}
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
              <button
                onClick={() => {
                  setTheme('light')
                  setShowThemeMenu(false)
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3',
                  theme === 'light' && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Sun className="w-4 h-4" />
                <span>Light</span>
              </button>
              <button
                onClick={() => {
                  setTheme('dark')
                  setShowThemeMenu(false)
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3',
                  theme === 'dark' && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Moon className="w-4 h-4" />
                <span>Dark</span>
              </button>
              <button
                onClick={() => {
                  setTheme('system')
                  setShowThemeMenu(false)
                }}
                className={cn(
                  'w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3',
                  theme === 'system' && 'bg-gray-100 dark:bg-gray-700'
                )}
              >
                <Monitor className="w-4 h-4" />
                <span>System</span>
              </button>
            </div>
          )}
        </div>

        {/* Admin Menu - Only visible for admins/managers */}
        {isAdmin && (
          <div className="relative" ref={adminRef}>
            <button
              onClick={() => {
                setShowAdminMenu(!showAdminMenu)
                setShowThemeMenu(false)
                setShowNotifications(false)
                setShowProfileMenu(false)
              }}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAdminMenu
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
              aria-label="Administration menu"
              title="Administration"
            >
              <Shield className="w-5 h-5" />
            </button>

            {showAdminMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
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
                      navigate('/users')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Users & Roles</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/organization-settings')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Building2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Organization Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/audit')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <ClipboardList className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Audit Logs</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/permission-audit')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <KeyRound className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Permission Audit</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/retention')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Retention Policies</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/compliance')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Scale className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Legal Holds</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/workflows')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <GitBranch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Workflows</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/automation')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Zap className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Automation</span>
                  </button>
                </div>

                {/* System Settings Section */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/admin/system')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Server className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>System Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowAdminMenu(false)
                      navigate('/billing')
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <CreditCard className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span>Billing & Usage</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => {
              setShowNotifications(!showNotifications)
              setShowThemeMenu(false)
              setShowAdminMenu(false)
              setShowProfileMenu(false)
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer',
                        !notification.read && 'bg-blue-50 dark:bg-blue-900/10'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {notification.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Profile Menu */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu)
              setShowThemeMenu(false)
              setShowAdminMenu(false)
              setShowNotifications(false)
            }}
            className="flex items-center gap-3 p-1 pr-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Profile menu"
          >
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-semibold text-sm">
                  {initials}
                </div>
              )}
              {/* Session Status Indicator */}
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900',
                  isOnline
                    ? isSlow
                      ? 'bg-yellow-500' // Slow connection
                      : 'bg-green-500' // Active/Online
                    : 'bg-gray-400' // Offline
                )}
                title={isOnline ? (isSlow ? 'Slow connection' : 'Active') : 'Offline'}
              />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
              {user.firstName} {user.lastName}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                {/* Session Status */}
                <div className="flex items-center gap-2 mt-2">
                  {isOnline ? (
                    <>
                      <Wifi
                        className={cn('w-3 h-3', isSlow ? 'text-yellow-500' : 'text-green-500')}
                      />
                      <span
                        className={cn(
                          'text-xs',
                          isSlow
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                        )}
                      >
                        {isSlow ? 'Slow connection' : 'Active session'}
                      </span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">Offline</span>
                    </>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    navigate('/settings')
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span>Settings</span>
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false)
                    onLogout?.()
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search Command Overlay */}
      <GlobalSearchCommand isOpen={isSearchOpen} onClose={closeSearch} />
    </header>
  )
}
