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
type TemplateCategory = 'compliance' | 'risk' | 'audit' | 'privacy' | 'executive' | 'operational'
type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'on_demand'

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  frequency: ReportFrequency
  data_sources: string[]
  visualizations: string[]
  is_featured: boolean
  use_count: number
  last_generated?: string
  preview_image?: string
  created_by: string
  tags: string[]
}

// Mock templates
const mockTemplates: ReportTemplate[] = [
  {
    id: '1',
    name: 'Compliance Health Dashboard',
    description:
      'Comprehensive overview of compliance status across all regulatory frameworks with key metrics, trends, and risk indicators.',
    category: 'compliance',
    frequency: 'monthly',
    data_sources: ['regulations', 'controls', 'findings', 'assessments'],
    visualizations: [
      'Health Score Gauge',
      'Framework Compliance Chart',
      'Control Status Distribution',
      'Findings Trend',
    ],
    is_featured: true,
    use_count: 156,
    last_generated: '2024-10-28T14:00:00Z',
    created_by: 'System',
    tags: ['executive', 'overview', 'KPI'],
  },
  {
    id: '2',
    name: 'Control Effectiveness Report',
    description:
      'Detailed analysis of control effectiveness including testing results, remediation status, and compliance gaps.',
    category: 'compliance',
    frequency: 'quarterly',
    data_sources: ['controls', 'assessments'],
    visualizations: ['Control Matrix', 'Effectiveness Trend', 'Gap Analysis'],
    is_featured: true,
    use_count: 89,
    last_generated: '2024-10-15T09:00:00Z',
    created_by: 'System',
    tags: ['controls', 'testing', 'gaps'],
  },
  {
    id: '3',
    name: 'Finding Remediation Tracker',
    description:
      'Track all open findings, remediation progress, overdue items, and assigned ownership.',
    category: 'audit',
    frequency: 'weekly',
    data_sources: ['findings'],
    visualizations: [
      'Finding Status Pie',
      'Severity Distribution',
      'Aging Analysis',
      'Owner Assignment',
    ],
    is_featured: true,
    use_count: 234,
    last_generated: '2024-10-28T08:00:00Z',
    created_by: 'System',
    tags: ['findings', 'remediation', 'tracking'],
  },
  {
    id: '4',
    name: 'Risk Assessment Summary',
    description:
      'Executive-level risk assessment with heat maps, risk trends, and mitigation recommendations.',
    category: 'risk',
    frequency: 'quarterly',
    data_sources: ['controls', 'findings', 'assessments'],
    visualizations: ['Risk Heat Map', 'Risk Score Trend', 'Top Risks Table', 'Mitigation Progress'],
    is_featured: true,
    use_count: 67,
    last_generated: '2024-10-01T10:00:00Z',
    created_by: 'System',
    tags: ['risk', 'executive', 'assessment'],
  },
  {
    id: '5',
    name: 'GDPR Compliance Report',
    description:
      'GDPR-specific compliance metrics including DSAR status, consent tracking, and data processing activities.',
    category: 'privacy',
    frequency: 'monthly',
    data_sources: ['dsar', 'policies', 'audit_logs'],
    visualizations: ['DSAR Status', 'Consent Metrics', 'Processing Activities', 'Breach Summary'],
    is_featured: false,
    use_count: 45,
    last_generated: '2024-10-20T11:00:00Z',
    created_by: 'System',
    tags: ['GDPR', 'privacy', 'DSAR'],
  },
  {
    id: '6',
    name: 'Audit Trail Report',
    description:
      'Comprehensive audit log analysis with user activity, access patterns, and security events.',
    category: 'audit',
    frequency: 'daily',
    data_sources: ['audit_logs', 'users'],
    visualizations: [
      'Activity Timeline',
      'User Activity Distribution',
      'Access Patterns',
      'Security Events',
    ],
    is_featured: false,
    use_count: 178,
    last_generated: '2024-10-28T06:00:00Z',
    created_by: 'System',
    tags: ['audit', 'security', 'access'],
  },
  {
    id: '7',
    name: 'Policy Acknowledgment Status',
    description:
      'Track policy acknowledgment completion rates, pending acknowledgments, and compliance by department.',
    category: 'operational',
    frequency: 'weekly',
    data_sources: ['policies', 'users'],
    visualizations: [
      'Acknowledgment Progress',
      'Department Compliance',
      'Pending List',
      'Trend Analysis',
    ],
    is_featured: false,
    use_count: 92,
    last_generated: '2024-10-27T09:00:00Z',
    created_by: 'System',
    tags: ['policies', 'acknowledgment', 'training'],
  },
  {
    id: '8',
    name: 'Executive Compliance Summary',
    description:
      'Board-ready compliance summary with high-level KPIs, risk indicators, and strategic recommendations.',
    category: 'executive',
    frequency: 'quarterly',
    data_sources: ['regulations', 'controls', 'findings', 'assessments'],
    visualizations: ['Executive Scorecard', 'Key Metrics', 'Risk Indicators', 'Action Items'],
    is_featured: true,
    use_count: 34,
    last_generated: '2024-10-01T08:00:00Z',
    created_by: 'System',
    tags: ['executive', 'board', 'summary'],
  },
  {
    id: '9',
    name: 'Document Retention Compliance',
    description:
      'Monitor document retention policy compliance, expiring documents, and retention violations.',
    category: 'operational',
    frequency: 'monthly',
    data_sources: ['documents'],
    visualizations: [
      'Retention Status',
      'Expiring Documents',
      'Violations',
      'Category Distribution',
    ],
    is_featured: false,
    use_count: 56,
    last_generated: '2024-10-25T10:00:00Z',
    created_by: 'System',
    tags: ['documents', 'retention', 'compliance'],
  },
  {
    id: '10',
    name: 'KYC/AML Compliance Dashboard',
    description:
      'Monitor KYC and AML compliance metrics, customer due diligence status, and regulatory requirements.',
    category: 'compliance',
    frequency: 'weekly',
    data_sources: ['regulations', 'controls', 'documents'],
    visualizations: [
      'CDD Status',
      'Risk Classification',
      'Screening Results',
      'Compliance Timeline',
    ],
    is_featured: false,
    use_count: 78,
    last_generated: '2024-10-26T07:00:00Z',
    created_by: 'System',
    tags: ['KYC', 'AML', 'due diligence'],
  },
]

// Helper functions
const getCategoryColor = (category: TemplateCategory): string => {
  const colors: Record<TemplateCategory, string> = {
    compliance: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    risk: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    audit: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    privacy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    executive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    operational: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[category]
}

const getCategoryLabel = (category: TemplateCategory): string => {
  const labels: Record<TemplateCategory, string> = {
    compliance: 'Compliance',
    risk: 'Risk',
    audit: 'Audit',
    privacy: 'Privacy',
    executive: 'Executive',
    operational: 'Operational',
  }
  return labels[category]
}

const getFrequencyLabel = (frequency: ReportFrequency): string => {
  const labels: Record<ReportFrequency, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    annually: 'Annually',
    on_demand: 'On Demand',
  }
  return labels[frequency]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Template Card Component
const TemplateCard: React.FC<{
  template: ReportTemplate
  onUse: () => void
  onPreview: () => void
  onSchedule: () => void
}> = ({ template, onUse, onPreview, onSchedule }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}
            >
              {getCategoryLabel(template.category)}
            </span>
            {template.is_featured && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                Featured
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{template.name}</h3>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* Visualizations Preview */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Includes:</p>
        <div className="flex flex-wrap gap-1">
          {template.visualizations.slice(0, 3).map((viz, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {viz}
            </span>
          ))}
          {template.visualizations.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              +{template.visualizations.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {getFrequencyLabel(template.frequency)}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {template.use_count} uses
        </span>
        {template.last_generated && <span>Last: {formatDate(template.last_generated)}</span>}
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-4">
        {template.tags.slice(0, 4).map((tag, idx) => (
          <span key={idx} className="px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
            #{tag}
          </span>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Preview
        </button>
        <button
          onClick={onSchedule}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Schedule
        </button>
        <button
          onClick={onUse}
          className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate
        </button>
      </div>
    </div>
  )
}

// Template Preview Modal
const TemplatePreviewModal: React.FC<{
  template: ReportTemplate
  onClose: () => void
  onGenerate: (format: 'pdf' | 'excel' | 'csv') => void
}> = ({ template, onClose, onGenerate }) => {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'excel' | 'csv'>('pdf')
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="relative inline-block w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all my-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}
                  >
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {template.name}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
            <p className="text-gray-600 dark:text-gray-400 mb-6">{template.description}</p>

            {/* Sample Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Sample Preview
              </h3>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                <div className="grid grid-cols-2 gap-4">
                  {template.visualizations.slice(0, 4).map((viz, idx) => (
                    <div
                      key={idx}
                      className="h-32 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 flex items-center justify-center"
                    >
                      <div className="text-center text-gray-400">
                        <svg
                          className="w-8 h-8 mx-auto mb-1"
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
                        <p className="text-xs">{viz}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Data Sources
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.data_sources.map((ds, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                    >
                      {ds.charAt(0).toUpperCase() + ds.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Visualizations
                </h3>
                <ul className="space-y-1">
                  {template.visualizations.map((viz, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                    >
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
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {viz}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Report Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  This template is typically generated {template.frequency} and has been used{' '}
                  {template.use_count} times.
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Export as:</span>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'excel' | 'csv')}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => onGenerate(selectedFormat)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Component
const ReportTemplatesTab: React.FC = () => {
  const [templates] = useState<ReportTemplate[]>(mockTemplates)
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)

  const categories: (TemplateCategory | 'all')[] = [
    'all',
    'compliance',
    'risk',
    'audit',
    'privacy',
    'executive',
    'operational',
  ]

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch =
      searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const featuredTemplates = templates.filter((t) => t.is_featured)

  const handleUseTemplate = useCallback(
    (template: ReportTemplate, format: 'pdf' | 'excel' | 'csv' = 'pdf') => {
      // Generate mock data based on template data sources
      const generateMockData = () => {
        const mockRows: Array<Record<string, unknown>> = []
        for (let i = 1; i <= 30; i++) {
          mockRows.push({
            id: `REC-${i.toString().padStart(4, '0')}`,
            name: `Record ${i}`,
            status: ['Compliant', 'Non-Compliant', 'In Progress', 'Pending'][
              Math.floor(Math.random() * 4)
            ],
            score: Math.floor(Math.random() * 100),
            last_updated: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split('T')[0],
            owner: ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Williams'][
              Math.floor(Math.random() * 4)
            ],
          })
        }
        return mockRows
      }

      const exportData: ExportData = {
        columns: [
          { field: 'id', label: 'ID' },
          { field: 'name', label: 'Name' },
          { field: 'status', label: 'Status' },
          { field: 'score', label: 'Score', align: 'right' as const },
          { field: 'last_updated', label: 'Last Updated' },
          { field: 'owner', label: 'Owner' },
        ],
        rows: generateMockData(),
        title: template.name,
        subtitle: template.description,
        generatedAt: new Date().toISOString(),
        summary: {
          'Total Records': 30,
          Compliant: Math.floor(Math.random() * 20) + 10,
          'Non-Compliant': Math.floor(Math.random() * 5) + 2,
          Category: getCategoryLabel(template.category),
        },
      }

      const exportOptions: ExportOptions = {
        filename: `${template.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
        title: template.name,
        subtitle: template.description,
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      // Generate chart data for PDF
      const chartData: ChartData[] = template.visualizations.slice(0, 2).map((viz) => ({
        type: 'bar' as const,
        title: viz,
        data: [
          { label: 'Compliant', value: Math.floor(Math.random() * 50) + 50, color: '#22c55e' },
          { label: 'Non-Compliant', value: Math.floor(Math.random() * 20), color: '#ef4444' },
          { label: 'In Progress', value: Math.floor(Math.random() * 15) + 5, color: '#f59e0b' },
          { label: 'Pending', value: Math.floor(Math.random() * 10), color: '#6b7280' },
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
      }
    },
    []
  )

  const handlePreviewTemplate = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  const handleScheduleTemplate = (template: ReportTemplate) => {
    alert(`Schedule report: ${template.name}`)
  }

  return (
    <div className="space-y-6">
      {/* Featured Templates */}
      {selectedCategory === 'all' && searchQuery === '' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Featured Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTemplates.slice(0, 4).map((template) => (
              <div
                key={template.id}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handlePreviewTemplate(template)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(template.category)}`}
                  >
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {template.name}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {template.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'All Templates' : getCategoryLabel(category)}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
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
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUse={() => handleUseTemplate(template)}
              onPreview={() => handlePreviewTemplate(template)}
              onSchedule={() => handleScheduleTemplate(template)}
            />
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <TemplatePreviewModal
          template={selectedTemplate}
          onClose={() => {
            setShowPreviewModal(false)
            setSelectedTemplate(null)
          }}
          onGenerate={(format) => {
            handleUseTemplate(selectedTemplate, format)
            setShowPreviewModal(false)
            setSelectedTemplate(null)
          }}
        />
      )}
    </div>
  )
}

export default ReportTemplatesTab
