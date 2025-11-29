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
type ReportType =
  | 'compliance_summary'
  | 'control_status'
  | 'finding_analysis'
  | 'risk_assessment'
  | 'audit_trail'
  | 'policy_acknowledgment'
  | 'dsar_status'
  | 'custom'
type DataSource =
  | 'regulations'
  | 'controls'
  | 'findings'
  | 'assessments'
  | 'documents'
  | 'policies'
  | 'dsar'
  | 'audit_logs'
  | 'users'
type ChartType = 'bar' | 'line' | 'pie' | 'donut' | 'table' | 'metric' | 'heatmap'
type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json'
type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'in'

interface ReportFilter {
  id: string
  field: string
  operator: FilterOperator
  value: string | string[] | number | [number, number]
}

interface ReportColumn {
  id: string
  field: string
  label: string
  visible: boolean
  sortable: boolean
  width?: number
}

interface ReportVisualization {
  id: string
  type: ChartType
  title: string
  dataField: string
  groupBy?: string
  aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
}

interface ReportConfig {
  id: string
  name: string
  description: string
  type: ReportType
  dataSources: DataSource[]
  filters: ReportFilter[]
  columns: ReportColumn[]
  visualizations: ReportVisualization[]
  groupBy?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateRange?: {
    start: string
    end: string
  }
}

interface SavedReport {
  id: string
  name: string
  description: string
  config: ReportConfig
  created_by: string
  created_at: string
  updated_at: string
  is_template: boolean
  is_favorite: boolean
}

// Mock saved reports
const mockSavedReports: SavedReport[] = [
  {
    id: '1',
    name: 'Monthly Compliance Summary',
    description: 'Overview of compliance status across all frameworks',
    config: {
      id: 'c1',
      name: 'Monthly Compliance Summary',
      description: 'Overview of compliance status',
      type: 'compliance_summary',
      dataSources: ['regulations', 'controls', 'findings'],
      filters: [],
      columns: [],
      visualizations: [
        {
          id: 'v1',
          type: 'donut',
          title: 'Compliance by Framework',
          dataField: 'framework',
          aggregation: 'count',
        },
        {
          id: 'v2',
          type: 'bar',
          title: 'Control Status',
          dataField: 'status',
          aggregation: 'count',
        },
      ],
    },
    created_by: 'Admin User',
    created_at: '2024-10-01T10:00:00Z',
    updated_at: '2024-10-15T14:30:00Z',
    is_template: false,
    is_favorite: true,
  },
  {
    id: '2',
    name: 'Open Findings Report',
    description: 'All open findings with severity analysis',
    config: {
      id: 'c2',
      name: 'Open Findings Report',
      description: 'Open findings analysis',
      type: 'finding_analysis',
      dataSources: ['findings'],
      filters: [{ id: 'f1', field: 'status', operator: 'equals', value: 'open' }],
      columns: [],
      visualizations: [],
    },
    created_by: 'Compliance Officer',
    created_at: '2024-09-15T09:00:00Z',
    updated_at: '2024-10-20T11:00:00Z',
    is_template: false,
    is_favorite: true,
  },
  {
    id: '3',
    name: 'Quarterly Risk Assessment',
    description: 'Risk assessment summary for executive review',
    config: {
      id: 'c3',
      name: 'Quarterly Risk Assessment',
      description: 'Risk assessment summary',
      type: 'risk_assessment',
      dataSources: ['controls', 'findings', 'assessments'],
      filters: [],
      columns: [],
      visualizations: [],
    },
    created_by: 'Risk Manager',
    created_at: '2024-08-01T08:00:00Z',
    updated_at: '2024-10-01T16:00:00Z',
    is_template: true,
    is_favorite: false,
  },
]

// Available fields per data source
const dataSourceFields: Record<
  DataSource,
  { field: string; label: string; type: 'string' | 'number' | 'date' | 'boolean' }[]
> = {
  regulations: [
    { field: 'name', label: 'Regulation Name', type: 'string' },
    { field: 'framework', label: 'Framework', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'compliance_score', label: 'Compliance Score', type: 'number' },
    { field: 'effective_date', label: 'Effective Date', type: 'date' },
  ],
  controls: [
    { field: 'control_id', label: 'Control ID', type: 'string' },
    { field: 'name', label: 'Control Name', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'owner', label: 'Owner', type: 'string' },
    { field: 'last_tested', label: 'Last Tested', type: 'date' },
    { field: 'effectiveness', label: 'Effectiveness', type: 'number' },
  ],
  findings: [
    { field: 'finding_id', label: 'Finding ID', type: 'string' },
    { field: 'title', label: 'Title', type: 'string' },
    { field: 'severity', label: 'Severity', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'due_date', label: 'Due Date', type: 'date' },
    { field: 'assigned_to', label: 'Assigned To', type: 'string' },
  ],
  assessments: [
    { field: 'assessment_id', label: 'Assessment ID', type: 'string' },
    { field: 'name', label: 'Assessment Name', type: 'string' },
    { field: 'type', label: 'Type', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'score', label: 'Score', type: 'number' },
    { field: 'completed_date', label: 'Completed Date', type: 'date' },
  ],
  documents: [
    { field: 'document_id', label: 'Document ID', type: 'string' },
    { field: 'title', label: 'Title', type: 'string' },
    { field: 'type', label: 'Document Type', type: 'string' },
    { field: 'confidentiality', label: 'Confidentiality', type: 'string' },
    { field: 'retention_status', label: 'Retention Status', type: 'string' },
    { field: 'created_date', label: 'Created Date', type: 'date' },
  ],
  policies: [
    { field: 'policy_id', label: 'Policy ID', type: 'string' },
    { field: 'title', label: 'Title', type: 'string' },
    { field: 'category', label: 'Category', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'version', label: 'Version', type: 'string' },
    { field: 'acknowledgment_rate', label: 'Acknowledgment Rate', type: 'number' },
  ],
  dsar: [
    { field: 'request_id', label: 'Request ID', type: 'string' },
    { field: 'type', label: 'Request Type', type: 'string' },
    { field: 'status', label: 'Status', type: 'string' },
    { field: 'submitted_date', label: 'Submitted Date', type: 'date' },
    { field: 'due_date', label: 'Due Date', type: 'date' },
    { field: 'days_remaining', label: 'Days Remaining', type: 'number' },
  ],
  audit_logs: [
    { field: 'log_id', label: 'Log ID', type: 'string' },
    { field: 'action', label: 'Action', type: 'string' },
    { field: 'user', label: 'User', type: 'string' },
    { field: 'resource_type', label: 'Resource Type', type: 'string' },
    { field: 'timestamp', label: 'Timestamp', type: 'date' },
    { field: 'ip_address', label: 'IP Address', type: 'string' },
  ],
  users: [
    { field: 'user_id', label: 'User ID', type: 'string' },
    { field: 'name', label: 'Name', type: 'string' },
    { field: 'department', label: 'Department', type: 'string' },
    { field: 'role', label: 'Role', type: 'string' },
    { field: 'last_login', label: 'Last Login', type: 'date' },
    { field: 'training_completion', label: 'Training Completion', type: 'number' },
  ],
}

// Helper functions
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getReportTypeLabel = (type: ReportType): string => {
  const labels: Record<ReportType, string> = {
    compliance_summary: 'Compliance Summary',
    control_status: 'Control Status',
    finding_analysis: 'Finding Analysis',
    risk_assessment: 'Risk Assessment',
    audit_trail: 'Audit Trail',
    policy_acknowledgment: 'Policy Acknowledgment',
    dsar_status: 'DSAR Status',
    custom: 'Custom Report',
  }
  return labels[type]
}

const getDataSourceLabel = (source: DataSource): string => {
  const labels: Record<DataSource, string> = {
    regulations: 'Regulations',
    controls: 'Controls',
    findings: 'Findings',
    assessments: 'Assessments',
    documents: 'Documents',
    policies: 'Policies',
    dsar: 'DSAR Requests',
    audit_logs: 'Audit Logs',
    users: 'Users',
  }
  return labels[source]
}

// Report Builder Component
const ReportBuilderTab: React.FC = () => {
  const [savedReports, setSavedReports] = useState<SavedReport[]>(mockSavedReports)
  const [activeView, setActiveView] = useState<'list' | 'builder' | 'preview'>('list')
  const [currentReport, setCurrentReport] = useState<ReportConfig | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)

  // Builder state
  const [reportName, setReportName] = useState('')
  const [reportDescription, setReportDescription] = useState('')
  const [reportType, setReportType] = useState<ReportType>('compliance_summary')
  const [selectedDataSources, setSelectedDataSources] = useState<DataSource[]>([])
  const [filters, setFilters] = useState<ReportFilter[]>([])
  const [selectedColumns, setSelectedColumns] = useState<ReportColumn[]>([])
  const [visualizations, setVisualizations] = useState<ReportVisualization[]>([])
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  const filteredReports = savedReports.filter((report) => {
    const matchesSearch =
      searchQuery === '' ||
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFavorites = !filterFavorites || report.is_favorite
    return matchesSearch && matchesFavorites
  })

  const handleCreateNewReport = () => {
    setReportName('')
    setReportDescription('')
    setReportType('compliance_summary')
    setSelectedDataSources([])
    setFilters([])
    setSelectedColumns([])
    setVisualizations([])
    setDateRange({ start: '', end: '' })
    setCurrentReport(null)
    setActiveView('builder')
  }

  const handleEditReport = (report: SavedReport) => {
    setReportName(report.name)
    setReportDescription(report.description)
    setReportType(report.config.type)
    setSelectedDataSources(report.config.dataSources)
    setFilters(report.config.filters)
    setSelectedColumns(report.config.columns)
    setVisualizations(report.config.visualizations)
    setDateRange(report.config.dateRange || { start: '', end: '' })
    setCurrentReport(report.config)
    setActiveView('builder')
  }

  const handleToggleFavorite = (reportId: string) => {
    setSavedReports(
      savedReports.map((r) => (r.id === reportId ? { ...r, is_favorite: !r.is_favorite } : r))
    )
  }

  const handleDeleteReport = (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
      setSavedReports(savedReports.filter((r) => r.id !== reportId))
    }
  }

  const handleAddFilter = () => {
    const availableFields = selectedDataSources.flatMap((ds) => dataSourceFields[ds])
    if (availableFields.length > 0) {
      const newFilter: ReportFilter = {
        id: `filter-${Date.now()}`,
        field: availableFields[0].field,
        operator: 'equals',
        value: '',
      }
      setFilters([...filters, newFilter])
    }
  }

  const handleRemoveFilter = (filterId: string) => {
    setFilters(filters.filter((f) => f.id !== filterId))
  }

  const handleUpdateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setFilters(filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)))
  }

  const handleAddVisualization = () => {
    const newViz: ReportVisualization = {
      id: `viz-${Date.now()}`,
      type: 'bar',
      title: 'New Chart',
      dataField: '',
      aggregation: 'count',
    }
    setVisualizations([...visualizations, newViz])
  }

  const handleRemoveVisualization = (vizId: string) => {
    setVisualizations(visualizations.filter((v) => v.id !== vizId))
  }

  const handleUpdateVisualization = (vizId: string, updates: Partial<ReportVisualization>) => {
    setVisualizations(visualizations.map((v) => (v.id === vizId ? { ...v, ...updates } : v)))
  }

  const handleSaveReport = () => {
    const newReport: SavedReport = {
      id: currentReport?.id || `report-${Date.now()}`,
      name: reportName,
      description: reportDescription,
      config: {
        id: currentReport?.id || `config-${Date.now()}`,
        name: reportName,
        description: reportDescription,
        type: reportType,
        dataSources: selectedDataSources,
        filters,
        columns: selectedColumns,
        visualizations,
        dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
      },
      created_by: 'Current User',
      created_at: currentReport
        ? savedReports.find((r) => r.id === currentReport.id)?.created_at ||
          new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_template: false,
      is_favorite: false,
    }

    if (currentReport) {
      setSavedReports(savedReports.map((r) => (r.id === currentReport.id ? newReport : r)))
    } else {
      setSavedReports([newReport, ...savedReports])
    }

    setActiveView('list')
  }

  const handleRunReport = () => {
    setActiveView('preview')
  }

  const handleExport = useCallback(
    (format: ExportFormat) => {
      // Get available fields from selected data sources
      const availableFields = selectedDataSources.flatMap((ds) => dataSourceFields[ds])

      // Generate mock data for preview (in production, this would come from API)
      const generateMockData = () => {
        const mockRows: Array<Record<string, unknown>> = []
        for (let i = 1; i <= 25; i++) {
          const row: Record<string, unknown> = {}
          availableFields.slice(0, 6).forEach((field) => {
            if (field.type === 'number') {
              row[field.field] = Math.floor(Math.random() * 100)
            } else if (field.type === 'date') {
              const date = new Date()
              date.setDate(date.getDate() - Math.floor(Math.random() * 90))
              row[field.field] = date.toISOString().split('T')[0]
            } else if (field.type === 'boolean') {
              row[field.field] = Math.random() > 0.5 ? 'Yes' : 'No'
            } else {
              row[field.field] = `Sample ${field.label} ${i}`
            }
          })
          mockRows.push(row)
        }
        return mockRows
      }

      const exportData: ExportData = {
        columns: availableFields.slice(0, 6).map((field) => ({
          field: field.field,
          label: field.label,
          align: field.type === 'number' ? ('right' as const) : ('left' as const),
        })),
        rows: generateMockData(),
        title: reportName || 'Compliance Report',
        subtitle: reportDescription || undefined,
        generatedAt: new Date().toISOString(),
        filters: filters.map((f) => ({
          label: availableFields.find((field) => field.field === f.field)?.label || f.field,
          value: `${f.operator} ${f.value}`,
        })),
        summary: {
          'Total Records': 25,
          'Data Sources': selectedDataSources.length,
          'Filters Applied': filters.length,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `${reportName || 'report'}_${new Date().toISOString().split('T')[0]}`,
        title: reportName || 'Compliance Report',
        subtitle: reportDescription,
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeFilters: filters.length > 0,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      // Generate chart data for PDF
      const chartData: ChartData[] = visualizations
        .filter((v) => v.type === 'bar' || v.type === 'pie' || v.type === 'donut')
        .map((viz) => ({
          type: viz.type as 'bar' | 'pie' | 'donut',
          title: viz.title,
          data: [
            { label: 'Compliant', value: 75, color: '#22c55e' },
            { label: 'Non-Compliant', value: 15, color: '#ef4444' },
            { label: 'In Progress', value: 10, color: '#f59e0b' },
          ],
        }))

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
        case 'json': {
          // Export as JSON for data portability
          const jsonContent = JSON.stringify(
            {
              metadata: {
                title: exportData.title,
                generatedAt: new Date().toISOString(),
                recordCount: exportData.rows.length,
              },
              filters: exportData.filters,
              summary: exportData.summary,
              data: exportData.rows,
            },
            null,
            2
          )
          const blob = new Blob([jsonContent], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${exportOptions.filename}.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)
          break
        }
      }
    },
    [reportName, reportDescription, selectedDataSources, filters, visualizations]
  )

  // Render saved reports list
  const renderReportsList = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Report Builder</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Create custom reports and analytics
          </p>
        </div>
        <button
          onClick={handleCreateNewReport}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Report
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setFilterFavorites(!filterFavorites)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            filterFavorites
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
          }`}
        >
          <svg
            className="w-4 h-4"
            fill={filterFavorites ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          Favorites
        </button>
      </div>

      {/* Reports Grid */}
      {filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {getReportTypeLabel(report.config.type)}
                    </span>
                    {report.is_template && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        Template
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    {report.name}
                  </h3>
                </div>
                <button
                  onClick={() => handleToggleFavorite(report.id)}
                  className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill={report.is_favorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                {report.description}
              </p>

              <div className="flex flex-wrap gap-1 mb-4">
                {report.config.dataSources.slice(0, 3).map((ds) => (
                  <span
                    key={ds}
                    className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                  >
                    {getDataSourceLabel(ds)}
                  </span>
                ))}
                {report.config.dataSources.length > 3 && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    +{report.config.dataSources.length - 3} more
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Updated {formatDate(report.updated_at)} by {report.created_by}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEditReport(report)}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    handleEditReport(report)
                    setTimeout(() => setActiveView('preview'), 0)
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Run
                </button>
                <button
                  onClick={() => handleDeleteReport(report.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No reports found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first custom report to get started
          </p>
          <button
            onClick={handleCreateNewReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Report
          </button>
        </div>
      )}
    </div>
  )

  // Render report builder
  const renderBuilder = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('list')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentReport ? 'Edit Report' : 'New Report'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Configure your report settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunReport}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Preview
          </button>
          <button
            onClick={handleSaveReport}
            disabled={!reportName || selectedDataSources.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Save Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Report Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  placeholder="Enter report name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  rows={2}
                  placeholder="Describe this report"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Report Type
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="compliance_summary">Compliance Summary</option>
                    <option value="control_status">Control Status</option>
                    <option value="finding_analysis">Finding Analysis</option>
                    <option value="risk_assessment">Risk Assessment</option>
                    <option value="audit_trail">Audit Trail</option>
                    <option value="policy_acknowledgment">Policy Acknowledgment</option>
                    <option value="dsar_status">DSAR Status</option>
                    <option value="custom">Custom Report</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={handleAddFilter}
                disabled={selectedDataSources.length === 0}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Add Filter
              </button>
            </div>
            {filters.length > 0 ? (
              <div className="space-y-3">
                {filters.map((filter) => (
                  <div
                    key={filter.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <select
                      value={filter.field}
                      onChange={(e) => handleUpdateFilter(filter.id, { field: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {selectedDataSources
                        .flatMap((ds) => dataSourceFields[ds])
                        .map((field) => (
                          <option key={field.field} value={field.field}>
                            {field.label}
                          </option>
                        ))}
                    </select>
                    <select
                      value={filter.operator}
                      onChange={(e) =>
                        handleUpdateFilter(filter.id, {
                          operator: e.target.value as FilterOperator,
                        })
                      }
                      className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="contains">Contains</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                    </select>
                    <input
                      type="text"
                      value={filter.value as string}
                      onChange={(e) => handleUpdateFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleRemoveFilter(filter.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No filters applied. Add filters to refine your report data.
              </p>
            )}
          </div>

          {/* Visualizations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Visualizations</h3>
              <button
                onClick={handleAddVisualization}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                + Add Chart
              </button>
            </div>
            {visualizations.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {visualizations.map((viz) => (
                  <div key={viz.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={viz.title}
                        onChange={(e) =>
                          handleUpdateVisualization(viz.id, { title: e.target.value })
                        }
                        className="text-sm font-medium bg-transparent border-none focus:outline-none text-gray-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleRemoveVisualization(viz.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={viz.type}
                        onChange={(e) =>
                          handleUpdateVisualization(viz.id, { type: e.target.value as ChartType })
                        }
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="pie">Pie Chart</option>
                        <option value="donut">Donut Chart</option>
                        <option value="table">Table</option>
                        <option value="metric">Metric</option>
                      </select>
                      <select
                        value={viz.aggregation}
                        onChange={(e) =>
                          handleUpdateVisualization(viz.id, {
                            aggregation: e.target.value as 'count' | 'sum' | 'avg',
                          })
                        }
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Average</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No visualizations added. Add charts to visualize your report data.
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Data Sources */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
              Data Sources *
            </h3>
            <div className="space-y-2">
              {(Object.keys(dataSourceFields) as DataSource[]).map((source) => (
                <label
                  key={source}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedDataSources.includes(source)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700/50 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDataSources.includes(source)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDataSources([...selectedDataSources, source])
                      } else {
                        setSelectedDataSources(selectedDataSources.filter((s) => s !== source))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {getDataSourceLabel(source)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Available Fields */}
          {selectedDataSources.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Available Fields
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {selectedDataSources.map((source) => (
                  <div key={source}>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
                      {getDataSourceLabel(source)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {dataSourceFields[source].map((field) => (
                        <span
                          key={field.field}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                        >
                          {field.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Render report preview
  const renderPreview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('builder')}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {reportName || 'Report Preview'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Preview and export your report
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            PDF
          </button>
          <button
            onClick={() => handleExport('excel')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Excel
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {/* Report Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {reportName || 'Untitled Report'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{reportDescription}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Generated: {new Date().toLocaleString()}</span>
            {dateRange.start && dateRange.end && (
              <span>
                Date Range: {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
              </span>
            )}
          </div>
        </div>

        {/* Mock Visualizations */}
        {visualizations.length > 0 ? (
          <div className="grid grid-cols-2 gap-6 mb-8">
            {visualizations.map((viz) => (
              <div
                key={viz.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  {viz.title}
                </h3>
                <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-700/50 rounded">
                  <div className="text-center text-gray-400">
                    <svg
                      className="w-12 h-12 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p className="text-sm">
                      {viz.type.charAt(0).toUpperCase() + viz.type.slice(1)} Chart
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 mb-8">
            <p className="text-gray-500 dark:text-gray-400">No visualizations configured</p>
          </div>
        )}

        {/* Mock Data Table */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Data Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  {selectedDataSources.length > 0 &&
                    dataSourceFields[selectedDataSources[0]].slice(0, 5).map((field) => (
                      <th
                        key={field.field}
                        className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400"
                      >
                        {field.label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((row) => (
                  <tr key={row} className="border-b border-gray-100 dark:border-gray-700/50">
                    {selectedDataSources.length > 0 &&
                      dataSourceFields[selectedDataSources[0]].slice(0, 5).map((field) => (
                        <td
                          key={field.field}
                          className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400"
                        >
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-24" />
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {activeView === 'list' && renderReportsList()}
      {activeView === 'builder' && renderBuilder()}
      {activeView === 'preview' && renderPreview()}
    </div>
  )
}

export default ReportBuilderTab
