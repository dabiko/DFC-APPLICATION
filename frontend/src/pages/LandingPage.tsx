import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import HeroSection from '../components/Landing/HeroSection'
import FeaturesSection from '../components/Landing/FeaturesSection'
import ProcedureShowcaseSection from '../components/Landing/ProcedureShowcaseSection'
import SecuritySection from '../components/Landing/SecuritySection'
import PricingSection from '../components/Landing/PricingSection'
import StatsSection from '../components/Landing/StatsSection'
import CTASection from '../components/Landing/CTASection'
import Footer from '../components/Landing/Footer'
import LandingHeader from '../components/Landing/LandingHeader'
import { getPublicPlatformInfo, type PublicPlatformInfo } from '../services/systemService'

/**
 * Landing Page - Enterprise-grade marketing page for DFC
 * Features: Hero, Features, Security, Pricing, Stats, CTA, Footer
 * Supports: Light/Dark theme, Smooth animations, Conversion optimization
 */
const DEFAULT_PLATFORM: PublicPlatformInfo = {
  platform_name: 'Digital Filing Cabinet',
  platform_tagline: 'Secure Document Management',
  support_email: '',
  support_phone: '',
}

const LandingPage: React.FC = () => {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const [platformInfo, setPlatformInfo] = useState<PublicPlatformInfo>(DEFAULT_PLATFORM)

  useEffect(() => {
    getPublicPlatformInfo()
      .then(setPlatformInfo)
      .catch(() => {})
  }, [])

  // Scroll to a hash target when arriving from another route (e.g. /#features).
  useEffect(() => {
    if (!location.hash) return
    const id = window.setTimeout(() => {
      const el = document.querySelector(location.hash)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    return () => window.clearTimeout(id)
  }, [location.hash])

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
      <LandingHeader
        theme={theme}
        onToggleTheme={cycleTheme}
        onNavigate={navigate}
        platformInfo={platformInfo}
      />

      {/* Main Content */}
      <main>
        {/* Hero Section - Above the fold */}
        <HeroSection onNavigate={navigate} platformInfo={platformInfo} />

        {/* Features Section - Core value propositions */}
        <FeaturesSection />

        {/* Procedure Lifecycle Showcase - Author, Review, Train */}
        <ProcedureShowcaseSection />

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
      <Footer onNavigate={navigate} platformInfo={platformInfo} />
    </div>
  )
}

export default LandingPage
