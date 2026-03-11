/**
 * SettingsPage Component
 *
 * Main settings page with tabbed navigation for:
 * - Profile: Personal information and avatar
 * - Preferences: Display, language, and behavior settings
 * - Notifications: Email and in-app notification preferences
 * - Security: Password, MFA, and session management
 *
 * Features:
 * - Tab-based navigation
 * - Lazy loading of settings data
 * - Responsive design
 * - Dark mode support
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Settings, User, Sliders, Bell, Shield, ChevronLeft } from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { ProfileTab, PreferencesTab, SecurityTab, NotificationsTab } from '@/components/Settings'
import { authService } from '@/services/auth.service'
import settingsService, {
  type UserProfile,
  type UserPreferences,
  type NotificationSettings,
  type SecuritySettings,
  type UpdateProfileData,
} from '@/services/settingsService'
import apiClient from '@/services/apiClient'
import { cn } from '@/utils/cn'

// Tab definitions
const TABS = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Personal information and avatar',
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: Sliders,
    description: 'Display, language, and behavior',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    description: 'Email and in-app alerts',
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password and authentication',
  },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL or default to 'profile'
  const activeTab = (searchParams.get('tab') as TabId) || 'profile'

  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(true)
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true)
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(true)

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null
  )
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)

  // Get user data from auth service for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Handle logout
  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  // Set active tab
  const setActiveTab = (tabId: TabId) => {
    setSearchParams({ tab: tabId })
  }

  // Load profile data
  const loadProfile = useCallback(async () => {
    setIsLoadingProfile(true)
    try {
      const data = await settingsService.getProfile()
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [])

  // Load preferences data
  const loadPreferences = useCallback(async () => {
    setIsLoadingPreferences(true)
    try {
      const data = await settingsService.getPreferences()
      setPreferences(data)
    } catch (error) {
      console.error('Error loading preferences:', error)
    } finally {
      setIsLoadingPreferences(false)
    }
  }, [])

  // Load notification settings
  const loadNotificationSettings = useCallback(async () => {
    setIsLoadingNotifications(true)
    try {
      const data = await settingsService.getNotificationSettings()
      setNotificationSettings(data)
    } catch (error) {
      console.error('Error loading notification settings:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [])

  // Load security settings
  const loadSecuritySettings = useCallback(async () => {
    setIsLoadingSecurity(true)
    try {
      const data = await settingsService.getSecuritySettings()
      setSecuritySettings(data)
    } catch (error) {
      console.error('Error loading security settings:', error)
    } finally {
      setIsLoadingSecurity(false)
    }
  }, [])

  // Load data on mount and tab change
  useEffect(() => {
    if (activeTab === 'profile' && !profile) {
      loadProfile()
    } else if (activeTab === 'preferences' && !preferences) {
      loadPreferences()
    } else if (activeTab === 'notifications' && !notificationSettings) {
      loadNotificationSettings()
    } else if (activeTab === 'security' && !securitySettings) {
      loadSecuritySettings()
    }
  }, [
    activeTab,
    profile,
    preferences,
    notificationSettings,
    securitySettings,
    loadProfile,
    loadPreferences,
    loadNotificationSettings,
    loadSecuritySettings,
  ])

  // Handlers for profile updates
  const handleUpdateProfile = async (data: UpdateProfileData) => {
    const updated = await settingsService.updateProfile(data)
    setProfile(updated)
  }

  const handleUploadAvatar = async (file: File) => {
    const updated = await settingsService.uploadAvatar(file)
    setProfile(updated)
  }

  const handleDeleteAvatar = async () => {
    await settingsService.deleteAvatar()
    setProfile((prev) => (prev ? { ...prev, avatar: null } : null))
  }

  // Handler for preferences updates
  const handleUpdatePreferences = async (data: Partial<UserPreferences>) => {
    const updated = await settingsService.updatePreferences(data)
    setPreferences(updated)
  }

  // Handler for notification settings updates
  const handleUpdateNotificationSettings = async (data: Partial<NotificationSettings>) => {
    const updated = await settingsService.updateNotificationSettings(data)
    setNotificationSettings(updated)
  }

  // Handler for security settings updates
  const handleUpdateSecuritySettings = async (data: Partial<SecuritySettings>) => {
    const updated = await settingsService.updateSecuritySettings(data)
    setSecuritySettings(updated)
  }

  // Handler for password change
  const handleChangePassword = async (data: {
    old_password: string
    new_password: string
    new_password_confirm: string
  }) => {
    await apiClient.post('/auth/change-password/', data)
  }

  // Render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <ProfileTab
            profile={profile}
            isLoading={isLoadingProfile}
            onUpdateProfile={handleUpdateProfile}
            onUploadAvatar={handleUploadAvatar}
            onDeleteAvatar={handleDeleteAvatar}
          />
        )
      case 'preferences':
        return (
          <PreferencesTab
            preferences={preferences}
            isLoading={isLoadingPreferences}
            onUpdatePreferences={handleUpdatePreferences}
          />
        )
      case 'notifications':
        return (
          <NotificationsTab
            notificationSettings={notificationSettings}
            isLoading={isLoadingNotifications}
            onUpdateNotificationSettings={handleUpdateNotificationSettings}
          />
        )
      case 'security':
        return (
          <SecurityTab
            securitySettings={securitySettings}
            isLoading={isLoadingSecurity}
            onUpdateSecuritySettings={handleUpdateSecuritySettings}
            onChangePassword={handleChangePassword}
            onMFAEnabled={handleLogout}
          />
        )
      default:
        return null
    }
  }

  // Main content
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage your account and preferences
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content with sidebar navigation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Settings Sidebar */}
        <div className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <tab.icon
                  className={cn(
                    'w-5 h-5',
                    activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
                  )}
                />
                <div className="flex-1">
                  <span className="text-sm font-medium">{tab.label}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {tab.description}
                  </p>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">{renderTabContent()}</div>
      </div>
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={[]} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
    />
  )
}

export default SettingsPage
