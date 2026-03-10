import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { ComplianceReportGenerator } from './ComplianceReportGenerator'
import type { ComplianceReport, ComplianceReportParams } from '@/types/audit'

const meta: Meta<typeof ComplianceReportGenerator> = {
  title: 'Components/Audit/ComplianceReportGenerator',
  component: ComplianceReportGenerator,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ComplianceReportGenerator>

const mockReports: ComplianceReport[] = [
  {
    id: '1',
    reportType: 'access_report',
    generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    generatedBy: 'admin@example.com',
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
    summary: {
      totalEntries: 1250,
      byActionType: {} as any,
      byResourceType: {} as any,
      byOutcome: {} as any,
      bySeverity: {} as any,
      uniqueUsers: 45,
      uniqueResources: 230,
      timeRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    },
    entries: [],
  },
  {
    id: '2',
    reportType: 'permission_changes',
    generatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    generatedBy: 'admin@example.com',
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    dateTo: new Date().toISOString(),
    summary: {
      totalEntries: 85,
      byActionType: {} as any,
      byResourceType: {} as any,
      byOutcome: {} as any,
      bySeverity: {} as any,
      uniqueUsers: 12,
      uniqueResources: 45,
      timeRange: {
        from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
    },
    entries: [],
  },
]

/**
 * Default report generator
 */
export const Default: Story = {
  args: {
    onGenerateReport: (params) => console.log('Generate report:', params),
    onDownloadReport: (reportId, format) => console.log('Download:', reportId, format),
    recentReports: mockReports,
  },
}

/**
 * No recent reports
 */
export const NoReports: Story = {
  args: {
    onGenerateReport: (params) => console.log('Generate report:', params),
    onDownloadReport: (reportId, format) => console.log('Download:', reportId, format),
    recentReports: [],
  },
}

/**
 * Generating report
 */
export const Generating: Story = {
  args: {
    onGenerateReport: (params) => console.log('Generate report:', params),
    onDownloadReport: (reportId, format) => console.log('Download:', reportId, format),
    recentReports: mockReports,
    isGenerating: true,
  },
}

/**
 * Interactive demo
 */
export const Interactive: Story = {
  render: () => {
    const [reports, setReports] = useState<ComplianceReport[]>(mockReports)
    const [isGenerating, setIsGenerating] = useState(false)

    const handleGenerate = (params: ComplianceReportParams) => {
      setIsGenerating(true)
      console.log('Generating report with params:', params)

      setTimeout(() => {
        const newReport: ComplianceReport = {
          id: Math.random().toString(),
          reportType: params.reportType,
          generatedAt: new Date().toISOString(),
          generatedBy: 'current.user@example.com',
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          summary: {
            totalEntries: Math.floor(Math.random() * 1000) + 100,
            byActionType: {} as any,
            byResourceType: {} as any,
            byOutcome: {} as any,
            bySeverity: {} as any,
            uniqueUsers: Math.floor(Math.random() * 50) + 10,
            uniqueResources: Math.floor(Math.random() * 200) + 50,
            timeRange: {
              from: params.dateFrom,
              to: params.dateTo,
            },
          },
          entries: [],
        }
        setReports([newReport, ...reports])
        setIsGenerating(false)
        alert('Report generated successfully!')
      }, 2000)
    }

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <strong>Interactive Demo:</strong> Select a report type, date range, and generate reports.
          Download using CSV or PDF options.
        </div>

        <ComplianceReportGenerator
          onGenerateReport={handleGenerate}
          onDownloadReport={(reportId, format) =>
            alert(`Downloading report ${reportId} as ${format.toUpperCase()}`)
          }
          recentReports={reports}
          isGenerating={isGenerating}
        />
      </div>
    )
  },
}

/**
 * Dark mode
 */
export const DarkMode: Story = {
  render: () => (
    <div className="dark bg-gray-950 p-8 min-h-screen">
      <ComplianceReportGenerator
        onGenerateReport={(params) => console.log('Generate report:', params)}
        onDownloadReport={(reportId, format) => console.log('Download:', reportId, format)}
        recentReports={mockReports}
      />
    </div>
  ),
}
