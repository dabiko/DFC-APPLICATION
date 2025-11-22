/**
 * Public 404 Page
 * Shown to unauthenticated users when they access a non-existent route
 */

import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@components/Button/Button'
import { HomeIcon, ArrowLeftIcon, PhoneIcon } from '@heroicons/react/24/outline'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  type: 'file' | 'folder' | 'lock' | 'check'
}

export function NotFound() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Background Animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    const particles: Particle[] = []
    const particleCount = 20

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        type: ['file', 'folder', 'lock', 'check'][
          Math.floor(Math.random() * 4)
        ] as Particle['type'],
      })
    }

    let animationId: number

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const isDark = document.documentElement.classList.contains('dark')

      // Draw connections
      ctx.strokeStyle = isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)'
      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.globalAlpha = (150 - distance) / 150
            ctx.stroke()
            ctx.globalAlpha = 1
          }
        }
      }

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        ctx.save()
        ctx.translate(particle.x, particle.y)

        ctx.fillStyle = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.3)'

        if (particle.type === 'file') {
          ctx.beginPath()
          ctx.moveTo(-8, -10)
          ctx.lineTo(4, -10)
          ctx.lineTo(8, -6)
          ctx.lineTo(8, 10)
          ctx.lineTo(-8, 10)
          ctx.closePath()
          ctx.fill()
        } else if (particle.type === 'folder') {
          ctx.fillRect(-10, -6, 20, 12)
          ctx.fillRect(-10, -8, 8, 4)
        } else if (particle.type === 'lock') {
          ctx.fillRect(-6, 0, 12, 8)
          ctx.beginPath()
          ctx.arc(0, 0, 5, Math.PI, 0, true)
          ctx.stroke()
        } else if (particle.type === 'check') {
          ctx.strokeStyle = isDark ? 'rgba(34, 197, 94, 0.5)' : 'rgba(34, 197, 94, 0.5)'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(-6, 0)
          ctx.lineTo(-2, 4)
          ctx.lineTo(6, -4)
          ctx.stroke()
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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Animated Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
        style={{ zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg mb-6">
            <span className="text-3xl font-bold text-white">DFC</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            Digital Filing Cabinet
          </h1>
        </div>

        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-64 h-64 mb-6">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Main circle background */}
              <circle cx="100" cy="100" r="90" className="fill-blue-100 dark:fill-blue-900/20" />

              {/* Folder */}
              <path
                d="M50 80 L50 140 C50 145 52 147 57 147 L143 147 C148 147 150 145 150 140 L150 90 C150 85 148 83 143 83 L90 83 L80 73 L57 73 C52 73 50 75 50 80Z"
                className="fill-blue-600 dark:fill-blue-500"
              />

              {/* Question mark */}
              <text
                x="100"
                y="125"
                fontSize="60"
                fontWeight="bold"
                className="fill-white dark:fill-gray-900"
                textAnchor="middle"
              >
                ?
              </text>

              {/* Floating elements */}
              <circle
                cx="40"
                cy="50"
                r="8"
                className="fill-purple-400 dark:fill-purple-600 opacity-60"
              />
              <circle
                cx="160"
                cy="60"
                r="6"
                className="fill-blue-400 dark:fill-blue-600 opacity-60"
              />
              <circle
                cx="170"
                cy="140"
                r="10"
                className="fill-indigo-400 dark:fill-indigo-600 opacity-60"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <div className="mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
          <h2 className="text-6xl font-bold text-gray-900 dark:text-white mb-4">404</h2>
          <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Page Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Oops! The page you're looking for doesn't exist. It might have been moved or deleted.
          </p>

          {/* Helpful Links */}
          <div className="space-y-3 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              Here are some helpful links instead:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <HomeIcon className="w-4 h-4" />
                Home
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign In
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign Up
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <PhoneIcon className="w-4 h-4" />
                Contact Support
              </Link>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              className="inline-flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Go Back
            </Button>
            <Link to="/">
              <Button variant="primary" className="inline-flex items-center gap-2 w-full sm:w-auto">
                <HomeIcon className="w-5 h-5" />
                Go to Homepage
              </Button>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Need help? Contact our support team at{' '}
          <a
            href="mailto:support@digitalfilingcabinet.com"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            support@digitalfilingcabinet.com
          </a>
        </p>
      </div>
    </div>
  )
}
