/**
 * SignUp Page
 * Comprehensive registration page with:
 * - Business email validation
 * - KYC fields
 * - Phone number with country selection
 * - Email & Phone OTP verification
 * - Password strength indicator
 * - Form validation
 * - Loading states
 */

import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Input } from '../components/Input/Input'
import { Button } from '../components/Button/Button'
import { Select } from '../components/Select/Select'
import { Checkbox } from '../components/Checkbox/Checkbox'
import { PasswordStrengthIndicator } from '../components/Auth/PasswordStrengthIndicator'
import { OTPVerificationModal } from '../components/Auth/OTPVerificationModal'
import { AuthHeader } from '../components/Auth/AuthHeader'
import { validateBusinessEmail } from '../utils/emailValidation'
import { validatePassword } from '../utils/passwordStrength'
import { COUNTRIES } from '../data/countries'
import {
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  BriefcaseIcon,
  IdentificationIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

interface FormData {
  // Company Information
  companyName: string
  companyRegistrationNumber: string
  companyTaxId: string
  industry: string

  // Personal Information (KYC)
  firstName: string
  lastName: string
  email: string
  phone: string
  country: string
  jobTitle: string

  // Address Information
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string

  // Security
  password: string
  confirmPassword: string

  // Agreements
  termsAccepted: boolean
  privacyAccepted: boolean
  marketingAccepted: boolean
}

interface FormErrors {
  [key: string]: string
}

export const SignUp: React.FC = () => {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    companyRegistrationNumber: '',
    companyTaxId: '',
    industry: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: 'US',
    jobTitle: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
    privacyAccepted: false,
    marketingAccepted: false,
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1) // 1: Company, 2: Personal, 3: Security
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [showEmailOTP, setShowEmailOTP] = useState(false)
  const [showPhoneOTP, setShowPhoneOTP] = useState(false)

  const industries = [
    'Financial Services',
    'Banking',
    'Insurance',
    'Legal Services',
    'Healthcare',
    'Technology',
    'Real Estate',
    'Consulting',
    'Manufacturing',
    'Education',
    'Government',
    'Non-Profit',
    'Other',
  ]

  const selectedCountry = COUNTRIES.find((c) => c.code === formData.country)

  // Background Animation Effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

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
    const particleCount = 20

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 15 + 8,
        speedY: (Math.random() - 0.5) * 0.3,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.2 + 0.05,
        type: ['file', 'folder', 'lock', 'check'][
          Math.floor(Math.random() * 4)
        ] as Particle['type'],
      })
    }

    const maxDistance = 120

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const isDark = document.documentElement.classList.contains('dark')

      // Draw connections
      particles.forEach((particle, i) => {
        particles.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.1
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
        particle.x += particle.speedX
        particle.y += particle.speedY

        if (particle.x < 0) particle.x = canvas.width
        if (particle.x > canvas.width) particle.x = 0
        if (particle.y < 0) particle.y = canvas.height
        if (particle.y > canvas.height) particle.y = 0

        ctx.save()
        ctx.globalAlpha = particle.opacity
        const color = isDark ? 'rgba(96, 165, 250, 1)' : 'rgba(59, 130, 246, 1)'

        switch (particle.type) {
          case 'file':
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
            break
          case 'folder':
            ctx.fillStyle = color
            ctx.fillRect(
              particle.x - particle.size / 2,
              particle.y,
              particle.size,
              particle.size * 0.8
            )
            break
          case 'lock':
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
            ctx.strokeStyle = color
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2)
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

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    validateField(field)
  }

  const validateField = (field: keyof FormData): boolean => {
    const value = formData[field]
    let error = ''

    switch (field) {
      case 'companyName':
        if (!value) error = 'Company name is required'
        else if ((value as string).length < 2) error = 'Company name must be at least 2 characters'
        break

      case 'companyRegistrationNumber':
        if (!value) error = 'Company registration number is required'
        break

      case 'companyTaxId':
        if (!value) error = 'Tax ID is required'
        break

      case 'industry':
        if (!value) error = 'Industry is required'
        break

      case 'country':
        if (!value) error = 'Country is required'
        break

      case 'email': {
        const emailValidation = validateBusinessEmail(value as string)
        if (!emailValidation.valid) error = emailValidation.error || 'Invalid email'
        break
      }

      case 'phone':
        if (!value) error = 'Phone number is required'
        else if ((value as string).replace(/\D/g, '').length < 6)
          error = 'Please enter a valid phone number'
        break

      case 'firstName':
      case 'lastName':
        if (!value) error = `${field === 'firstName' ? 'First' : 'Last'} name is required`
        else if ((value as string).length < 2) error = 'Must be at least 2 characters'
        break

      case 'jobTitle':
        if (!value) error = 'Job title is required'
        break

      case 'addressLine1':
        if (!value) error = 'Address is required'
        break

      case 'city':
        if (!value) error = 'City is required'
        break

      case 'state':
        if (!value) error = 'State/Province is required'
        break

      case 'postalCode':
        if (!value) error = 'Postal code is required'
        break

      case 'password': {
        const passwordValidation = validatePassword(value as string)
        if (!passwordValidation.valid) error = passwordValidation.error || 'Invalid password'
        break
      }

      case 'confirmPassword':
        if (!value) error = 'Please confirm your password'
        else if (value !== formData.password) error = 'Passwords do not match'
        break

      case 'termsAccepted':
      case 'privacyAccepted':
        if (!value) error = 'You must accept to continue'
        break
    }

    if (error) {
      setErrors((prev) => ({ ...prev, [field]: error }))
      return false
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      return true
    }
  }

  const validateStep = (step: number): boolean => {
    let fieldsToValidate: (keyof FormData)[] = []

    if (step === 1) {
      fieldsToValidate = ['companyName', 'companyRegistrationNumber', 'companyTaxId', 'industry']
    } else if (step === 2) {
      fieldsToValidate = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'country',
        'jobTitle',
        'addressLine1',
        'city',
        'state',
        'postalCode',
      ]
    } else if (step === 3) {
      fieldsToValidate = ['password', 'confirmPassword', 'termsAccepted', 'privacyAccepted']
    }

    let isValid = true
    fieldsToValidate.forEach((field) => {
      if (!validateField(field)) {
        isValid = false
      }
    })

    return isValid
  }

  const handleNext = () => {
    // Mark all fields in current step as touched to show validation errors
    let fieldsToValidate: (keyof FormData)[] = []

    if (currentStep === 1) {
      fieldsToValidate = ['companyName', 'companyRegistrationNumber', 'companyTaxId', 'industry']
    } else if (currentStep === 2) {
      fieldsToValidate = [
        'firstName',
        'lastName',
        'email',
        'phone',
        'country',
        'jobTitle',
        'addressLine1',
        'city',
        'state',
        'postalCode',
      ]
    } else if (currentStep === 3) {
      fieldsToValidate = ['password', 'confirmPassword', 'termsAccepted', 'privacyAccepted']
    }

    // Mark all fields as touched
    const touchedUpdates: { [key: string]: boolean } = {}
    fieldsToValidate.forEach((field) => {
      touchedUpdates[field] = true
    })
    setTouched((prev) => ({ ...prev, ...touchedUpdates }))

    // Validate step - use setTimeout to ensure touched state is updated before validation
    // This ensures error messages are visible when validation fails
    setTimeout(() => {
      if (validateStep(currentStep)) {
        if (currentStep === 2 && !emailVerified) {
          // Blur the button before opening modal to prevent focus trap conflict
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
          // Delay modal opening to allow focus to be released
          setTimeout(() => {
            setShowEmailOTP(true)
          }, 0)
          return
        }
        setCurrentStep((prev) => Math.min(prev + 1, 3))
      }
    }, 0)
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSendEmailOTP = async () => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Sending email OTP to:', formData.email)
  }

  const handleVerifyEmailOTP = async (otp: string) => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (otp === '123456') {
      // Demo OTP
      setEmailVerified(true)
      setShowEmailOTP(false)
      if (phoneVerified || !formData.phone) {
        setCurrentStep(3)
      } else {
        // Delay phone OTP modal opening to allow email modal to fully close
        setTimeout(() => {
          setShowPhoneOTP(true)
        }, 100)
      }
    } else {
      throw new Error('Invalid OTP code')
    }
  }

  const handleSendPhoneOTP = async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    console.log('Sending phone OTP to:', selectedCountry?.phoneCode, formData.phone)
  }

  const handleVerifyPhoneOTP = async (otp: string) => {
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (otp === '123456') {
      setPhoneVerified(true)
      setShowPhoneOTP(false)
      setCurrentStep(3)
    } else {
      throw new Error('Invalid OTP code')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Mark all step 3 fields as touched to show validation errors
    const step3Fields: (keyof FormData)[] = [
      'password',
      'confirmPassword',
      'termsAccepted',
      'privacyAccepted',
    ]
    const touchedUpdates: { [key: string]: boolean } = {}
    step3Fields.forEach((field) => {
      touchedUpdates[field] = true
    })
    setTouched((prev) => ({ ...prev, ...touchedUpdates }))

    if (!validateStep(3)) {
      return
    }

    setLoading(true)

    try {
      // Call the comprehensive registration API
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/auth/register/comprehensive/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            // Step 1: Company Information
            company_name: formData.companyName,
            company_registration_number: formData.companyRegistrationNumber,
            company_tax_id: formData.companyTaxId,
            industry: formData.industry,

            // Step 2: Personal Information & KYC
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone,
            country: formData.country,
            job_title: formData.jobTitle,

            // Address Information
            address_line1: formData.addressLine1,
            address_line2: formData.addressLine2,
            city: formData.city,
            state: formData.state,
            postal_code: formData.postalCode,

            // Step 3: Security
            password: formData.password,
            confirm_password: formData.confirmPassword,

            // Agreements
            terms_accepted: formData.termsAccepted,
            privacy_accepted: formData.privacyAccepted,
            marketing_accepted: formData.marketingAccepted,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || errorData.error || 'Registration failed')
      }

      const data = await response.json()
      console.log('Registration successful:', data)

      // Store tokens if returned
      if (data.tokens) {
        localStorage.setItem('access_token', data.tokens.access)
        localStorage.setItem('refresh_token', data.tokens.refresh)
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      // Navigate to success page or dashboard
      navigate('/login?registered=true')
    } catch (error) {
      console.error('Registration failed:', error)
      setErrors((prev) => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      }))
    } finally {
      setLoading(false)
    }
  }

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, label: 'Company Info' },
      { number: 2, label: 'Personal Info' },
      { number: 3, label: 'Security' },
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep >= step.number
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {step.number}
              </div>
              <span
                className={`text-xs mt-2 ${
                  currentStep >= step.number
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 rounded transition-all ${
                  currentStep > step.number ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
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

      <div className="relative z-10 w-full max-w-2xl bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
        {/* Navigation Header */}
        <AuthHeader title="Sign Up" showBack showLogo />

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <BuildingOfficeIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Join DabiTech's Digital Filing Cabinet</p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Company Information
              </h2>

              <Input
                label="Company Name"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                onBlur={() => handleBlur('companyName')}
                error={touched.companyName ? errors.companyName : undefined}
                leftIcon={<BuildingOfficeIcon className="w-5 h-5" />}
                placeholder="Acme Corporation"
                required
                fullWidth
              />

              <Input
                label="Company Registration Number"
                value={formData.companyRegistrationNumber}
                onChange={(e) => handleChange('companyRegistrationNumber', e.target.value)}
                onBlur={() => handleBlur('companyRegistrationNumber')}
                error={
                  touched.companyRegistrationNumber ? errors.companyRegistrationNumber : undefined
                }
                leftIcon={<IdentificationIcon className="w-5 h-5" />}
                placeholder="123456789"
                required
                fullWidth
              />

              <Input
                label="Tax ID / VAT Number"
                value={formData.companyTaxId}
                onChange={(e) => handleChange('companyTaxId', e.target.value)}
                onBlur={() => handleBlur('companyTaxId')}
                error={touched.companyTaxId ? errors.companyTaxId : undefined}
                leftIcon={<IdentificationIcon className="w-5 h-5" />}
                placeholder="XX-XXXXXXX"
                required
                fullWidth
              />

              <Select
                label="Industry"
                value={formData.industry}
                onChange={(value) => handleChange('industry', value as string)}
                error={touched.industry ? errors.industry : undefined}
                placeholder="Select industry..."
                options={industries.map((industry) => ({
                  value: industry,
                  label: industry,
                }))}
                fullWidth
              />
            </div>
          )}

          {/* Step 2: Personal Information & KYC */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Personal Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  error={touched.firstName ? errors.firstName : undefined}
                  leftIcon={<UserIcon className="w-5 h-5" />}
                  placeholder="John"
                  required
                  fullWidth
                />

                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                  error={touched.lastName ? errors.lastName : undefined}
                  leftIcon={<UserIcon className="w-5 h-5" />}
                  placeholder="Doe"
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Company Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                error={touched.email ? errors.email : undefined}
                leftIcon={<EnvelopeIcon className="w-5 h-5" />}
                rightIcon={
                  emailVerified ? (
                    <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                      Verified
                    </span>
                  ) : undefined
                }
                placeholder="john.doe@company.com"
                helperText="Personal email addresses (Gmail, Yahoo, etc.) are not allowed"
                required
                fullWidth
              />

              <Input
                label="Job Title / Position"
                value={formData.jobTitle}
                onChange={(e) => handleChange('jobTitle', e.target.value)}
                onBlur={() => handleBlur('jobTitle')}
                error={touched.jobTitle ? errors.jobTitle : undefined}
                leftIcon={<BriefcaseIcon className="w-5 h-5" />}
                placeholder="Chief Financial Officer"
                required
                fullWidth
              />

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <Select
                    label="Country"
                    value={formData.country}
                    onChange={(value) => handleChange('country', value as string)}
                    placeholder="Select country..."
                    searchable
                    options={COUNTRIES.map((country) => ({
                      value: country.code,
                      label: `${country.flag} ${country.name}`,
                    }))}
                    fullWidth
                  />
                </div>

                <div className="col-span-2">
                  <Input
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, ''))}
                    onBlur={() => handleBlur('phone')}
                    error={touched.phone ? errors.phone : undefined}
                    leftIcon={
                      <div className="flex items-center gap-1">
                        <PhoneIcon className="w-5 h-5" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {selectedCountry?.phoneCode}
                        </span>
                      </div>
                    }
                    rightIcon={
                      phoneVerified ? (
                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                          Verified
                        </span>
                      ) : undefined
                    }
                    placeholder="1234567890"
                    required
                    fullWidth
                  />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4">
                Business Address
              </h3>

              <Input
                label="Address Line 1"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                onBlur={() => handleBlur('addressLine1')}
                error={touched.addressLine1 ? errors.addressLine1 : undefined}
                leftIcon={<MapPinIcon className="w-5 h-5" />}
                placeholder="123 Main Street"
                required
                fullWidth
              />

              <Input
                label="Address Line 2 (Optional)"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                placeholder="Suite 100"
                fullWidth
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  onBlur={() => handleBlur('city')}
                  error={touched.city ? errors.city : undefined}
                  placeholder="New York"
                  required
                  fullWidth
                />

                <Input
                  label="State / Province"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  onBlur={() => handleBlur('state')}
                  error={touched.state ? errors.state : undefined}
                  placeholder="NY"
                  required
                  fullWidth
                />
              </div>

              <Input
                label="Postal / ZIP Code"
                value={formData.postalCode}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                onBlur={() => handleBlur('postalCode')}
                error={touched.postalCode ? errors.postalCode : undefined}
                placeholder="10001"
                required
                fullWidth
              />
            </div>
          )}

          {/* Step 3: Security */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Set Up Your Password
              </h2>

              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                error={touched.password ? errors.password : undefined}
                placeholder="Create a strong password"
                required
                fullWidth
              />

              {formData.password && <PasswordStrengthIndicator password={formData.password} />}

              <Input
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                onBlur={() => handleBlur('confirmPassword')}
                error={touched.confirmPassword ? errors.confirmPassword : undefined}
                placeholder="Re-enter your password"
                required
                fullWidth
              />

              <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Checkbox
                  label={
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I agree to the{' '}
                      <a
                        href="/terms"
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Terms of Service
                      </a>
                    </span>
                  }
                  checked={formData.termsAccepted}
                  onChange={(e) => handleChange('termsAccepted', e.target.checked)}
                  error={touched.termsAccepted ? errors.termsAccepted : undefined}
                />

                <Checkbox
                  label={
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I agree to the{' '}
                      <a
                        href="/privacy"
                        className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Privacy Policy
                      </a>
                    </span>
                  }
                  checked={formData.privacyAccepted}
                  onChange={(e) => handleChange('privacyAccepted', e.target.checked)}
                  error={touched.privacyAccepted ? errors.privacyAccepted : undefined}
                />

                <Checkbox
                  label={
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      I want to receive product updates and marketing communications (optional)
                    </span>
                  }
                  checked={formData.marketingAccepted}
                  onChange={(e) => handleChange('marketingAccepted', e.target.checked)}
                />
              </div>

              {errors.submit && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 pt-6">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
                className="flex-1 cursor-pointer"
              >
                Back
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex-1 cursor-pointer"
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="flex-1 cursor-pointer"
              >
                Create Account
              </Button>
            )}
          </div>
        </form>

        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* OTP Modals */}
      <OTPVerificationModal
        isOpen={showEmailOTP}
        onClose={() => setShowEmailOTP(false)}
        onVerify={handleVerifyEmailOTP}
        type="email"
        destination={formData.email}
        onResend={handleSendEmailOTP}
      />

      <OTPVerificationModal
        isOpen={showPhoneOTP}
        onClose={() => setShowPhoneOTP(false)}
        onVerify={handleVerifyPhoneOTP}
        type="phone"
        destination={`${selectedCountry?.phoneCode} ${formData.phone}`}
        onResend={handleSendPhoneOTP}
      />
    </div>
  )
}
