import React, { useState, useCallback } from 'react'
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  type ExportData,
  type ExportOptions,
  type ChartData,
} from '../../utils/reportExport'

// Types
type TimeRange = '7d' | '30d' | '90d' | '1y' | 'ytd' | 'all'
type TrendDirection = 'up' | 'down' | 'stable'

interface KPIMetric {
  id: string
  name: string
  value: number
  unit: '%' | 'count' | 'days' | 'currency'
  trend: TrendDirection
  trendValue: number
  target?: number
  status: 'good' | 'warning' | 'critical'
}

interface FrameworkCompliance {
  id: string
  name: string
  shortName: string
  score: number
  previousScore: number
  controlsTotal: number
  controlsCompliant: number
  findingsOpen: number
  status: 'compliant' | 'at_risk' | 'non_compliant'
}

interface RiskItem {
  id: string
  title: string
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  likelihood: number
  impact: number
  score: number
  trend: TrendDirection
  owner: string
  dueDate?: string
}

interface ComplianceAlert {
  id: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  timestamp: string
  acknowledged: boolean
}

interface TrendDataPoint {
  date: string
  value: number
}

// Mock Data
const mockKPIs: KPIMetric[] = [
  {
    id: '1',
    name: 'Overall Compliance Score',
    value: 87,
    unit: '%',
    trend: 'up',
    trendValue: 3,
    target: 90,
    status: 'good',
  },
  {
    id: '2',
    name: 'Open Findings',
    value: 23,
    unit: 'count',
    trend: 'down',
    trendValue: 5,
    target: 20,
    status: 'warning',
  },
  {
    id: '3',
    name: 'Critical Risks',
    value: 3,
    unit: 'count',
    trend: 'stable',
    trendValue: 0,
    target: 0,
    status: 'critical',
  },
  {
    id: '4',
    name: 'Avg. Remediation Time',
    value: 18,
    unit: 'days',
    trend: 'down',
    trendValue: 2,
    target: 15,
    status: 'warning',
  },
  {
    id: '5',
    name: 'Control Effectiveness',
    value: 92,
    unit: '%',
    trend: 'up',
    trendValue: 1,
    target: 95,
    status: 'good',
  },
  {
    id: '6',
    name: 'Policy Acknowledgment',
    value: 94,
    unit: '%',
    trend: 'up',
    trendValue: 4,
    target: 100,
    status: 'good',
  },
]

const mockFrameworks: FrameworkCompliance[] = [
  {
    id: '1',
    name: 'Know Your Customer',
    shortName: 'KYC',
    score: 94,
    previousScore: 91,
    controlsTotal: 45,
    controlsCompliant: 42,
    findingsOpen: 3,
    status: 'compliant',
  },
  {
    id: '2',
    name: 'Anti-Money Laundering',
    shortName: 'AML',
    score: 89,
    previousScore: 88,
    controlsTotal: 52,
    controlsCompliant: 46,
    findingsOpen: 5,
    status: 'compliant',
  },
  {
    id: '3',
    name: 'General Data Protection Regulation',
    shortName: 'GDPR',
    score: 78,
    previousScore: 82,
    controlsTotal: 38,
    controlsCompliant: 30,
    findingsOpen: 8,
    status: 'at_risk',
  },
  {
    id: '4',
    name: 'Sarbanes-Oxley Act',
    shortName: 'SOX',
    score: 91,
    previousScore: 89,
    controlsTotal: 65,
    controlsCompliant: 59,
    findingsOpen: 4,
    status: 'compliant',
  },
  {
    id: '5',
    name: 'Payment Card Industry',
    shortName: 'PCI-DSS',
    score: 85,
    previousScore: 85,
    controlsTotal: 42,
    controlsCompliant: 36,
    findingsOpen: 3,
    status: 'compliant',
  },
]

const mockRisks: RiskItem[] = [
  {
    id: '1',
    title: 'Data Breach Vulnerability',
    category: 'Information Security',
    severity: 'critical',
    likelihood: 3,
    impact: 5,
    score: 15,
    trend: 'stable',
    owner: 'CISO',
    dueDate: '2024-11-15',
  },
  {
    id: '2',
    title: 'Third-Party Vendor Risk',
    category: 'Operational',
    severity: 'high',
    likelihood: 4,
    impact: 4,
    score: 16,
    trend: 'up',
    owner: 'Risk Manager',
  },
  {
    id: '3',
    title: 'Regulatory Non-Compliance',
    category: 'Compliance',
    severity: 'high',
    likelihood: 2,
    impact: 5,
    score: 10,
    trend: 'down',
    owner: 'Compliance Officer',
  },
  {
    id: '4',
    title: 'Business Continuity Gap',
    category: 'Operational',
    severity: 'medium',
    likelihood: 3,
    impact: 3,
    score: 9,
    trend: 'stable',
    owner: 'Operations Director',
  },
  {
    id: '5',
    title: 'Access Control Weakness',
    category: 'Information Security',
    severity: 'medium',
    likelihood: 3,
    impact: 4,
    score: 12,
    trend: 'down',
    owner: 'IT Security',
  },
]

const mockAlerts: ComplianceAlert[] = [
  {
    id: '1',
    title: 'GDPR Assessment Overdue',
    description: 'Annual GDPR assessment is 5 days overdue',
    severity: 'high',
    category: 'Assessment',
    timestamp: '2024-10-28T10:00:00Z',
    acknowledged: false,
  },
  {
    id: '2',
    title: 'Critical Finding Unresolved',
    description: 'Critical finding FND-2024-089 past remediation deadline',
    severity: 'critical',
    category: 'Finding',
    timestamp: '2024-10-28T09:00:00Z',
    acknowledged: false,
  },
  {
    id: '3',
    title: 'Policy Update Required',
    description: 'Information Security Policy requires annual review',
    severity: 'medium',
    category: 'Policy',
    timestamp: '2024-10-27T14:00:00Z',
    acknowledged: true,
  },
  {
    id: '4',
    title: 'Control Testing Due',
    description: '12 controls require quarterly testing this month',
    severity: 'medium',
    category: 'Control',
    timestamp: '2024-10-27T08:00:00Z',
    acknowledged: false,
  },
]

const mockTrendData: TrendDataPoint[] = [
  { date: '2024-05', value: 82 },
  { date: '2024-06', value: 84 },
  { date: '2024-07', value: 83 },
  { date: '2024-08', value: 85 },
  { date: '2024-09', value: 86 },
  { date: '2024-10', value: 87 },
]

// Helper functions
const getSeverityColor = (severity: string): string => {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[severity] || colors.medium
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    compliant: 'text-green-600 dark:text-green-400',
    at_risk: 'text-yellow-600 dark:text-yellow-400',
    non_compliant: 'text-red-600 dark:text-red-400',
    good: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    critical: 'text-red-600 dark:text-red-400',
  }
  return colors[status] || 'text-gray-600'
}

const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 dark:text-green-400'
  if (score >= 80) return 'text-blue-600 dark:text-blue-400'
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const getScoreBgColor = (score: number): string => {
  if (score >= 90) return 'bg-green-500'
  if (score >= 80) return 'bg-blue-500'
  if (score >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

// KPI Card Component
const KPICard: React.FC<{ kpi: KPIMetric }> = ({ kpi }) => {
  const formatValue = (value: number, unit: string): string => {
    if (unit === '%') return `${value}%`
    if (unit === 'days') return `${value} days`
    if (unit === 'currency') return `$${value.toLocaleString()}`
    return value.toLocaleString()
  }

  const TrendIcon = () => {
    if (kpi.trend === 'up') {
      return (
        <svg
          className={`w-4 h-4 ${kpi.status === 'good' ? 'text-green-500' : 'text-red-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      )
    }
    if (kpi.trend === 'down') {
      return (
        <svg
          className={`w-4 h-4 ${kpi.name.includes('Finding') || kpi.name.includes('Risk') || kpi.name.includes('Time') ? 'text-green-500' : 'text-red-500'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{kpi.name}</p>
        <div
          className={`w-2 h-2 rounded-full ${
            kpi.status === 'good'
              ? 'bg-green-500'
              : kpi.status === 'warning'
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
        />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className={`text-3xl font-bold ${getStatusColor(kpi.status)}`}>
            {formatValue(kpi.value, kpi.unit)}
          </p>
          {kpi.target && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Target: {formatValue(kpi.target, kpi.unit)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <TrendIcon />
          <span className="text-gray-600 dark:text-gray-400">
            {kpi.trendValue > 0 ? '+' : ''}
            {kpi.trendValue}
            {kpi.unit === '%' ? 'pts' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

// Compliance Score Gauge Component
const ComplianceScoreGauge: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const circumference = 2 * Math.PI * 70
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="88"
            cy="88"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="88"
            cy="88"
            r="70"
            fill="none"
            stroke="currentColor"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={getScoreColor(score)}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        </div>
      </div>
    </div>
  )
}

// Framework Row Component
const FrameworkRow: React.FC<{ framework: FrameworkCompliance }> = ({ framework }) => {
  const change = framework.score - framework.previousScore

  return (
    <div className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
      <div className="w-16 text-center">
        <span className={`text-2xl font-bold ${getScoreColor(framework.score)}`}>
          {framework.score}
        </span>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white">{framework.shortName}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">({framework.name})</span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span>
            {framework.controlsCompliant}/{framework.controlsTotal} controls
          </span>
          <span>{framework.findingsOpen} open findings</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {change !== 0 && (
          <span className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change > 0 ? '+' : ''}
            {change}
          </span>
        )}
        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${getScoreBgColor(framework.score)}`}
            style={{ width: `${framework.score}%` }}
          />
        </div>
      </div>
    </div>
  )
}

// Risk Heat Map Component
const RiskHeatMap: React.FC<{ risks: RiskItem[] }> = ({ risks }) => {
  const getHeatMapColor = (likelihood: number, impact: number): string => {
    const score = likelihood * impact
    if (score >= 15) return 'bg-red-500'
    if (score >= 10) return 'bg-orange-500'
    if (score >= 5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getRisksInCell = (likelihood: number, impact: number) => {
    return risks.filter((r) => r.likelihood === likelihood && r.impact === impact)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Risk Heat Map</h3>
      <div className="flex">
        {/* Y-axis label */}
        <div className="flex flex-col justify-center items-center pr-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 transform -rotate-90 whitespace-nowrap">
            Likelihood
          </span>
        </div>
        <div className="flex-1">
          {/* Grid */}
          <div className="grid grid-cols-5 gap-1">
            {[5, 4, 3, 2, 1].map((likelihood) =>
              [1, 2, 3, 4, 5].map((impact) => {
                const cellRisks = getRisksInCell(likelihood, impact)
                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    className={`aspect-square rounded flex items-center justify-center text-xs font-medium text-white ${getHeatMapColor(likelihood, impact)} ${
                      cellRisks.length > 0 ? 'ring-2 ring-white dark:ring-gray-800' : 'opacity-50'
                    }`}
                    title={cellRisks.length > 0 ? cellRisks.map((r) => r.title).join(', ') : ''}
                  >
                    {cellRisks.length > 0 && cellRisks.length}
                  </div>
                )
              })
            )}
          </div>
          {/* X-axis label */}
          <div className="text-center mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Impact</span>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-gray-500 dark:text-gray-400">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500" />
          <span className="text-gray-500 dark:text-gray-400">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span className="text-gray-500 dark:text-gray-400">High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-500 dark:text-gray-400">Critical</span>
        </div>
      </div>
    </div>
  )
}

// Trend Chart Component
const TrendChart: React.FC<{ data: TrendDataPoint[]; title: string }> = ({ data, title }) => {
  const maxValue = Math.max(...data.map((d) => d.value))
  const minValue = Math.min(...data.map((d) => d.value))
  const range = maxValue - minValue || 1

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="h-40 flex items-end gap-2">
        {data.map((point, idx) => {
          const height = ((point.value - minValue) / range) * 100
          return (
            <div key={point.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t transition-all ${getScoreBgColor(point.value)}`}
                style={{ height: `${Math.max(height, 10)}%` }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {point.date.split('-')[1]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Alert Item Component
const AlertItem: React.FC<{
  alert: ComplianceAlert
  onAcknowledge: () => void
}> = ({ alert, onAcknowledge }) => {
  return (
    <div
      className={`p-3 rounded-lg border ${
        alert.acknowledged
          ? 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-1.5 rounded ${
            alert.severity === 'critical'
              ? 'bg-red-100 dark:bg-red-900/30'
              : alert.severity === 'high'
                ? 'bg-orange-100 dark:bg-orange-900/30'
                : 'bg-yellow-100 dark:bg-yellow-900/30'
          }`}
        >
          <svg
            className={`w-4 h-4 ${
              alert.severity === 'critical'
                ? 'text-red-600 dark:text-red-400'
                : alert.severity === 'high'
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-yellow-600 dark:text-yellow-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}
            >
              {alert.severity.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{alert.category}</span>
          </div>
          <p
            className={`text-sm font-medium ${alert.acknowledged ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}
          >
            {alert.title}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{alert.description}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {formatTimeAgo(alert.timestamp)}
          </p>
        </div>
        {!alert.acknowledged && (
          <button
            onClick={onAcknowledge}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Acknowledge"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

// Main Component
const ExecutiveDashboardTab: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d')
  const [kpis] = useState<KPIMetric[]>(mockKPIs)
  const [frameworks] = useState<FrameworkCompliance[]>(mockFrameworks)
  const [risks] = useState<RiskItem[]>(mockRisks)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>(mockAlerts)
  const [trendData] = useState<TrendDataPoint[]>(mockTrendData)

  const overallScore = Math.round(
    frameworks.reduce((acc, f) => acc + f.score, 0) / frameworks.length
  )
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length

  const handleAcknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)))
  }

  const handleExportDashboard = useCallback(
    (format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
      // Prepare KPI metrics data
      const kpiRows = mockKPIs.map((kpi) => ({
        name: kpi.name,
        value: kpi.value,
        unit: kpi.unit === '%' ? '%' : kpi.unit,
        trend: kpi.trend === 'up' ? 'Improving' : kpi.trend === 'down' ? 'Declining' : 'Stable',
        trend_value: `${kpi.trendValue > 0 ? '+' : ''}${kpi.trendValue}${kpi.unit}`,
        target: kpi.target || '-',
        status: kpi.status.charAt(0).toUpperCase() + kpi.status.slice(1),
      }))

      // Prepare framework compliance data
      const frameworkRows = mockFrameworks.map((fw) => ({
        framework: fw.name,
        score: `${fw.score}%`,
        previous: `${fw.previousScore}%`,
        change: `${fw.score - fw.previousScore > 0 ? '+' : ''}${fw.score - fw.previousScore}%`,
        controls_compliant: `${fw.controlsCompliant}/${fw.controlsTotal}`,
        findings_open: fw.findingsOpen,
        status: fw.status
          .replace('_', ' ')
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      }))

      // Prepare top risks data
      const risksRows = mockRisks.map((risk) => ({
        title: risk.title,
        category: risk.category,
        severity: risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1),
        risk_score: risk.score.toFixed(1),
        trend: risk.trend === 'up' ? 'Increasing' : risk.trend === 'down' ? 'Decreasing' : 'Stable',
        owner: risk.owner,
        due_date: risk.dueDate ? new Date(risk.dueDate).toLocaleDateString() : '-',
      }))

      // Combined export data
      const exportData: ExportData = {
        columns: [
          { field: 'metric', label: 'Metric' },
          { field: 'value', label: 'Value' },
          { field: 'status', label: 'Status' },
          { field: 'trend', label: 'Trend' },
        ],
        rows: [
          // KPIs section
          { metric: '--- KEY PERFORMANCE INDICATORS ---', value: '', status: '', trend: '' },
          ...kpiRows.map((kpi) => ({
            metric: kpi.name,
            value: `${kpi.value}${kpi.unit === '%' ? '%' : ` ${kpi.unit}`}`,
            status: kpi.status,
            trend: kpi.trend,
          })),
          // Frameworks section
          { metric: '', value: '', status: '', trend: '' },
          { metric: '--- FRAMEWORK COMPLIANCE ---', value: '', status: '', trend: '' },
          ...frameworkRows.map((fw) => ({
            metric: fw.framework,
            value: fw.score,
            status: fw.status,
            trend: fw.change,
          })),
          // Top Risks section
          { metric: '', value: '', status: '', trend: '' },
          { metric: '--- TOP RISKS ---', value: '', status: '', trend: '' },
          ...risksRows.map((risk) => ({
            metric: risk.title,
            value: `Score: ${risk.risk_score}`,
            status: risk.severity,
            trend: risk.trend,
          })),
        ],
        title: 'Executive Compliance Dashboard',
        subtitle: `Time Range: ${timeRange.toUpperCase()}`,
        generatedAt: new Date().toISOString(),
        summary: {
          'Overall Health Score': `${mockKPIs.find((k) => k.name === 'Compliance Health Score')?.value || 0}%`,
          'Frameworks Monitored': mockFrameworks.length,
          'Open Findings': mockKPIs.find((k) => k.name === 'Open Findings')?.value || 0,
          'Top Risks': mockRisks.length,
          'Recent Alerts': mockAlerts.length,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `Executive_Dashboard_${new Date().toISOString().split('T')[0]}`,
        title: 'Executive Compliance Dashboard',
        subtitle: `Report Period: ${timeRange.toUpperCase()} | Generated by DFC Compliance Center`,
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      // Generate chart data for PDF
      const chartData: ChartData[] = [
        {
          type: 'bar' as const,
          title: 'Framework Compliance Scores',
          data: mockFrameworks.map((fw) => ({
            label: fw.shortName,
            value: fw.score,
            color:
              fw.status === 'compliant'
                ? '#22c55e'
                : fw.status === 'at_risk'
                  ? '#f59e0b'
                  : '#ef4444',
          })),
        },
        {
          type: 'pie' as const,
          title: 'Risk Distribution by Severity',
          data: [
            {
              label: 'Critical',
              value: mockRisks.filter((r) => r.severity === 'critical').length || 1,
              color: '#ef4444',
            },
            {
              label: 'High',
              value: mockRisks.filter((r) => r.severity === 'high').length || 2,
              color: '#f97316',
            },
            {
              label: 'Medium',
              value: mockRisks.filter((r) => r.severity === 'medium').length || 3,
              color: '#f59e0b',
            },
            {
              label: 'Low',
              value: mockRisks.filter((r) => r.severity === 'low').length || 1,
              color: '#22c55e',
            },
          ],
        },
      ]

      switch (format) {
        case 'csv':
          exportToCSV(exportData, exportOptions)
          break
        case 'excel':
          exportToExcel(exportData, exportOptions)
          break
        case 'pdf':
          exportToPDF(exportData, exportOptions, chartData)
          break
      }
    },
    [timeRange]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Executive Dashboard
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            High-level compliance overview for leadership
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="ytd">Year to Date</option>
          </select>
          <div className="relative inline-block">
            <div className="flex">
              <button
                onClick={() => handleExportDashboard('pdf')}
                className="px-4 py-2 bg-blue-600 text-white rounded-l-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Export
              </button>
              <div className="relative group">
                <button className="px-2 py-2 bg-blue-700 text-white rounded-r-lg hover:bg-blue-800 transition-colors border-l border-blue-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => handleExportDashboard('pdf')}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleExportDashboard('excel')}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => handleExportDashboard('csv')}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    CSV
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Row: Overall Score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Overall Compliance Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
          <ComplianceScoreGauge score={overallScore} label="Overall Score" />
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {frameworks.filter((f) => f.status === 'compliant').length}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">Compliant</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {frameworks.filter((f) => f.status === 'at_risk').length}
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400">At Risk</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {frameworks.filter((f) => f.status === 'non_compliant').length}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">Non-Compliant</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

      {/* Middle Row: Frameworks + Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Framework Compliance */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Framework Compliance
            </h3>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-2">
            {frameworks.map((framework) => (
              <FrameworkRow key={framework.id} framework={framework} />
            ))}
          </div>
        </div>

        {/* Trend Chart */}
        <TrendChart data={trendData} title="Compliance Score Trend" />
      </div>

      {/* Bottom Row: Risk Heat Map + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Heat Map */}
        <RiskHeatMap risks={risks} />

        {/* Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Compliance Alerts
              </h3>
              {unacknowledgedAlerts > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-full">
                  {unacknowledgedAlerts} new
                </span>
              )}
            </div>
            <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {alerts.map((alert) => (
              <AlertItem
                key={alert.id}
                alert={alert}
                onAcknowledge={() => handleAcknowledgeAlert(alert.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Top Risks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Top Risks</h3>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View Risk Register
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Risk
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Category
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Severity
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Score
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Trend
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Owner
                </th>
              </tr>
            </thead>
            <tbody>
              {risks
                .sort((a, b) => b.score - a.score)
                .slice(0, 5)
                .map((risk) => (
                  <tr key={risk.id} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {risk.title}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {risk.category}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(risk.severity)}`}
                      >
                        {risk.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-sm font-medium ${risk.score >= 15 ? 'text-red-600' : risk.score >= 10 ? 'text-orange-600' : 'text-yellow-600'}`}
                      >
                        {risk.score}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {risk.trend === 'up' ? (
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 10l7-7m0 0l7 7m-7-7v18"
                          />
                        </svg>
                      ) : risk.trend === 'down' ? (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 12h14"
                          />
                        </svg>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {risk.owner}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ExecutiveDashboardTab
