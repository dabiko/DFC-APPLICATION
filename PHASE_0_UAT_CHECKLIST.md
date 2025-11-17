# Phase 0 UAT (User Acceptance Testing) Checklist
## Digital Filing Cabinet - Frontend Foundations

**Test Date**: _______________
**Tester Name**: _______________
**Environment**: Development
**Phase**: Phase 0 - Foundations & Infrastructure

---

## ✅ CRITICAL SERVERS STATUS

### Development Server
- [ ] **Dev Server Running**: Vite development server is running at http://localhost:3003
- [ ] **No Console Errors**: Open browser console (F12) - no red errors visible
- [ ] **Hot Module Replacement**: Make a small change to any component and verify it auto-reloads
- [ ] **Fast Refresh**: Changes appear within 1-2 seconds

### Storybook Server
- [ ] **Storybook Running**: Storybook accessible at http://localhost:6006
- [ ] **All Components Listed**: Sidebar shows all component categories
- [ ] **No Loading Errors**: No error messages on Storybook homepage

---

## UAT-0.1: DEVELOPMENT ENVIRONMENT ✅

### Build & Compilation
- [ ] Run `npm run build` - build completes successfully with no errors
- [ ] TypeScript compilation succeeds (no type errors)
- [ ] Production build files created in `dist/` folder
- [ ] Build size is reasonable (<2MB total)

### Code Quality Tools
- [ ] Run `npm run lint` - ESLint runs with no critical errors
- [ ] Run `npm run format:check` - Prettier formatting verified
- [ ] Pre-commit hooks work (Husky) - try making a commit with poorly formatted code
- [ ] Git hooks prevent commits with linting errors

**Test Commands:**
```bash
cd frontend
npm run build
npm run lint
npm run format:check
```

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## UAT-0.2: COMPONENT LIBRARY (Storybook)

### Navigate to http://localhost:6006 and verify each component:

### Button Component
- [ ] **Renders correctly** in Storybook
- [ ] **Variants work**: Primary, Secondary, Tertiary, Danger, Ghost
- [ ] **Sizes work**: Small, Medium, Large
- [ ] **States work**:
  - [ ] Hover (color changes on hover)
  - [ ] Active (click and hold)
  - [ ] Disabled (greyed out, not clickable)
  - [ ] Loading (shows spinner)
- [ ] **Icon support**: Left icon, Right icon, Icon-only buttons display
- [ ] **Keyboard accessible**: Tab to button, press Enter/Space to activate

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Input Components
- [ ] **Text Input** renders and accepts input
- [ ] **Textarea** renders and accepts multi-line text
- [ ] **Password Input** has show/hide toggle
- [ ] **Search Input** has clear button (X)
- [ ] **Number Input** accepts only numbers
- [ ] **Email Input** accepts email format
- [ ] **States work**:
  - [ ] Default state
  - [ ] Focus (border highlights when clicked)
  - [ ] Error state (red border, error message shows)
  - [ ] Disabled state (greyed out, cannot type)
- [ ] **Labels** display correctly
- [ ] **Helper text** displays below input
- [ ] **Error messages** display in red

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Select & Dropdown
- [ ] **Single select** opens dropdown menu
- [ ] **Multi-select** allows multiple selections with chips
- [ ] **Searchable dropdown** filters options as you type
- [ ] **Custom option rendering** works (if applicable)
- [ ] **Keyboard navigation**: Arrow keys navigate options, Enter selects

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Date Picker
- [ ] **Calendar popup** opens when clicked
- [ ] **Can select single date**
- [ ] **Date range picker** allows start and end date
- [ ] **Manual input** accepts YYYY-MM-DD format
- [ ] **Calendar navigation** (previous/next month) works
- [ ] **Today button** selects current date

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### File Upload
- [ ] **Drag-and-drop zone** highlights when dragging files over it
- [ ] **Click to browse** opens file picker
- [ ] **File type validation** works (try uploading wrong file type)
- [ ] **Size validation** warns for large files
- [ ] **Progress bar** displays during upload simulation
- [ ] **Preview thumbnails** show for uploaded files
- [ ] **Remove file** button works (X button)

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Checkbox, Radio, Switch
- [ ] **Checkbox** toggles on/off
- [ ] **Radio buttons** allow single selection in group
- [ ] **Toggle switch** animates smoothly
- [ ] **States**: Checked, Unchecked, Indeterminate (for checkbox), Disabled
- [ ] **Keyboard accessible**: Space to toggle

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Modal/Dialog
- [ ] **Standard modal** opens and closes
- [ ] **Confirmation dialog** displays with Yes/No buttons
- [ ] **Drawer** slides in from side
- [ ] **Close button** (X) works
- [ ] **Overlay click** closes modal
- [ ] **Escape key** closes modal
- [ ] **Focus traps** inside modal (Tab stays within modal)
- [ ] **Focus restoration** (returns focus to trigger button after close)

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Card Component
- [ ] **Basic card** renders with padding
- [ ] **Clickable card** has hover effect
- [ ] **Card sections** (header, image, content) display correctly
- [ ] **Elevation variants** (shadow depth) visible

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Badge/Tag Component
- [ ] **Color variants** display correctly
- [ ] **Removable tags** have X button that works
- [ ] **Tag input** allows adding multiple tags
- [ ] **Confidentiality badges** show correct colors:
  - [ ] Gray for Public
  - [ ] Blue for Internal
  - [ ] Orange for Confidential
  - [ ] Red for Highly Confidential

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Navigation Components
- [ ] **Breadcrumbs** display path with clickable segments
- [ ] **Tree view** expands/collapses folders
- [ ] **Tabs** switch between panels
- [ ] **Pagination** has Previous/Next buttons and page numbers

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Feedback Components
- [ ] **Toast notification** appears and auto-dismisses
- [ ] **Alert banners** display: Success (green), Warning (yellow), Error (red), Info (blue)
- [ ] **Loading spinner** animates smoothly
- [ ] **Progress bars** (linear and circular) show progress percentage
- [ ] **Skeleton loaders** display placeholder content

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

### Table/List Components
- [ ] **Data table** displays with columns and rows
- [ ] **Sortable columns** change order when header clicked
- [ ] **Grid view** displays items in grid
- [ ] **List view** displays items in rows
- [ ] **Row selection** checkboxes work
- [ ] **Expandable rows** (if applicable) expand/collapse

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## UAT-0.3: RESPONSIVE LAYOUT

### Three-Panel Layout Testing

#### Desktop View (>1024px)
Open http://localhost:3003 and resize browser to full screen

- [ ] **Three panels visible**: Left (Navigation), Center (Content), Right (Details)
- [ ] **Left panel width**: 240-280px
- [ ] **Right panel width**: 320-360px
- [ ] **Center panel**: Fills remaining space flexibly
- [ ] **Panel collapse buttons** work:
  - [ ] Left panel collapses to icon-only (60px)
  - [ ] Right panel collapses completely
  - [ ] Expand buttons restore panels

#### Tablet View (640px - 1024px)
Resize browser to 768px wide (common tablet size)

- [ ] **Two-panel layout**: Left panel + Center panel OR Center panel + Right panel
- [ ] **Navigation** accessible via button or drawer
- [ ] **Layout doesn't break** (no horizontal scroll)
- [ ] **Touch-friendly** button sizes (if on tablet device)

#### Mobile View (<640px)
Resize browser to 375px wide (common phone size)

- [ ] **Stacked single-panel layout**
- [ ] **Navigation drawer** (hamburger menu) works
- [ ] **Content fills screen width**
- [ ] **No horizontal scroll bar**
- [ ] **Text readable** without zooming
- [ ] **Buttons large enough** for touch (min 44x44px)

**Test Breakpoints:**
- Desktop: 1920px, 1366px, 1024px
- Tablet: 768px, 820px
- Mobile: 375px, 390px, 414px

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## UAT-0.4: ACCESSIBILITY (WCAG 2.1 AA)

### Lighthouse Accessibility Audit

1. Open http://localhost:3003 in Chrome
2. Open DevTools (F12) → Lighthouse tab
3. Select "Accessibility" category
4. Click "Analyze page load"

- [ ] **Lighthouse Accessibility Score ≥90%** (Target: 95%+)
- [ ] **No critical accessibility errors** (red items)
- [ ] **All warnings addressed** or documented

### Keyboard Navigation

**Test without using mouse:**

- [ ] **Tab order is logical** (top to bottom, left to right)
- [ ] **All interactive elements accessible** via Tab key
- [ ] **Focus indicators visible** (blue outline or custom ring)
- [ ] **Enter/Space** activates buttons
- [ ] **Escape** closes modals/dropdowns
- [ ] **Arrow keys** navigate lists and dropdowns
- [ ] **Keyboard shortcuts work**:
  - [ ] Ctrl+K opens search (if implemented)
  - [ ] Ctrl+U triggers upload (if implemented)

### Screen Reader Testing (Optional but Recommended)

**Using NVDA (Windows) or VoiceOver (Mac):**

- [ ] **All buttons** announce their labels
- [ ] **Form inputs** announce their labels and required state
- [ ] **Error messages** announced when validation fails
- [ ] **Loading states** announced ("Loading...")
- [ ] **Modal dialogs** announce title and content
- [ ] **Images** have alt text (if any images present)

### Color Contrast

Using browser DevTools or online tool (https://webaim.org/resources/contrastchecker/):

- [ ] **Normal text contrast ≥4.5:1** (black text on white background)
- [ ] **Large text contrast ≥3:1** (headings)
- [ ] **Button text** readable against background
- [ ] **Confidentiality badges** have sufficient contrast:
  - [ ] Gray badge text readable
  - [ ] Blue badge text readable
  - [ ] Orange badge text readable
  - [ ] Red badge text readable

### Non-Color Indicators

- [ ] **Confidentiality levels** have non-color indicators (icons, labels)
- [ ] **Required fields** marked with asterisk (*) not just red color
- [ ] **Error states** have icon + text, not just red border
- [ ] **Success/Warning** states have icons, not just color

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## UAT-0.5: AUTHENTICATION UI

### Login Page (http://localhost:3003)

- [ ] **Login page displays** without errors
- [ ] **Email input** accepts email format
- [ ] **Password input** has show/hide toggle
- [ ] **Validation works**:
  - [ ] Empty email shows error
  - [ ] Invalid email format shows error
  - [ ] Empty password shows error
  - [ ] Short password shows error

### Login Functionality

**Test with valid credentials:**
- Email: `admin@cccplc.net`
- Password: `password` (if backend is running)

- [ ] **Can submit login form**
- [ ] **Loading state** shows during login
- [ ] **Error message displays** for invalid credentials
- [ ] **Domain validation**: Try `user@gmail.com` - should show error "Only users with @cccplc.net email addresses..."
- [ ] **Account lockout**: After 5 failed attempts, account locks and shows error
- [ ] **Remaining attempts counter** displays after wrong password

### Token Management

- [ ] **Token stored** in localStorage after login (check DevTools → Application → Local Storage)
- [ ] **User data stored** in localStorage
- [ ] **Token included** in API requests (check DevTools → Network → Headers)

### Protected Routes

- [ ] **Accessing /dashboard without login** redirects to login page
- [ ] **After login**, redirected to dashboard or intended page
- [ ] **Logout button** works (token cleared, redirected to login)

### Navigation

- [ ] **Dashboard accessible** after login
- [ ] **User profile** displays (if implemented)
- [ ] **Landing page** accessible at root URL

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## PERFORMANCE BENCHMARKS

### Lighthouse Performance Audit

1. Open http://localhost:3003 in Chrome (Incognito mode)
2. Open DevTools (F12) → Lighthouse tab
3. Select "Performance" category
4. Click "Analyze page load"

- [ ] **Lighthouse Performance Score >90** (Target: 95%+)
- [ ] **First Contentful Paint (FCP) <1.5 seconds**
- [ ] **Time to Interactive (TTI) <3.5 seconds**
- [ ] **Largest Contentful Paint (LCP) <2.5 seconds**
- [ ] **Cumulative Layout Shift (CLS) <0.1**

### Bundle Size

Check build output:
```bash
npm run build
```

- [ ] **Initial bundle size <250KB** (gzipped)
- [ ] **Vendor bundle** separated from app code
- [ ] **No console warnings** about large bundle sizes

### Load Time Testing

- [ ] **Homepage loads in <2 seconds** (hard refresh Ctrl+Shift+R)
- [ ] **Storybook loads all components** without freezing
- [ ] **No memory leaks** (check DevTools → Memory)

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## CODE QUALITY METRICS

### TypeScript
```bash
npm run build  # TypeScript compilation
```
- [ ] **Zero TypeScript errors**
- [ ] **Strict mode enabled** (check tsconfig.json)
- [ ] **All types properly defined** (no `any` types or minimal)

### Testing
```bash
npm test
```
- [ ] **Unit tests pass** (Jest + React Testing Library)
- [ ] **Test coverage >80%** (if running coverage)
- [ ] **No failing tests**

### Linting
```bash
npm run lint
```
- [ ] **Zero ESLint errors**
- [ ] **Minimal warnings** (or all documented)

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## BROWSER COMPATIBILITY (Manual Testing)

### Test in Multiple Browsers:

#### Chrome (Latest)
- [ ] All components render correctly
- [ ] No console errors
- [ ] Drag-and-drop works
- [ ] All interactions work

#### Firefox (Latest)
- [ ] All components render correctly
- [ ] No console errors
- [ ] Drag-and-drop works
- [ ] All interactions work

#### Edge (Latest)
- [ ] All components render correctly
- [ ] No console errors
- [ ] Drag-and-drop works
- [ ] All interactions work

#### Safari (Latest) - If on Mac
- [ ] All components render correctly
- [ ] No console errors
- [ ] Drag-and-drop works
- [ ] All interactions work

**✅ PASS** | **❌ FAIL** | **Notes**: ___________________________________

---

## EXIT CRITERIA - PHASE 0 GATE ⚠️

### Required for Phase 1 Approval:

- [ ] **All UAT-0.1 tests pass** (Development Environment)
- [ ] **All UAT-0.2 tests pass** (Component Library - minimum 90%)
- [ ] **All UAT-0.3 tests pass** (Responsive Layout)
- [ ] **All UAT-0.4 tests pass** (Accessibility - Lighthouse ≥90)
- [ ] **All UAT-0.5 tests pass** (Authentication UI)
- [ ] **Lighthouse scores**:
  - [ ] Performance >90
  - [ ] Accessibility >90
  - [ ] Best Practices >90
- [ ] **Zero critical bugs** in console
- [ ] **TypeScript builds** with no errors
- [ ] **Storybook** displays all components
- [ ] **Design review approved** by stakeholders
- [ ] **Documentation complete** (component docs in Storybook)

### Sign-Off:

**Tester**: _________________________ **Date**: _____________

**Technical Lead**: _________________________ **Date**: _____________

**Product Owner**: _________________________ **Date**: _____________

---

## ISSUES LOG

| # | Issue Description | Severity | Status | Assigned To | Notes |
|---|-------------------|----------|--------|-------------|-------|
| 1 |                   | Critical/High/Medium/Low | Open/In Progress/Fixed |  |  |
| 2 |                   |          |        |             |       |
| 3 |                   |          |        |             |       |

**Severity Levels:**
- **Critical**: Blocks testing, system unusable
- **High**: Major functionality broken
- **Medium**: Minor functionality issue
- **Low**: Cosmetic issue

---

**⚠️ GATE POLICY**: Cannot proceed to Phase 1 without complete Phase 0 UAT approval and all sign-offs.

**Next Phase**: Phase 1 - Ingestion & Storage UI (Weeks 5-10)
