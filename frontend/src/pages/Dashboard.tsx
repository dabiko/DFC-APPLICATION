import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ThreePanelLayout } from '@components/Layout/ThreePanelLayout'
import { DashboardHeader } from '@components/Dashboard/DashboardHeader'
import { DashboardSidebar } from '@components/Dashboard/DashboardSidebar'
import { FolderContentView } from '@components/Dashboard/FolderContentView'
import { KPICard } from '@components/Dashboard/KPICard'
import { SimpleBarChart } from '@components/Dashboard/SimpleBarChart'
import { InactivityWarningModal } from '@components/Auth/InactivityWarningModal'
import { useInactivityTimeout } from '@hooks/useInactivityTimeout'
import { authService } from '@/services/auth.service'
import {
  FileText,
  Folder,
  Users,
  HardDrive,
  Clock,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Activity,
} from 'lucide-react'

export function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showWarningModal, setShowWarningModal] = useState(false)

  // Check if a folder is selected via URL parameter
  const selectedFolderId = searchParams.get('folder')

  // Get user data from auth service
  const userData = authService.getUser()
  const user = {
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    email: userData?.email || '',
  }

  // Mock notifications - replace with actual API data
  const notifications = [
    {
      id: '1',
      title: '5 documents expiring soon',
      message: 'Review retention policies for expiring documents',
      time: '2h ago',
      read: false,
    },
    {
      id: '2',
      title: 'New user registered',
      message: 'John Doe joined your organization',
      time: '4h ago',
      read: false,
    },
    {
      id: '3',
      title: 'Audit log exported',
      message: 'Your requested audit log is ready for download',
      time: '1d ago',
      read: true,
    },
  ]

  /**
   * Handle logout - clears tokens and redirects to login
   */
  const handleLogout = async () => {
    try {
      const refreshToken = authService.getRefreshToken()
      if (refreshToken) {
        await authService.logout(refreshToken)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear tokens regardless of API call success
      authService.clearTokens()
      navigate('/login')
    }
  }

  /**
   * Handle inactivity warning
   */
  const handleInactivityWarning = () => {
    setShowWarningModal(true)
  }

  /**
   * Handle staying active - resets timers and closes modal
   */
  const handleStayActive = () => {
    setShowWarningModal(false)
    resetActivity()
  }

  // Set up inactivity timeout
  const { showWarning: _showWarning, resetActivity } = useInactivityTimeout({
    warningTimeout: 5 * 60 * 1000, // 5 minutes
    logoutTimeout: 10 * 60 * 1000, // 10 minutes
    onWarning: handleInactivityWarning,
    onLogout: handleLogout,
    enabled: true,
  })

  // Mock data for charts
  const documentsByDepartment = [
    { label: 'Executive Management', value: 1247, color: 'bg-blue-600' },
    { label: 'Engagements', value: 3852, color: 'bg-green-600' },
    { label: 'Accounting', value: 2941, color: 'bg-yellow-600' },
    { label: 'IT', value: 1653, color: 'bg-purple-600' },
    { label: 'Compliance', value: 4127, color: 'bg-red-600' },
  ]

  const documentsByType = [
    { label: 'Invoices', value: 5240 },
    { label: 'Contracts', value: 3128 },
    { label: 'KYC Records', value: 2847 },
    { label: 'Reports', value: 1652 },
    { label: 'Others', value: 953 },
  ]

  const recentActivity = [
    {
      user: 'John Doe',
      action: 'uploaded',
      document: 'Q4_Financial_Report.pdf',
      time: '5 min ago',
    },
    {
      user: 'Jane Smith',
      action: 'shared',
      document: 'Client_Contract_2024.docx',
      time: '23 min ago',
    },
    {
      user: 'Mike Tech',
      action: 'deleted',
      document: 'Temp_File.xlsx',
      time: '1 hour ago',
    },
    {
      user: 'Sarah Comply',
      action: 'downloaded',
      document: 'Audit_Report_Nov.pdf',
      time: '2 hours ago',
    },
  ]

  return (
    <>
      {/* Inactivity Warning Modal */}
      <InactivityWarningModal
        isOpen={showWarningModal}
        onStayActive={handleStayActive}
        onLogout={handleLogout}
      />

      <ThreePanelLayout
        header={
          <DashboardHeader user={user} notifications={notifications} onLogout={handleLogout} />
        }
        leftPanel={<DashboardSidebar />}
        leftPanelWidth="auto"
        collapsibleLeft={false}
        centerPanel={
          selectedFolderId ? (
            <FolderContentView />
          ) : (
            <div className="p-6 space-y-6">
              {/* Welcome Section */}
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Welcome back, {user.firstName}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Here's what's happening with your documents today
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Documents"
                  value="13,820"
                  icon={<FileText className="w-6 h-6" />}
                  trend={{ value: 12.5, isPositive: true }}
                  subtitle="Across all departments"
                  color="blue"
                />
                <KPICard
                  title="Total Folders"
                  value="1,248"
                  icon={<Folder className="w-6 h-6" />}
                  trend={{ value: 5.2, isPositive: true }}
                  subtitle="Organized structure"
                  color="green"
                />
                <KPICard
                  title="Active Users"
                  value="87"
                  icon={<Users className="w-6 h-6" />}
                  trend={{ value: 3.1, isPositive: false }}
                  subtitle="In last 30 days"
                  color="purple"
                />
                <KPICard
                  title="Storage Used"
                  value="325 GB"
                  icon={<HardDrive className="w-6 h-6" />}
                  subtitle="65% of 500 GB"
                  color="yellow"
                />
              </div>

              {/* Secondary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Pending Reviews"
                  value="24"
                  icon={<Clock className="w-6 h-6" />}
                  subtitle="Require attention"
                  color="yellow"
                />
                <KPICard
                  title="Compliance Score"
                  value="98.5%"
                  icon={<Shield className="w-6 h-6" />}
                  trend={{ value: 2.3, isPositive: true }}
                  subtitle="Excellent"
                  color="green"
                />
                <KPICard
                  title="Documents Shared"
                  value="156"
                  icon={<TrendingUp className="w-6 h-6" />}
                  subtitle="This month"
                  color="indigo"
                />
                <KPICard
                  title="Active Alerts"
                  value="7"
                  icon={<AlertCircle className="w-6 h-6" />}
                  subtitle="Need review"
                  color="red"
                />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleBarChart data={documentsByDepartment} title="Documents by Department" />
                <SimpleBarChart data={documentsByType} title="Documents by Type" />
              </div>

              {/* Activity and Quick Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Recent Activity
                    </h3>
                    <Activity className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            {activity.user
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                            <span className="font-medium text-blue-600 dark:text-blue-400">
                              {activity.document}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    Quick Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Completed Tasks
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        142
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Pending Approvals
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        18
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Uploads This Week
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        234
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Secure Documents
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        8,547
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors">
                      View Full Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
        collapsibleRight={false}
      />
    </>
  )
}
