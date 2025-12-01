/**
 * System Settings Page (Super Admin)
 *
 * Platform-wide settings accessible only to super administrators.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Settings,
  Shield,
  Bell,
  Activity,
  Building2,
  Server,
  FileText,
  Globe,
  AlertTriangle,
  Check,
  X,
  Loader2,
  RefreshCw,
  ChevronRight,
  Users,
  HardDrive,
  TrendingUp,
  Megaphone,
  Plus,
  Trash2,
  Power,
  PowerOff,
  Search,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { authService } from '@/services/auth.service'
import {
  getSystemSettings,
  updateSystemSettings,
  getAuditConfiguration,
  updateAuditConfiguration,
  getSystemHealth,
  getPlatformStats,
  getAnnouncements,
  deleteAnnouncement,
  activateAnnouncement,
  deactivateAnnouncement,
  getOrganizations,
  suspendOrganization,
  activateOrganization,
  updateOrganizationPlan,
  type SystemSettings,
  type AuditConfiguration,
  type SystemHealth,
  type PlatformStats,
  type PlatformAnnouncement,
  type OrganizationSummary,
} from '@/services/systemService'
import { cn } from '@/utils/cn'

type TabId = 'overview' | 'settings' | 'security' | 'organizations' | 'announcements' | 'health'

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'settings', label: 'Platform Settings', icon: Settings },
  { id: 'security', label: 'Security & Audit', icon: Shield },
  { id: 'organizations', label: 'Organizations', icon: Building2 },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'health', label: 'System Health', icon: Server },
]

export function SystemSettingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Data states
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [auditConfig, setAuditConfig] = useState<AuditConfiguration | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form states
  const [editedSettings, setEditedSettings] = useState<Partial<SystemSettings>>({})
  const [editedAuditConfig, setEditedAuditConfig] = useState<Partial<AuditConfiguration>>({})

  // Get user data from auth service for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  const notifications: Array<{
    id: string
    title: string
    message: string
    time: string
    read: boolean
  }> = []

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

  // Load initial data
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      // Load each resource independently to handle partial failures
      const results = await Promise.allSettled([
        getPlatformStats(),
        getSystemSettings(),
        getAuditConfiguration(),
        getSystemHealth(),
        getOrganizations(),
        getAnnouncements(),
      ])

      // Count failures to check if all requests failed (likely permission issue)
      const failures = results.filter((r) => r.status === 'rejected')
      if (failures.length === results.length) {
        // All requests failed - likely a permission issue
        const firstError = failures[0] as PromiseRejectedResult
        const errorMsg =
          firstError.reason?.response?.status === 403
            ? 'You do not have permission to access System Administration. This feature requires Super Admin privileges.'
            : 'Failed to load system data. Please try again.'
        setLoadError(errorMsg)
      } else {
        // Process results - set data if successful, log errors if failed
        if (results[0].status === 'fulfilled') setStats(results[0].value)
        else console.error('Error loading stats:', results[0].reason)

        if (results[1].status === 'fulfilled') setSettings(results[1].value)
        else console.error('Error loading settings:', results[1].reason)

        if (results[2].status === 'fulfilled') setAuditConfig(results[2].value)
        else console.error('Error loading audit config:', results[2].reason)

        if (results[3].status === 'fulfilled') setHealth(results[3].value)
        else console.error('Error loading health:', results[3].reason)

        if (results[4].status === 'fulfilled') {
          const orgs = results[4].value
          setOrganizations(Array.isArray(orgs) ? orgs : [])
        } else {
          console.error('Error loading organizations:', results[4].reason)
          setOrganizations([])
        }

        if (results[5].status === 'fulfilled') {
          const anncs = results[5].value
          setAnnouncements(Array.isArray(anncs) ? anncs : [])
        } else {
          console.error('Error loading announcements:', results[5].reason)
          setAnnouncements([])
        }
      }
    } catch (error) {
      console.error('Error loading system data:', error)
      setLoadError('An unexpected error occurred while loading system data.')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const handleRefresh = () => {
    setIsRefreshing(true)
    loadData()
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save settings
  const handleSaveSettings = async () => {
    if (Object.keys(editedSettings).length === 0) return
    setIsSaving(true)
    try {
      const updated = await updateSystemSettings(editedSettings)
      setSettings(updated)
      setEditedSettings({})
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Save audit config
  const handleSaveAuditConfig = async () => {
    if (Object.keys(editedAuditConfig).length === 0) return
    setIsSaving(true)
    try {
      const updated = await updateAuditConfiguration(editedAuditConfig)
      setAuditConfig(updated)
      setEditedAuditConfig({})
    } catch (error) {
      console.error('Error saving audit config:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Organization actions
  const handleSuspendOrg = async (id: number) => {
    if (!confirm('Are you sure you want to suspend this organization?')) return
    try {
      await suspendOrganization(id)
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === id ? { ...org, is_active: false, subscription_status: 'suspended' } : org
        )
      )
    } catch (error) {
      console.error('Error suspending organization:', error)
    }
  }

  const handleActivateOrg = async (id: number) => {
    try {
      await activateOrganization(id)
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === id ? { ...org, is_active: true, subscription_status: 'active' } : org
        )
      )
    } catch (error) {
      console.error('Error activating organization:', error)
    }
  }

  const handleChangePlan = async (
    id: number,
    plan: 'free' | 'starter' | 'professional' | 'enterprise'
  ) => {
    try {
      await updateOrganizationPlan(id, plan)
      setOrganizations((prev) =>
        prev.map((org) => (org.id === id ? { ...org, subscription_plan: plan } : org))
      )
    } catch (error) {
      console.error('Error changing plan:', error)
    }
  }

  // Announcement actions
  const handleToggleAnnouncement = async (id: string, active: boolean) => {
    try {
      if (active) {
        await deactivateAnnouncement(id)
      } else {
        await activateAnnouncement(id)
      }
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !active } : a)))
    } catch (error) {
      console.error('Error toggling announcement:', error)
    }
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return
    try {
      await deleteAnnouncement(id)
      setAnnouncements((prev) => prev.filter((a) => a.id !== id))
    } catch (error) {
      console.error('Error deleting announcement:', error)
    }
  }

  // Content renderer
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  System Administration
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Platform-wide settings and management
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6">
          <nav className="flex gap-1 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Error State */}
          {loadError && (
            <div className="mb-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-300">Access Denied</h3>
                  <p className="text-sm text-red-800 dark:text-red-400 mt-1">{loadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && !stats && !loadError && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No statistics available</p>
            </div>
          )}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Organizations"
                  value={stats.total_organizations}
                  subtitle={`${stats.active_organizations} active`}
                  icon={Building2}
                  color="purple"
                />
                <StatCard
                  title="Total Users"
                  value={stats.total_users}
                  subtitle={`${stats.active_users_today} active today`}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Total Documents"
                  value={stats.total_documents.toLocaleString()}
                  subtitle={`${stats.total_storage_used_gb.toFixed(1)} GB used`}
                  icon={FileText}
                  color="green"
                />
                <StatCard
                  title="Trial Organizations"
                  value={stats.trial_organizations}
                  subtitle={`${stats.recent_signups} signups this week`}
                  icon={TrendingUp}
                  color="orange"
                />
              </div>

              {/* Plan Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Organizations by Plan
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {stats.organizations_by_plan &&
                    Object.entries(stats.organizations_by_plan).map(([plan, count]) => (
                      <div
                        key={plan}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 text-center"
                      >
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {count}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                          {plan}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Platform Settings Tab */}
          {activeTab === 'settings' && !settings && !loadError && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Platform settings not available</p>
            </div>
          )}
          {activeTab === 'settings' && settings && (
            <div className="space-y-6">
              <SettingsSection title="Platform Identity" icon={Globe}>
                <SettingsInput
                  label="Platform Name"
                  value={editedSettings.platform_name ?? settings.platform_name}
                  onChange={(v) => setEditedSettings((prev) => ({ ...prev, platform_name: v }))}
                />
                <SettingsInput
                  label="Support Email"
                  value={editedSettings.support_email ?? settings.support_email}
                  onChange={(v) => setEditedSettings((prev) => ({ ...prev, support_email: v }))}
                />
              </SettingsSection>

              <SettingsSection title="Maintenance Mode" icon={AlertTriangle}>
                <SettingsToggle
                  label="Enable Maintenance Mode"
                  description="Block all non-admin access to the platform"
                  checked={editedSettings.maintenance_mode ?? settings.maintenance_mode}
                  onChange={(v) => setEditedSettings((prev) => ({ ...prev, maintenance_mode: v }))}
                />
                <SettingsTextarea
                  label="Maintenance Message"
                  value={editedSettings.maintenance_message ?? settings.maintenance_message}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({ ...prev, maintenance_message: v }))
                  }
                />
              </SettingsSection>

              <SettingsSection title="Registration" icon={Users}>
                <SettingsToggle
                  label="Allow Registration"
                  description="Allow new organizations to register"
                  checked={editedSettings.allow_registration ?? settings.allow_registration}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({ ...prev, allow_registration: v }))
                  }
                />
                <SettingsToggle
                  label="Require Email Verification"
                  description="New users must verify their email"
                  checked={
                    editedSettings.require_email_verification ?? settings.require_email_verification
                  }
                  onChange={(v) =>
                    setEditedSettings((prev) => ({ ...prev, require_email_verification: v }))
                  }
                />
                <SettingsInput
                  label="Default Trial Days"
                  type="number"
                  value={String(editedSettings.default_trial_days ?? settings.default_trial_days)}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({
                      ...prev,
                      default_trial_days: parseInt(v) || 14,
                    }))
                  }
                />
              </SettingsSection>

              <SettingsSection title="Storage" icon={HardDrive}>
                <SettingsSelect
                  label="Storage Provider"
                  value={editedSettings.storage_provider ?? settings.storage_provider}
                  options={[
                    { value: 'minio', label: 'MinIO' },
                    { value: 's3', label: 'Amazon S3' },
                    { value: 'azure', label: 'Azure Blob Storage' },
                    { value: 'gcs', label: 'Google Cloud Storage' },
                  ]}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({
                      ...prev,
                      storage_provider: v as SystemSettings['storage_provider'],
                    }))
                  }
                />
                <SettingsInput
                  label="Max File Size (MB)"
                  type="number"
                  value={String(editedSettings.max_file_size_mb ?? settings.max_file_size_mb)}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({ ...prev, max_file_size_mb: parseInt(v) || 500 }))
                  }
                />
              </SettingsSection>

              <SettingsSection title="Search & OCR" icon={Search}>
                <SettingsSelect
                  label="Search Provider"
                  value={editedSettings.search_provider ?? settings.search_provider}
                  options={[
                    { value: 'elasticsearch', label: 'Elasticsearch' },
                    { value: 'opensearch', label: 'OpenSearch' },
                    { value: 'database', label: 'Database Full-Text' },
                  ]}
                  onChange={(v) =>
                    setEditedSettings((prev) => ({
                      ...prev,
                      search_provider: v as SystemSettings['search_provider'],
                    }))
                  }
                />
                <SettingsToggle
                  label="Enable OCR"
                  description="Enable OCR for scanned documents"
                  checked={editedSettings.enable_ocr ?? settings.enable_ocr}
                  onChange={(v) => setEditedSettings((prev) => ({ ...prev, enable_ocr: v }))}
                />
              </SettingsSection>

              {Object.keys(editedSettings).length > 0 && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditedSettings({})}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security & Audit Tab */}
          {activeTab === 'security' && !auditConfig && !loadError && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Audit configuration not available</p>
            </div>
          )}
          {activeTab === 'security' && auditConfig && (
            <div className="space-y-6">
              <SettingsSection title="Event Logging" icon={FileText}>
                <div className="grid grid-cols-2 gap-4">
                  <SettingsToggle
                    label="Authentication Events"
                    checked={editedAuditConfig.log_auth_events ?? auditConfig.log_auth_events}
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_auth_events: v }))
                    }
                  />
                  <SettingsToggle
                    label="Document Events"
                    checked={
                      editedAuditConfig.log_document_events ?? auditConfig.log_document_events
                    }
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_document_events: v }))
                    }
                  />
                  <SettingsToggle
                    label="Folder Events"
                    checked={editedAuditConfig.log_folder_events ?? auditConfig.log_folder_events}
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_folder_events: v }))
                    }
                  />
                  <SettingsToggle
                    label="User Events"
                    checked={editedAuditConfig.log_user_events ?? auditConfig.log_user_events}
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_user_events: v }))
                    }
                  />
                  <SettingsToggle
                    label="Permission Events"
                    checked={
                      editedAuditConfig.log_permission_events ?? auditConfig.log_permission_events
                    }
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_permission_events: v }))
                    }
                  />
                  <SettingsToggle
                    label="API Events"
                    checked={editedAuditConfig.log_api_events ?? auditConfig.log_api_events}
                    onChange={(v) =>
                      setEditedAuditConfig((prev) => ({ ...prev, log_api_events: v }))
                    }
                  />
                </div>
              </SettingsSection>

              <SettingsSection title="Alerts" icon={Bell}>
                <SettingsToggle
                  label="Alert on Failed Logins"
                  description={`Alert after ${auditConfig.failed_login_threshold} failed attempts`}
                  checked={
                    editedAuditConfig.alert_on_failed_logins ?? auditConfig.alert_on_failed_logins
                  }
                  onChange={(v) =>
                    setEditedAuditConfig((prev) => ({ ...prev, alert_on_failed_logins: v }))
                  }
                />
                <SettingsToggle
                  label="Alert on Bulk Deletion"
                  description={`Alert when ${auditConfig.bulk_deletion_threshold}+ items deleted`}
                  checked={
                    editedAuditConfig.alert_on_bulk_deletion ?? auditConfig.alert_on_bulk_deletion
                  }
                  onChange={(v) =>
                    setEditedAuditConfig((prev) => ({ ...prev, alert_on_bulk_deletion: v }))
                  }
                />
                <SettingsToggle
                  label="Alert on Permission Changes"
                  checked={
                    editedAuditConfig.alert_on_permission_changes ??
                    auditConfig.alert_on_permission_changes
                  }
                  onChange={(v) =>
                    setEditedAuditConfig((prev) => ({ ...prev, alert_on_permission_changes: v }))
                  }
                />
              </SettingsSection>

              {Object.keys(editedAuditConfig).length > 0 && (
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setEditedAuditConfig({})}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAuditConfig}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Organizations Tab */}
          {activeTab === 'organizations' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  All Organizations
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Organization
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Users
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {!Array.isArray(organizations) || organizations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                        >
                          No organizations found
                        </td>
                      </tr>
                    ) : (
                      organizations.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {org.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {org.domain}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={org.subscription_plan}
                              onChange={(e) =>
                                handleChangePlan(
                                  org.id,
                                  e.target.value as
                                    | 'free'
                                    | 'starter'
                                    | 'professional'
                                    | 'enterprise'
                                )
                              }
                              className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                            >
                              <option value="free">Free</option>
                              <option value="starter">Starter</option>
                              <option value="professional">Professional</option>
                              <option value="enterprise">Enterprise</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {org.current_user_count} / {org.max_users}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'px-2 py-0.5 text-xs font-medium rounded-full',
                                org.is_active
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              )}
                            >
                              {org.subscription_status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => navigate(`/admin/organizations/${org.id}`)}
                                className="p-1 text-gray-500 hover:text-purple-600"
                                title="View Details"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              {org.is_active ? (
                                <button
                                  onClick={() => handleSuspendOrg(org.id)}
                                  className="p-1 text-gray-500 hover:text-red-600"
                                  title="Suspend"
                                >
                                  <PowerOff className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivateOrg(org.id)}
                                  className="p-1 text-gray-500 hover:text-green-600"
                                  title="Activate"
                                >
                                  <Power className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Platform Announcements
                </h3>
                <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Plus className="w-4 h-4" />
                  New Announcement
                </button>
              </div>

              <div className="space-y-4">
                {!Array.isArray(announcements) || announcements.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Megaphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No announcements yet</p>
                  </div>
                ) : (
                  announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={cn(
                        'bg-white dark:bg-gray-800 rounded-xl border p-4',
                        announcement.is_active
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-gray-200 dark:border-gray-700 opacity-60'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span
                            className={cn(
                              'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                              announcement.severity === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : announcement.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : announcement.severity === 'maintenance'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {announcement.severity}
                          </span>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {announcement.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {announcement.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              Created by {announcement.created_by_name || 'Unknown'} on{' '}
                              {new Date(announcement.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleToggleAnnouncement(announcement.id, announcement.is_active)
                            }
                            className={cn(
                              'p-1',
                              announcement.is_active
                                ? 'text-green-600 hover:text-green-700'
                                : 'text-gray-400 hover:text-green-600'
                            )}
                            title={announcement.is_active ? 'Deactivate' : 'Activate'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'health' && !health && !loadError && (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">System health data not available</p>
            </div>
          )}
          {activeTab === 'health' && health && (
            <div className="space-y-6">
              {/* Overall Status */}
              <div
                className={cn(
                  'p-6 rounded-xl border',
                  health.overall_status === 'healthy'
                    ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                    : health.overall_status === 'degraded'
                      ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                )}
              >
                <div className="flex items-center gap-3">
                  {health.overall_status === 'healthy' ? (
                    <Check className="w-8 h-8 text-green-600" />
                  ) : health.overall_status === 'degraded' ? (
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                  ) : (
                    <X className="w-8 h-8 text-red-600" />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold capitalize">{health.overall_status}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last checked: {new Date(health.checked_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {health.services &&
                  Object.entries(health.services).map(([name, service]) => (
                    <div
                      key={name}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Server className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white capitalize">
                            {name}
                          </span>
                        </div>
                        <span
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full capitalize',
                            service.status === 'healthy'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : service.status === 'degraded'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : service.status === 'unhealthy'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          )}
                        >
                          {service.status}
                        </span>
                      </div>
                      {service.response_time_ms !== null && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Response time: {service.response_time_ms}ms
                        </p>
                      )}
                      {service.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                          {service.error_message}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
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

// Helper Components
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.FC<{ className?: string }>
  color: 'purple' | 'blue' | 'green' | 'orange'
}) {
  const colors = {
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={cn('p-3 rounded-lg', colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.FC<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function SettingsInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
      />
    </div>
  )
}

function SettingsTextarea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
      />
    </div>
  )
}

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-900 dark:text-white"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  )
}

export default SystemSettingsPage
