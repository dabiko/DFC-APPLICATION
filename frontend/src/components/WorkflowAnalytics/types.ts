/**
 * Workflow Analytics Types
 *
 * Type definitions for workflow analytics and reporting.
 */

// =============================================================================
// Time Period Types
// =============================================================================

export type TimePeriod = '7d' | '30d' | '90d' | '12m' | 'custom'

export interface DateRange {
  startDate: string
  endDate: string
}

// =============================================================================
// Analytics Data Types
// =============================================================================

export interface WorkflowAnalyticsSummary {
  totalWorkflows: number
  completedWorkflows: number
  activeWorkflows: number
  cancelledWorkflows: number
  avgCompletionTime: number // in hours
  completionRate: number // percentage
  slaComplianceRate: number // percentage
  totalTasks: number
  completedTasks: number
  overdueTasksRate: number // percentage
}

export interface CompletionTrend {
  date: string
  completed: number
  started: number
  cancelled: number
}

export interface StatusDistribution {
  status: string
  count: number
  percentage: number
  color: string
}

export interface BottleneckStep {
  stepId: string
  stepName: string
  workflowName: string
  avgDuration: number // in hours
  maxDuration: number
  totalTasks: number
  pendingTasks: number
  overdueRate: number
  bottleneckScore: number // 0-100, higher = worse
}

export interface SLAMetrics {
  templateName: string
  templateId: string
  totalInstances: number
  withinSLA: number
  breachedSLA: number
  complianceRate: number
  avgResolutionTime: number
  targetSLA: number
}

export interface UserPerformance {
  userId: number
  userName: string
  userEmail: string
  department: string
  tasksAssigned: number
  tasksCompleted: number
  tasksOverdue: number
  avgResponseTime: number // in hours
  completionRate: number
  slaCompliance: number
  rank?: number
}

export interface DepartmentMetrics {
  department: string
  totalWorkflows: number
  completedWorkflows: number
  avgCycleTime: number
  slaCompliance: number
  activeUsers: number
}

export interface TemplatePerformance {
  templateId: string
  templateName: string
  category: string
  timesUsed: number
  completionRate: number
  avgDuration: number
  slaCompliance: number
}

export interface HourlyDistribution {
  hour: number
  taskCount: number
}

export interface WeekdayDistribution {
  day: string
  taskCount: number
}

// =============================================================================
// Filter Types
// =============================================================================

export interface AnalyticsFilters {
  period: TimePeriod
  dateRange?: DateRange
  templateId?: string
  department?: string
  userId?: number
  status?: string
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface AnalyticsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
}

export interface TrendChartProps {
  data: CompletionTrend[]
  height?: number
  showLegend?: boolean
}

export interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>
  title: string
  horizontal?: boolean
  showValues?: boolean
}

export interface DonutChartProps {
  data: StatusDistribution[]
  title: string
  size?: number
  showLegend?: boolean
}
