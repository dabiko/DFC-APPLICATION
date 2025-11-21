import React, { useEffect, useRef } from 'react'
import { ArrowRight, FileText, Shield, Zap, CheckCircle } from 'lucide-react'

interface HeroSectionProps {
  onNavigate: (path: string) => void
}

/**
 * Hero Section - Above the fold conversion-focused section
 * Features: Animated filing cabinet visualization, compelling copy, CTAs
 */
const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Animation: Floating documents/files
    interface Particle {
      x: number
      y: number
      size: number
      speedY: number
      speedX: number
      opacity: number
      type: 'file' | 'folder' | 'lock' | 'check'
    }

    const particles: Particle[] = []
    const particleCount = 30

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 20 + 10,
        speedY: (Math.random() - 0.5) * 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        type: ['file', 'folder', 'lock', 'check'][
          Math.floor(Math.random() * 4)
        ] as Particle['type'],
      })
    }

    // Connection lines between particles
    const maxDistance = 150

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Get theme from root element
      const isDark = document.documentElement.classList.contains('dark')

      // Draw connections
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15
            ctx.strokeStyle = isDark
              ? `rgba(96, 165, 250, ${opacity})`
              : `rgba(59, 130, 246, ${opacity})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })

      // Draw and update particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX
        particle.y += particle.speedY

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        // Draw particle based on type
        ctx.save()
        ctx.globalAlpha = particle.opacity

        const color = isDark ? 'rgba(96, 165, 250, 1)' : 'rgba(59, 130, 246, 1)'

        switch (particle.type) {
          case 'file':
            // Draw file icon
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.rect(
              particle.x - particle.size / 2,
              particle.y - particle.size / 2,
              particle.size,
              particle.size * 1.3
            )
            ctx.stroke()
            // Lines inside
            ctx.beginPath()
            ctx.moveTo(particle.x - particle.size / 4, particle.y - particle.size / 4)
            ctx.lineTo(particle.x + particle.size / 4, particle.y - particle.size / 4)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(particle.x - particle.size / 4, particle.y)
            ctx.lineTo(particle.x + particle.size / 4, particle.y)
            ctx.stroke()
            break

          case 'folder':
            // Draw folder icon
            ctx.fillStyle = color
            ctx.fillRect(
              particle.x - particle.size / 2,
              particle.y,
              particle.size,
              particle.size * 0.8
            )
            ctx.fillRect(
              particle.x - particle.size / 2,
              particle.y - particle.size * 0.2,
              particle.size * 0.5,
              particle.size * 0.2
            )
            break

          case 'lock':
            // Draw lock icon
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(
              particle.x,
              particle.y - particle.size / 4,
              particle.size / 3,
              Math.PI,
              0,
              false
            )
            ctx.stroke()
            ctx.fillStyle = color
            ctx.fillRect(
              particle.x - particle.size / 3,
              particle.y - particle.size / 4,
              (particle.size * 2) / 3,
              particle.size / 2
            )
            break

          case 'check':
            // Draw checkmark
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(particle.x - particle.size / 4, particle.y)
            ctx.lineTo(particle.x - particle.size / 8, particle.y + particle.size / 4)
            ctx.lineTo(particle.x + particle.size / 4, particle.y - particle.size / 4)
            ctx.stroke()
            break
        }

        ctx.restore()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 sm:pt-24">
      {/* Animated Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-950/30 dark:via-transparent dark:to-purple-950/30"
        style={{ zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6 sm:mb-8 animate-fadeIn">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Enterprise-Grade Document Management
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8 leading-tight animate-slideUp">
            Secure Digital Filing
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed animate-slideUp"
            style={{ animationDelay: '0.1s' }}
          >
            Transform your document management with military-grade security, AI-powered
            classification, and seamless collaboration. Built for financial institutions and
            enterprises.
          </p>

          {/* Key Benefits */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12 max-w-3xl mx-auto animate-slideUp"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-lg">
              <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bank-Level Security
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                GDPR Compliant
              </span>
            </div>
            <div className="flex items-center justify-center space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm px-4 py-3 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                99.9% Uptime SLA
              </span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 animate-slideUp"
            style={{ animationDelay: '0.3s' }}
          >
            <button
              onClick={() => onNavigate('/register')}
              className="group w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center space-x-2"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
            <button
              onClick={() => onNavigate('/demo')}
              className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-gray-200 dark:border-gray-700"
            >
              Watch Demo
            </button>
          </div>

          {/* Trust Indicators */}
          <p
            className="mt-8 sm:mt-12 text-sm text-gray-500 dark:text-gray-400 animate-fadeIn"
            style={{ animationDelay: '0.4s' }}
          >
            Trusted by 500+ financial institutions worldwide • No credit card required
          </p>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-400 dark:border-gray-600 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 dark:bg-gray-600 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}

export default HeroSection
