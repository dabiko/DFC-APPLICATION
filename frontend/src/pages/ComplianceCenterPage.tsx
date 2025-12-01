/**
 * ComplianceCenterPage Component
 *
 * Enterprise-grade compliance management center with tabs for:
 * - Overview (Dashboard with KPIs, health score, risk matrix)
 * - Regulations (Regulatory framework tracking)
 * - Documents (Document compliance status)
 * - Retention (Retention policy compliance)
 * - Access (Access control compliance)
 * - Privacy (DSAR, PII management) - Phase 3
 * - Reports (Compliance reporting) - Phase 5
 * - Policies (Policy management) - Phase 4
 */

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  Scale,
  FileText,
  Archive,
  Lock,
  UserCheck,
  FileBarChart,
  BookOpen,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { cn } from '@/utils/cn'
import { getDashboardOverview, type ComplianceDashboard } from '@/services/complianceService'
import { authService } from '@/services/auth.service'
import {
  RegulationsTab,
  ControlsTab,
  FindingsTab,
  AssessmentsTab,
  DSARTab,
  PIIInventoryTab,
  ConsentTrackingTab,
  BreachManagementTab,
  PoliciesTab,
  AcknowledgmentCampaignsTab,
  ReportBuilderTab,
  ReportTemplatesTab,
  ScheduledReportsTab,
  ExecutiveDashboardTab,
  AccessReviewCampaignsTab,
  MFAComplianceTab,
  PermissionAnalysisTab,
  AnomalyDetectionTab,
} from '@/components/Compliance'

// ============================================================================
// TYPES
// ============================================================================

type TabId =
  | 'overview'
  | 'regulations'
  | 'controls'
  | 'findings'
  | 'assessments'
  | 'documents'
  | 'retention'
  | 'access'
  | 'privacy'
  | 'reports'
  | 'policies'

type PrivacySubTab = 'dsar' | 'pii' | 'consent' | 'breaches'
type PoliciesSubTab = 'policies' | 'campaigns'
type ReportsSubTab = 'builder' | 'templates' | 'scheduled' | 'executive'
type AccessSubTab = 'reviews' | 'mfa' | 'permissions' | 'anomalies'

interface Tab {
  id: TabId
  label: string
  icon: React.FC<{ className?: string }>
  disabled?: boolean
  badge?: number
}

interface ComplianceHealth {
  overallScore: number
  scoreTrend: number
  frameworkScores: FrameworkScore[]
  totalRegulations: number
  activeRegulations: number
  totalControls: number
  compliantControls: number
  nonCompliantControls: number
  openFindings: number
  criticalFindings: number
  overdueFindings: number
  totalDocuments: number
  compliantDocuments: number
  documentsAtRisk: number
  upcomingAssessments: number
  overdueAssessments: number
  unreadAlerts: number
  criticalAlerts: number
  recentActivity: ActivityItem[]
}

interface FrameworkScore {
  id: string
  name: string
  fullName: string
  score: number
  status: 'compliant' | 'at_risk' | 'non_compliant'
}

interface ActivityItem {
  type: string
  action: string
  title: string
  severity?: string
  timestamp: string
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'regulations', label: 'Regulations', icon: Scale },
  { id: 'controls', label: 'Controls', icon: Shield },
  { id: 'findings', label: 'Findings', icon: AlertTriangle },
  { id: 'assessments', label: 'Assessments', icon: FileBarChart },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'retention', label: 'Retention', icon: Archive },
  { id: 'access', label: 'Access', icon: Lock },
  { id: 'privacy', label: 'Privacy', icon: UserCheck },
  { id: 'reports', label: 'Reports', icon: FileBarChart },
  { id: 'policies', label: 'Policies', icon: BookOpen },
]

const DEFAULT_HEALTH: ComplianceHealth = {
  overallScore: 0,
  scoreTrend: 0,
  frameworkScores: [],
  totalRegulations: 0,
  activeRegulations: 0,
  totalControls: 0,
  compliantControls: 0,
  nonCompliantControls: 0,
  openFindings: 0,
  criticalFindings: 0,
  overdueFindings: 0,
  totalDocuments: 0,
  compliantDocuments: 0,
  documentsAtRisk: 0,
  upcomingAssessments: 0,
  overdueAssessments: 0,
  unreadAlerts: 0,
  criticalAlerts: 0,
  recentActivity: [],
}

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
    isPositive: boolean
  }
  onClick?: () => void
}

function KPICard({ title, value, subtitle, icon: Icon, iconColor, trend, onClick }: KPICardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6',
        onClick &&
          'cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 transition-colors'
      )}
    >
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
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-gray-500 dark:text-gray-400">vs last month</span>
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

interface HealthScoreGaugeProps {
  score: number
  trend: number
}

function HealthScoreGauge({ score, trend }: HealthScoreGaugeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 60) return 'Needs Attention'
    return 'Critical'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
        Compliance Health Score
      </h3>
      <div className="flex items-center justify-center">
        <div className="relative w-40 h-40">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="currentColor"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 440} 440`}
              className={getScoreColor(score)}
            />
          </svg>
          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-4xl font-bold', getScoreColor(score))}>{score}%</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">{getScoreLabel(score)}</span>
          </div>
        </div>
      </div>
      {/* Trend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        {trend >= 0 ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
        <span className={cn('text-sm font-medium', trend >= 0 ? 'text-green-600' : 'text-red-600')}>
          {trend >= 0 ? '+' : ''}
          {trend}% from last month
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              getScoreBgColor(score)
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  )
}

interface FrameworkScoreCardProps {
  framework: FrameworkScore
}

function FrameworkScoreCard({ framework }: FrameworkScoreCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'at_risk':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'non_compliant':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white">{framework.name}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">{framework.fullName}</p>
        </div>
        <span
          className={cn(
            'px-2 py-1 text-xs font-medium rounded-full capitalize',
            getStatusColor(framework.status)
          )}
        >
          {framework.status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', getProgressColor(framework.score))}
            style={{ width: `${framework.score}%` }}
          />
        </div>
        <span className="text-sm font-semibold text-gray-900 dark:text-white w-12 text-right">
          {framework.score}%
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComplianceCenterPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>(
    (searchParams.get('tab') as TabId) || 'overview'
  )
  const [privacySubTab, setPrivacySubTab] = useState<PrivacySubTab>(
    (searchParams.get('subtab') as PrivacySubTab) || 'dsar'
  )
  const [policiesSubTab, setPoliciesSubTab] = useState<PoliciesSubTab>(
    (searchParams.get('subtab') as PoliciesSubTab) || 'policies'
  )
  const [reportsSubTab, setReportsSubTab] = useState<ReportsSubTab>(
    (searchParams.get('subtab') as ReportsSubTab) || 'executive'
  )
  const [accessSubTab, setAccessSubTab] = useState<AccessSubTab>(
    (searchParams.get('subtab') as AccessSubTab) || 'reviews'
  )
  const [isLoading, setIsLoading] = useState(true)
  const [health, setHealth] = useState<ComplianceHealth>(DEFAULT_HEALTH)

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Mock notifications - replace with actual API data
  const notifications = [
    {
      id: '1',
      title: '2 compliance findings pending',
      message: 'Review critical findings before deadline',
      time: '1h ago',
      read: false,
    },
    {
      id: '2',
      title: 'GDPR assessment due',
      message: 'Quarterly GDPR assessment is due in 5 days',
      time: '3h ago',
      read: false,
    },
    {
      id: '3',
      title: 'Policy acknowledged',
      message: 'Information Security Policy acknowledged by 95% of users',
      time: '1d ago',
      read: true,
    },
  ]

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

  // Transform API response to local health format
  const transformDashboardData = (data: ComplianceDashboard): ComplianceHealth => ({
    overallScore: data.overall_score,
    scoreTrend: data.score_trend,
    frameworkScores: data.framework_scores.map((f) => ({
      id: f.id,
      name: f.short_name,
      fullName: f.name,
      score: f.score,
      status: f.score >= 80 ? 'compliant' : f.score >= 60 ? 'at_risk' : 'non_compliant',
    })),
    totalRegulations: data.total_regulations,
    activeRegulations: data.active_regulations,
    totalControls: data.total_controls,
    compliantControls: data.compliant_controls,
    nonCompliantControls: data.non_compliant_controls,
    openFindings: data.open_findings,
    criticalFindings: data.critical_findings,
    overdueFindings: data.overdue_findings,
    totalDocuments: data.total_documents,
    compliantDocuments: data.compliant_documents,
    documentsAtRisk: data.documents_at_risk,
    upcomingAssessments: data.upcoming_assessments,
    overdueAssessments: data.overdue_assessments,
    unreadAlerts: data.unread_alerts,
    criticalAlerts: data.critical_alerts,
    recentActivity: data.recent_activity.map((a) => ({
      type: a.type,
      action: 'updated',
      title: a.description,
      timestamp: a.timestamp,
    })),
  })

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await getDashboardOverview()
      setHealth(transformDashboardData(response))
    } catch (error) {
      console.error('Failed to fetch compliance dashboard:', error)
      // Use fallback mock data when API is not available
      setHealth({
        overallScore: 87,
        scoreTrend: 3,
        frameworkScores: [
          { id: '1', name: 'KYC', fullName: 'Know Your Customer', score: 94, status: 'compliant' },
          {
            id: '2',
            name: 'AML',
            fullName: 'Anti-Money Laundering',
            score: 89,
            status: 'compliant',
          },
          {
            id: '3',
            name: 'GDPR',
            fullName: 'General Data Protection Regulation',
            score: 78,
            status: 'at_risk',
          },
          { id: '4', name: 'SOX', fullName: 'Sarbanes-Oxley Act', score: 91, status: 'compliant' },
        ],
        totalRegulations: 6,
        activeRegulations: 4,
        totalControls: 124,
        compliantControls: 108,
        nonCompliantControls: 12,
        openFindings: 8,
        criticalFindings: 2,
        overdueFindings: 1,
        totalDocuments: 12847,
        compliantDocuments: 12105,
        documentsAtRisk: 156,
        upcomingAssessments: 2,
        overdueAssessments: 0,
        unreadAlerts: 5,
        criticalAlerts: 1,
        recentActivity: [
          {
            type: 'finding',
            action: 'created',
            title: 'Missing retention policy on 23 documents',
            severity: 'medium',
            timestamp: new Date().toISOString(),
          },
          {
            type: 'assessment',
            action: 'completed',
            title: 'Q4 KYC Assessment completed',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            type: 'control',
            action: 'updated',
            title: 'GDPR-Art17 control marked compliant',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Update URL when tab changes
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId)
    if (tabId === 'privacy') {
      setSearchParams({ tab: tabId, subtab: privacySubTab })
    } else if (tabId === 'policies') {
      setSearchParams({ tab: tabId, subtab: policiesSubTab })
    } else if (tabId === 'reports') {
      setSearchParams({ tab: tabId, subtab: reportsSubTab })
    } else if (tabId === 'access') {
      setSearchParams({ tab: tabId, subtab: accessSubTab })
    } else {
      setSearchParams({ tab: tabId })
    }
  }

  // Update URL when privacy sub-tab changes
  const handlePrivacySubTabChange = (subTabId: PrivacySubTab) => {
    setPrivacySubTab(subTabId)
    setSearchParams({ tab: 'privacy', subtab: subTabId })
  }

  // Update URL when policies sub-tab changes
  const handlePoliciesSubTabChange = (subTabId: PoliciesSubTab) => {
    setPoliciesSubTab(subTabId)
    setSearchParams({ tab: 'policies', subtab: subTabId })
  }

  // Update URL when reports sub-tab changes
  const handleReportsSubTabChange = (subTabId: ReportsSubTab) => {
    setReportsSubTab(subTabId)
    setSearchParams({ tab: 'reports', subtab: subTabId })
  }

  // Update URL when access sub-tab changes
  const handleAccessSubTabChange = (subTabId: AccessSubTab) => {
    setAccessSubTab(subTabId)
    setSearchParams({ tab: 'access', subtab: subTabId })
  }

  // Privacy sub-tabs configuration
  const PRIVACY_SUB_TABS = [
    { id: 'dsar' as PrivacySubTab, label: 'DSAR Requests', icon: UserCheck },
    { id: 'pii' as PrivacySubTab, label: 'PII Inventory', icon: Shield },
    { id: 'consent' as PrivacySubTab, label: 'Consent Tracking', icon: CheckCircle },
    { id: 'breaches' as PrivacySubTab, label: 'Breach Management', icon: AlertTriangle },
  ]

  // Policies sub-tabs configuration
  const POLICIES_SUB_TABS = [
    { id: 'policies' as PoliciesSubTab, label: 'Policy Management', icon: BookOpen },
    { id: 'campaigns' as PoliciesSubTab, label: 'Acknowledgment Campaigns', icon: CheckCircle },
  ]

  // Reports sub-tabs configuration
  const REPORTS_SUB_TABS = [
    { id: 'executive' as ReportsSubTab, label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'builder' as ReportsSubTab, label: 'Report Builder', icon: FileBarChart },
    { id: 'templates' as ReportsSubTab, label: 'Templates', icon: FileText },
    { id: 'scheduled' as ReportsSubTab, label: 'Scheduled Reports', icon: Clock },
  ]

  // Access sub-tabs configuration
  const ACCESS_SUB_TABS = [
    { id: 'reviews' as AccessSubTab, label: 'Access Reviews', icon: UserCheck },
    { id: 'mfa' as AccessSubTab, label: 'MFA Compliance', icon: Shield },
    { id: 'permissions' as AccessSubTab, label: 'Permission Analysis', icon: Lock },
    { id: 'anomalies' as AccessSubTab, label: 'Anomaly Detection', icon: AlertTriangle },
  ]

  // Render Privacy Tab with sub-navigation
  const renderPrivacyTab = () => (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {PRIVACY_SUB_TABS.map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => handlePrivacySubTabChange(subTab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              privacySubTab === subTab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <subTab.icon className="w-4 h-4" />
            {subTab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {privacySubTab === 'dsar' && <DSARTab />}
      {privacySubTab === 'pii' && <PIIInventoryTab />}
      {privacySubTab === 'consent' && <ConsentTrackingTab />}
      {privacySubTab === 'breaches' && <BreachManagementTab />}
    </div>
  )

  // Render Policies Tab with sub-navigation
  const renderPoliciesTab = () => (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {POLICIES_SUB_TABS.map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => handlePoliciesSubTabChange(subTab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              policiesSubTab === subTab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <subTab.icon className="w-4 h-4" />
            {subTab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {policiesSubTab === 'policies' && <PoliciesTab />}
      {policiesSubTab === 'campaigns' && <AcknowledgmentCampaignsTab />}
    </div>
  )

  // Render Reports Tab with sub-navigation
  const renderReportsTab = () => (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {REPORTS_SUB_TABS.map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => handleReportsSubTabChange(subTab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              reportsSubTab === subTab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <subTab.icon className="w-4 h-4" />
            {subTab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {reportsSubTab === 'executive' && <ExecutiveDashboardTab />}
      {reportsSubTab === 'builder' && <ReportBuilderTab />}
      {reportsSubTab === 'templates' && <ReportTemplatesTab />}
      {reportsSubTab === 'scheduled' && <ScheduledReportsTab />}
    </div>
  )

  // Render Access Tab with sub-navigation
  const renderAccessTab = () => (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {ACCESS_SUB_TABS.map((subTab) => (
          <button
            key={subTab.id}
            onClick={() => handleAccessSubTabChange(subTab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              accessSubTab === subTab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <subTab.icon className="w-4 h-4" />
            {subTab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab Content */}
      {accessSubTab === 'reviews' && <AccessReviewCampaignsTab />}
      {accessSubTab === 'mfa' && <MFAComplianceTab />}
      {accessSubTab === 'permissions' && <PermissionAnalysisTab />}
      {accessSubTab === 'anomalies' && <AnomalyDetectionTab />}
    </div>
  )

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Top Row: Health Score + KPI Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Health Score Gauge */}
        <div className="lg:col-span-1">
          <HealthScoreGauge score={health.overallScore} trend={health.scoreTrend} />
        </div>

        {/* KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard
            title="Open Findings"
            value={health.openFindings}
            subtitle={`${health.criticalFindings} critical`}
            icon={AlertTriangle}
            iconColor={health.criticalFindings > 0 ? 'bg-red-600' : 'bg-yellow-600'}
          />
          <KPICard
            title="Overdue Actions"
            value={health.overdueFindings}
            subtitle="Requires immediate attention"
            icon={Clock}
            iconColor={health.overdueFindings > 0 ? 'bg-red-600' : 'bg-green-600'}
          />
          <KPICard
            title="Documents at Risk"
            value={health.documentsAtRisk}
            subtitle={`of ${health.totalDocuments.toLocaleString()} total`}
            icon={FileText}
            iconColor={health.documentsAtRisk > 100 ? 'bg-orange-600' : 'bg-blue-600'}
          />
        </div>
      </div>

      {/* Framework Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Regulatory Framework Compliance
          </h3>
          <button
            onClick={() => handleTabChange('regulations')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {health.frameworkScores.map((framework) => (
            <FrameworkScoreCard key={framework.id} framework={framework} />
          ))}
        </div>
      </div>

      {/* Bottom Row: Controls Summary + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Control Status Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Compliant</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.compliantControls} (
                {Math.round((health.compliantControls / health.totalControls) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Non-Compliant</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.nonCompliantControls} (
                {Math.round((health.nonCompliantControls / health.totalControls) * 100)}%)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Not Tested</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.totalControls - health.compliantControls - health.nonCompliantControls} (
                {Math.round(
                  ((health.totalControls - health.compliantControls - health.nonCompliantControls) /
                    health.totalControls) *
                    100
                )}
                %)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500"
                style={{ width: `${(health.compliantControls / health.totalControls) * 100}%` }}
              />
              <div
                className="h-full bg-red-500"
                style={{ width: `${(health.nonCompliantControls / health.totalControls) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-4">
            {health.recentActivity.length > 0 ? (
              health.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      activity.type === 'finding'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30'
                        : activity.type === 'assessment'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-green-100 dark:bg-green-900/30'
                    )}
                  >
                    {activity.type === 'finding' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    ) : activity.type === 'assessment' ? (
                      <FileBarChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No recent activity
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Alerts Banner */}
      {health.criticalAlerts > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {health.criticalAlerts} critical alert{health.criticalAlerts !== 1 ? 's' : ''}{' '}
                require your attention
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                {health.unreadAlerts} total unread alerts
              </p>
            </div>
            <button className="text-sm font-medium text-red-700 dark:text-red-300 hover:underline">
              View Alerts
            </button>
          </div>
        </div>
      )}
    </div>
  )

  // Render placeholder for other tabs
  const renderPlaceholderTab = (tabId: TabId) => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {TABS.find((t) => t.id === tabId)?.label} Module
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
        This module is under development and will be available soon.
      </p>
    </div>
  )

  // Main content renderer
  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Compliance Center
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Monitor regulatory compliance, manage controls, and track findings
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : tab.disabled
                    ? 'border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading compliance data...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'regulations' && <RegulationsTab />}
            {activeTab === 'controls' && <ControlsTab />}
            {activeTab === 'findings' && <FindingsTab />}
            {activeTab === 'assessments' && <AssessmentsTab />}
            {activeTab === 'documents' && renderPlaceholderTab('documents')}
            {activeTab === 'retention' && renderPlaceholderTab('retention')}
            {activeTab === 'access' && renderAccessTab()}
            {activeTab === 'privacy' && renderPrivacyTab()}
            {activeTab === 'reports' && renderReportsTab()}
            {activeTab === 'policies' && renderPoliciesTab()}
          </>
        )}
      </div>
    </div>
  )

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

export default ComplianceCenterPage
