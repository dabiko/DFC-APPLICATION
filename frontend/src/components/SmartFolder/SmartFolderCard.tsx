/**
 * SmartFolderCard Component
 * Displays a smart folder as a card with icon, name, criteria chips, and actions
 */

import { useState } from 'react'
import {
  FolderSearch,
  Star,
  Clock,
  Filter,
  Search,
  Bookmark,
  Tag,
  Calendar,
  Briefcase,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Shield,
  CircleDot,
  type LucideIcon,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  type SmartFolder,
  type SmartFolderCriteria,
  getSmartFolderColorClasses,
  getRelativeDateLabel,
} from '@/services/smartFolderService'
import { cn } from '@/utils/cn'

interface SmartFolderCardProps {
  folder: SmartFolder
  onEdit?: (folder: SmartFolder) => void
  onDelete?: (folder: SmartFolder) => void
  onToggleVisibility?: (folder: SmartFolder) => void
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  'folder-search': FolderSearch,
  'folder-star': Star,
  'folder-clock': Clock,
  filter: Filter,
  search: Search,
  star: Star,
  bookmark: Bookmark,
  tag: Tag,
  calendar: Calendar,
  briefcase: Briefcase,
  folder_special: FolderSearch,
}

// Friendly labels for document types
const DOC_TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Contract',
  INVOICE: 'Invoice',
  REPORT: 'Report',
  KYC_RECORD: 'KYC Record',
  STATEMENT: 'Statement',
  CORRESPONDENCE: 'Correspondence',
  POLICY_DOCUMENT: 'Policy',
  PROCEDURE_DOCUMENT: 'Procedure',
  AUDIT_REPORT: 'Audit Report',
  TAX_DOCUMENT: 'Tax Document',
  LEGAL_DOCUMENT: 'Legal Document',
}

// Friendly labels for confidentiality levels
const CONF_LABELS: Record<string, { label: string; className: string }> = {
  PUBLIC: {
    label: 'Public',
    className: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  },
  INTERNAL: {
    label: 'Internal',
    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  },
  CONFIDENTIAL: {
    label: 'Confidential',
    className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  },
  HIGHLY_CONFIDENTIAL: {
    label: 'Highly Confidential',
    className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  },
}

// Friendly labels for document states
const STATE_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

/**
 * Renders criteria as structured, labeled chip groups
 */
function CriteriaChips({ criteria }: { criteria: SmartFolderCriteria }) {
  if (!criteria) return null

  const toArray = (val: string | string[] | undefined): string[] => {
    if (!val) return []
    return Array.isArray(val) ? val : [val]
  }

  const docTypes = toArray(criteria.document_type)
  const confLevels = toArray(criteria.confidentiality_level)
  const states = toArray(criteria.state)
  const tags = toArray(criteria.tags)
  const hasNameFilter = !!criteria.name_contains
  const hasDateFilter = !!criteria.relative_date

  const hasAnyCriteria =
    hasNameFilter ||
    docTypes.length > 0 ||
    confLevels.length > 0 ||
    states.length > 0 ||
    tags.length > 0 ||
    hasDateFilter

  if (!hasAnyCriteria) {
    return <p className="text-xs text-gray-400 dark:text-gray-500 italic">No criteria defined</p>
  }

  return (
    <div className="space-y-2">
      {/* Name contains */}
      {hasNameFilter && (
        <div className="flex items-center gap-1.5">
          <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            &ldquo;{criteria.name_contains}&rdquo;
          </span>
        </div>
      )}

      {/* Document types */}
      {docTypes.length > 0 && (
        <div className="flex items-start gap-1.5">
          <FileText className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {docTypes.map((type) => (
              <span
                key={type}
                className="inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
              >
                {DOC_TYPE_LABELS[type] || type}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Confidentiality levels */}
      {confLevels.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Shield className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {confLevels.map((level) => {
              const conf = CONF_LABELS[level]
              return (
                <span
                  key={level}
                  className={cn(
                    'inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded',
                    conf?.className ||
                      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {conf?.label || level}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Document states */}
      {states.length > 0 && (
        <div className="flex items-start gap-1.5">
          <CircleDot className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {states.map((state) => (
              <span
                key={state}
                className="inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              >
                {STATE_LABELS[state] || state}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-start gap-1.5">
          <Tag className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-wrap gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex px-1.5 py-0.5 text-[11px] font-medium rounded bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Date filter */}
      {hasDateFilter && (
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {getRelativeDateLabel(criteria.relative_date!)}
          </span>
        </div>
      )}
    </div>
  )
}

export function SmartFolderCard({
  folder,
  onEdit,
  onDelete,
  onToggleVisibility,
}: SmartFolderCardProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  // Get icon component
  const IconComponent = ICON_MAP[folder.icon] || FolderSearch

  // Get color classes
  const colorClasses = getSmartFolderColorClasses(folder.color)

  // Handle card click - navigate to results page
  const handleClick = () => {
    navigate(`/smart-folder/${folder.id}`)
  }

  // Handle edit
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onEdit?.(folder)
  }

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onDelete?.(folder)
  }

  // Handle toggle visibility
  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(false)
    onToggleVisibility?.(folder)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group relative flex flex-col"
    >
      {/* Header with icon and menu */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            colorClasses.bg
          )}
        >
          <IconComponent className={cn('w-5 h-5', colorClasses.text)} />
        </div>

        {/* Menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
          >
            <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-20">
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={handleToggleVisibility}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {folder.is_visible ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      Hide from sidebar
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      Show in sidebar
                    </>
                  )}
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
        {folder.name}
      </h3>

      {/* Description */}
      {folder.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
          {folder.description}
        </p>
      )}

      {/* Criteria chips */}
      <div className="mb-4 flex-1">
        <CriteriaChips criteria={folder.criteria} />
      </div>

      {/* Footer with document count and badges */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {folder.document_count}
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            {folder.document_count === 1 ? 'document' : 'documents'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Visibility badge */}
          {!folder.is_visible && (
            <span className="px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
              Hidden
            </span>
          )}

          {/* Scope badges */}
          {folder.is_global && (
            <span className="px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded">
              Global
            </span>
          )}
          {!folder.is_personal && !folder.is_global && (
            <span className="px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              Department
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
