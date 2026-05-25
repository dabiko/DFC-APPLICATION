import { HardDrive, FileArchive, Zap } from 'lucide-react'
import { cn } from '@utils/cn'
import type { DocumentStats } from '@/services/dashboardService'

interface Props {
  stats: DocumentStats
  /** compact = single-row summary for the Overview tab */
  compact?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

export function StorageCompressionCard({ stats, compact = false }: Props) {
  const {
    total_documents,
    total_original_size_bytes,
    total_compressed_size_bytes,
    storage_saved_bytes,
    storage_saved_percent,
  } = stats

  const hasData = total_original_size_bytes > 0
  const barWidth = hasData ? Math.min(100, Math.max(0, storage_saved_percent)) : 0

  if (compact) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
            <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Storage Compression
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Documents" value={total_documents.toLocaleString()} />
          <Stat label="Original Size" value={formatBytes(total_original_size_bytes)} />
          <Stat label="Stored Size" value={formatBytes(total_compressed_size_bytes)} />
          <Stat
            label="Space Saved"
            value={hasData ? `${storage_saved_percent}%` : '—'}
            highlight={hasData && storage_saved_percent > 0}
          />
        </div>

        {hasData && storage_saved_percent > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Compression savings</span>
              <span>{formatBytes(storage_saved_bytes)} saved</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full card for the Documents tab
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
          <FileArchive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Storage Compression Overview
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Original vs. compressed file sizes across all documents
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricBlock
          icon={<FileArchive className="w-4 h-4" />}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          label="Total Documents"
          value={total_documents.toLocaleString()}
          sub="uploaded files"
        />
        <MetricBlock
          icon={<HardDrive className="w-4 h-4" />}
          iconClass="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
          label="Original Size"
          value={formatBytes(total_original_size_bytes)}
          sub="before compression"
        />
        <MetricBlock
          icon={<HardDrive className="w-4 h-4" />}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          label="Stored Size"
          value={formatBytes(total_compressed_size_bytes)}
          sub="after compression"
        />
        <MetricBlock
          icon={<Zap className="w-4 h-4" />}
          iconClass={
            hasData && storage_saved_percent > 0
              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
          }
          label="Space Saved"
          value={hasData && storage_saved_percent > 0 ? `${storage_saved_percent}%` : '—'}
          sub={hasData ? formatBytes(storage_saved_bytes) : 'no compression yet'}
          highlight={hasData && storage_saved_percent > 0}
        />
      </div>

      {hasData ? (
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium text-gray-600 dark:text-gray-400">
            <span>Compression efficiency</span>
            <span>
              {storage_saved_percent > 0
                ? `${formatBytes(storage_saved_bytes)} saved (${storage_saved_percent}%)`
                : 'No savings yet — files may not be compressed'}
            </span>
          </div>
          <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 rounded-l-full transition-all duration-700"
              style={{ width: `${barWidth}%` }}
              title={`${storage_saved_percent}% saved`}
            />
            <div
              className="h-full bg-blue-400 rounded-r-full transition-all duration-700"
              style={{ width: `${100 - barWidth}%` }}
              title="Stored size"
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              Saved ({storage_saved_percent}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-400" />
              Stored ({(100 - storage_saved_percent).toFixed(1)}%)
            </span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
          Upload documents to see compression statistics
        </p>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string | number
  highlight?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          'text-lg font-bold mt-0.5',
          highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function MetricBlock({
  icon,
  iconClass,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode
  iconClass: string
  label: string
  value: string
  sub: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={cn('p-2 rounded-lg flex-shrink-0', iconClass)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
          {label}
        </p>
        <p
          className={cn(
            'text-xl font-bold mt-0.5',
            highlight
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-gray-900 dark:text-gray-100'
          )}
        >
          {value}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  )
}
