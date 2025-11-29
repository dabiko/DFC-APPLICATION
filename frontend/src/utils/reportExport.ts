/**
 * Report Export Utilities
 * Functions for exporting report data to PDF, Excel, and CSV formats
 */

// ============================================================================
// Types
// ============================================================================

export interface ExportColumn {
  field: string
  label: string
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: (value: unknown) => string
}

export interface ExportData {
  columns: ExportColumn[]
  rows: Array<Record<string, unknown>>
  title?: string
  subtitle?: string
  generatedAt?: string
  filters?: Array<{ label: string; value: string }>
  summary?: Record<string, string | number>
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'donut'
  title: string
  data: Array<{ label: string; value: number; color?: string }>
}

export interface ExportOptions {
  filename: string
  title?: string
  subtitle?: string
  author?: string
  includeTimestamp?: boolean
  includeFilters?: boolean
  includeSummary?: boolean
  orientation?: 'portrait' | 'landscape'
  pageSize?: 'A4' | 'Letter' | 'Legal'
}

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Escape a value for CSV format
 */
const escapeCSVValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  const str = String(value)
  // If value contains comma, newline, or double quote, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export data to CSV format
 */
export const exportToCSV = (data: ExportData, options: ExportOptions): void => {
  const { columns, rows, title, filters, summary } = data
  const {
    filename,
    includeTimestamp = true,
    includeFilters = true,
    includeSummary = true,
  } = options

  const lines: string[] = []

  // Add title if present
  if (title) {
    lines.push(escapeCSVValue(title))
    lines.push('')
  }

  // Add generation timestamp
  if (includeTimestamp) {
    lines.push(`Generated: ${new Date().toLocaleString()}`)
    lines.push('')
  }

  // Add filters if present
  if (includeFilters && filters && filters.length > 0) {
    lines.push('Applied Filters:')
    filters.forEach((filter) => {
      lines.push(`${escapeCSVValue(filter.label)}: ${escapeCSVValue(filter.value)}`)
    })
    lines.push('')
  }

  // Add summary if present
  if (includeSummary && summary && Object.keys(summary).length > 0) {
    lines.push('Summary:')
    Object.entries(summary).forEach(([key, value]) => {
      lines.push(`${escapeCSVValue(key)}: ${escapeCSVValue(value)}`)
    })
    lines.push('')
  }

  // Add header row
  const headers = columns.map((col) => escapeCSVValue(col.label))
  lines.push(headers.join(','))

  // Add data rows
  rows.forEach((row) => {
    const values = columns.map((col) => {
      const value = row[col.field]
      if (col.format) {
        return escapeCSVValue(col.format(value))
      }
      return escapeCSVValue(value)
    })
    lines.push(values.join(','))
  })

  // Create and download the file
  const csvContent = lines.join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, `${filename}.csv`)
}

// ============================================================================
// Excel Export (using XLSX-like format with HTML tables)
// ============================================================================

/**
 * Generate Excel-compatible HTML content
 */
const generateExcelHTML = (data: ExportData, options: ExportOptions): string => {
  const { columns, rows, title, filters, summary } = data
  const { includeTimestamp = true, includeFilters = true, includeSummary = true } = options

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head>
      <meta charset="UTF-8">
      <style>
        table { border-collapse: collapse; font-family: Arial, sans-serif; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4472C4; color: white; font-weight: bold; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
        .meta { font-size: 12px; color: #888; margin-bottom: 5px; }
        .summary-label { font-weight: bold; background-color: #E2EFDA; }
        .summary-value { background-color: #E2EFDA; }
      </style>
    </head>
    <body>
  `

  // Title
  if (title) {
    html += `<div class="title">${escapeHTML(title)}</div>`
  }

  // Timestamp
  if (includeTimestamp) {
    html += `<div class="meta">Generated: ${new Date().toLocaleString()}</div>`
  }

  // Filters
  if (includeFilters && filters && filters.length > 0) {
    html += '<div class="meta">Filters: '
    html += filters.map((f) => `${escapeHTML(f.label)}: ${escapeHTML(f.value)}`).join(' | ')
    html += '</div>'
  }

  html += '<br/>'

  // Summary table
  if (includeSummary && summary && Object.keys(summary).length > 0) {
    html += '<table><tr>'
    Object.keys(summary).forEach((key) => {
      html += `<td class="summary-label">${escapeHTML(key)}</td>`
    })
    html += '</tr><tr>'
    Object.values(summary).forEach((value) => {
      html += `<td class="summary-value">${escapeHTML(String(value))}</td>`
    })
    html += '</tr></table><br/>'
  }

  // Data table
  html += '<table>'

  // Header
  html += '<tr>'
  columns.forEach((col) => {
    html += `<th>${escapeHTML(col.label)}</th>`
  })
  html += '</tr>'

  // Data rows
  rows.forEach((row) => {
    html += '<tr>'
    columns.forEach((col) => {
      const value = row[col.field]
      const displayValue = col.format ? col.format(value) : String(value ?? '')
      html += `<td>${escapeHTML(displayValue)}</td>`
    })
    html += '</tr>'
  })

  html += '</table></body></html>'

  return html
}

/**
 * Export data to Excel format (HTML-based .xls)
 */
export const exportToExcel = (data: ExportData, options: ExportOptions): void => {
  const { filename } = options
  const html = generateExcelHTML(data, options)

  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  downloadBlob(blob, `${filename}.xls`)
}

// ============================================================================
// PDF Export (using HTML and print-to-PDF approach)
// ============================================================================

/**
 * Generate PDF-ready HTML content
 */
const generatePDFHTML = (
  data: ExportData,
  options: ExportOptions,
  charts?: ChartData[]
): string => {
  const { columns, rows, title, subtitle, filters, summary } = data
  const {
    includeTimestamp = true,
    includeFilters = true,
    includeSummary = true,
    orientation = 'portrait',
    pageSize = 'A4',
  } = options

  const pageSizes: Record<string, string> = {
    A4: '210mm 297mm',
    Letter: '8.5in 11in',
    Legal: '8.5in 14in',
  }

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${escapeHTML(title || 'Report')}</title>
      <style>
        @page {
          size: ${pageSizes[pageSize]} ${orientation};
          margin: 1cm;
        }
        * {
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.5;
          color: #333;
          margin: 0;
          padding: 20px;
        }
        .header {
          border-bottom: 2px solid #2563eb;
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #1e3a5f;
          margin: 0;
        }
        .subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 5px 0 0 0;
        }
        .meta {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 10px;
        }
        .filters {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 20px;
        }
        .filters-title {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .filter-item {
          display: inline-block;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          padding: 4px 8px;
          margin: 2px 4px 2px 0;
          font-size: 11px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin-bottom: 25px;
        }
        .summary-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 15px;
          text-align: center;
        }
        .summary-value {
          font-size: 24px;
          font-weight: 700;
          color: #0369a1;
        }
        .summary-label {
          font-size: 11px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }
        th {
          background: #1e40af;
          color: white;
          font-weight: 600;
          text-align: left;
          padding: 12px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        td {
          padding: 10px;
          border-bottom: 1px solid #e2e8f0;
        }
        tr:nth-child(even) {
          background: #f8fafc;
        }
        tr:hover {
          background: #f1f5f9;
        }
        .chart-container {
          margin: 20px 0;
          page-break-inside: avoid;
        }
        .chart-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e3a5f;
          margin-bottom: 10px;
        }
        .bar-chart {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bar-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bar-label {
          width: 120px;
          font-size: 11px;
          text-align: right;
        }
        .bar-track {
          flex: 1;
          height: 24px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          color: white;
          font-size: 10px;
          font-weight: 600;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #94a3b8;
          text-align: center;
        }
        @media print {
          body { padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
  `

  // Header
  html += '<div class="header">'
  if (title) {
    html += `<h1 class="title">${escapeHTML(title)}</h1>`
  }
  if (subtitle) {
    html += `<p class="subtitle">${escapeHTML(subtitle)}</p>`
  }
  if (includeTimestamp) {
    html += `<p class="meta">Generated on ${new Date().toLocaleString()}</p>`
  }
  html += '</div>'

  // Filters
  if (includeFilters && filters && filters.length > 0) {
    html += '<div class="filters">'
    html += '<div class="filters-title">Applied Filters</div>'
    filters.forEach((filter) => {
      html += `<span class="filter-item"><strong>${escapeHTML(filter.label)}:</strong> ${escapeHTML(filter.value)}</span>`
    })
    html += '</div>'
  }

  // Summary
  if (includeSummary && summary && Object.keys(summary).length > 0) {
    html += '<div class="summary-grid">'
    Object.entries(summary).forEach(([key, value]) => {
      html += `
        <div class="summary-card">
          <div class="summary-value">${escapeHTML(String(value))}</div>
          <div class="summary-label">${escapeHTML(key)}</div>
        </div>
      `
    })
    html += '</div>'
  }

  // Charts
  if (charts && charts.length > 0) {
    charts.forEach((chart) => {
      html += renderChartHTML(chart)
    })
  }

  // Data table
  if (rows.length > 0) {
    html += '<table>'
    html += '<thead><tr>'
    columns.forEach((col) => {
      html += `<th style="text-align: ${col.align || 'left'}">${escapeHTML(col.label)}</th>`
    })
    html += '</tr></thead>'
    html += '<tbody>'
    rows.forEach((row) => {
      html += '<tr>'
      columns.forEach((col) => {
        const value = row[col.field]
        const displayValue = col.format ? col.format(value) : String(value ?? '')
        html += `<td style="text-align: ${col.align || 'left'}">${escapeHTML(displayValue)}</td>`
      })
      html += '</tr>'
    })
    html += '</tbody></table>'
  }

  // Footer
  html += `
    <div class="footer">
      Digital Filing Cabinet - Compliance Center | ${new Date().getFullYear()} CCC PLC
    </div>
  `

  html += '</body></html>'

  return html
}

/**
 * Render chart as HTML for PDF
 */
const renderChartHTML = (chart: ChartData): string => {
  let html = `<div class="chart-container"><div class="chart-title">${escapeHTML(chart.title)}</div>`

  if (chart.type === 'bar') {
    const maxValue = Math.max(...chart.data.map((d) => d.value))
    html += '<div class="bar-chart">'
    chart.data.forEach((item) => {
      const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
      html += `
        <div class="bar-row">
          <div class="bar-label">${escapeHTML(item.label)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percentage}%; background: ${item.color || '#3b82f6'}">
              ${item.value.toLocaleString()}
            </div>
          </div>
        </div>
      `
    })
    html += '</div>'
  } else if (chart.type === 'pie' || chart.type === 'donut') {
    // Simple text-based representation for pie/donut charts
    const total = chart.data.reduce((sum, d) => sum + d.value, 0)
    html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">'
    chart.data.forEach((item) => {
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
      html += `
        <div style="flex: 1; min-width: 150px; padding: 10px; background: ${item.color || '#f1f5f9'}; border-radius: 6px;">
          <div style="font-weight: 600;">${escapeHTML(item.label)}</div>
          <div style="font-size: 18px; font-weight: 700;">${item.value.toLocaleString()}</div>
          <div style="font-size: 11px; color: #64748b;">${percentage}%</div>
        </div>
      `
    })
    html += '</div>'
  }

  html += '</div>'
  return html
}

/**
 * Export data to PDF format (opens in new window for print)
 */
export const exportToPDF = (
  data: ExportData,
  options: ExportOptions,
  charts?: ChartData[]
): void => {
  const html = generatePDFHTML(data, options, charts)

  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      printWindow.print()
    }
  } else {
    // Fallback: download as HTML file
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    downloadBlob(blob, `${options.filename}.html`)
  }
}

// ============================================================================
// JSON Export
// ============================================================================

/**
 * Export data to JSON format
 */
export const exportToJSON = (data: ExportData, options: ExportOptions): void => {
  const { columns, rows, title, filters, summary } = data
  const { filename, includeTimestamp = true } = options

  const exportObj = {
    metadata: {
      title,
      generatedAt: includeTimestamp ? new Date().toISOString() : undefined,
      recordCount: rows.length,
      filters: filters?.map((f) => ({ [f.label]: f.value })),
    },
    summary,
    columns: columns.map((col) => ({
      field: col.field,
      label: col.label,
    })),
    data: rows,
  }

  const jsonContent = JSON.stringify(exportObj, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  downloadBlob(blob, `${filename}.json`)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape HTML special characters
 */
const escapeHTML = (str: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return str.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

/**
 * Download a blob as a file
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Download a file from a URL
 */
export const downloadFromURL = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    downloadBlob(blob, filename)
  } catch (error) {
    console.error('Failed to download file:', error)
    throw error
  }
}

/**
 * Format bytes to human-readable size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ============================================================================
// Convenience Export Function
// ============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json'

/**
 * Export data in the specified format
 */
export const exportReport = (
  format: ExportFormat,
  data: ExportData,
  options: ExportOptions,
  charts?: ChartData[]
): void => {
  switch (format) {
    case 'pdf':
      exportToPDF(data, options, charts)
      break
    case 'excel':
      exportToExcel(data, options)
      break
    case 'csv':
      exportToCSV(data, options)
      break
    case 'json':
      exportToJSON(data, options)
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

export default {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  exportToJSON,
  exportReport,
  downloadFromURL,
  formatFileSize,
}
