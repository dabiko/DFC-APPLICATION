# DFC Component Library Documentation

## Digital Filing Cabinet - Frontend Component Reference

**Version**: 1.0.0
**Framework**: React 19 + TypeScript
**Styling**: Tailwind CSS
**Storybook**: http://localhost:6006

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Design Tokens](#design-tokens)
3. [Component Catalog](#component-catalog)
4. [Usage Guidelines](#usage-guidelines)
5. [Accessibility](#accessibility)
6. [Contributing](#contributing)

---

## Getting Started

### Viewing Components in Storybook

```bash
cd frontend
npm run storybook
```

Navigate to http://localhost:6006 to browse all components interactively.

### Using Components in Your Code

```typescript
import { Button } from '@components/Button/Button'
import { Input } from '@components/Input/Input'

function MyPage() {
  return (
    <div>
      <Input label="Email" type="email" />
      <Button variant="primary">Submit</Button>
    </div>
  )
}
```

---

## Design Tokens

### Colors

#### Brand Colors

- **Primary**: Blue (#3B82F6) - Main actions, links
- **Secondary**: Purple (#8B5CF6) - Secondary actions
- **Accent**: Indigo (#6366F1) - Highlights

#### Semantic Colors

- **Success**: Green (#10B981) - Success messages, confirmations
- **Warning**: Yellow/Orange (#F59E0B) - Warnings, cautions
- **Error**: Red (#EF4444) - Errors, destructive actions
- **Info**: Blue (#3B82F6) - Informational messages

#### Confidentiality Levels (DFC-Specific)

- **Public**: Gray (#6B7280)
- **Internal**: Blue (#3B82F6)
- **Confidential**: Orange (#F97316)
- **Highly Confidential**: Red (#DC2626)

#### Neutral Colors

- **Gray Scale**: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900

### Typography

#### Font Family

- **Primary**: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif

#### Font Sizes

- **Tiny**: 0.75rem (12px)
- **Small**: 0.875rem (14px)
- **Base**: 1rem (16px)
- **Large**: 1.125rem (18px)
- **XL**: 1.25rem (20px)
- **2XL**: 1.5rem (24px)
- **3XL**: 1.875rem (30px)
- **4XL**: 2.25rem (36px)

#### Font Weights

- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Spacing

Based on 4px base unit:

- **0**: 0
- **1**: 0.25rem (4px)
- **2**: 0.5rem (8px)
- **3**: 0.75rem (12px)
- **4**: 1rem (16px)
- **5**: 1.25rem (20px)
- **6**: 1.5rem (24px)
- **8**: 2rem (32px)
- **10**: 2.5rem (40px)
- **12**: 3rem (48px)
- **16**: 4rem (64px)

### Border Radius

- **None**: 0
- **SM**: 0.125rem (2px)
- **Default**: 0.25rem (4px)
- **MD**: 0.375rem (6px)
- **LG**: 0.5rem (8px)
- **XL**: 0.75rem (12px)
- **2XL**: 1rem (16px)
- **Full**: 9999px (pill shape)

---

## Component Catalog

### 1. Button

**Location**: `src/components/Button/Button.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-button--primary

#### Variants

- `primary` - Primary actions (blue background)
- `secondary` - Secondary actions (outlined)
- `tertiary` - Tertiary actions (text only)
- `danger` - Destructive actions (red)
- `ghost` - Minimal style (transparent)

#### Sizes

- `sm` - Small (32px height)
- `md` - Medium (40px height, default)
- `lg` - Large (48px height)

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  disabled?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children: ReactNode
  onClick?: () => void
}
```

#### Example

```tsx
<Button variant="primary" size="lg" leftIcon={<UploadIcon />} loading={isUploading}>
  Upload Document
</Button>
```

---

### 2. Input

**Location**: `src/components/Input/Input.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-input--default

#### Types

- `text` - Text input
- `email` - Email input with validation
- `password` - Password input with show/hide toggle
- `search` - Search input with clear button
- `number` - Number input
- `tel` - Telephone input

#### Props

```typescript
interface InputProps {
  label?: string
  type?: string
  placeholder?: string
  value?: string
  error?: string
  helperText?: string
  disabled?: boolean
  required?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
}
```

#### Example

```tsx
<Input
  label="Email Address"
  type="email"
  placeholder="you@cccplc.net"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required
  fullWidth
/>
```

---

### 3. Select

**Location**: `src/components/Select/Select.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-select--single

#### Variants

- Single select
- Multi-select (with chips)
- Searchable dropdown

#### Props

```typescript
interface SelectProps {
  label?: string
  options: Array<{ value: string; label: string }>
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  searchable?: boolean
  multiple?: boolean
}
```

#### Example

```tsx
<Select
  label="Department"
  options={[
    { value: 'finance', label: 'Finance' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'it', label: 'IT' },
  ]}
  value={department}
  onChange={setDepartment}
  required
/>
```

---

### 4. Modal

**Location**: `src/components/Modal/Modal.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-modal--default

#### Types

- Standard modal
- Confirmation dialog
- Drawer (slide-in from side)

#### Props

```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
}
```

#### Example

```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Upload Document" size="lg">
  <UploadForm onSubmit={handleUpload} />
</Modal>
```

---

### 5. Badge

**Location**: `src/components/Badge/Badge.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-badge--default

#### Variants

- Standard badge
- Tag (removable)
- Confidentiality badge (color-coded)

#### Props

```typescript
interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  removable?: boolean
  onRemove?: () => void
}
```

#### Confidentiality Badge

```tsx
import { ConfidentialityBadge } from '@components/Badge/ConfidentialityBadge'

;<ConfidentialityBadge level="highly_confidential" />
// Renders: Red badge with "Highly Confidential" text
```

---

### 6. File Upload

**Location**: `src/components/FileUpload/FileUpload.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-fileupload--default

#### Features

- Drag-and-drop support
- Click to browse
- File type validation
- Size validation
- Progress tracking
- Multiple file upload
- Preview thumbnails

#### Props

```typescript
interface FileUploadProps {
  accept?: string // e.g., ".pdf,.doc,.docx"
  maxSize?: number // in bytes
  maxFiles?: number
  multiple?: boolean
  onFilesSelected?: (files: File[]) => void
  disabled?: boolean
}
```

#### Example

```tsx
<FileUpload
  accept=".pdf,.doc,.docx"
  maxSize={10 * 1024 * 1024} // 10MB
  multiple
  onFilesSelected={handleFiles}
/>
```

---

### 7. Date Picker

**Location**: `src/components/DatePicker/DatePicker.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-datepicker--single

#### Features

- Single date selection
- Date range selection
- Calendar popup
- Manual input (YYYY-MM-DD)
- Min/max date constraints

#### Props

```typescript
interface DatePickerProps {
  label?: string
  value?: Date
  onChange?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  disabled?: boolean
  required?: boolean
}
```

---

### 8. Table

**Location**: `src/components/Table/Table.tsx`
**Storybook**: http://localhost:6006/?path=/story/components-table--default

#### Features

- Sortable columns
- Row selection
- Pagination
- Grid view
- List view
- Custom cell rendering

#### Example

```tsx
<Table
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'modified', label: 'Modified', sortable: true },
  ]}
  data={documents}
  onRowClick={handleRowClick}
  selectable
/>
```

---

### 9. Navigation Components

#### Breadcrumbs

```tsx
<Breadcrumbs
  items={[
    { label: 'Home', href: '/' },
    { label: 'Documents', href: '/documents' },
    { label: 'Financial Reports', href: null }, // Current page
  ]}
/>
```

#### Tabs

```tsx
<Tabs
  tabs={[
    { id: 'details', label: 'Details', content: <Details /> },
    { id: 'versions', label: 'Versions', content: <Versions /> },
    { id: 'permissions', label: 'Permissions', content: <Permissions /> },
  ]}
  defaultTab="details"
/>
```

#### Pagination

```tsx
<Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
```

#### TreeView

```tsx
<TreeView data={folderTree} onNodeClick={handleFolderClick} expandable draggable />
```

---

### 10. Feedback Components

#### Alert

```tsx
<Alert variant="error" onClose={() => setShowAlert(false)}>
  Failed to upload document. Please try again.
</Alert>
```

#### Toast

```tsx
import { toast } from '@components/Feedback/Toast'

// Show toast notification
toast.success('Document uploaded successfully!')
toast.error('Upload failed')
toast.warning('File size exceeds limit')
toast.info('Processing document...')
```

#### Spinner

```tsx
<Spinner size="lg" /> // Loading indicator
```

#### Progress Bar

```tsx
<Progress value={uploadProgress} max={100} showLabel />
```

#### Skeleton Loader

```tsx
<Skeleton width={200} height={20} /> // Placeholder while loading
```

---

### 11. Layout Components

#### Three-Panel Layout

```tsx
<ThreePanelLayout
  leftPanel={<FolderNavigation />}
  centerPanel={<DocumentList />}
  rightPanel={<DocumentDetails />}
  leftPanelCollapsible
  rightPanelCollapsible
/>
```

---

### 12. Form Components

#### Checkbox

```tsx
<Checkbox label="I agree to the terms" checked={agreed} onChange={setAgreed} />
```

#### Radio Group

```tsx
<RadioGroup
  name="confidentiality"
  options={[
    { value: 'public', label: 'Public' },
    { value: 'internal', label: 'Internal' },
    { value: 'confidential', label: 'Confidential' },
  ]}
  value={level}
  onChange={setLevel}
/>
```

#### Switch

```tsx
<Switch label="Enable MFA" checked={mfaEnabled} onChange={setMfaEnabled} />
```

---

## Usage Guidelines

### When to Use Each Component

#### Buttons

- **Primary**: Main action on page (e.g., "Save", "Upload", "Submit")
- **Secondary**: Secondary actions (e.g., "Cancel", "Back")
- **Tertiary**: Less important actions (e.g., "Learn More")
- **Danger**: Destructive actions (e.g., "Delete", "Remove")
- **Ghost**: Minimal actions in tight spaces

#### Inputs

- **Text**: General text input
- **Email**: Email addresses (includes validation)
- **Password**: Passwords (includes show/hide)
- **Search**: Search queries (includes clear button)
- **Number**: Numeric values only

#### Modals

- **Standard**: Forms, content display
- **Confirmation**: Yes/No decisions
- **Drawer**: Side panel for details, filters

#### Alerts vs Toasts

- **Alert**: Persistent messages on page
- **Toast**: Temporary notifications (auto-dismiss)

---

## Accessibility

All components follow WCAG 2.1 AA standards:

### Keyboard Navigation

- **Tab**: Move to next interactive element
- **Shift+Tab**: Move to previous element
- **Enter/Space**: Activate buttons, checkboxes
- **Escape**: Close modals, dropdowns
- **Arrow Keys**: Navigate lists, menus

### Screen Reader Support

- All form inputs have associated labels
- ARIA attributes for complex interactions
- Status messages announced (loading, errors)
- Focus management in modals

### Color Contrast

- All text meets 4.5:1 contrast ratio
- Large text meets 3:1 contrast ratio
- Confidentiality badges have non-color indicators (text labels)

### Focus Indicators

- Visible focus ring on all interactive elements
- High contrast focus indicators (blue outline)

---

## Component Development Standards

### Creating a New Component

1. **Create component folder**:

   ```
   src/components/MyComponent/
   ├── MyComponent.tsx       # Main component
   ├── MyComponent.stories.tsx  # Storybook stories
   └── MyComponent.test.tsx  # Unit tests
   ```

2. **Component template**:

   ```tsx
   import { FC, ReactNode } from 'react'
   import { cn } from '@utils/cn'

   export interface MyComponentProps {
     variant?: 'default' | 'primary'
     children: ReactNode
     className?: string
   }

   export const MyComponent: FC<MyComponentProps> = ({
     variant = 'default',
     children,
     className,
   }) => {
     return <div className={cn('my-component', className)}>{children}</div>
   }
   ```

3. **Create Storybook story**:

   ```tsx
   import type { Meta, StoryObj } from '@storybook/react'
   import { MyComponent } from './MyComponent'

   const meta: Meta<typeof MyComponent> = {
     title: 'Components/MyComponent',
     component: MyComponent,
     tags: ['autodocs'],
   }

   export default meta
   type Story = StoryObj<typeof MyComponent>

   export const Default: Story = {
     args: {
       children: 'My Component',
     },
   }
   ```

4. **Write tests**:

   ```tsx
   import { render, screen } from '@testing-library/react'
   import { MyComponent } from './MyComponent'

   describe('MyComponent', () => {
     it('renders children', () => {
       render(<MyComponent>Hello</MyComponent>)
       expect(screen.getByText('Hello')).toBeInTheDocument()
     })
   })
   ```

---

## Contributing

### Component Checklist

Before submitting a new component:

- [ ] TypeScript types defined
- [ ] Props documented with JSDoc comments
- [ ] All variants implemented
- [ ] Storybook story created with all variants
- [ ] Unit tests written (>80% coverage)
- [ ] Accessibility tested (keyboard, screen reader)
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Color contrast verified (WCAG AA)
- [ ] Focus indicators visible
- [ ] Error states handled
- [ ] Loading states implemented
- [ ] Example usage in Storybook docs

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules
- Use Prettier for formatting
- Use Tailwind CSS for styling
- Use `cn()` utility for class merging
- Avoid inline styles
- Use semantic HTML
- Add ARIA attributes for accessibility

---

## Resources

- **Storybook**: http://localhost:6006
- **Tailwind CSS Docs**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Headless UI**: https://headlessui.com/ (used for complex components)

---

**Last Updated**: 2025-11-17
**Version**: 1.0.0
**Maintainers**: Frontend Team
