import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'
import { ToastContainer } from '@components/common'
import { BillingDashboard } from './pages/BillingDashboard'
import { SignUp } from './pages/SignUp'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/register" element={<SignUp />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Billing Dashboard */}
          <Route path="/billing" element={<BillingDashboard />} />

          {/* Other pages */}
          <Route path="/demo" element={<div className="p-8">Demo page (coming soon)</div>} />
          <Route path="/contact" element={<div className="p-8">Contact page (coming soon)</div>} />
        </Routes>
      </Router>
      <ToastContainer />
    </Provider>
  )
}

export default App
