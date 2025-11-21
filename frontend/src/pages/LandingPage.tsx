import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import HeroSection from '../components/Landing/HeroSection'
import FeaturesSection from '../components/Landing/FeaturesSection'
import SecuritySection from '../components/Landing/SecuritySection'
import PricingSection from '../components/Landing/PricingSection'
import StatsSection from '../components/Landing/StatsSection'
import CTASection from '../components/Landing/CTASection'
import Footer from '../components/Landing/Footer'
import LandingHeader from '../components/Landing/LandingHeader'

/**
 * Landing Page - Enterprise-grade marketing page for DFC
 * Features: Hero, Features, Security, Pricing, Stats, CTA, Footer
 * Supports: Light/Dark theme, Smooth animations, Conversion optimization
 */
const LandingPage: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark')
    } else if (theme === 'dark') {
      setTheme('system')
    } else {
      setTheme('light')
    }
  }

  return (
    <div className="landing-page min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
      {/* Header with Navigation */}
      <LandingHeader theme={theme} onToggleTheme={cycleTheme} onNavigate={navigate} />

      {/* Main Content */}
      <main>
        {/* Hero Section - Above the fold */}
        <HeroSection onNavigate={navigate} />

        {/* Features Section - Core value propositions */}
        <FeaturesSection />

        {/* Security & Compliance - Trust building */}
        <SecuritySection />

        {/* Pricing Section - Clear pricing tiers */}
        <PricingSection onNavigate={navigate} />

        {/* Stats/Social Proof - Build credibility */}
        <StatsSection />

        {/* Final CTA - Convert visitors */}
        <CTASection onNavigate={navigate} />
      </main>

      {/* Footer - Links & Legal */}
      <Footer onNavigate={navigate} />
    </div>
  )
}

export default LandingPage
