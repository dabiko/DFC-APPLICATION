import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Moon, Sun, Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { authService } from '@/services/auth.service'
import type { PublicPlatformInfo } from '@/services/systemService'

interface LandingHeaderProps {
  theme: string
  onToggleTheme: () => void
  onNavigate: (path: string) => void
  platformInfo?: PublicPlatformInfo
}

/**
 * Landing Page Header
 * Features: Sticky header, logo, navigation, theme toggle, mobile menu
 */
const LandingHeader: React.FC<LandingHeaderProps> = ({
  theme,
  onToggleTheme,
  onNavigate,
  platformInfo,
}) => {
  const platformName = platformInfo?.platform_name || 'Digital Filing Cabinet'
  const platformTagline = platformInfo?.platform_tagline || 'Secure Document Management'
  const initials = platformName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    // Check authentication status on component mount
    setIsAuthenticated(authService.isAuthenticated())
  }, [])

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Procedures', href: '#procedures' },
    { label: 'Security', href: '#security' },
    { label: 'Pricing', href: '#pricing' },
  ]

  const scrollToSection = (href: string) => {
    setIsMobileMenuOpen(false)
    if (location.pathname === '/') {
      const element = document.querySelector(href)
      if (element) element.scrollIntoView({ behavior: 'smooth' })
    } else {
      onNavigate('/' + href)
    }
  }

  /**
   * Handle user logout
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
      // Clear tokens and update state
      authService.clearTokens()
      setIsAuthenticated(false)
      setIsMobileMenuOpen(false)
      // Redirect to login page
      onNavigate('/login')
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg sm:text-xl">{initials}</span>
            </div>

            {/* Platform Name */}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {platformName}
              </h1>
              {platformTagline && (
                <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">
                  {platformTagline}
                </p>
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle - Cycles: Light → Dark → System */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 group"
              aria-label={`Current theme: ${theme}. Click to cycle themes`}
              title={`Current: ${theme.charAt(0).toUpperCase() + theme.slice(1)} mode. Click to change.`}
            >
              {theme === 'light' && <Sun className="w-5 h-5 text-yellow-500" />}
              {theme === 'dark' && <Moon className="w-5 h-5 text-blue-400" />}
              {theme === 'system' && (
                <svg
                  className="w-5 h-5 text-gray-600 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>

            {/* Desktop CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              {isAuthenticated ? (
                // Show Dashboard and Logout buttons when logged in
                <>
                  <button
                    onClick={() => onNavigate('/dashboard')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Dashboard</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors duration-200 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                // Show Sign In and Get Started when not logged in
                <>
                  <button
                    onClick={() => onNavigate('/login')}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => onNavigate('/register')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors duration-200"
                >
                  {link.label}
                </button>
              ))}
              <div className="flex flex-col space-y-2 px-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                {isAuthenticated ? (
                  // Show Dashboard and Logout buttons when logged in
                  <>
                    <button
                      onClick={() => {
                        onNavigate('/dashboard')
                        setIsMobileMenuOpen(false)
                      }}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="py-2 text-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors duration-200 rounded-lg flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </>
                ) : (
                  // Show Sign In and Get Started when not logged in
                  <>
                    <button
                      onClick={() => {
                        onNavigate('/login')
                        setIsMobileMenuOpen(false)
                      }}
                      className="py-2 text-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors duration-200"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => {
                        onNavigate('/register')
                        setIsMobileMenuOpen(false)
                      }}
                      className="py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-lg transition-all duration-200"
                    >
                      Get Started
                    </button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}

export default LandingHeader
