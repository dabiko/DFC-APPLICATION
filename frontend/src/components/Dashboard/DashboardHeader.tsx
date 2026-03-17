import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
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
  Check,
} from 'lucide-react'
import { TopNavigationBar } from '@components/Navigation/TopNavigationBar'
import { GlobalSearchCommand } from '@components/Search'
import { useTheme } from '@hooks/useTheme'
import { useNetworkStatus } from '@/contexts/NetworkStatusContext'
import { useAuth } from '@hooks/useAuth'
import { useGlobalSearch } from '@hooks/useGlobalSearch'
import { cn } from '@utils/cn'
import {
  getNotifications,
  markAsRead,
  markNotificationsRead,
  type Notification as ApiNotification,
} from '@/services/notificationService'

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

interface DisplayNotification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  action_url?: string
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
  const [liveNotifications, setLiveNotifications] = useState<DisplayNotification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)

  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const adminRef = useRef<HTMLDivElement>(null)

  // Fetch real notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications()
      const results = Array.isArray(data) ? data : ((data as any)?.results ?? [])
      setLiveNotifications(
        results.map((n: ApiNotification) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: n.time_ago || n.created_at,
          read: n.is_read,
          action_url: n.action_url,
        }))
      )
    } catch {
      // Silently fail — keep showing whatever we have (or prop fallback)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30_000) // poll every 30s
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    setLoadingNotifs(true)
    try {
      await markNotificationsRead()
      setLiveNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // ignore
    } finally {
      setLoadingNotifs(false)
    }
  }

  // Always use live notifications from API
  const displayNotifications = liveNotifications

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

  const unreadCount = displayNotifications.filter((n) => !n.read).length

  // Play notification sound ONLY when a genuinely new notification arrives during the session.
  // We persist the last known count in sessionStorage so component remounts (page navigation)
  // don't trigger the sound.
  useEffect(() => {
    if (unreadCount === 0) return

    const storedStr = sessionStorage.getItem('notif_last_unread')
    const lastKnown = storedStr !== null ? parseInt(storedStr, 10) : null

    if (lastKnown !== null && unreadCount > lastKnown) {
      try {
        const ctx = new AudioContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      } catch {
        // Audio not available
      }
    }

    sessionStorage.setItem('notif_last_unread', String(unreadCount))
  }, [unreadCount])

  // Get user initials
  const initials =
    `${user.firstName?.charAt(0) || ''}${user.lastName?.charAt(0) || ''}`.toUpperCase() || 'U'

  // Detect OS for keyboard shortcut display
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  }, [])
  const searchShortcut = isMac ? '⌘K' : 'Ctrl+K'

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
          className="flex items-center gap-3 min-w-[360px] px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl transition-all"
          aria-label="Global search"
        >
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <span className="flex-1 text-left">Search documents, folders...</span>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
            {searchShortcut}
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
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full leading-none animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : displayNotifications.length > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gray-400 dark:bg-gray-500 text-white text-[10px] font-bold rounded-full leading-none">
                {displayNotifications.length > 99 ? '99+' : displayNotifications.length}
              </span>
            ) : null}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
                  {unreadCount > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{unreadCount} unread</p>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={loadingNotifs}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {displayNotifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No notifications
                  </div>
                ) : (
                  displayNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={async () => {
                        // Mark as read on click
                        if (!notification.read) {
                          try {
                            await markAsRead(notification.id)
                            setLiveNotifications((prev) =>
                              prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
                            )
                          } catch {
                            // ignore
                          }
                        }
                        if (notification.action_url) {
                          setShowNotifications(false)
                          navigate(notification.action_url)
                        }
                      }}
                      className={cn(
                        'p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer',
                        !notification.read && 'bg-blue-50 dark:bg-blue-900/10'
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
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
            className="flex items-center p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

              {/* Theme Switcher */}
              <div className="border-t border-gray-200 dark:border-gray-700 py-1">
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Appearance
                </p>
                <div className="flex items-center gap-1 px-3">
                  <button
                    onClick={() => {
                      setTheme('light')
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                      theme === 'light'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    Light
                  </button>
                  <button
                    onClick={() => {
                      setTheme('dark')
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                      theme === 'dark'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      setTheme('system')
                    }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                      theme === 'system'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 font-medium'
                        : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    System
                  </button>
                </div>
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
