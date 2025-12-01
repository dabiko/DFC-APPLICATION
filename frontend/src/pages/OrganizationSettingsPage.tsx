/**
 * OrganizationSettingsPage Component
 *
 * Organization-level settings page with tabbed navigation for:
 * - General: Organization info, branding, contact
 * - Security: Password policies, MFA, session settings
 * - Features: Feature flags based on subscription
 * - Usage: Resource usage statistics
 *
 * Only accessible to organization admins and owners.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  Shield,
  Sparkles,
  BarChart3,
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import {
  GeneralSettingsTab,
  SecurityPoliciesTab,
  FeaturesTab,
  UsageTab,
} from '@/components/OrganizationSettings'
import { authService } from '@/services/auth.service'
import organizationSettingsService, {
  type AllOrganizationSettings,
} from '@/services/organizationSettingsService'
import { cn } from '@/utils/cn'

// Tab definitions
const TABS = [
  {
    id: 'general',
    label: 'General',
    icon: Building2,
    description: 'Organization info and branding',
  },
  {
    id: 'security',
    label: 'Security Policies',
    icon: Shield,
    description: 'Password, MFA, and session settings',
  },
  {
    id: 'features',
    label: 'Features',
    icon: Sparkles,
    description: 'Available features by plan',
  },
  {
    id: 'usage',
    label: 'Usage',
    icon: BarChart3,
    description: 'Resource usage statistics',
  },
] as const

type TabId = (typeof TABS)[number]['id']

export function OrganizationSettingsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Get active tab from URL or default to 'general'
  const activeTab = (searchParams.get('tab') as TabId) || 'general'

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [allSettings, setAllSettings] = useState<AllOrganizationSettings | null>(null)

  // Get user data from auth service for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Mock notifications for header
  const notifications: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }> = []

  // Handle logout
  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  // Set active tab
  const setActiveTab = (tabId: TabId) => {
    setSearchParams({ tab: tabId })
  }

  // Load all settings
  const loadSettings = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await organizationSettingsService.getAllOrganizationSettings()
      setAllSettings(data)
    } catch (err) {
      console.error('Error loading organization settings:', err)
      setError(
        'Failed to load organization settings. You may not have permission to access this page.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Update handlers
  const handleUpdateGeneral = async (
    data: Parameters<typeof organizationSettingsService.updateOrganizationGeneral>[0]
  ) => {
    const updated = await organizationSettingsService.updateOrganizationGeneral(data)
    setAllSettings((prev) => (prev ? { ...prev, organization: updated } : null))
  }

  const handleUpdateSecurityPolicy = async (
    data: Parameters<typeof organizationSettingsService.updateSecurityPolicy>[0]
  ) => {
    const updated = await organizationSettingsService.updateSecurityPolicy(data)
    setAllSettings((prev) => (prev ? { ...prev, security_policy: updated } : null))
  }

  const handleUploadLogo = async (file: File) => {
    const updated = await organizationSettingsService.uploadLogo(file)
    setAllSettings((prev) => (prev ? { ...prev, settings: updated } : null))
  }

  const handleDeleteLogo = async () => {
    await organizationSettingsService.deleteLogo()
    setAllSettings((prev) =>
      prev
        ? {
            ...prev,
            settings: { ...prev.settings, logo: null, logo_url: null },
          }
        : null
    )
  }

  // Render the active tab content
  const renderTabContent = () => {
    if (!allSettings) return null

    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettingsTab
            organization={allSettings.organization}
            settings={allSettings.settings}
            onUpdate={handleUpdateGeneral}
            onUploadLogo={handleUploadLogo}
            onDeleteLogo={handleDeleteLogo}
          />
        )
      case 'security':
        return (
          <SecurityPoliciesTab
            securityPolicy={allSettings.security_policy}
            onUpdate={handleUpdateSecurityPolicy}
          />
        )
      case 'features':
        return (
          <FeaturesTab
            featureFlags={allSettings.feature_flags}
            subscriptionPlan={allSettings.organization.subscription_plan}
          />
        )
      case 'usage':
        return <UsageTab usage={allSettings.usage} organization={allSettings.organization} />
      default:
        return null
    }
  }

  // Main content
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
            {error}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )
    }

    return (
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
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Organization Settings
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {allSettings?.organization.name || 'Your Organization'}
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
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <tab.icon
                    className={cn(
                      'w-5 h-5',
                      activeTab === tab.id ? 'text-indigo-500' : 'text-gray-400'
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
  }

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
    />
  )
}

export default OrganizationSettingsPage
