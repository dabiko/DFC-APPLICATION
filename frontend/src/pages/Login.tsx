import { useState, useEffect, useRef, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Input } from '@components/Input/Input'
import { Button } from '@components/Button/Button'
import { Checkbox } from '@components/Checkbox/Checkbox'
import { AuthHeader } from '@components/Auth/AuthHeader'
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline'

interface LoginFormData {
  email: string
  password: string
  rememberMe: boolean
}

interface LoginErrors {
  email?: string
  password?: string
  submit?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  type: 'file' | 'folder' | 'lock' | 'check'
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [errors, setErrors] = useState<LoginErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Check if user just registered
  useEffect(() => {
    if (searchParams.get('registered') === 'true') {
      setSuccessMessage('Registration successful! Please log in with your credentials.')
      // Clear the query parameter after showing message
      setTimeout(() => {
        setSuccessMessage('')
      }, 5000)
    }
  }, [searchParams])

  // Background Animation (identical to landing page and signup)
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

  const validateField = (name: keyof LoginFormData, value: string | boolean): string => {
    let error = ''

    switch (name) {
      case 'email':
        if (!value) {
          error = 'Email or username is required'
        }
        // Allow both email and username format (no validation on format)
        break

      case 'password':
        if (!value) {
          error = 'Password is required'
        }
        break
    }

    return error
  }

  const handleChange = (name: keyof LoginFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (touched[name] && errors[name as keyof LoginErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleBlur = (name: keyof LoginFormData) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const error = validateField(name, formData[name])
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {}

    const emailError = validateField('email', formData.email)
    if (emailError) newErrors.email = emailError

    const passwordError = validateField('password', formData.password)
    if (passwordError) newErrors.password = passwordError

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Mark all fields as touched to show validation errors
    setTouched({
      email: true,
      password: true,
    })

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setErrors({})

    try {
      // Import auth service dynamically to avoid bundling issues
      const { authService } = await import('@/services/auth.service')

      // Call backend login API with remember me flag
      const response = await authService.login(
        formData.email,
        formData.password,
        formData.rememberMe
      )

      // Store tokens and user data based on Remember Me preference
      authService.storeTokens(response.access, response.refresh, formData.rememberMe)
      authService.storeUser(response.user, formData.rememberMe)

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      console.error('Login failed:', error)

      // Handle specific error messages with account lockout info
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed. Please try again.'

      // Check if account is locked
      if (error.locked === true || errorMessage.includes('Account locked')) {
        const lockedUntil = error.locked_until
          ? new Date(error.locked_until).toLocaleString()
          : 'unknown time'
        setErrors({
          submit: `${errorMessage}\nYour account will be unlocked at: ${lockedUntil}`,
        })
      } else if (error.remaining_attempts !== undefined) {
        // Show remaining attempts warning
        const attemptsText =
          error.remaining_attempts === 1 ? '1 attempt' : `${error.remaining_attempts} attempts`
        setErrors({
          submit: `Invalid credentials. You have ${attemptsText} remaining before your account is locked.`,
        })
      } else if (errorMessage.includes('Invalid')) {
        setErrors({
          submit: 'Invalid email or password. Please check your credentials and try again.',
        })
      } else {
        setErrors({
          submit: errorMessage || 'An error occurred during login. Please try again.',
        })
      }
    } finally {
      setLoading(false)
    }
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

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        {/* Navigation Header */}
        <AuthHeader title="Sign In" showBack showLogo />

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400">Sign in to your account</p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email or Username */}
          <Input
            label="Email or Username"
            type="text"
            placeholder="admin@cccplc.net or admin"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            error={touched.email ? errors.email : undefined}
            leftIcon={<EnvelopeIcon className="h-5 w-5" />}
            disabled={loading}
            fullWidth
            required
          />

          {/* Password */}
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'password' : 'password'}
              placeholder="Enter your password"
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
              className="absolute right-3 top-9 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
            >
              {showPassword ? '' : ''}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <Checkbox
              label="Remember me"
              checked={formData.rememberMe}
              onChange={(e) => handleChange('rememberMe', e.target.checked)}
              size="sm"
            />
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium cursor-pointer"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
