/**
 * EvidenceExportButton — CSV/PDF export button.
 */

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { exportEvidenceCsv } from '@/services/evidenceService'

interface EvidenceExportButtonProps {
  searchParams?: Record<string, string>
}

export function EvidenceExportButton({ searchParams }: EvidenceExportButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportEvidenceCsv(searchParams)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `training-evidence-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      // Error handling delegated to parent
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
    >
      {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export CSV
    </button>
  )
}
