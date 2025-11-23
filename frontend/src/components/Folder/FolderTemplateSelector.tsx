/**
 * FolderTemplateSelector Component
 * Select and preview folder templates
 */

import { type FC, useState } from 'react'
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import type { FolderTemplate } from '@/types/folderTemplate'
import { FOLDER_TEMPLATES, searchTemplates } from '@/data/folderTemplates'
import { TemplatePreview } from './TemplatePreview'

export interface FolderTemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: FolderTemplate) => void
  parentFolderName?: string
}

export const FolderTemplateSelector: FC<FolderTemplateSelectorProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  parentFolderName,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<FolderTemplate | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const filteredTemplates = searchQuery
    ? searchTemplates(searchQuery)
    : categoryFilter === 'all'
      ? FOLDER_TEMPLATES
      : FOLDER_TEMPLATES.filter((t) => t.category === categoryFilter)

  const handleSelectTemplate = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-selector-title"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2
              id="template-selector-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Choose Folder Template
            </h2>
            {parentFolderName && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Creating in: <span className="font-medium">{parentFolderName}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="project">Project</option>
              <option value="employee">Employee</option>
              <option value="client">Client</option>
              <option value="department">Department</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Template List */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {filteredTemplates.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No templates found
              </div>
            ) : (
              <div className="p-2">
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTemplate(template)
                    }}
                    className={`
                      w-full p-4 rounded-lg text-left transition-colors mb-2
                      ${
                        selectedTemplate?.id === template.id
                          ? 'bg-primary-100 dark:bg-primary-900/30 border-2 border-primary-500'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {template.name}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                            {template.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Preview */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedTemplate ? (
              <div>
                <div className="flex items-start gap-4 mb-6">
                  <span className="text-4xl">{selectedTemplate.icon}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Folder Structure Preview:
                  </h4>
                  <TemplatePreview structure={selectedTemplate.structure} />
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Default Confidentiality:</strong>{' '}
                    {selectedTemplate.defaultConfidentiality}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    This template will create{' '}
                    <strong>{countFolders(selectedTemplate.structure)}</strong> folders
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                Select a template to preview its structure
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSelectTemplate}
            disabled={!selectedTemplate}
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use This Template
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Count total folders in template structure
 */
function countFolders(structure: any[]): number {
  let count = 0
  for (const folder of structure) {
    count++
    if (folder.children) {
      count += countFolders(folder.children)
    }
  }
  return count
}
