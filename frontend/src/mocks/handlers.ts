import { http, HttpResponse } from 'msw'

// Define your API mock handlers here
// Example handlers for the DFC application

export const handlers = [
  // Authentication endpoints
  http.post('/api/v1/auth/login/', async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password: string }

    // Mock users for testing
    if (email === 'admin@example.com' && password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          access: 'mock-access-token-' + Date.now(),
          refresh: 'mock-refresh-token-' + Date.now(),
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            department: 'IT',
            mfaEnabled: false,
          },
        },
      })
    }

    if (email === 'editor@example.com' && password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          access: 'mock-access-token-' + Date.now(),
          refresh: 'mock-refresh-token-' + Date.now(),
          user: {
            id: '2',
            username: 'editor',
            email: 'editor@example.com',
            firstName: 'John',
            lastName: 'Editor',
            role: 'editor',
            department: 'Accounting',
            mfaEnabled: true,
          },
        },
      })
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid email or password',
      },
      { status: 401 }
    )
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
        email: 'admin@example.com',
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
