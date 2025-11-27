/**
 * RetentionDashboardPage Component
 *
 * Enterprise-grade retention management dashboard with tabs for:
 * - Dashboard (KPIs, compliance health, quick actions)
 * - Policies (retention policy management)
 * - Legal Holds (litigation hold management)
 * - Compliance (compliance reporting)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Clock,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar,
  RefreshCw,
  Plus,
  LayoutDashboard,
  Scale,
  FileCheck,
  Loader2,
  ArrowRight,
  AlertCircle,
  Archive,
  Trash2,
  Bell,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { RetentionPolicyList } from '@/components/Retention/RetentionPolicyList'
import { RetentionPolicyEditor } from '@/components/Retention/RetentionPolicyEditor'
import { LegalHoldManager } from '@/components/Retention/LegalHoldManager'
import { PolicyComplianceReport } from '@/components/Retention/PolicyComplianceReport'
import {
  LegalHoldWizard,
  CustodianManagement,
  HoldNotificationCenter,
  ReleaseHoldWorkflow,
} from '@/components/LegalHold'
import type {
  Custodian,
  NotificationTemplate,
  NotificationHistoryEntry,
} from '@/components/LegalHold'
import { authService } from '@/services/auth.service'
import {
  getRetentionDashboardStats,
  getRetentionPolicies,
  getLegalHolds,
  getComplianceReport,
  createRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  createLegalHold,
  releaseLegalHold,
  getHoldCustodians,
  addCustodian,
  removeCustodian,
  updateCustodianRole,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendHoldNotifications,
  resendNotification,
  getNotificationHistory,
  submitReleaseRequest,
  FINANCIAL_SERVICES_POLICY_TEMPLATES,
  type RetentionDashboardStats,
  type RetentionPolicy,
  type LegalHold,
  type ComplianceReport,
  type CustodianResponse,
  type NotificationTemplateResponse,
  type NotificationHistoryResponse,
} from '@/services/retentionService'
import { cn } from '@/utils/cn'

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'dashboard' | 'policies' | 'legal-holds' | 'compliance'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'policies', label: 'Policies', icon: Clock },
  { id: 'legal-holds', label: 'Legal Holds', icon: Scale },
  { id: 'compliance', label: 'Compliance', icon: FileCheck },
]

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.FC<{ className?: string }>
  iconColor: string
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
}

function KPICard({ title, value, subtitle, icon: Icon, iconColor, trend }: KPICardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
          {trend && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1 text-sm',
                trend.isPositive
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              )}
            >
              <TrendingUp className={cn('w-4 h-4', !trend.isPositive && 'rotate-180')} />
              <span>{trend.value}%</span>
              <span className="text-gray-500 dark:text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={cn('p-3 rounded-xl', iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.FC<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'warning' | 'danger'
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  onClick,
  variant = 'default',
}: QuickActionCardProps) {
  const variantStyles = {
    default: 'hover:border-blue-300 dark:hover:border-blue-600',
    warning: 'hover:border-yellow-300 dark:hover:border-yellow-600',
    danger: 'hover:border-red-300 dark:hover:border-red-600',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md',
        variantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            variant === 'default' && 'bg-blue-100 dark:bg-blue-900/30',
            variant === 'warning' && 'bg-yellow-100 dark:bg-yellow-900/30',
            variant === 'danger' && 'bg-red-100 dark:bg-red-900/30'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5',
              variant === 'default' && 'text-blue-600 dark:text-blue-400',
              variant === 'warning' && 'text-yellow-600 dark:text-yellow-400',
              variant === 'danger' && 'text-red-600 dark:text-red-400'
            )}
          />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RetentionDashboardPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // User data for header
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
  }

  // Mock notifications
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
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  // Tab state
  const initialTab = (searchParams.get('tab') as TabId) || 'dashboard'
  const [activeTab, setActiveTab] = useState<TabId>(initialTab)

  // Data states
  const [stats, setStats] = useState<RetentionDashboardStats | null>(null)
  const [policies, setPolicies] = useState<RetentionPolicy[]>([])
  const [legalHolds, setLegalHolds] = useState<LegalHold[]>([])
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null)

  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isPoliciesLoading, setIsPoliciesLoading] = useState(false)
  const [isHoldsLoading, setIsHoldsLoading] = useState(false)
  const [isReportLoading, setIsReportLoading] = useState(false)

  // Editor states
  const [showPolicyEditor, setShowPolicyEditor] = useState(false)
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null)
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null)
  const [selectedHoldId, setSelectedHoldId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Legal Hold Management states
  const [showLegalHoldWizard, setShowLegalHoldWizard] = useState(false)
  const [showCustodianManagement, setShowCustodianManagement] = useState(false)
  const [showNotificationCenter, setShowNotificationCenter] = useState(false)
  const [showReleaseWorkflow, setShowReleaseWorkflow] = useState(false)
  const [managingHold, setManagingHold] = useState<LegalHold | null>(null)
  const [custodians, setCustodians] = useState<Custodian[]>([])
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([])
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryEntry[]>([])

  // Error state
  const [error, setError] = useState<string | null>(null)

  // Update URL when tab changes
  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      setSearchParams({ tab })
    },
    [setSearchParams]
  )

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await getRetentionDashboardStats()
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err)
    }
  }, [])

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    setIsPoliciesLoading(true)
    try {
      const data = await getRetentionPolicies()
      setPolicies(data)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
    } finally {
      setIsPoliciesLoading(false)
    }
  }, [])

  // Fetch legal holds
  const fetchLegalHolds = useCallback(async () => {
    setIsHoldsLoading(true)
    try {
      const data = await getLegalHolds()
      setLegalHolds(data)
    } catch (err) {
      console.error('Failed to fetch legal holds:', err)
    } finally {
      setIsHoldsLoading(false)
    }
  }, [])

  // Fetch compliance report
  const fetchComplianceReport = useCallback(async (period?: { from: string; to: string }) => {
    setIsReportLoading(true)
    try {
      const data = await getComplianceReport(period)
      setComplianceReport(data)
    } catch (err) {
      console.error('Failed to fetch compliance report:', err)
    } finally {
      setIsReportLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        await Promise.all([fetchStats(), fetchPolicies(), fetchLegalHolds()])
      } catch (err) {
        console.error('Failed to fetch initial data:', err)
        setError('Failed to load retention data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [fetchStats, fetchPolicies, fetchLegalHolds])

  // Fetch compliance report when tab changes to compliance
  useEffect(() => {
    if (activeTab === 'compliance' && !complianceReport) {
      fetchComplianceReport()
    }
  }, [activeTab, complianceReport, fetchComplianceReport])

  // Refresh all data
  const handleRefresh = useCallback(async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchStats(), fetchPolicies(), fetchLegalHolds()])
      if (activeTab === 'compliance') {
        await fetchComplianceReport()
      }
    } finally {
      setIsLoading(false)
    }
  }, [fetchStats, fetchPolicies, fetchLegalHolds, fetchComplianceReport, activeTab])

  // Policy handlers
  const handleCreatePolicy = useCallback(() => {
    setEditingPolicy(null)
    setShowPolicyEditor(true)
  }, [])

  const handleEditPolicy = useCallback(
    (policyId: string) => {
      const policy = policies.find((p) => p.id === policyId)
      if (policy) {
        setEditingPolicy(policy)
        setShowPolicyEditor(true)
      }
    },
    [policies]
  )

  const handleDeletePolicy = useCallback(
    async (policyId: string) => {
      try {
        await deleteRetentionPolicy(policyId)
        await fetchPolicies()
        await fetchStats()
      } catch (err) {
        console.error('Failed to delete policy:', err)
      }
    },
    [fetchPolicies, fetchStats]
  )

  const handleTogglePolicyStatus = useCallback(
    async (policyId: string) => {
      const policy = policies.find((p) => p.id === policyId)
      if (policy) {
        try {
          await updateRetentionPolicy(policyId, {
            status: policy.status === 'active' ? 'inactive' : 'active',
          })
          await fetchPolicies()
          await fetchStats()
        } catch (err) {
          console.error('Failed to toggle policy status:', err)
        }
      }
    },
    [policies, fetchPolicies, fetchStats]
  )

  const handleSavePolicy = useCallback(
    async (policyData: Partial<RetentionPolicy>) => {
      setIsSaving(true)
      try {
        if (editingPolicy) {
          await updateRetentionPolicy(editingPolicy.id, policyData)
        } else {
          await createRetentionPolicy(policyData as Omit<RetentionPolicy, 'id'>)
        }
        setShowPolicyEditor(false)
        setEditingPolicy(null)
        await fetchPolicies()
        await fetchStats()
      } catch (err) {
        console.error('Failed to save policy:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [editingPolicy, fetchPolicies, fetchStats]
  )

  // Legal hold handlers
  const handleReleaseHold = useCallback(
    async (holdId: string) => {
      try {
        await releaseLegalHold(holdId, 'Released via dashboard')
        await fetchLegalHolds()
        await fetchStats()
      } catch (err) {
        console.error('Failed to release legal hold:', err)
      }
    },
    [fetchLegalHolds, fetchStats]
  )

  // Create new legal hold
  const handleCreateLegalHold = useCallback(
    async (holdData: Partial<LegalHold>) => {
      setIsSaving(true)
      try {
        await createLegalHold({
          case_number: holdData.caseNumber || '',
          title: holdData.caseName || '',
          reason: holdData.description || '',
          start_date: holdData.effectiveDate || new Date().toISOString(),
          end_date: holdData.expiryDate || null,
        })
        setShowLegalHoldWizard(false)
        await fetchLegalHolds()
        await fetchStats()
      } catch (err) {
        console.error('Failed to create legal hold:', err)
      } finally {
        setIsSaving(false)
      }
    },
    [fetchLegalHolds, fetchStats]
  )

  // Open custodian management for a hold
  const handleManageCustodians = useCallback(async (hold: LegalHold) => {
    setManagingHold(hold)
    try {
      const custodiansData = await getHoldCustodians(hold.id)
      setCustodians(
        custodiansData.map(
          (c: CustodianResponse): Custodian => ({
            id: c.id,
            name: c.name,
            email: c.email,
            department: c.department,
            role: c.role,
            addedAt: c.added_at,
            addedBy: c.added_by,
            notificationStatus: c.notification_status,
            notificationSentAt: c.notification_sent_at,
            acknowledgedAt: c.acknowledged_at,
            documentsCount: c.documents_count,
          })
        )
      )
      setShowCustodianManagement(true)
    } catch (err) {
      console.error('Failed to load custodians:', err)
    }
  }, [])

  // Add a custodian
  const handleAddCustodian = useCallback(
    async (custodian: Omit<Custodian, 'id' | 'addedAt' | 'addedBy' | 'notificationStatus'>) => {
      if (!managingHold) return
      try {
        const response = await addCustodian(managingHold.id, {
          name: custodian.name,
          email: custodian.email,
          department: custodian.department,
          role: custodian.role,
        })
        setCustodians((prev) => [
          ...prev,
          {
            id: response.id,
            name: response.name,
            email: response.email,
            department: response.department,
            role: response.role,
            addedAt: response.added_at,
            addedBy: response.added_by,
            notificationStatus: response.notification_status,
            notificationSentAt: response.notification_sent_at,
            acknowledgedAt: response.acknowledged_at,
            documentsCount: response.documents_count,
          },
        ])
      } catch (err) {
        console.error('Failed to add custodian:', err)
      }
    },
    [managingHold]
  )

  // Remove a custodian
  const handleRemoveCustodian = useCallback(
    async (custodianId: string) => {
      if (!managingHold) return
      try {
        await removeCustodian(managingHold.id, custodianId)
        setCustodians((prev) => prev.filter((c) => c.id !== custodianId))
      } catch (err) {
        console.error('Failed to remove custodian:', err)
      }
    },
    [managingHold]
  )

  // Update custodian role
  const handleUpdateCustodianRole = useCallback(
    async (custodianId: string, role: Custodian['role']) => {
      if (!managingHold) return
      try {
        await updateCustodianRole(managingHold.id, custodianId, role)
        setCustodians((prev) => prev.map((c) => (c.id === custodianId ? { ...c, role } : c)))
      } catch (err) {
        console.error('Failed to update custodian role:', err)
      }
    },
    [managingHold]
  )

  // Open notification center for a hold
  const handleOpenNotificationCenter = useCallback(async (hold: LegalHold) => {
    setManagingHold(hold)
    try {
      const [templates, history, custodiansData] = await Promise.all([
        getNotificationTemplates(),
        getNotificationHistory(hold.id),
        getHoldCustodians(hold.id),
      ])
      setNotificationTemplates(
        templates.map(
          (t: NotificationTemplateResponse): NotificationTemplate => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            body: t.body,
            type: t.type,
            isDefault: t.is_default,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          })
        )
      )
      setNotificationHistory(
        history.map(
          (h: NotificationHistoryResponse): NotificationHistoryEntry => ({
            id: h.id,
            templateId: h.template_id,
            templateName: h.template_name,
            recipientIds: h.recipient_ids,
            recipientCount: h.recipient_count,
            subject: h.subject,
            sentAt: h.sent_at,
            sentBy: h.sent_by,
            status: h.status,
            deliveredCount: h.delivered_count,
            failedCount: h.failed_count,
            openedCount: h.opened_count,
            acknowledgedCount: h.acknowledged_count,
          })
        )
      )
      setCustodians(
        custodiansData.map(
          (c: CustodianResponse): Custodian => ({
            id: c.id,
            name: c.name,
            email: c.email,
            department: c.department,
            role: c.role,
            addedAt: c.added_at,
            addedBy: c.added_by,
            notificationStatus: c.notification_status,
            notificationSentAt: c.notification_sent_at,
            acknowledgedAt: c.acknowledged_at,
            documentsCount: c.documents_count,
          })
        )
      )
      setShowNotificationCenter(true)
    } catch (err) {
      console.error('Failed to load notification data:', err)
    }
  }, [])

  // Send notifications
  const handleSendNotifications = useCallback(
    async (templateId: string, recipientIds: string[], customMessage?: string) => {
      if (!managingHold) return
      try {
        await sendHoldNotifications(managingHold.id, {
          template_id: templateId,
          recipient_ids: recipientIds,
          custom_message: customMessage,
        })
        // Refresh notification history
        const history = await getNotificationHistory(managingHold.id)
        setNotificationHistory(
          history.map(
            (h: NotificationHistoryResponse): NotificationHistoryEntry => ({
              id: h.id,
              templateId: h.template_id,
              templateName: h.template_name,
              recipientIds: h.recipient_ids,
              recipientCount: h.recipient_count,
              subject: h.subject,
              sentAt: h.sent_at,
              sentBy: h.sent_by,
              status: h.status,
              deliveredCount: h.delivered_count,
              failedCount: h.failed_count,
              openedCount: h.opened_count,
              acknowledgedCount: h.acknowledged_count,
            })
          )
        )
      } catch (err) {
        console.error('Failed to send notifications:', err)
      }
    },
    [managingHold]
  )

  // Resend notification to a custodian
  const handleResendNotification = useCallback(
    async (custodianId: string) => {
      if (!managingHold) return
      try {
        await resendNotification(managingHold.id, custodianId)
      } catch (err) {
        console.error('Failed to resend notification:', err)
      }
    },
    [managingHold]
  )

  // Save notification template
  const handleSaveTemplate = useCallback(async (template: Partial<NotificationTemplate>) => {
    try {
      if (template.id) {
        await updateNotificationTemplate(template.id, {
          name: template.name,
          subject: template.subject,
          body: template.body,
          type: template.type,
          is_default: template.isDefault,
        })
      } else {
        await createNotificationTemplate({
          name: template.name || '',
          subject: template.subject || '',
          body: template.body || '',
          type: template.type || 'custom',
          is_default: template.isDefault || false,
        })
      }
      // Refresh templates
      const templates = await getNotificationTemplates()
      setNotificationTemplates(
        templates.map(
          (t: NotificationTemplateResponse): NotificationTemplate => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            body: t.body,
            type: t.type,
            isDefault: t.is_default,
            createdAt: t.created_at,
            updatedAt: t.updated_at,
          })
        )
      )
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }, [])

  // Delete notification template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteNotificationTemplate(templateId)
      setNotificationTemplates((prev) => prev.filter((t) => t.id !== templateId))
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }, [])

  // Open release workflow for a hold
  const handleOpenReleaseWorkflow = useCallback((hold: LegalHold) => {
    setManagingHold(hold)
    setShowReleaseWorkflow(true)
  }, [])

  // Submit release request
  const handleSubmitReleaseRequest = useCallback(
    async (reason: string, releaseAll: boolean, documentIds?: string[]) => {
      if (!managingHold) return
      try {
        await submitReleaseRequest(managingHold.id, {
          reason,
          release_all: releaseAll,
          document_ids: documentIds,
        })
        setShowReleaseWorkflow(false)
        setManagingHold(null)
        await fetchLegalHolds()
        await fetchStats()
      } catch (err) {
        console.error('Failed to submit release request:', err)
      }
    },
    [managingHold, fetchLegalHolds, fetchStats]
  )

  // Render dashboard tab content
  const renderDashboardTab = () => (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Policies"
          value={stats?.activePolicies || 0}
          subtitle={`${stats?.totalPolicies || 0} total policies`}
          icon={Clock}
          iconColor="bg-blue-600"
        />
        <KPICard
          title="Documents Under Retention"
          value={stats?.documentsUnderRetention || 0}
          icon={FileText}
          iconColor="bg-green-600"
        />
        <KPICard
          title="Compliance Rate"
          value={`${stats?.complianceRate || 0}%`}
          subtitle={
            stats?.complianceRate && stats.complianceRate >= 95 ? 'Healthy' : 'Needs attention'
          }
          icon={Shield}
          iconColor={
            stats?.complianceRate && stats.complianceRate >= 95 ? 'bg-green-600' : 'bg-yellow-600'
          }
        />
        <KPICard
          title="Active Legal Holds"
          value={stats?.activeLegalHolds || 0}
          subtitle={`${stats?.documentsOnHold || 0} documents on hold`}
          icon={Scale}
          iconColor="bg-purple-600"
        />
      </div>

      {/* Alerts & Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Attention Required
          </h3>
          <div className="space-y-3">
            {(stats?.documentsExpiringSoon || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {stats?.documentsExpiringSoon} documents expiring in 30 days
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    Review and take action before expiration
                  </p>
                </div>
              </div>
            )}
            {(stats?.pendingReviews || 0) > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <FileCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {stats?.pendingReviews} policies pending review
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Review draft policies before activation
                  </p>
                </div>
              </div>
            )}
            {stats?.activeLegalHolds && stats.activeLegalHolds > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <Scale className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    {stats.activeLegalHolds} active legal holds
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Documents protected from deletion
                  </p>
                </div>
              </div>
            )}
            {!stats?.documentsExpiringSoon &&
              !stats?.pendingReviews &&
              !stats?.activeLegalHolds && (
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      All systems healthy
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400">
                      No immediate action required
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <QuickActionCard
              title="Create Retention Policy"
              description="Define new document retention rules"
              icon={Plus}
              onClick={handleCreatePolicy}
            />
            <QuickActionCard
              title="View Expiring Documents"
              description={`${stats?.documentsExpiringSoon || 0} documents expiring soon`}
              icon={Calendar}
              onClick={() => handleTabChange('policies')}
              variant="warning"
            />
            <QuickActionCard
              title="Generate Compliance Report"
              description="Export retention compliance status"
              icon={FileCheck}
              onClick={() => handleTabChange('compliance')}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity & Policy Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Policy Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Policies</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {policies.filter((p) => p.status === 'active').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Draft Policies</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {policies.filter((p) => p.status === 'draft').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Archive className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Archive Actions</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {policies.filter((p) => p.primaryAction === 'archive').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Delete Actions</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {policies.filter((p) => p.primaryAction === 'delete').length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Bell className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Notify Actions</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {policies.filter((p) => p.primaryAction === 'notify').length}
              </span>
            </div>
          </div>
        </div>

        {/* Available Templates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Financial Services Templates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Pre-built policy templates for regulatory compliance
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {FINANCIAL_SERVICES_POLICY_TEMPLATES.slice(0, 5).map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {template.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {Math.floor(template.retention_days / 365)} years
                    </span>
                    {template.compliance_standards.slice(0, 2).map((standard) => (
                      <span
                        key={standard}
                        className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded"
                      >
                        {standard}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleCreatePolicy}
            className="mt-4 w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Use Template to Create Policy
          </button>
        </div>
      </div>
    </div>
  )

  // Render policies tab content
  const renderPoliciesTab = () => {
    if (showPolicyEditor) {
      return (
        <RetentionPolicyEditor
          policy={editingPolicy || undefined}
          templates={FINANCIAL_SERVICES_POLICY_TEMPLATES.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description,
            retentionPeriod: {
              value: Math.floor(t.retention_days / 365),
              unit: 'years' as const,
            },
            action: t.policy_type === 'DOCUMENT_TYPE' ? 'archive' : 'review',
            complianceStandards: t.compliance_standards,
          }))}
          onSave={handleSavePolicy}
          onCancel={() => {
            setShowPolicyEditor(false)
            setEditingPolicy(null)
          }}
          saving={isSaving}
          mode={editingPolicy ? 'edit' : 'create'}
        />
      )
    }

    return (
      <RetentionPolicyList
        policies={policies.map((p) => ({
          ...p,
          documentsAffected: p.documentsAffected || 0,
          documentsCompliant: p.documentsCompliant || 0,
          documentsAtRisk: p.documentsAtRisk || 0,
        }))}
        selectedPolicyId={selectedPolicyId || undefined}
        onPolicySelect={setSelectedPolicyId}
        onCreatePolicy={handleCreatePolicy}
        onEditPolicy={handleEditPolicy}
        onDeletePolicy={handleDeletePolicy}
        onToggleStatus={handleTogglePolicyStatus}
        loading={isPoliciesLoading}
        view="list"
      />
    )
  }

  // Render legal holds tab content
  const renderLegalHoldsTab = () => (
    <LegalHoldManager
      holds={legalHolds.map((h) => ({
        ...h,
        documentsOnHold: h.documentsOnHold || 0,
        documentsReleased: h.documentsReleased || 0,
        custodians: h.custodians || [],
        departments: h.departments || [],
        pendingAcknowledgment: h.pendingAcknowledgment || [],
      }))}
      selectedHoldId={selectedHoldId || undefined}
      onHoldSelect={setSelectedHoldId}
      onCreateHold={() => setShowLegalHoldWizard(true)}
      onReleaseHold={handleReleaseHold}
      onManageCustodians={(holdId) => {
        const hold = legalHolds.find((h) => h.id === holdId)
        if (hold) handleManageCustodians(hold)
      }}
      onManageNotifications={(holdId) => {
        const hold = legalHolds.find((h) => h.id === holdId)
        if (hold) handleOpenNotificationCenter(hold)
      }}
      onInitiateRelease={(holdId) => {
        const hold = legalHolds.find((h) => h.id === holdId)
        if (hold) handleOpenReleaseWorkflow(hold)
      }}
      loading={isHoldsLoading}
    />
  )

  // Render compliance tab content
  const renderComplianceTab = () => {
    if (!complianceReport) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading compliance report...</p>
          </div>
        </div>
      )
    }

    return (
      <PolicyComplianceReport
        report={{
          ...complianceReport,
          violations: complianceReport.violations || [],
          topViolationTypes: complianceReport.topViolationTypes || [],
          complianceTrend: complianceReport.complianceTrend || [],
        }}
        loading={isReportLoading}
        onGenerateReport={fetchComplianceReport}
        onExport={(format) => {
          console.log('Exporting report as:', format)
          // TODO: Implement export functionality
        }}
      />
    )
  }

  // Main content renderer
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Retention Management
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage document retention policies, legal holds, and compliance
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6">
          <div className="flex border-b border-gray-200 dark:border-gray-700 -mb-px">
            {TABS.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Error Loading Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : isLoading && activeTab === 'dashboard' ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading retention data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboardTab()}
            {activeTab === 'policies' && renderPoliciesTab()}
            {activeTab === 'legal-holds' && renderLegalHoldsTab()}
            {activeTab === 'compliance' && renderComplianceTab()}
          </>
        )}
      </div>
    </div>
  )

  return (
    <>
      <ThreePanelLayout
        header={
          <DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />
        }
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={renderContent()}
        collapsibleRight={false}
      />

      {/* Legal Hold Creation Wizard */}
      <LegalHoldWizard
        isOpen={showLegalHoldWizard}
        onClose={() => setShowLegalHoldWizard(false)}
        onComplete={handleCreateLegalHold}
        availableDepartments={['Legal', 'Compliance', 'Finance', 'HR', 'IT', 'Operations']}
        availableDocumentTypes={[
          'Contract',
          'Invoice',
          'Report',
          'Email',
          'Correspondence',
          'Financial Statement',
        ]}
        availableUsers={[]}
      />

      {/* Custodian Management Modal */}
      {managingHold && (
        <CustodianManagement
          isOpen={showCustodianManagement}
          onClose={() => {
            setShowCustodianManagement(false)
            setManagingHold(null)
          }}
          holdId={managingHold.id}
          holdName={managingHold.caseName}
          custodians={custodians}
          onAddCustodian={handleAddCustodian}
          onRemoveCustodian={handleRemoveCustodian}
          onUpdateRole={handleUpdateCustodianRole}
          onResendNotification={handleResendNotification}
        />
      )}

      {/* Notification Center Modal */}
      {managingHold && (
        <HoldNotificationCenter
          isOpen={showNotificationCenter}
          onClose={() => {
            setShowNotificationCenter(false)
            setManagingHold(null)
          }}
          holdId={managingHold.id}
          holdName={managingHold.caseName}
          templates={notificationTemplates}
          history={notificationHistory}
          custodians={custodians}
          onSendNotification={handleSendNotifications}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      {/* Release Hold Workflow Modal */}
      {managingHold && (
        <ReleaseHoldWorkflow
          isOpen={showReleaseWorkflow}
          onClose={() => {
            setShowReleaseWorkflow(false)
            setManagingHold(null)
          }}
          hold={{
            ...managingHold,
            documentsOnHold: managingHold.documentsOnHold || 0,
            documentsReleased: managingHold.documentsReleased || 0,
          }}
          onSubmitRelease={async (data) => {
            await handleSubmitReleaseRequest(
              data.reason,
              data.releaseType === 'full',
              data.releaseType === 'partial' ? data.documentIds : undefined
            )
          }}
        />
      )}
    </>
  )
}

export default RetentionDashboardPage
