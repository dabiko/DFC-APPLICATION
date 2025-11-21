/**
 * Password Strength Validation Utilities
 * Evaluates password strength and provides feedback
 */

export type PasswordStrengthLevel = 'very-weak' | 'weak' | 'fair' | 'good' | 'strong'

export interface PasswordStrengthResult {
  level: PasswordStrengthLevel
  score: number // 0-100
  feedback: string[]
  color: string
  percentage: number
}

/**
 * Calculate password strength score
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      level: 'very-weak',
      score: 0,
      feedback: ['Password is required'],
      color: 'bg-gray-300',
      percentage: 0,
    }
  }

  let score = 0
  const feedback: string[] = []

  // Length check (max 40 points)
  if (password.length >= 8) {
    score += 10
  } else {
    feedback.push('Use at least 8 characters')
  }

  if (password.length >= 12) {
    score += 10
  }

  if (password.length >= 16) {
    score += 10
  }

  if (password.length >= 20) {
    score += 10
  }

  // Uppercase letters (15 points)
  if (/[A-Z]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add uppercase letters (A-Z)')
  }

  // Lowercase letters (15 points)
  if (/[a-z]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add lowercase letters (a-z)')
  }

  // Numbers (15 points)
  if (/\d/.test(password)) {
    score += 15
  } else {
    feedback.push('Add numbers (0-9)')
  }

  // Special characters (15 points)
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 15
  } else {
    feedback.push('Add special characters (!@#$%...)')
  }

  // No repeated characters (5 points)
  if (!/(.)\1{2,}/.test(password)) {
    score += 5
  } else {
    feedback.push('Avoid repeated characters')
  }

  // No sequential characters (5 points)
  if (!/(?:abc|bcd|cde|def|123|234|345|456|567|678|789)/i.test(password)) {
    score += 5
  } else {
    feedback.push('Avoid sequential characters')
  }

  // Determine level and color
  let level: PasswordStrengthLevel
  let color: string

  if (score >= 90) {
    level = 'strong'
    color = 'bg-green-500'
    if (feedback.length === 0) feedback.push('Excellent password!')
  } else if (score >= 70) {
    level = 'good'
    color = 'bg-blue-500'
  } else if (score >= 50) {
    level = 'fair'
    color = 'bg-yellow-500'
  } else if (score >= 30) {
    level = 'weak'
    color = 'bg-orange-500'
  } else {
    level = 'very-weak'
    color = 'bg-red-500'
  }

  return {
    level,
    score,
    feedback,
    color,
    percentage: score,
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(level: PasswordStrengthLevel): string {
  const labels: Record<PasswordStrengthLevel, string> = {
    'very-weak': 'Very Weak',
    weak: 'Weak',
    fair: 'Fair',
    good: 'Good',
    strong: 'Strong',
  }
  return labels[level]
}

/**
 * Validate password meets minimum requirements
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' }
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }

  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' }
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' }
  }

  return { valid: true }
}
