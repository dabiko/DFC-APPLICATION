# Digital Filing Cabinet - Frontend

A comprehensive, production-ready component library for the Digital Filing Cabinet system.

## Features

- **25+ Production-Ready Components** with TypeScript
- **150+ Storybook Stories** with complete documentation
- **24 Passing Unit Tests** with Vitest + React Testing Library
- **Dark Mode Support** across all components
- **WCAG 2.1 AA Accessible** with keyboard navigation
- **Responsive Design** (mobile, tablet, desktop)
- **Complete Design System** with tokens and utilities

## Tech Stack

- React 19 + TypeScript 5.9
- Vite 7 + Tailwind CSS 4
- Headless UI + Heroicons
- Vitest + React Testing Library + Cypress
- Storybook 10

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Storybook
npm run storybook

# Run tests
npm test
```

## Component Library

### Form Components

- Button, Input, Textarea, Select, MultiSelect
- Checkbox, Radio, Switch
- DatePicker, DateRangePicker
- FileUpload (drag-and-drop)

### Feedback

- Toast, Alert, Spinner, Progress (linear & circular), Skeleton

### Navigation

- Breadcrumbs, Tabs, Pagination, TreeView

### Data Display

- Table (sortable, selectable), ListView, GridView
- Card, Badge, Tag, ConfidentialityBadge

### Layout

- ThreePanelLayout, Modal, Drawer

## Project Structure

```
frontend/
├── src/
│   ├── components/    # All UI components
│   ├── styles/        # Design tokens
│   ├── utils/         # Utility functions
│   └── test/          # Test setup
├── .storybook/        # Storybook config
└── vitest.config.ts   # Test config
```

## Scripts

```bash
npm run dev              # Start dev server
npm run build           # Build for production
npm test                # Run tests
npm run test:coverage   # Test coverage
npm run lint            # Lint code
npm run storybook       # Start Storybook
```

## Testing

- **24 unit tests** with 100% pass rate
- Vitest + React Testing Library
- Coverage for critical components

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- ARIA attributes

## Authors

- Cedric Mbah
- DabiTech

**Status**: Production Ready ✅
