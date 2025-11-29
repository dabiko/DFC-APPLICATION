/**
 * Workflow Analytics Components
 *
 * Analytics and reporting components for workflow performance monitoring.
 */

export { default as WorkflowAnalyticsDashboard } from './WorkflowAnalyticsDashboard'
export { default as AnalyticsCard } from './AnalyticsCard'
export { default as TrendChart } from './TrendChart'
export { default as DonutChart } from './DonutChart'
export { default as BottleneckAnalysis } from './BottleneckAnalysis'
export { default as SLAComplianceReport } from './SLAComplianceReport'
export { default as UserPerformanceTable } from './UserPerformanceTable'
export { default as AnalyticsExport } from './AnalyticsExport'

export type {
  TimePeriod,
  DateRange,
  WorkflowAnalyticsSummary,
  CompletionTrend,
  StatusDistribution,
  BottleneckStep,
  SLAMetrics,
  UserPerformance,
  DepartmentMetrics,
  TemplatePerformance,
  HourlyDistribution,
  WeekdayDistribution,
  AnalyticsFilters,
  AnalyticsCardProps,
  TrendChartProps,
  BarChartProps,
  DonutChartProps,
} from './types'
