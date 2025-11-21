import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@store'
import { ToastContainer } from './components/common'
import { BillingDashboard } from './pages/BillingDashboard'
import LandingPage from './pages/LandingPage'

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Billing Dashboard */}
          <Route path="/billing" element={<BillingDashboard />} />

          {/* Placeholder routes for landing page CTAs */}
          <Route
            path="/register"
            element={<div className="p-8">Registration page (coming soon)</div>}
          />
          <Route path="/login" element={<div className="p-8">Login page (coming soon)</div>} />
          <Route path="/demo" element={<div className="p-8">Demo page (coming soon)</div>} />
          <Route path="/contact" element={<div className="p-8">Contact page (coming soon)</div>} />
        </Routes>
      </Router>
      <ToastContainer />
    </Provider>
  )
}

export default App
