# Digital Filing Cabinet (DFC) - Frontend

A secure, scalable, and compliant document management system frontend built for CCC PLC. This application enables efficient storage, retrieval, classification, and sharing of sensitive financial documents across departments.

## 🚀 Quick Start

### Prerequisites

- Node.js v18+ LTS (currently using v22.21.0)
- npm v9+ (currently using v11.6.2)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page-level components
│   ├── layouts/         # Layout components (3-panel)
│   ├── services/        # API service layer
│   ├── store/           # Redux Toolkit state management
│   │   └── slices/      # Redux slices
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   ├── types/           # TypeScript type definitions
│   ├── assets/          # Images, icons, fonts
│   ├── styles/          # Global styles
│   ├── mocks/           # MSW API mocks
│   └── test/            # Test utilities and setup
├── cypress/             # E2E tests
│   ├── e2e/             # E2E test specs
│   ├── fixtures/        # Test fixtures
│   └── support/         # Cypress support files
├── .storybook/          # Storybook configuration
└── public/              # Static assets
```

## 🛠 Technology Stack

### Core

- **React 19** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS 4** - Utility-first CSS framework

### State Management

- **Redux Toolkit 2** - State management
- **React Redux 9** - React bindings for Redux

### Testing

- **Vitest 4** - Unit testing framework
- **React Testing Library 16** - Component testing
- **Cypress 15** - E2E testing
- **MSW 2** - API mocking

### Development Tools

- **Storybook 10** - Component development and documentation
- **ESLint 9** - Code linting
- **Prettier 3** - Code formatting
- **Husky 9** - Git hooks
- **lint-staged 16** - Run linters on git staged files

## 🧪 Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Testing

```bash
npm run test              # Run unit tests (watch mode)
npm run test:ui           # Run tests with UI
npm run test:coverage     # Generate coverage report
npm run cypress           # Open Cypress E2E tests
npm run cypress:headless  # Run Cypress tests headlessly
npm run test:e2e          # Run E2E tests with server
```

### Code Quality

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint errors
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

### Storybook

```bash
npm run storybook        # Start Storybook dev server
npm run build-storybook  # Build Storybook for production
```

## 📝 Code Style & Conventions

### TypeScript

- Strict mode enabled
- Use explicit types when type inference is unclear
- Prefer interfaces over types for object shapes
- Use enums for known sets of values

### React

- Functional components with hooks
- Use TypeScript for props typing
- Follow the container/presentational component pattern
- Custom hooks for reusable logic

### File Naming

- Components: PascalCase (`Button.tsx`)
- Utilities/Hooks: camelCase (`useAuth.ts`)
- Tests: Component name + `.test.tsx` or `.cy.ts`
- Storybook: Component name + `.stories.tsx`

### Import Aliases

Path aliases are configured for cleaner imports:

```typescript
import { Button } from '@components/Button'
import { useAuth } from '@hooks/useAuth'
import { User } from '@types/index'
import { apiClient } from '@services/api'
```

## 🎨 Styling

### Tailwind CSS

The project uses Tailwind CSS with custom configuration:

- **Confidentiality Colors**:
  - Gray (`confidentiality-public`) - Public documents
  - Blue (`confidentiality-internal`) - Internal documents
  - Orange (`confidentiality-confidential`) - Confidential documents
  - Red (`confidentiality-highly-confidential`) - Highly confidential documents

### Usage

```tsx
<div className="bg-confidentiality-confidential text-white px-4 py-2 rounded-md">
  Confidential Document
</div>
```

## 🧩 Component Development

Components should be developed in isolation using Storybook:

```bash
npm run storybook
```

### Creating a New Component

1. Create component file in `src/components/`
2. Create corresponding `.stories.tsx` file
3. Create corresponding `.test.tsx` file
4. Document props and usage in Storybook

## 🔒 Security Considerations

- All API requests authenticated with JWT tokens
- Confidentiality levels enforced on all documents
- Input validation and sanitization
- XSS protection through React's built-in escaping
- CSRF protection through token-based auth

## 🧪 Testing Strategy

### Unit Tests

Test individual components and utility functions:

```typescript
import { render, screen } from '@test/utils'
import { Button } from './Button'

test('renders button with text', () => {
  render(<Button>Click me</Button>)
  expect(screen.getByText('Click me')).toBeInTheDocument()
})
```

### E2E Tests

Test complete user workflows with Cypress:

```typescript
describe('Login flow', () => {
  it('allows user to login', () => {
    cy.visit('/login')
    cy.get('input[name="email"]').type('user@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })
})
```

## 🎯 Development Workflow

### Git Hooks

Pre-commit hooks automatically:

- Run ESLint on staged files
- Format code with Prettier
- Prevent commits with linting errors

### Making Changes

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Run tests locally
5. Commit (pre-commit hooks will run)
6. Push and create PR

## 📦 API Integration

### Using MSW for Development

Mock API handlers are configured in `src/mocks/handlers.ts`. To enable mocking in development:

1. Create `.env.local`:

   ```
   VITE_ENABLE_MOCKS=true
   ```

2. Update `src/main.tsx` to start MSW worker

### API Service Layer

All API calls should go through the service layer in `src/services/`:

```typescript
import { apiClient } from '@services/api'

const documents = await apiClient.get('/documents')
```

## 🌐 Browser Support

- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Vitest Documentation](https://vitest.dev/)
- [Cypress Documentation](https://www.cypress.io/)
- [Storybook Documentation](https://storybook.js.org/)

## ♿ Accessibility

This application is built with WCAG 2.1 AA compliance in mind:

- Keyboard navigation for all features
- Screen reader support
- Color contrast ratios ≥4.5:1 for normal text
- Focus indicators visible
- Semantic HTML elements

## 🏗 Build & Deployment

### Production Build

```bash
npm run build
```

Build artifacts will be in the `dist/` directory.

### Environment Variables

Create `.env.local` for local development:

```env
VITE_API_URL=http://localhost:8000
VITE_ENABLE_MOCKS=false
```

## 📄 License

Private - CCC PLC Internal Use Only

## 👥 Team

Frontend Development Team - DFC Project

---

For backend documentation, see `../backend/README.md`
For project requirements, see `../CLAUDE.md`
