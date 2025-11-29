import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'
import { ToastContainer, NetworkStatusBanner } from '@components/common'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { ProtectedRoute, PublicRoute } from '@components/Auth'
import { NotFoundRouter } from '@components/NotFoundRouter'
import { BillingDashboard } from './pages/BillingDashboard'
import { SignUp } from './pages/SignUp'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import LandingPage from './pages/LandingPage'
import { Dashboard } from '@pages/Dashboard'
import { TrashPage } from './pages/TrashPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { RecentPage } from './pages/RecentPage'
import { SharedWithMePage } from './pages/SharedWithMePage'
import { MyDocumentsPage } from './pages/MyDocumentsPage'
import SmartFolderResultsPage from './pages/SmartFolderResultsPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { UsersRolesPage } from './pages/UsersRolesPage'
import { RetentionDashboardPage } from './pages/RetentionDashboardPage'
import { WorkflowCenterPage } from './pages/WorkflowCenterPage'
import { WorkflowDesignerPage } from './pages/WorkflowDesignerPage'
import { AutomationPage } from './pages/AutomationPage'
import { ComplianceCenterPage } from './pages/ComplianceCenterPage'
import { SettingsPage } from './pages/SettingsPage'
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SystemSettingsPage } from './pages/SystemSettingsPage'
import { Navigate } from 'react-router-dom'

function App() {
  return (
    <Provider store={store}>
      <NetworkStatusProvider>
        <NetworkStatusBanner />
        <Router>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Authentication - Public Routes (redirect to dashboard if already logged in) */}
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicRoute>
                  <SignUp />
                </PublicRoute>
              }
            />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              }
            />

            {/* Dashboard - Protected Route */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Trash - Protected Route */}
            <Route
              path="/trash"
              element={
                <ProtectedRoute>
                  <TrashPage />
                </ProtectedRoute>
              }
            />

            {/* Favorites - Protected Route */}
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />

            {/* Recent Files - Protected Route */}
            <Route
              path="/recent"
              element={
                <ProtectedRoute>
                  <RecentPage />
                </ProtectedRoute>
              }
            />

            {/* Shared With Me - Protected Route */}
            <Route
              path="/shared-with-me"
              element={
                <ProtectedRoute>
                  <SharedWithMePage />
                </ProtectedRoute>
              }
            />

            {/* My Documents - Protected Route */}
            <Route
              path="/my-documents"
              element={
                <ProtectedRoute>
                  <MyDocumentsPage />
                </ProtectedRoute>
              }
            />

            {/* Smart Folder Results - Protected Route */}
            <Route
              path="/smart-folder/:id"
              element={
                <ProtectedRoute>
                  <SmartFolderResultsPage />
                </ProtectedRoute>
              }
            />

            {/* Audit Logs - Protected Route */}
            <Route
              path="/audit"
              element={
                <ProtectedRoute>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />

            {/* Users & Roles - Protected Route */}
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <UsersRolesPage />
                </ProtectedRoute>
              }
            />

            {/* Retention Management - Protected Route */}
            <Route
              path="/retention"
              element={
                <ProtectedRoute>
                  <RetentionDashboardPage />
                </ProtectedRoute>
              }
            />

            {/* Schedules - Redirect to Retention tab for backwards compatibility */}
            <Route path="/schedules" element={<Navigate to="/retention?tab=schedules" replace />} />

            {/* Workflows - Protected Route */}
            <Route
              path="/workflows"
              element={
                <ProtectedRoute>
                  <WorkflowCenterPage />
                </ProtectedRoute>
              }
            />

            {/* Workflow Designer - Protected Route */}
            <Route
              path="/workflows/designer"
              element={
                <ProtectedRoute>
                  <WorkflowDesignerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workflows/designer/:templateId"
              element={
                <ProtectedRoute>
                  <WorkflowDesignerPage />
                </ProtectedRoute>
              }
            />

            {/* Automation Center - Protected Route */}
            <Route
              path="/automation"
              element={
                <ProtectedRoute>
                  <AutomationPage />
                </ProtectedRoute>
              }
            />

            {/* Compliance Center - Protected Route */}
            <Route
              path="/compliance"
              element={
                <ProtectedRoute>
                  <ComplianceCenterPage />
                </ProtectedRoute>
              }
            />

            {/* Settings - Protected Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Organization Settings - Protected Route */}
            <Route
              path="/organization-settings"
              element={
                <ProtectedRoute>
                  <OrganizationSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Integrations - Protected Route */}
            <Route
              path="/integrations"
              element={
                <ProtectedRoute>
                  <IntegrationsPage />
                </ProtectedRoute>
              }
            />

            {/* System Settings (Super Admin) - Protected Route */}
            <Route
              path="/admin/system"
              element={
                <ProtectedRoute>
                  <SystemSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Billing Dashboard - Protected Route */}
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <BillingDashboard />
                </ProtectedRoute>
              }
            />

            {/* Other pages */}
            <Route path="/demo" element={<div className="p-8">Demo page (coming soon)</div>} />
            <Route
              path="/contact"
              element={<div className="p-8">Contact page (coming soon)</div>}
            />

            {/* 404 - Catch all undefined routes */}
            <Route path="*" element={<NotFoundRouter />} />
          </Routes>
        </Router>
        <ToastContainer />
      </NetworkStatusProvider>
    </Provider>
  )
}

export default App
