import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Enable MSW in development (DISABLED - using real backend)
// async function enableMocking() {
//   if (import.meta.env.DEV) {
//     const { worker } = await import('./mocks/browser')
//     return worker.start({
//       onUnhandledRequest: 'bypass',
//     })
//   }
// }

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

// Disabled MSW - now using real Django backend
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
