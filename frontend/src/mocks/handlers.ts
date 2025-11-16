import { http, HttpResponse } from 'msw'

// Define your API mock handlers here
// Example handlers for the DFC application

export const handlers = [
  // Authentication endpoints
  http.post('/api/v1/auth/login', async ({ request }) => {
    const { username, password } = (await request.json()) as { username: string; password: string }

    if (username === 'admin@example.com' && password === 'password') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: '1',
            username: 'admin',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            department: 'it',
          },
        },
      })
    }

    return HttpResponse.json(
      {
        success: false,
        message: 'Invalid credentials',
      },
      { status: 401 }
    )
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
