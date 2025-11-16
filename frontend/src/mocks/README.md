# API Mocking with Mock Service Worker (MSW)

This directory contains the Mock Service Worker (MSW) configuration for the DFC application.

## Files

- **handlers.ts**: API request handlers that intercept and mock API responses
- **browser.ts**: MSW setup for browser/development use
- **server.ts**: MSW setup for Node.js/testing use
- **mockData.ts**: Mock data objects used in handlers and tests

## Usage

### In Development

To enable MSW in development mode, you can optionally start the service worker in your `main.tsx`:

```typescript
if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const { worker } = await import('./mocks/browser')
  worker.start()
}
```

Then add `VITE_ENABLE_MOCKS=true` to your `.env.local` file.

### In Tests

MSW is automatically configured in the test setup (`src/test/setup.ts`). All tests will use the mock handlers by default.

To override handlers for a specific test:

```typescript
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

test('custom handler', async () => {
  server.use(
    http.get('/api/v1/documents', () => {
      return HttpResponse.json({ data: [] })
    })
  )
  // Your test code here
})
```

## Adding New Handlers

Add new request handlers to `handlers.ts`:

```typescript
export const handlers = [
  // ... existing handlers
  http.get('/api/v1/your-endpoint', () => {
    return HttpResponse.json({ your: 'data' })
  }),
]
```

## Documentation

For more information, see the [MSW documentation](https://mswjs.io/).
