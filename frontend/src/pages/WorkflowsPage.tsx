/**
 * WorkflowsPage Component
 *
 * Document workflow management for approval/review processes.
 * Handles human-centric routing of documents through decision points.
 *
 * Features (planned):
 * - Document approval workflows
 * - Review cycles (sequential/parallel)
 * - Sign-off chains
 * - Escalation rules
 * - Conditional routing
 * - Task assignment with deadlines
 * - Status tracking
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GitBranch,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  ArrowRight,
  MoreVertical,
} from 'lucide-react'
import { ThreePanelLayout } from '@/components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@/components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@/components/Dashboard/DashboardSidebar'
import { cn } from '@/utils/cn'
import { authService } from '@/services/auth.service'

// Placeholder workflow templates
const WORKFLOW_TEMPLATES = [
  {
    id: '1',
    name: 'Contract Approval',
    description: 'Route contracts through Legal, Finance, and Executive approval',
    steps: 4,
    avgDuration: '3-5 days',
    category: 'Contracts',
  },
  {
    id: '2',
    name: 'Document Review',
    description: 'Standard document review with single approver',
    steps: 2,
    avgDuration: '1-2 days',
    category: 'General',
  },
  {
    id: '3',
    name: 'Compliance Sign-off',
    description: 'Multi-department compliance review and sign-off',
    steps: 5,
    avgDuration: '5-7 days',
    category: 'Compliance',
  },
  {
    id: '4',
    name: 'Invoice Approval',
    description: 'Finance approval workflow based on amount thresholds',
    steps: 3,
    avgDuration: '1-3 days',
    category: 'Finance',
  },
]

// Placeholder active workflows
const ACTIVE_WORKFLOWS = [
  {
    id: 'wf-001',
    documentName: 'Q4 Financial Report.pdf',
    workflowName: 'Document Review',
    currentStep: 'Finance Review',
    status: 'in_progress',
    assignee: 'John Smith',
    startedAt: '2024-11-25',
    dueDate: '2024-11-29',
  },
  {
    id: 'wf-002',
    documentName: 'Vendor Contract - ABC Corp.docx',
    workflowName: 'Contract Approval',
    currentStep: 'Legal Review',
    status: 'pending',
    assignee: 'Sarah Johnson',
    startedAt: '2024-11-24',
    dueDate: '2024-11-30',
  },
  {
    id: 'wf-003',
    documentName: 'Policy Update - Data Protection.pdf',
    workflowName: 'Compliance Sign-off',
    currentStep: 'Compliance Officer',
    status: 'overdue',
    assignee: 'Mike Williams',
    startedAt: '2024-11-20',
    dueDate: '2024-11-26',
  },
]

export function WorkflowsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'active' | 'templates' | 'completed'>('active')
  const [searchQuery, setSearchQuery] = useState('')

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
    is_staff: userData?.is_staff || false,
    is_superuser: userData?.is_superuser || false,
  }

  // Mock notifications
  const notifications = [
    {
      id: '1',
      title: 'Workflow awaiting approval',
      message: 'Contract Review workflow needs your action',
      time: '30m ago',
      read: false,
    },
  ]

  // Handle logout
  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      authService.clearTokens()
      navigate('/login')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_progress':
        return <Play className="w-4 h-4 text-blue-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress'
      case 'pending':
        return 'Pending'
      case 'overdue':
        return 'Overdue'
      case 'completed':
        return 'Completed'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'overdue':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const renderContent = () => (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Workflows</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage document approval and review processes
              </p>
            </div>
            <button
              onClick={() => navigate('/workflows/designer')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Workflow
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 flex items-center gap-1">
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'active'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Active Workflows
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {ACTIVE_WORKFLOWS.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'templates'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'completed'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            )}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Search and Filter Bar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workflows..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {activeTab === 'active' && (
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">12</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">In Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">5</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Review</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">2</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">48</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Completed (30d)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Workflows List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Workflow
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Current Step
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="w-12 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ACTIVE_WORKFLOWS.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {workflow.documentName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {workflow.workflowName}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {workflow.currentStep}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                            <Users className="w-3 h-3 text-gray-500" />
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {workflow.assignee}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {workflow.dueDate}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full',
                            getStatusColor(workflow.status)
                          )}
                        >
                          {getStatusIcon(workflow.status)}
                          {getStatusLabel(workflow.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WORKFLOW_TEMPLATES.map((template) => (
              <div
                key={template.id}
                onClick={() => navigate(`/workflows/designer/${template.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <GitBranch className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {template.category}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {template.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {template.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{template.steps} steps</span>
                  <span className="text-gray-500 dark:text-gray-400">~{template.avgDuration}</span>
                </div>
              </div>
            ))}

            {/* Add New Template Card */}
            <div
              onClick={() => navigate('/workflows/designer')}
              className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors min-h-[200px]"
            >
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                <Plus className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Create Template</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Design a custom workflow
              </p>
            </div>
          </div>
        )}

        {activeTab === 'completed' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Completed Workflows
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
              View history of completed document workflows. This section will show all workflows
              that have been successfully completed.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <ThreePanelLayout
      header={<DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />}
      leftPanel={<DashboardSidebar />}
      leftPanelWidth="auto"
      collapsibleLeft={false}
      centerPanel={renderContent()}
    />
  )
}

export default WorkflowsPage
