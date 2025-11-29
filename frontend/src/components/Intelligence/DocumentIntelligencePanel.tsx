/**
 * DocumentIntelligencePanel Component
 *
 * Displays extracted intelligence data for a document:
 * - Entities (people, organizations, dates, amounts)
 * - Tables
 * - Key-Value pairs
 * - Summary
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Brain,
  Table2,
  FileText,
  Tag,
  User,
  Building2,
  Calendar,
  DollarSign,
  Percent,
  MapPin,
  Phone,
  Mail,
  Hash,
  FileSearch,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  Star,
  AlertCircle,
} from 'lucide-react'
import {
  getDocumentIntelligence,
  processDocument,
  verifyEntity,
  rateSummary,
  type DocumentIntelligence,
  type ExtractedEntity,
  type ExtractedTable,
  type ExtractedKeyValue,
  type DocumentSummary,
  type EntityType,
  type JobStatus,
  getEntityTypeInfo,
  formatConfidence,
} from '../../services/intelligenceService'

interface DocumentIntelligencePanelProps {
  documentId: string
  documentTitle?: string
}

// Entity type icons
const ENTITY_ICONS: Record<EntityType, typeof User> = {
  PERSON: User,
  ORGANIZATION: Building2,
  DATE: Calendar,
  MONEY: DollarSign,
  PERCENTAGE: Percent,
  LOCATION: MapPin,
  PHONE: Phone,
  EMAIL: Mail,
  ACCOUNT_NUMBER: Hash,
  REFERENCE: FileSearch,
  CUSTOM: Tag,
}

export default function DocumentIntelligencePanel({
  documentId,
  documentTitle,
}: DocumentIntelligencePanelProps) {
  const [intelligence, setIntelligence] = useState<DocumentIntelligence | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'entities' | 'tables' | 'keyvalues' | 'summary'>(
    'entities'
  )
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())

  const loadIntelligence = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDocumentIntelligence(documentId)
      setIntelligence(data)
    } catch (err) {
      setError('Failed to load document intelligence')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    loadIntelligence()
  }, [loadIntelligence])

  const handleProcess = async () => {
    try {
      setProcessing(true)
      setError(null)
      await processDocument(documentId)
      // Poll for completion
      setTimeout(loadIntelligence, 2000)
    } catch (err) {
      setError('Failed to start processing')
      console.error(err)
    } finally {
      setProcessing(false)
    }
  }

  const handleVerifyEntity = async (entityId: string, correctedValue?: string) => {
    try {
      await verifyEntity(entityId, correctedValue)
      loadIntelligence()
    } catch (err) {
      console.error('Failed to verify entity:', err)
    }
  }

  const handleRateSummary = async (summaryId: string, rating: number) => {
    try {
      await rateSummary(summaryId, rating)
      loadIntelligence()
    } catch (err) {
      console.error('Failed to rate summary:', err)
    }
  }

  const toggleTable = (tableId: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableId)) {
      newExpanded.delete(tableId)
    } else {
      newExpanded.add(tableId)
    }
    setExpandedTables(newExpanded)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
        <button onClick={loadIntelligence} className="mt-2 text-sm text-red-600 hover:underline">
          Try again
        </button>
      </div>
    )
  }

  const hasData =
    intelligence &&
    (intelligence.entities.length > 0 ||
      intelligence.tables.length > 0 ||
      intelligence.key_values.length > 0 ||
      intelligence.summary)

  const isJobPending =
    intelligence?.processing_job?.status === 'PENDING' ||
    intelligence?.processing_job?.status === 'PROCESSING'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">Document Intelligence</h3>
        </div>
        <div className="flex items-center gap-2">
          {isJobPending && (
            <span className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </span>
          )}
          <button
            onClick={handleProcess}
            disabled={processing || isJobPending}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
            {hasData ? 'Reprocess' : 'Process'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <TabButton
          active={activeTab === 'entities'}
          onClick={() => setActiveTab('entities')}
          icon={Tag}
          label="Entities"
          count={intelligence?.entities.length || 0}
        />
        <TabButton
          active={activeTab === 'tables'}
          onClick={() => setActiveTab('tables')}
          icon={Table2}
          label="Tables"
          count={intelligence?.tables.length || 0}
        />
        <TabButton
          active={activeTab === 'keyvalues'}
          onClick={() => setActiveTab('keyvalues')}
          icon={FileText}
          label="Key-Values"
          count={intelligence?.key_values.length || 0}
        />
        <TabButton
          active={activeTab === 'summary'}
          onClick={() => setActiveTab('summary')}
          icon={FileSearch}
          label="Summary"
          count={intelligence?.summary ? 1 : 0}
        />
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {!hasData ? (
          <EmptyState onProcess={handleProcess} processing={processing} />
        ) : (
          <>
            {activeTab === 'entities' && (
              <EntitiesTab
                entities={intelligence?.entities || []}
                onVerify={handleVerifyEntity}
                onCopy={copyToClipboard}
              />
            )}
            {activeTab === 'tables' && (
              <TablesTab
                tables={intelligence?.tables || []}
                expanded={expandedTables}
                onToggle={toggleTable}
              />
            )}
            {activeTab === 'keyvalues' && (
              <KeyValuesTab keyValues={intelligence?.key_values || []} onCopy={copyToClipboard} />
            )}
            {activeTab === 'summary' && (
              <SummaryTab summary={intelligence?.summary || null} onRate={handleRateSummary} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Tab Button Component
// =============================================================================

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Tag
  label: string
  count: number
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${
          active
            ? 'border-purple-500 text-purple-600 dark:text-purple-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
        }
      `}
    >
      <Icon className="h-4 w-4" />
      {label}
      {count > 0 && (
        <span
          className={`
          px-1.5 py-0.5 text-xs rounded-full
          ${
            active
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }
        `}
        >
          {count}
        </span>
      )}
    </button>
  )
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ onProcess, processing }: { onProcess: () => void; processing: boolean }) {
  return (
    <div className="text-center py-8">
      <Brain className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Intelligence Data
      </h4>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Process this document to extract entities, tables, and generate a summary.
      </p>
      <button
        onClick={onProcess}
        disabled={processing}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
      >
        {processing ? 'Processing...' : 'Process Document'}
      </button>
    </div>
  )
}

// =============================================================================
// Entities Tab
// =============================================================================

function EntitiesTab({
  entities,
  onVerify,
  onCopy,
}: {
  entities: ExtractedEntity[]
  onVerify: (id: string, correctedValue?: string) => void
  onCopy: (text: string) => void
}) {
  // Group entities by type
  const grouped = entities.reduce(
    (acc, entity) => {
      if (!acc[entity.entity_type]) {
        acc[entity.entity_type] = []
      }
      acc[entity.entity_type].push(entity)
      return acc
    },
    {} as Record<EntityType, ExtractedEntity[]>
  )

  if (entities.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">No entities extracted</div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([type, items]) => {
        const Icon = ENTITY_ICONS[type as EntityType] || Tag
        const typeInfo = getEntityTypeInfo(type as EntityType)

        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-4 w-4 text-${typeInfo.color}-500`} />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {typeInfo.label} ({items.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map((entity) => (
                <EntityChip key={entity.id} entity={entity} onVerify={onVerify} onCopy={onCopy} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EntityChip({
  entity,
  onVerify,
  onCopy,
}: {
  entity: ExtractedEntity
  onVerify: (id: string) => void
  onCopy: (text: string) => void
}) {
  const typeInfo = getEntityTypeInfo(entity.entity_type)

  return (
    <div
      className={`
        group relative inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-sm
        bg-${typeInfo.color}-50 dark:bg-${typeInfo.color}-900/20
        text-${typeInfo.color}-700 dark:text-${typeInfo.color}-300
        border border-${typeInfo.color}-200 dark:border-${typeInfo.color}-800
      `}
    >
      <span>{entity.value}</span>
      <span className="text-xs opacity-60">{formatConfidence(entity.confidence_score)}</span>

      {entity.is_verified && <CheckCircle className="h-3 w-3 text-green-500" />}

      {/* Action buttons (shown on hover) */}
      <div className="hidden group-hover:flex items-center gap-1 ml-1">
        <button
          onClick={() => onCopy(entity.value)}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          title="Copy"
        >
          <Copy className="h-3 w-3" />
        </button>
        {!entity.is_verified && (
          <button
            onClick={() => onVerify(entity.id)}
            className="p-0.5 hover:bg-green-200 dark:hover:bg-green-900/30 rounded"
            title="Verify"
          >
            <CheckCircle className="h-3 w-3 text-green-500" />
          </button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Tables Tab
// =============================================================================

function TablesTab({
  tables,
  expanded,
  onToggle,
}: {
  tables: ExtractedTable[]
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">No tables extracted</div>
    )
  }

  return (
    <div className="space-y-3">
      {tables.map((table) => {
        const isExpanded = expanded.has(table.id)

        return (
          <div
            key={table.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => onToggle(table.id)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <Table2 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {table.title || `Table ${table.table_number}`}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {table.row_count} rows × {table.column_count} cols
              </span>
            </button>

            {isExpanded && (
              <div className="p-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      {table.headers.map((header, i) => (
                        <th
                          key={i}
                          className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2 py-1 text-gray-600 dark:text-gray-400">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {table.rows.length > 10 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Showing 10 of {table.rows.length} rows
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Key-Values Tab
// =============================================================================

function KeyValuesTab({
  keyValues,
  onCopy,
}: {
  keyValues: ExtractedKeyValue[]
  onCopy: (text: string) => void
}) {
  if (keyValues.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        No key-value pairs extracted
      </div>
    )
  }

  // Group by group_name
  const grouped = keyValues.reduce(
    (acc, kv) => {
      const group = kv.group_name || 'Other'
      if (!acc[group]) {
        acc[group] = []
      }
      acc[group].push(kv)
      return acc
    },
    {} as Record<string, ExtractedKeyValue[]>
  )

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([group, items]) => (
        <div key={group}>
          {group !== 'Other' && (
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{group}</h4>
          )}
          <div className="grid grid-cols-2 gap-2">
            {items.map((kv) => (
              <div
                key={kv.id}
                className="flex justify-between items-start p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
              >
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{kv.key}</span>
                  <p className="text-sm text-gray-900 dark:text-white">{kv.value}</p>
                </div>
                <button
                  onClick={() => onCopy(kv.value)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <Copy className="h-3 w-3 text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Summary Tab
// =============================================================================

function SummaryTab({
  summary,
  onRate,
}: {
  summary: DocumentSummary | null
  onRate: (id: string, rating: number) => void
}) {
  if (!summary) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">No summary generated</div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary text */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Summary</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
          {summary.summary_text}
        </p>
      </div>

      {/* Key points */}
      {summary.key_points.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Key Points</h4>
          <ul className="space-y-1">
            {summary.key_points.map((point, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400"
              >
                <span className="text-purple-500">•</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Topics */}
      {summary.topics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Topics</h4>
          <div className="flex flex-wrap gap-2">
            {summary.topics.map((topic, i) => (
              <span
                key={i}
                className="px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment */}
      <div className="flex items-center gap-4">
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Sentiment</span>
          <p
            className={`text-sm font-medium ${
              summary.sentiment === 'positive'
                ? 'text-green-600'
                : summary.sentiment === 'negative'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Words</span>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{summary.word_count}</p>
        </div>
      </div>

      {/* Rating */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 block mb-1">
          Rate this summary
        </span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              onClick={() => onRate(summary.id, rating)}
              className={`p-1 rounded ${
                summary.user_rating && summary.user_rating >= rating
                  ? 'text-yellow-500'
                  : 'text-gray-300 hover:text-yellow-400'
              }`}
            >
              <Star className="h-5 w-5 fill-current" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
