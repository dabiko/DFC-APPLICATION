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
type PermissionType = 'read' | 'write' | 'delete' | 'admin' | 'full_access'
type ResourceType = 'folder' | 'document' | 'application' | 'role' | 'system'
type AnalysisCategory =
  | 'excessive'
  | 'unused'
  | 'orphaned'
  | 'conflicting'
  | 'segregation_violation'

interface Permission {
  id: string
  user_id: string
  user_name: string
  user_email: string
  user_department: string
  resource_type: ResourceType
  resource_id: string
  resource_name: string
  resource_path?: string
  permission_type: PermissionType
  granted_by: string
  granted_at: string
  last_used?: string
  is_inherited: boolean
  is_direct: boolean
  source: 'role' | 'direct' | 'group'
}

interface PermissionIssue {
  id: string
  category: AnalysisCategory
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  affected_users: number
  affected_resources: number
  permissions: Permission[]
  recommendation: string
  auto_fixable: boolean
  created_at: string
}

interface RoleAnalysis {
  id: string
  role_name: string
  users_count: number
  permissions_count: number
  resources_accessed: number
  overlap_percentage: number
  similar_roles: string[]
  unused_permissions: number
  excessive_permissions: number
  risk_score: number
}

interface PermissionStats {
  total_permissions: number
  direct_permissions: number
  inherited_permissions: number
  unused_permissions: number
  excessive_permissions: number
  orphaned_permissions: number
  users_with_admin: number
  users_with_full_access: number
  avg_permissions_per_user: number
}

// Mock Data
const mockPermissions: Permission[] = [
  {
    id: '1',
    user_id: 'u1',
    user_name: 'John Smith',
    user_email: 'john.smith@company.com',
    user_department: 'IT',
    resource_type: 'folder',
    resource_id: 'f1',
    resource_name: 'Confidential/Finance',
    resource_path: '/Confidential/Finance',
    permission_type: 'full_access',
    granted_by: 'Admin',
    granted_at: '2024-01-15T10:00:00Z',
    last_used: '2024-10-15T08:30:00Z',
    is_inherited: false,
    is_direct: true,
    source: 'direct',
  },
  {
    id: '2',
    user_id: 'u2',
    user_name: 'Jane Doe',
    user_email: 'jane.doe@company.com',
    user_department: 'Finance',
    resource_type: 'application',
    resource_id: 'a1',
    resource_name: 'Financial System',
    permission_type: 'admin',
    granted_by: 'IT Admin',
    granted_at: '2024-02-20T14:00:00Z',
    last_used: '2024-10-14T09:15:00Z',
    is_inherited: false,
    is_direct: true,
    source: 'role',
  },
  {
    id: '3',
    user_id: 'u3',
    user_name: 'Bob Wilson',
    user_email: 'bob.wilson@company.com',
    user_department: 'HR',
    resource_type: 'folder',
    resource_id: 'f2',
    resource_name: 'Employee Records',
    resource_path: '/HR/Employee Records',
    permission_type: 'write',
    granted_by: 'HR Manager',
    granted_at: '2024-03-10T11:00:00Z',
    is_inherited: true,
    is_direct: false,
    source: 'group',
  },
  {
    id: '4',
    user_id: 'u1',
    user_name: 'John Smith',
    user_email: 'john.smith@company.com',
    user_department: 'IT',
    resource_type: 'system',
    resource_id: 's1',
    resource_name: 'Database Server',
    permission_type: 'admin',
    granted_by: 'System Admin',
    granted_at: '2024-01-05T09:00:00Z',
    last_used: '2024-10-15T07:45:00Z',
    is_inherited: false,
    is_direct: true,
    source: 'direct',
  },
]

const mockIssues: PermissionIssue[] = [
  {
    id: 'i1',
    category: 'excessive',
    severity: 'high',
    title: 'Excessive Admin Permissions',
    description:
      '12 users have admin access to systems they no longer require based on their current role',
    affected_users: 12,
    affected_resources: 8,
    permissions: [],
    recommendation:
      'Review and revoke unnecessary admin permissions. Consider implementing least privilege access.',
    auto_fixable: false,
    created_at: '2024-10-15T10:00:00Z',
  },
  {
    id: 'i2',
    category: 'unused',
    severity: 'medium',
    title: 'Unused Folder Permissions',
    description: '45 folder permissions have not been used in the last 90 days',
    affected_users: 23,
    affected_resources: 45,
    permissions: [],
    recommendation:
      'Remove unused permissions to reduce attack surface and improve security posture.',
    auto_fixable: true,
    created_at: '2024-10-15T10:00:00Z',
  },
  {
    id: 'i3',
    category: 'orphaned',
    severity: 'medium',
    title: 'Orphaned Permissions',
    description: '8 permissions exist for deactivated user accounts',
    affected_users: 8,
    affected_resources: 15,
    permissions: [],
    recommendation: 'Clean up permissions for inactive accounts to prevent unauthorized access.',
    auto_fixable: true,
    created_at: '2024-10-14T14:30:00Z',
  },
  {
    id: 'i4',
    category: 'segregation_violation',
    severity: 'critical',
    title: 'Segregation of Duties Violation',
    description: '3 users have both approval and execution permissions in the payment system',
    affected_users: 3,
    affected_resources: 2,
    permissions: [],
    recommendation: 'Immediately review and separate conflicting duties to prevent fraud risk.',
    auto_fixable: false,
    created_at: '2024-10-15T08:00:00Z',
  },
  {
    id: 'i5',
    category: 'conflicting',
    severity: 'high',
    title: 'Conflicting Role Assignments',
    description: '5 users have been assigned to roles with conflicting permission sets',
    affected_users: 5,
    affected_resources: 12,
    permissions: [],
    recommendation: 'Review role assignments and resolve conflicts by removing redundant roles.',
    auto_fixable: false,
    created_at: '2024-10-14T16:00:00Z',
  },
]

const mockRoles: RoleAnalysis[] = [
  {
    id: 'r1',
    role_name: 'System Administrator',
    users_count: 5,
    permissions_count: 156,
    resources_accessed: 89,
    overlap_percentage: 45,
    similar_roles: ['IT Admin', 'Database Admin'],
    unused_permissions: 23,
    excessive_permissions: 12,
    risk_score: 85,
  },
  {
    id: 'r2',
    role_name: 'Financial Analyst',
    users_count: 15,
    permissions_count: 45,
    resources_accessed: 32,
    overlap_percentage: 78,
    similar_roles: ['Accountant', 'Budget Manager'],
    unused_permissions: 8,
    excessive_permissions: 3,
    risk_score: 45,
  },
  {
    id: 'r3',
    role_name: 'Document Manager',
    users_count: 8,
    permissions_count: 67,
    resources_accessed: 124,
    overlap_percentage: 35,
    similar_roles: ['Records Clerk'],
    unused_permissions: 15,
    excessive_permissions: 7,
    risk_score: 55,
  },
  {
    id: 'r4',
    role_name: 'Compliance Officer',
    users_count: 3,
    permissions_count: 89,
    resources_accessed: 156,
    overlap_percentage: 25,
    similar_roles: ['Auditor'],
    unused_permissions: 5,
    excessive_permissions: 2,
    risk_score: 35,
  },
]

// Helper Functions
const getCategoryColor = (category: AnalysisCategory): string => {
  switch (category) {
    case 'excessive':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'unused':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'orphaned':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
    case 'conflicting':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'segregation_violation':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'medium':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getPermissionColor = (type: PermissionType): string => {
  switch (type) {
    case 'full_access':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'admin':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
    case 'delete':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    case 'write':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    case 'read':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  }
}

const getRiskColor = (score: number): string => {
  if (score >= 80) return 'text-red-600 dark:text-red-400'
  if (score >= 60) return 'text-orange-600 dark:text-orange-400'
  if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getCategoryLabel = (category: AnalysisCategory): string => {
  switch (category) {
    case 'excessive':
      return 'Excessive'
    case 'unused':
      return 'Unused'
    case 'orphaned':
      return 'Orphaned'
    case 'conflicting':
      return 'Conflicting'
    case 'segregation_violation':
      return 'SoD Violation'
    default:
      return category
  }
}

// Issue Card Component
const IssueCard: React.FC<{
  issue: PermissionIssue
  onReview: () => void
  onAutoFix?: () => void
}> = ({ issue, onReview, onAutoFix }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-lg ${
              issue.severity === 'critical'
                ? 'bg-red-100 dark:bg-red-900/30'
                : issue.severity === 'high'
                  ? 'bg-orange-100 dark:bg-orange-900/30'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
            }`}
          >
            <svg
              className={`w-5 h-5 ${
                issue.severity === 'critical'
                  ? 'text-red-600 dark:text-red-400'
                  : issue.severity === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{issue.title}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(issue.severity)}`}
              >
                {issue.severity}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getCategoryColor(issue.category)}`}
              >
                {getCategoryLabel(issue.category)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{issue.description}</p>

      <div className="flex items-center gap-6 mb-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Affected Users</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {issue.affected_users}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Affected Resources</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {issue.affected_resources}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Recommendation</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">{issue.recommendation}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onReview}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Review Details
        </button>
        {issue.auto_fixable && onAutoFix && (
          <button
            onClick={onAutoFix}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Auto Fix
          </button>
        )}
      </div>
    </div>
  )
}

// Role Analysis Table Component
const RoleAnalysisTable: React.FC<{ roles: RoleAnalysis[] }> = ({ roles }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Users
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Permissions
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Resources
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Unused
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Excessive
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Risk Score
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                Similar Roles
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {role.role_name}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {role.users_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {role.permissions_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {role.resources_accessed}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-sm font-medium ${
                      role.unused_permissions > 10
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {role.unused_permissions}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`text-sm font-medium ${
                      role.excessive_permissions > 5
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {role.excessive_permissions}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-sm font-bold ${getRiskColor(role.risk_score)}`}>
                    {role.risk_score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {role.similar_roles.map((similar) => (
                      <span
                        key={similar}
                        className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                      >
                        {similar}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Permission Matrix Component
const PermissionMatrix: React.FC<{ permissions: Permission[] }> = ({ permissions }) => {
  const users = [...new Set(permissions.map((p) => p.user_name))]
  const resources = [...new Set(permissions.map((p) => p.resource_name))]

  const getPermission = (user: string, resource: string): Permission | undefined => {
    return permissions.find((p) => p.user_name === user && p.resource_name === resource)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-900/50">
                User
              </th>
              {resources.map((resource) => (
                <th
                  key={resource}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {resource.length > 20 ? resource.substring(0, 20) + '...' : resource}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <tr key={user} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-gray-800">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user}</span>
                </td>
                {resources.map((resource) => {
                  const permission = getPermission(user, resource)
                  return (
                    <td key={`${user}-${resource}`} className="px-4 py-3 text-center">
                      {permission ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getPermissionColor(permission.permission_type)}`}
                        >
                          {permission.permission_type.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-300 dark:text-gray-600">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Main Component
const PermissionAnalysisTab: React.FC = () => {
  const [permissions] = useState<Permission[]>(mockPermissions)
  const [issues] = useState<PermissionIssue[]>(mockIssues)
  const [roles] = useState<RoleAnalysis[]>(mockRoles)
  const [activeView, setActiveView] = useState<'issues' | 'roles' | 'matrix'>('issues')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const filteredIssues =
    severityFilter === 'all' ? issues : issues.filter((i) => i.severity === severityFilter)

  const stats: PermissionStats = {
    total_permissions: permissions.length * 25,
    direct_permissions: permissions.filter((p) => p.is_direct).length * 10,
    inherited_permissions: permissions.filter((p) => p.is_inherited).length * 15,
    unused_permissions: 45,
    excessive_permissions: 23,
    orphaned_permissions: 8,
    users_with_admin: 12,
    users_with_full_access: 5,
    avg_permissions_per_user: 18,
  }

  const handleExport = useCallback(
    (format: 'pdf' | 'excel' | 'csv') => {
      const exportData: ExportData = {
        columns: [
          { field: 'title', label: 'Issue' },
          { field: 'category', label: 'Category' },
          { field: 'severity', label: 'Severity' },
          { field: 'affected_users', label: 'Affected Users', align: 'right' as const },
          { field: 'affected_resources', label: 'Affected Resources', align: 'right' as const },
          { field: 'recommendation', label: 'Recommendation' },
        ],
        rows: issues.map((i) => ({
          title: i.title,
          category: getCategoryLabel(i.category),
          severity: i.severity,
          affected_users: i.affected_users,
          affected_resources: i.affected_resources,
          recommendation: i.recommendation,
        })),
        title: 'Permission Analysis Report',
        generatedAt: new Date().toISOString(),
        summary: {
          'Total Issues': issues.length,
          'Critical Issues': issues.filter((i) => i.severity === 'critical').length,
          'High Issues': issues.filter((i) => i.severity === 'high').length,
          'Excessive Permissions': stats.excessive_permissions,
          'Unused Permissions': stats.unused_permissions,
        },
      }

      const exportOptions: ExportOptions = {
        filename: `Permission_Analysis_Report_${new Date().toISOString().split('T')[0]}`,
        title: 'Permission Analysis Report',
        author: 'DFC Compliance Center',
        includeTimestamp: true,
        includeSummary: true,
        orientation: 'landscape',
        pageSize: 'A4',
      }

      const chartData: ChartData[] = [
        {
          type: 'pie',
          title: 'Issues by Severity',
          data: [
            {
              label: 'Critical',
              value: issues.filter((i) => i.severity === 'critical').length,
              color: '#ef4444',
            },
            {
              label: 'High',
              value: issues.filter((i) => i.severity === 'high').length,
              color: '#f97316',
            },
            {
              label: 'Medium',
              value: issues.filter((i) => i.severity === 'medium').length,
              color: '#f59e0b',
            },
            {
              label: 'Low',
              value: issues.filter((i) => i.severity === 'low').length,
              color: '#22c55e',
            },
          ],
        },
      ]

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
    [issues, stats]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Permission Analysis
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyze permissions, detect issues, and optimize access rights
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleExport('pdf')}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Run Analysis
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Permissions</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {stats.total_permissions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Unused Permissions</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
            {stats.unused_permissions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Excessive Access</p>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
            {stats.excessive_permissions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Orphaned</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            {stats.orphaned_permissions}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Users with Admin</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {stats.users_with_admin}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Avg per User</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {stats.avg_permissions_per_user}
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        {(['issues', 'roles', 'matrix'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
              activeView === view
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {view === 'issues'
              ? 'Permission Issues'
              : view === 'roles'
                ? 'Role Analysis'
                : 'Permission Matrix'}
          </button>
        ))}
      </div>

      {/* Content based on active view */}
      {activeView === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Showing {filteredIssues.length} of {issues.length} issues
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onReview={() => {}}
                onAutoFix={issue.auto_fixable ? () => {} : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {activeView === 'roles' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Analyze role permissions, identify overlaps, and optimize role assignments
          </p>
          <RoleAnalysisTable roles={roles} />
        </div>
      )}

      {activeView === 'matrix' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View permission assignments across users and resources
          </p>
          <PermissionMatrix permissions={permissions} />
        </div>
      )}
    </div>
  )
}

export default PermissionAnalysisTab
