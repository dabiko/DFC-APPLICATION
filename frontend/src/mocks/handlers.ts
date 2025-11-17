import { http, HttpResponse } from 'msw'

// Define your API mock handlers here
// Example handlers for the DFC application

// Track failed login attempts per email
const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes

// Mock users database
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@cccplc.net',
    password: 'password',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    mfaEnabled: false,
  },
  {
    id: '2',
    username: 'editor',
    email: 'editor@cccplc.net',
    password: 'password',
    firstName: 'John',
    lastName: 'Editor',
    role: 'editor',
    department: 'Accounting',
    mfaEnabled: false,
  },
  {
    id: '3',
    username: 'viewer',
    email: 'viewer@cccplc.net',
    password: 'password',
    firstName: 'Jane',
    lastName: 'Viewer',
    role: 'viewer',
    department: 'Compliance',
    mfaEnabled: false,
  },
]

export const handlers = [
  // Authentication endpoints
  http.post('/api/v1/auth/login/', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string }

    // Domain validation - only @cccplc.net emails allowed
    const emailDomain = email.split('@')[1]
    if (emailDomain !== 'cccplc.net') {
      return HttpResponse.json(
        {
          success: false,
          message: 'Access denied. Only CCC PLC email addresses (@cccplc.net) are allowed to access this system.',
          error: 'INVALID_DOMAIN',
        },
        { status: 403 }
      )
    }

    // Check if account is locked due to too many failed attempts
    const attempts = loginAttempts.get(email)
    if (attempts?.lockedUntil && Date.now() < attempts.lockedUntil) {
      const remainingTime = Math.ceil((attempts.lockedUntil - Date.now()) / 60000)
      return HttpResponse.json(
        {
          success: false,
          message: `Account temporarily locked due to multiple failed login attempts. Please try again in ${remainingTime} minutes.`,
          error: 'ACCOUNT_LOCKED',
          lockedUntil: attempts.lockedUntil,
        },
        { status: 423 }
      )
    }

    // Find user
    const user = mockUsers.find((u) => u.email === email)

    if (!user) {
      // Track failed attempt
      const currentAttempts = loginAttempts.get(email) || { count: 0 }
      currentAttempts.count += 1
      loginAttempts.set(email, currentAttempts)

      const remaining = MAX_ATTEMPTS - currentAttempts.count

      if (remaining <= 0) {
        // Lock the account
        currentAttempts.lockedUntil = Date.now() + LOCKOUT_DURATION
        loginAttempts.set(email, currentAttempts)

        return HttpResponse.json(
          {
            success: false,
            message: `Account locked due to ${MAX_ATTEMPTS} failed login attempts. Please try again in 15 minutes.`,
            error: 'ACCOUNT_LOCKED',
            remainingAttempts: 0,
          },
          { status: 423 }
        )
      }

      return HttpResponse.json(
        {
          success: false,
          message: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          error: 'INVALID_CREDENTIALS',
          remainingAttempts: remaining,
        },
        { status: 401 }
      )
    }

    // Check password
    if (user.password !== password) {
      // Track failed attempt
      const currentAttempts = loginAttempts.get(email) || { count: 0 }
      currentAttempts.count += 1
      loginAttempts.set(email, currentAttempts)

      const remaining = MAX_ATTEMPTS - currentAttempts.count

      if (remaining <= 0) {
        // Lock the account
        currentAttempts.lockedUntil = Date.now() + LOCKOUT_DURATION
        loginAttempts.set(email, currentAttempts)

        return HttpResponse.json(
          {
            success: false,
            message: `Account locked due to ${MAX_ATTEMPTS} failed login attempts. Please try again in 15 minutes.`,
            error: 'ACCOUNT_LOCKED',
            remainingAttempts: 0,
          },
          { status: 423 }
        )
      }

      return HttpResponse.json(
        {
          success: false,
          message: `Invalid email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          error: 'INVALID_CREDENTIALS',
          remainingAttempts: remaining,
        },
        { status: 401 }
      )
    }

    // Successful login - reset attempts
    loginAttempts.delete(email)

    return HttpResponse.json({
      success: true,
      data: {
        access: 'mock-access-token-' + Date.now(),
        refresh: 'mock-refresh-token-' + Date.now(),
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          department: user.department,
          mfaEnabled: user.mfaEnabled,
        },
      },
    })
  }),

  // Logout endpoint
  http.post('/api/v1/auth/logout/', async () => {
    return HttpResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  }),

  // Token refresh endpoint
  http.post('/api/v1/auth/refresh/', async ({ request }) => {
    const { refresh } = (await request.json()) as { refresh: string }

    if (refresh && refresh.startsWith('mock-refresh-token')) {
      return HttpResponse.json({
        success: true,
        data: {
          access: 'mock-access-token-refreshed-' + Date.now(),
        },
      })
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid refresh token',
      },
      { status: 401 }
    )
  }),

  // Get current user profile
  http.get('/api/v1/auth/profile/', ({ request }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        {
          success: false,
          message: 'Authentication required',
        },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: '1',
        username: 'admin',
        email: 'admin@cccplc.net',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        department: 'IT',
        mfaEnabled: false,
      },
    })
  }),

  // Example: Get documents
  http.get('/api/v1/documents', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          title: 'Sample Document',
          fileName: 'sample.pdf',
          fileType: 'application/pdf',
          fileSize: 1024000,
          documentType: 'invoice',
          folderId: 'folder-1',
          createdBy: 'admin',
          modifiedBy: 'admin',
          createdAt: '2025-01-01T00:00:00Z',
          modifiedAt: '2025-01-01T00:00:00Z',
          confidentialityLevel: 'internal',
          tags: ['important', 'finance'],
          versionNumber: 1,
          isOnLegalHold: false,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      hasMore: false,
    })
  }),

  // Add more handlers as needed for your API endpoints
]
