import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'
import { ToastContainer, NetworkStatusBanner } from '@components/common'
import { NetworkStatusProvider } from '@/contexts/NetworkStatusContext'
import { PermissionProvider } from '@/contexts/PermissionContext'
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
import { SmartFoldersPage } from './pages/SmartFoldersPage'
import { SearchPage } from './pages/SearchPage'
import { AuditLogPage } from './pages/AuditLogPage'
import { PermissionAuditPage } from './pages/PermissionAuditPage'
import { UsersRolesPage } from './pages/UsersRolesPage'
import { RetentionDashboardPage } from './pages/RetentionDashboardPage'
import { WorkflowCenterPage } from './pages/WorkflowCenterPage'
import { ProcedureBuilderPage } from './pages/ProcedureBuilderPage'
import { ProcedureDetailPage } from './pages/ProcedureDetailPage'
import { ProcedureReviewPage } from './pages/ProcedureReviewPage'
import { ProcedureVersionPage } from './pages/ProcedureVersionPage'
import { ProcedureVersionDiffPage } from './pages/ProcedureVersionDiffPage'
import { WorkflowDesignerPage } from './pages/WorkflowDesignerPage'
import { AutomationPage } from './pages/AutomationPage'
import { ComplianceCenterPage } from './pages/ComplianceCenterPage'
import { SettingsPage } from './pages/SettingsPage'
import { OrganizationSettingsPage } from './pages/OrganizationSettingsPage'
import { IntegrationsPage } from './pages/IntegrationsPage'
import { SystemSettingsPage } from './pages/SystemSettingsPage'
import { ProceduresListPage } from './pages/ProceduresListPage'
import { MyTrainingPage } from './pages/MyTrainingPage'
import { TrainingPlayerPage } from './pages/TrainingPlayerPage'
import { QuizTakingPage } from './pages/QuizTakingPage'
import { TrainingAssignmentsPage } from './pages/TrainingAssignmentsPage'
import { TraineeDetailPage } from './pages/TraineeDetailPage'
import { TrainingEvidencePage } from './pages/TrainingEvidencePage'
import { Navigate } from 'react-router-dom'

function App() {
  return (
    <Provider store={store}>
      <NetworkStatusProvider>
        <PermissionProvider>
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

              {/* Smart Folders Management - Protected Route */}
              <Route
                path="/smart-folders"
                element={
                  <ProtectedRoute>
                    <SmartFoldersPage />
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

              {/* Search Results - Protected Route */}
              <Route
                path="/search"
                element={
                  <ProtectedRoute>
                    <SearchPage />
                  </ProtectedRoute>
                }
              />

              {/* Audit Logs - Requires can_view_audit_log permission */}
              <Route
                path="/audit"
                element={
                  <ProtectedRoute requiredPermission="can_view_audit_log" pageName="Audit Logs">
                    <AuditLogPage />
                  </ProtectedRoute>
                }
              />

              {/* Permission Audit - Requires can_view_audit_log permission */}
              <Route
                path="/permission-audit"
                element={
                  <ProtectedRoute
                    requiredPermission="can_view_audit_log"
                    pageName="Permission Audit"
                  >
                    <PermissionAuditPage />
                  </ProtectedRoute>
                }
              />

              {/* Users & Roles - Requires can_manage_permissions permission */}
              <Route
                path="/users"
                element={
                  <ProtectedRoute
                    requiredPermission="can_manage_permissions"
                    pageName="Users & Roles"
                  >
                    <UsersRolesPage />
                  </ProtectedRoute>
                }
              />

              {/* Retention Management - Requires can_manage_retention permission */}
              <Route
                path="/retention"
                element={
                  <ProtectedRoute
                    requiredPermission="can_manage_retention"
                    pageName="Retention Management"
                  >
                    <RetentionDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Schedules - Redirect to Retention tab for backwards compatibility */}
              <Route
                path="/schedules"
                element={<Navigate to="/retention?tab=schedules" replace />}
              />

              {/* Workflows - Requires start_workflow or view_workflow_analytics */}
              <Route
                path="/workflows"
                element={
                  <ProtectedRoute
                    requiredPermission={['start_workflow', 'view_workflow_analytics']}
                    pageName="Workflow Center"
                  >
                    <WorkflowCenterPage />
                  </ProtectedRoute>
                }
              />

              {/* Workflow Designer - Requires create_workflow_template permission */}
              <Route
                path="/workflows/designer"
                element={
                  <ProtectedRoute
                    requiredPermission="create_workflow_template"
                    pageName="Workflow Designer"
                  >
                    <WorkflowDesignerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/workflows/designer/:templateId"
                element={
                  <ProtectedRoute
                    requiredPermission="create_workflow_template"
                    pageName="Workflow Designer"
                  >
                    <WorkflowDesignerPage />
                  </ProtectedRoute>
                }
              />

              {/* Procedure Management */}
              <Route
                path="/procedures/new"
                element={
                  <ProtectedRoute requiredPermission="create_procedure" pageName="New Procedure">
                    <ProcedureBuilderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedures/:id/review"
                element={
                  <ProtectedRoute pageName="Procedure Review">
                    <ProcedureReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedures/:id"
                element={
                  <ProtectedRoute pageName="Procedure Detail">
                    <ProcedureDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedures/:id/edit"
                element={
                  <ProtectedRoute pageName="Edit Procedure">
                    <ProcedureBuilderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedures/:id/versions/diff"
                element={
                  <ProtectedRoute
                    requiredPermission={['edit_procedure', 'publish_procedure']}
                    pageName="Version Diff"
                  >
                    <ProcedureVersionDiffPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/procedures/:id/versions/:versionNumber"
                element={
                  <ProtectedRoute
                    requiredPermission={['edit_procedure', 'publish_procedure']}
                    pageName="Procedure Version"
                  >
                    <ProcedureVersionPage />
                  </ProtectedRoute>
                }
              />

              {/* Training Assignments - requires manage_assignments or view_training_dashboard */}
              <Route
                path="/procedures/assignments"
                element={
                  <ProtectedRoute
                    requiredPermission={['manage_assignments', 'view_training_dashboard']}
                    pageName="Training Assignments"
                  >
                    <TrainingAssignmentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Trainee Detail - requires view_trainee_details */}
              <Route
                path="/procedures/assignments/trainee/:userId"
                element={
                  <ProtectedRoute
                    requiredPermission="view_trainee_details"
                    pageName="Trainee Detail"
                  >
                    <TraineeDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Training Evidence - requires view_training_evidence or audit_training */}
              <Route
                path="/procedures/evidence"
                element={
                  <ProtectedRoute
                    requiredPermission={['view_training_evidence', 'audit_training']}
                    pageName="Training Evidence"
                  >
                    <TrainingEvidencePage />
                  </ProtectedRoute>
                }
              />

              {/* Browse Procedures - All authenticated users */}
              <Route
                path="/procedures"
                element={
                  <ProtectedRoute>
                    <ProceduresListPage />
                  </ProtectedRoute>
                }
              />

              {/* My Training - All authenticated users */}
              <Route
                path="/my-training"
                element={
                  <ProtectedRoute>
                    <MyTrainingPage />
                  </ProtectedRoute>
                }
              />

              {/* Training Player - Step-by-step training delivery */}
              <Route
                path="/training/:attemptId"
                element={
                  <ProtectedRoute>
                    <TrainingPlayerPage />
                  </ProtectedRoute>
                }
              />

              {/* Quiz Taking - During training */}
              <Route
                path="/training/:attemptId/quiz/:quizId"
                element={
                  <ProtectedRoute>
                    <QuizTakingPage />
                  </ProtectedRoute>
                }
              />

              {/* Automation Center - Requires admin or manager role */}
              <Route
                path="/automation"
                element={
                  <ProtectedRoute requiredRole={['admin', 'manager']} pageName="Automation">
                    <AutomationPage />
                  </ProtectedRoute>
                }
              />

              {/* Compliance Center - Requires can_manage_classification permission */}
              <Route
                path="/compliance"
                element={
                  <ProtectedRoute
                    requiredPermission="can_manage_classification"
                    pageName="Compliance Center"
                  >
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

              {/* Organization Settings - Requires can_manage_permissions (admin level) */}
              <Route
                path="/organization-settings"
                element={
                  <ProtectedRoute
                    requiredPermission="can_manage_permissions"
                    pageName="Organization Settings"
                  >
                    <OrganizationSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Integrations - Requires can_manage_permissions (admin level) */}
              <Route
                path="/integrations"
                element={
                  <ProtectedRoute
                    requiredPermission="can_manage_permissions"
                    pageName="Integrations"
                  >
                    <IntegrationsPage />
                  </ProtectedRoute>
                }
              />

              {/* System Settings (Super Admin) - Requires admin role */}
              <Route
                path="/admin/system"
                element={
                  <ProtectedRoute requiredRole="admin" pageName="System Settings">
                    <SystemSettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Billing Dashboard - Requires admin role */}
              <Route
                path="/billing"
                element={
                  <ProtectedRoute requiredRole="admin" pageName="Billing">
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
        </PermissionProvider>
      </NetworkStatusProvider>
    </Provider>
  )
}

export default App
