/**
 * WorkflowAnalyticsDashboard Component
 *
 * Main analytics dashboard combining all analytics components.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  Calendar,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import AnalyticsCard from './AnalyticsCard'
import TrendChart from './TrendChart'
import DonutChart from './DonutChart'
import BottleneckAnalysis from './BottleneckAnalysis'
import SLAComplianceReport from './SLAComplianceReport'
import UserPerformanceTable from './UserPerformanceTable'
import AnalyticsExport from './AnalyticsExport'
import type {
  TimePeriod,
  AnalyticsFilters,
  WorkflowAnalyticsSummary,
  CompletionTrend,
  StatusDistribution,
  BottleneckStep,
  SLAMetrics,
  UserPerformance,
} from './types'

interface WorkflowAnalyticsDashboardProps {
  className?: string
}

// Mock data generator for demonstration
function generateMockData(period: TimePeriod) {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365

  // Summary
  const summary: WorkflowAnalyticsSummary = {
    totalWorkflows: Math.floor(Math.random() * 500) + 200,
    completedWorkflows: Math.floor(Math.random() * 400) + 150,
    activeWorkflows: Math.floor(Math.random() * 100) + 20,
    cancelledWorkflows: Math.floor(Math.random() * 30) + 5,
    avgCompletionTime: Math.random() * 48 + 12,
    completionRate: Math.random() * 20 + 75,
    slaComplianceRate: Math.random() * 15 + 80,
    totalTasks: Math.floor(Math.random() * 2000) + 800,
    completedTasks: Math.floor(Math.random() * 1800) + 600,
    overdueTasksRate: Math.random() * 15 + 5,
  }

  // Trends
  const trends: CompletionTrend[] = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (Math.min(days, 30) - 1 - i))
    return {
      date: date.toISOString().split('T')[0],
      completed: Math.floor(Math.random() * 20) + 5,
      started: Math.floor(Math.random() * 25) + 8,
      cancelled: Math.floor(Math.random() * 3),
    }
  })

  // Status distribution
  const statusDistribution: StatusDistribution[] = [
    { status: 'Completed', count: summary.completedWorkflows, percentage: 0, color: '#22c55e' },
    { status: 'Active', count: summary.activeWorkflows, percentage: 0, color: '#3b82f6' },
    {
      status: 'Pending',
      count: Math.floor(summary.activeWorkflows * 0.3),
      percentage: 0,
      color: '#f59e0b',
    },
    { status: 'Cancelled', count: summary.cancelledWorkflows, percentage: 0, color: '#ef4444' },
  ]
  const total = statusDistribution.reduce((sum, s) => sum + s.count, 0)
  statusDistribution.forEach((s) => {
    s.percentage = (s.count / total) * 100
  })

  // Bottlenecks
  const bottlenecks: BottleneckStep[] = [
    {
      stepId: 'step-1',
      stepName: 'Legal Review',
      workflowName: 'Contract Approval',
      avgDuration: 36,
      maxDuration: 96,
      totalTasks: 45,
      pendingTasks: 12,
      overdueRate: 28,
      bottleneckScore: 78,
    },
    {
      stepId: 'step-2',
      stepName: 'Finance Sign-off',
      workflowName: 'Invoice Processing',
      avgDuration: 24,
      maxDuration: 72,
      totalTasks: 62,
      pendingTasks: 8,
      overdueRate: 18,
      bottleneckScore: 52,
    },
    {
      stepId: 'step-3',
      stepName: 'Compliance Check',
      workflowName: 'Document Approval',
      avgDuration: 18,
      maxDuration: 48,
      totalTasks: 38,
      pendingTasks: 5,
      overdueRate: 12,
      bottleneckScore: 38,
    },
    {
      stepId: 'step-4',
      stepName: 'Manager Approval',
      workflowName: 'Expense Report',
      avgDuration: 12,
      maxDuration: 36,
      totalTasks: 85,
      pendingTasks: 3,
      overdueRate: 8,
      bottleneckScore: 25,
    },
  ]

  // SLA Metrics
  const slaMetrics: SLAMetrics[] = [
    {
      templateId: 't-1',
      templateName: 'Contract Approval',
      totalInstances: 45,
      withinSLA: 38,
      breachedSLA: 7,
      complianceRate: 84.4,
      avgResolutionTime: 28,
      targetSLA: 24,
    },
    {
      templateId: 't-2',
      templateName: 'Invoice Processing',
      totalInstances: 120,
      withinSLA: 108,
      breachedSLA: 12,
      complianceRate: 90.0,
      avgResolutionTime: 18,
      targetSLA: 24,
    },
    {
      templateId: 't-3',
      templateName: 'Document Review',
      totalInstances: 85,
      withinSLA: 82,
      breachedSLA: 3,
      complianceRate: 96.5,
      avgResolutionTime: 8,
      targetSLA: 12,
    },
    {
      templateId: 't-4',
      templateName: 'Compliance Check',
      totalInstances: 32,
      withinSLA: 24,
      breachedSLA: 8,
      complianceRate: 75.0,
      avgResolutionTime: 52,
      targetSLA: 48,
    },
  ]

  // User Performance
  const userPerformance: UserPerformance[] = [
    {
      userId: 1,
      userName: 'John Smith',
      userEmail: 'john.smith@company.com',
      department: 'Finance',
      tasksAssigned: 85,
      tasksCompleted: 82,
      tasksOverdue: 1,
      avgResponseTime: 4.2,
      completionRate: 96.5,
      slaCompliance: 97.6,
      rank: 1,
    },
    {
      userId: 2,
      userName: 'Sarah Johnson',
      userEmail: 'sarah.j@company.com',
      department: 'Legal',
      tasksAssigned: 62,
      tasksCompleted: 58,
      tasksOverdue: 2,
      avgResponseTime: 6.8,
      completionRate: 93.5,
      slaCompliance: 91.4,
      rank: 2,
    },
    {
      userId: 3,
      userName: 'Mike Williams',
      userEmail: 'mike.w@company.com',
      department: 'Compliance',
      tasksAssigned: 45,
      tasksCompleted: 40,
      tasksOverdue: 3,
      avgResponseTime: 8.5,
      completionRate: 88.9,
      slaCompliance: 86.7,
      rank: 3,
    },
    {
      userId: 4,
      userName: 'Emily Davis',
      userEmail: 'emily.d@company.com',
      department: 'Operations',
      tasksAssigned: 78,
      tasksCompleted: 68,
      tasksOverdue: 5,
      avgResponseTime: 12.3,
      completionRate: 87.2,
      slaCompliance: 82.1,
      rank: 4,
    },
    {
      userId: 5,
      userName: 'Robert Brown',
      userEmail: 'robert.b@company.com',
      department: 'Finance',
      tasksAssigned: 52,
      tasksCompleted: 44,
      tasksOverdue: 4,
      avgResponseTime: 15.6,
      completionRate: 84.6,
      slaCompliance: 78.8,
      rank: 5,
    },
  ]

  return {
    summary,
    trends,
    statusDistribution,
    bottlenecks,
    slaMetrics,
    userPerformance,
  }
}

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '12m', label: 'Last 12 Months' },
]

export default function WorkflowAnalyticsDashboard({ className }: WorkflowAnalyticsDashboardProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>({ period: '30d' })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Data state
  const [summary, setSummary] = useState<WorkflowAnalyticsSummary | null>(null)
  const [trends, setTrends] = useState<CompletionTrend[]>([])
  const [statusDistribution, setStatusDistribution] = useState<StatusDistribution[]>([])
  const [bottlenecks, setBottlenecks] = useState<BottleneckStep[]>([])
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics[]>([])
  const [userPerformance, setUserPerformance] = useState<UserPerformance[]>([])

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    try {
      // In production, this would call the actual API
      // For now, using mock data
      await new Promise((resolve) => setTimeout(resolve, 800)) // Simulate API call
      const data = generateMockData(filters.period)

      setSummary(data.summary)
      setTrends(data.trends)
      setStatusDistribution(data.statusDistribution)
      setBottlenecks(data.bottlenecks)
      setSlaMetrics(data.slaMetrics)
      setUserPerformance(data.userPerformance)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [filters.period])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchData()
  }

  const handlePeriodChange = (period: TimePeriod) => {
    setFilters((prev) => ({ ...prev, period }))
    setIsLoading(true)
  }

  if (isLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Period selector */}
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                onClick={() => handlePeriodChange(period.value)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  filters.period === period.value
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </button>

          {summary && (
            <AnalyticsExport
              summary={summary}
              trends={trends}
              bottlenecks={bottlenecks}
              slaMetrics={slaMetrics}
              userPerformance={userPerformance}
              filters={filters}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsCard
            title="Total Workflows"
            value={summary.totalWorkflows}
            subtitle={`${summary.activeWorkflows} active`}
            icon={<BarChart3 className="w-5 h-5" />}
            color="blue"
            trend={{ value: 12, isPositive: true, label: 'vs last period' }}
          />
          <AnalyticsCard
            title="Completion Rate"
            value={`${summary.completionRate.toFixed(1)}%`}
            subtitle={`${summary.completedWorkflows} completed`}
            icon={<CheckCircle className="w-5 h-5" />}
            color="green"
            trend={{ value: 5, isPositive: true, label: 'vs last period' }}
          />
          <AnalyticsCard
            title="SLA Compliance"
            value={`${summary.slaComplianceRate.toFixed(1)}%`}
            subtitle="Within target SLA"
            icon={<Clock className="w-5 h-5" />}
            color="purple"
            trend={{ value: -2, isPositive: false, label: 'vs last period' }}
          />
          <AnalyticsCard
            title="Overdue Rate"
            value={`${summary.overdueTasksRate.toFixed(1)}%`}
            subtitle={`${Math.round((summary.totalTasks * summary.overdueTasksRate) / 100)} tasks`}
            icon={<AlertTriangle className="w-5 h-5" />}
            color="red"
            trend={{ value: 3, isPositive: false, label: 'vs last period' }}
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart - takes 2 columns */}
        <div className="lg:col-span-2">
          <TrendChart data={trends} height={220} />
        </div>

        {/* Status Distribution */}
        <DonutChart
          data={statusDistribution}
          title="Workflow Status"
          centerValue={summary?.totalWorkflows || 0}
          centerLabel="Total"
        />
      </div>

      {/* Bottleneck and SLA Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BottleneckAnalysis data={bottlenecks} />
        <SLAComplianceReport
          data={slaMetrics}
          overallCompliance={summary?.slaComplianceRate || 0}
        />
      </div>

      {/* User Performance */}
      <UserPerformanceTable data={userPerformance} />
    </div>
  )
}
