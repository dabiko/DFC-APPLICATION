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
          message:
            'Access denied. Only CCC PLC email addresses (@cccplc.net) are allowed to access this system.',
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

  // Billing endpoints
  http.get('/api/v1/billing/subscription/', () => {
    return HttpResponse.json({
      id: 'sub_123',
      userId: 'user_123',
      planId: 'professional',
      plan: {
        id: 'professional',
        name: 'Professional',
        price: 29.99,
        billingCycle: 'monthly',
        features: ['50 users', '1TB storage', 'Priority support'],
      },
      status: 'active',
      billingCycle: 'monthly',
      currentPeriodStart: '2025-11-01T00:00:00Z',
      currentPeriodEnd: '2025-12-01T00:00:00Z',
      cancelAtPeriodEnd: false,
      autoRenew: true,
      usage: {
        users: { current: 18, limit: 50 },
        storage: { currentGB: 425, limitGB: 1000, percentage: 42.5 },
        documents: { current: 8500, limit: 100000, percentage: 8.5 },
        folders: { current: 342, limit: 1000 },
        apiCalls: { currentMonth: 75000, limit: 1000000, percentage: 7.5 },
      },
      createdAt: '2025-01-15T00:00:00Z',
      updatedAt: '2025-11-01T00:00:00Z',
    })
  }),

  http.get('/api/v1/billing/plans/', () => {
    return HttpResponse.json([
      {
        id: 'starter',
        name: 'Starter',
        price: 9.99,
        billingCycle: 'monthly',
        features: ['5 users', '10GB storage'],
      },
      {
        id: 'professional',
        name: 'Professional',
        price: 29.99,
        billingCycle: 'monthly',
        features: ['50 users', '1TB storage'],
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 99.99,
        billingCycle: 'monthly',
        features: ['Unlimited users', '10TB storage'],
      },
    ])
  }),

  http.get('/api/v1/billing/payment-methods/', () => {
    return HttpResponse.json([
      {
        id: 'pm_1',
        type: 'card',
        isDefault: true,
        card: {
          brand: 'visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2026,
          holderName: 'Admin User',
        },
        createdAt: '2025-01-15T00:00:00Z',
      },
    ])
  }),

  http.get('/api/v1/billing/invoices/', () => {
    return HttpResponse.json({
      results: [
        {
          id: 'inv_1',
          invoiceNumber: 'INV-2025-11-001',
          status: 'paid',
          amount: 29.99,
          currency: 'USD',
          description: 'Professional Plan - November 2025',
          dueDate: '2025-11-01T00:00:00Z',
          paidAt: '2025-11-01T00:00:00Z',
          createdAt: '2025-11-01T00:00:00Z',
        },
      ],
      count: 1,
    })
  }),

  http.get('/api/v1/billing/usage/', () => {
    return HttpResponse.json({
      users: { current: 18, limit: 50 },
      storage: { currentGB: 425, limitGB: 1000, percentage: 42.5 },
      documents: { current: 8500, limit: 100000, percentage: 8.5 },
    })
  }),

  http.get('/api/v1/billing/usage/alerts/', () => {
    return HttpResponse.json([])
  }),

  // Document stats endpoints
  http.get('/api/v1/documents/my-documents/stats/', () => {
    return HttpResponse.json({ count: 150, size: 1024000000 })
  }),

  http.get('/api/v1/shared-with-me/stats/', () => {
    return HttpResponse.json({ count: 25, size: 256000000 })
  }),

  http.get('/api/v1/documents/recent/stats/', () => {
    return HttpResponse.json({ count: 10 })
  }),

  http.get('/api/v1/folders/trash/', () => {
    return HttpResponse.json({ count: 5, folders: [], documents: [] })
  }),

  // Department navigation
  http.get('/api/v1/departments/navigation/', () => {
    return HttpResponse.json([
      {
        department: { id: 1, name: 'IT', code: 'IT' },
        accessType: 'own',
        folderCount: 10,
      },
    ])
  }),

  // Folders endpoint
  http.get('/api/v1/folders/', () => {
    return HttpResponse.json({
      results: [],
      count: 0,
    })
  }),

  // Add more handlers as needed for your API endpoints
]
