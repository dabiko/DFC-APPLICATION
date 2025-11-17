import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { Button } from '@components/Button/Button'
import { Input } from '@components/Input/Input'

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isAuthenticated, loading, error, remainingAttempts, isLocked, clearAuthError } =
    useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationErrors, setValidationErrors] = useState<{
    email?: string
    password?: string
  }>({})

  // Clear server errors when user starts typing (better UX)
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) {
      clearAuthError()
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) {
      clearAuthError()
    }
  }

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, navigate, location])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearAuthError()
    }
  }, [clearAuthError])

  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {}

    // Email validation
    if (!email) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email format'
    }

    // Password validation
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Clear only client-side validation errors
    setValidationErrors({})

    // Validate form
    if (!validateForm()) {
      return
    }

    // Don't clear server errors - let them persist until new response arrives
    // Attempt login
    try {
      await login({ email, password })
      // Navigation is handled by useEffect when isAuthenticated changes
    } catch (err) {
      // Error is handled by Redux and displayed via error state
      console.error('Login error:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">DFC</h1>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
            Digital Filing Cabinet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Secure Document Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">Sign In</h3>

          {/* Server Error Display */}
          {error && (
            <div
              className={`mb-4 p-3 rounded-md border ${
                isLocked
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {isLocked && (
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                )}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isLocked
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-error-700 dark:text-error-400'
                    }`}
                  >
                    {error}
                  </p>
                  {!isLocked && remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="text-xs text-error-600 dark:text-error-500 mt-1">
                      {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'}{' '}
                      remaining before account lockout.
                    </p>
                  )}
                  {isLocked && (
                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                      Please contact an administrator to unlock your account.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@cccplc.net"
                value={email}
                onChange={handleEmailChange}
                error={validationErrors.email}
                disabled={loading || isLocked}
                fullWidth
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={handlePasswordChange}
                error={validationErrors.password}
                disabled={loading || isLocked}
                fullWidth
                autoComplete="current-password"
              />
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  // TODO: Implement forgot password flow
                  alert('Forgot password feature coming soon!')
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || isLocked}
            >
              {loading ? 'Signing In...' : isLocked ? 'Account Locked' : 'Sign In'}
            </Button>
          </form>

          {/* Demo Credentials (for development) */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Demo Credentials:
              </p>
              <div className="space-y-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Admin:{' '}
                  <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                    admin@cccplc.net
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Editor:{' '}
                  <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                    editor@cccplc.net
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Viewer:{' '}
                  <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">
                    viewer@cccplc.net
                  </code>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Password:{' '}
                  <code className="bg-white dark:bg-gray-800 px-1 py-0.5 rounded">password</code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            CCC PLC &copy; {new Date().getFullYear()} - All rights reserved
          </p>
        </div>
      </div>
    </div>
  )
}
