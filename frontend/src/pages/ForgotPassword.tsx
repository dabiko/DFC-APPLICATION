import { useState, useEffect, useRef, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@components/Input/Input'
import { Button } from '@components/Button/Button'
import { AuthHeader } from '@components/Auth/AuthHeader'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

interface ForgotPasswordFormData {
  email: string
}

interface ForgotPasswordErrors {
  email?: string
  submit?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  type: 'file' | 'folder' | 'lock' | 'check'
}

export function ForgotPassword() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [formData, setFormData] = useState<ForgotPasswordFormData>({
    email: '',
  })

  const [errors, setErrors] = useState<ForgotPasswordErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Background Animation (identical to login and signup pages)
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

  const validateEmail = (email: string): string => {
    if (!email) {
      return 'Email is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  const handleChange = (email: string) => {
    setFormData({ email })

    // Clear error when user starts typing
    if (touched.email && errors.email) {
      setErrors({})
    }
  }

  const handleBlur = () => {
    setTouched({ email: true })
    const error = validateEmail(formData.email)
    if (error) {
      setErrors({ email: error })
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Mark field as touched
    setTouched({ email: true })

    // Validate
    const emailError = validateEmail(formData.email)
    if (emailError) {
      setErrors({ email: emailError })
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // Import auth service
      const { authService } = await import('@/services/auth.service')

      // Request password reset
      await authService.requestPasswordReset(formData.email)

      // Show success message
      setSuccess(true)
    } catch (error) {
      console.error('Password reset request failed:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Failed to send reset email. Please try again.'

      setErrors({
        submit: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        {/* Animated Background Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

        {/* Gradient Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
          style={{ zIndex: 1 }}
        />

        {/* Success Message */}
        <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          {/* Navigation Header */}
          <AuthHeader title="Check Your Email" showBack showLogo />

          {/* Success Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Email Sent!</h1>
            <p className="text-gray-600 dark:text-gray-400">
              We've sent password reset instructions to <strong>{formData.email}</strong>
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Next steps:</strong>
            </p>
            <ol className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-decimal space-y-1">
              <li>Check your email inbox</li>
              <li>Click the reset link (valid for 1 hour)</li>
              <li>Create a new password</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link to="/login">
              <Button variant="primary" size="lg" fullWidth>
                Back to Sign In
              </Button>
            </Link>

            <button
              onClick={() => {
                setSuccess(false)
                setFormData({ email: '' })
                setTouched({})
              }}
              className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Didn't receive the email? Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Animated Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />

      {/* Gradient Overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
        style={{ zIndex: 1 }}
      />

      {/* Forgot Password Form */}
      <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        {/* Navigation Header */}
        <AuthHeader title="Reset Password" showBack showLogo />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            No worries! Enter your email address and we'll send you instructions to reset your
            password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <Input
            label="Email Address"
            type="email"
            placeholder="john.smith@company.com"
            value={formData.email}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            error={touched.email ? errors.email : undefined}
            leftIcon={<EnvelopeIcon className="h-5 w-5" />}
            disabled={loading}
            fullWidth
            required
          />

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
