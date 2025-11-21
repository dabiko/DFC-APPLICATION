import { useState, useEffect, useRef, FormEvent } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Input } from '@components/Input/Input'
import { Button } from '@components/Button/Button'
import { AuthHeader } from '@components/Auth/AuthHeader'
import { LockClosedIcon } from '@heroicons/react/24/outline'

interface ResetPasswordFormData {
  password: string
  confirmPassword: string
}

interface ResetPasswordErrors {
  password?: string
  confirmPassword?: string
  submit?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  type: 'file' | 'folder' | 'lock' | 'check'
}

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const token = searchParams.get('token')

  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  })

  const [errors, setErrors] = useState<ResetPasswordErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [success, setSuccess] = useState(false)

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      navigate('/forgot-password')
    }
  }, [token, navigate])

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

  const validatePassword = (password: string): string => {
    if (!password) {
      return 'Password is required'
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters'
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter'
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter'
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number'
    }
    if (!/[!@#$%^&*]/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*)'
    }
    return ''
  }

  const validateConfirmPassword = (confirmPassword: string, password: string): string => {
    if (!confirmPassword) {
      return 'Please confirm your password'
    }
    if (confirmPassword !== password) {
      return 'Passwords do not match'
    }
    return ''
  }

  const handleChange = (name: keyof ResetPasswordFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (touched[name] && errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleBlur = (name: keyof ResetPasswordFormData) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    let error = ''
    if (name === 'password') {
      error = validatePassword(formData.password)
    } else if (name === 'confirmPassword') {
      error = validateConfirmPassword(formData.confirmPassword, formData.password)
    }
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setTouched({ password: true, confirmPassword: true })

    const passwordError = validatePassword(formData.password)
    const confirmError = validateConfirmPassword(formData.confirmPassword, formData.password)

    if (passwordError || confirmError) {
      setErrors({
        password: passwordError,
        confirmPassword: confirmError,
      })
      return
    }

    setLoading(true)
    setErrors({})

    try {
      const { authService } = await import('@/services/auth.service')

      if (!token) {
        throw new Error('Invalid reset token')
      }

      await authService.confirmPasswordReset(token, formData.password, formData.confirmPassword)

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Password reset failed:', error)

      const errorMessage =
        error instanceof Error ? error.message : 'Password reset failed. Please try again.'

      if (errorMessage.includes('token') || errorMessage.includes('expired')) {
        setErrors({
          submit: 'This reset link has expired or is invalid. Please request a new password reset.',
        })
      } else {
        setErrors({
          submit: errorMessage,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
          style={{ zIndex: 1 }}
        />

        <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <div className="text-center">
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Password Reset!
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/30 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/20"
        style={{ zIndex: 1 }}
      />

      <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        <AuthHeader title="Create New Password" showBack showLogo />

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create New Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Choose a strong password to secure your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter new password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              error={touched.password ? errors.password : undefined}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              disabled={loading}
              fullWidth
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              onBlur={() => handleBlur('confirmPassword')}
              error={touched.confirmPassword ? errors.confirmPassword : undefined}
              leftIcon={<LockClosedIcon className="h-5 w-5" />}
              disabled={loading}
              fullWidth
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-9 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
