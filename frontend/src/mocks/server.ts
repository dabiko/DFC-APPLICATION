import { setupServer } from 'msw/node'
import { handlers } from './handlers'

// This configures a request mocking server with the given request handlers for Node.js (for tests)
export const server = setupServer(...handlers)
