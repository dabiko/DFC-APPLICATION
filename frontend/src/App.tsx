import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'
import { ToastContainer } from '@components/common'
import { ProtectedRoute, PublicRoute } from '@components/Auth'
import { NotFoundRouter } from '@components/NotFoundRouter'
import { BillingDashboard } from './pages/BillingDashboard'
import { SignUp } from './pages/SignUp'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import LandingPage from './pages/LandingPage'
import { Dashboard } from '@pages/Dashboard'

function App() {
  return (
    <Provider store={store}>
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

          {/* Billing Dashboard */}
          <Route path="/billing" element={<BillingDashboard />} />

          {/* Other pages */}
          <Route path="/demo" element={<div className="p-8">Demo page (coming soon)</div>} />
          <Route path="/contact" element={<div className="p-8">Contact page (coming soon)</div>} />

          {/* 404 - Catch all undefined routes */}
          <Route path="*" element={<NotFoundRouter />} />
        </Routes>
      </Router>
      <ToastContainer />
    </Provider>
  )
}

export default App
