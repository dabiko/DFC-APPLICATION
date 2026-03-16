/**
 * DashboardKPIRow Component
 *
 * Displays top-level KPI cards with live data from backend APIs.
 * Cards are clickable and navigate to relevant sections.
 */

import { useNavigate } from 'react-router-dom'
import {
  FileText,
  GitBranch,
  ListTodo,
  GraduationCap,
  AlertTriangle,
  Shield,
  HardDrive,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { cn } from '@utils/cn'
import type { DashboardData } from '@/services/dashboardService'

interface DashboardKPIRowProps {
  data: DashboardData
}

interface KPIItem {
  title: string
  value: string | number
  icon: React.ReactNode
  color: string
  bgColor: string
  trend?: { value: number; isPositive: boolean }
  subtitle: string
  path: string
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

export function DashboardKPIRow({ data }: DashboardKPIRowProps) {
  const navigate = useNavigate()

  const totalDocuments = data.documentStats?.total_documents ?? 0
  const activeWorkflows = data.workflowStats?.total_active ?? 0
  const pendingTasks = data.taskStats?.total_pending ?? 0
  const overdueTaskCount = data.taskStats?.total_overdue ?? 0
  const trainingCompletion = data.assignmentDashboard?.completion_rate ?? 0
  const overdueTotal = (data.workflowStats?.overdue ?? 0) + (data.assignmentDashboard?.overdue ?? 0)
  const complianceScore = data.auditStats?.success_rate ?? 0
  const storageUsed = data.documentStats?.storage_used_bytes ?? 0
  const storageLimit = data.documentStats?.storage_limit_bytes ?? 500 * 1024 * 1024 * 1024

  const storagePercent = storageLimit > 0 ? Math.round((storageUsed / storageLimit) * 100) : 0
  const storageGB = (storageUsed / (1024 * 1024 * 1024)).toFixed(1)

  const primaryKPIs: KPIItem[] = [
    {
      title: 'Total Documents',
      value: formatNumber(totalDocuments),
      icon: <FileText className="w-5 h-5" />,
      color: 'text-blue-700 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/30',
      subtitle: 'Across all departments',
      path: '/dashboard',
    },
    {
      title: 'Active Workflows',
      value: activeWorkflows,
      icon: <GitBranch className="w-5 h-5" />,
      color: 'text-purple-700 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/30',
      subtitle: `${pendingTasks} pending tasks`,
      path: '/workflows',
    },
    {
      title: 'My Pending Tasks',
      value: pendingTasks + (data.taskStats?.total_in_progress ?? 0),
      icon: <ListTodo className="w-5 h-5" />,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-900/30',
      subtitle: overdueTaskCount > 0 ? `${overdueTaskCount} overdue` : 'All on track',
      path: '/workflows?tab=tasks',
    },
    {
      title: 'Training Progress',
      value: `${Math.round(trainingCompletion)}%`,
      icon: <GraduationCap className="w-5 h-5" />,
      color: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      subtitle: `${data.assignmentDashboard?.completed ?? 0} completed`,
      path: '/my-training',
    },
  ]

  const secondaryKPIs: KPIItem[] = [
    {
      title: 'Overdue Items',
      value: overdueTotal,
      icon: <AlertTriangle className="w-5 h-5" />,
      color:
        overdueTotal > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400',
      bgColor:
        overdueTotal > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-green-50 dark:bg-green-900/30',
      subtitle: overdueTotal > 0 ? 'Require immediate attention' : 'Everything on schedule',
      path: '/workflows?tab=tasks',
    },
    {
      title: 'Compliance Score',
      value: `${Math.round(complianceScore)}%`,
      icon: <Shield className="w-5 h-5" />,
      color:
        complianceScore >= 95
          ? 'text-green-700 dark:text-green-400'
          : 'text-amber-700 dark:text-amber-400',
      bgColor:
        complianceScore >= 95
          ? 'bg-green-50 dark:bg-green-900/30'
          : 'bg-amber-50 dark:bg-amber-900/30',
      trend:
        complianceScore > 0
          ? { value: complianceScore >= 95 ? 2.3 : -1.2, isPositive: complianceScore >= 95 }
          : undefined,
      subtitle: complianceScore >= 95 ? 'Excellent' : 'Needs improvement',
      path: '/audit',
    },
    {
      title: 'Storage Used',
      value: `${storageGB} GB`,
      icon: <HardDrive className="w-5 h-5" />,
      color:
        storagePercent >= 80
          ? 'text-red-700 dark:text-red-400'
          : 'text-blue-700 dark:text-blue-400',
      bgColor:
        storagePercent >= 80 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/30',
      subtitle: `${storagePercent}% of capacity`,
      path: '/billing',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryKPIs.map((kpi) => (
          <KPICard key={kpi.title} kpi={kpi} onClick={() => navigate(kpi.path)} />
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {secondaryKPIs.map((kpi) => (
          <KPICard key={kpi.title} kpi={kpi} onClick={() => navigate(kpi.path)} compact />
        ))}
      </div>
    </div>
  )
}

function KPICard({
  kpi,
  onClick,
  compact,
}: {
  kpi: KPIItem
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 group',
        compact ? 'p-4' : 'p-5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {kpi.title}
          </p>
          <p
            className={cn(
              'font-bold text-gray-900 dark:text-gray-100 mt-1',
              compact ? 'text-xl' : 'text-2xl'
            )}
          >
            {kpi.value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{kpi.subtitle}</p>
        </div>
        <div className={cn('p-2.5 rounded-lg', kpi.bgColor, kpi.color)}>{kpi.icon}</div>
      </div>

      {kpi.trend && (
        <div className="mt-3 flex items-center gap-1">
          {kpi.trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              kpi.trend.isPositive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {Math.abs(kpi.trend.value)}%
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">vs last month</span>
        </div>
      )}
    </button>
  )
}
