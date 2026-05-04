/**
 * QuickActions Component
 *
 * Provides one-click shortcuts to primary dashboard actions.
 */

import { useNavigate } from 'react-router-dom'
import { Upload, FolderPlus, GitBranch, ClipboardList, GraduationCap, Search } from 'lucide-react'

interface QuickActionsProps {
  onUploadDocument?: () => void
  onCreateFolder?: () => void
}

export function QuickActions({ onUploadDocument, onCreateFolder }: QuickActionsProps = {}) {
  const navigate = useNavigate()

  const actions = [
    {
      label: 'Upload Document',
      icon: Upload,
      onClick: () => (onUploadDocument ? onUploadDocument() : navigate('/dashboard')),
      color:
        'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50',
    },
    {
      label: 'New Folder',
      icon: FolderPlus,
      onClick: () => (onCreateFolder ? onCreateFolder() : navigate('/dashboard')),
      color:
        'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50',
    },
    {
      label: 'Start Workflow',
      icon: GitBranch,
      onClick: () => navigate('/workflows'),
      color:
        'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50',
    },
    {
      label: 'Browse Procedures',
      icon: ClipboardList,
      onClick: () => navigate('/procedures'),
      color:
        'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50',
    },
    {
      label: 'My Training',
      icon: GraduationCap,
      onClick: () => navigate('/my-training'),
      color:
        'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50',
    },
    {
      label: 'Search',
      icon: Search,
      onClick: () => navigate('/smart-folders'),
      color:
        'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
    },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${action.color}`}
        >
          <action.icon className="w-5 h-5" />
          <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
        </button>
      ))}
    </div>
  )
}
