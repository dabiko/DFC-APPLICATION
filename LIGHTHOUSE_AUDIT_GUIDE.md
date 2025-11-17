# Lighthouse Audit Guide
## Digital Filing Cabinet - Performance & Accessibility Testing

---

## What is Lighthouse?

Lighthouse is an open-source, automated tool from Google for improving the quality of web pages. It audits:
- **Performance**: Load times, responsiveness
- **Accessibility**: WCAG compliance, screen reader support
- **Best Practices**: Security, modern web standards
- **SEO**: Search engine optimization
- **PWA**: Progressive Web App capabilities

---

## How to Run Lighthouse Audits

### Method 1: Chrome DevTools (Recommended for Manual Testing)

1. **Open your application** in Google Chrome
   - Navigate to: http://localhost:3003

2. **Open DevTools**
   - Press `F12` or `Right-click` → `Inspect`

3. **Go to Lighthouse tab**
   - If you don't see it, click the `>>` icon and select "Lighthouse"

4. **Configure the audit**
   - **Mode**: Navigation (default)
   - **Device**: Desktop (or Mobile for mobile testing)
   - **Categories**: Select all:
     - ✅ Performance
     - ✅ Accessibility
     - ✅ Best Practices
     - ✅ SEO

5. **Run the audit**
   - Click "Analyze page load"
   - Wait 30-60 seconds for results

6. **Review the results**
   - Look for scores ≥90 in all categories
   - Expand any failing audits to see details
   - Note specific issues to fix

---

## Target Scores (Phase 0)

### Minimum Requirements:
- **Performance**: ≥90 ✅
- **Accessibility**: ≥90 ✅
- **Best Practices**: ≥90 ✅
- **SEO**: ≥80 (nice to have)

### Ideal Scores:
- **Performance**: ≥95
- **Accessibility**: ≥95
- **Best Practices**: ≥95

---

## Common Issues & Fixes

### Performance Issues

#### 1. Large Bundle Size
**Issue**: Initial JavaScript bundle >500KB
**Fix**:
- Implement code splitting (already in Vite)
- Lazy load routes
- Remove unused dependencies

```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/DashboardPage'))
const Login = lazy(() => import('./pages/LoginPage'))
```

#### 2. Unoptimized Images
**Issue**: Large image files
**Fix**:
- Use WebP format
- Compress images
- Implement lazy loading

```tsx
<img src="image.webp" loading="lazy" alt="Description" />
```

#### 3. Render-Blocking Resources
**Issue**: CSS/JS blocks page rendering
**Fix**: Already handled by Vite (async loading)

---

### Accessibility Issues

#### 1. Missing Alt Text
**Issue**: Images without alt attributes
**Fix**:
```tsx
// Bad
<img src="icon.png" />

// Good
<img src="icon.png" alt="Upload document icon" />
```

#### 2. Low Color Contrast
**Issue**: Text hard to read (contrast ratio <4.5:1)
**Fix**:
- Use darker text colors
- Increase font weight
- Check with contrast checker tool

```css
/* Bad - low contrast */
color: #888888; /* on white background */

/* Good - high contrast */
color: #333333; /* on white background */
```

#### 3. Missing Form Labels
**Issue**: Input fields without associated labels
**Fix**:
```tsx
// Bad
<input type="text" placeholder="Email" />

// Good
<label htmlFor="email">Email</label>
<input id="email" type="text" placeholder="you@example.com" />
```

#### 4. Missing ARIA Attributes
**Issue**: Interactive elements not announced by screen readers
**Fix**:
```tsx
// For buttons
<button aria-label="Close dialog">
  <XIcon />
</button>

// For loading states
<div role="status" aria-live="polite">
  Loading...
</div>
```

---

### Best Practices Issues

#### 1. Console Errors
**Issue**: JavaScript errors in console
**Fix**: Fix all console errors before audit

#### 2. HTTPS Not Used
**Issue**: Running on HTTP in production
**Fix**: Use HTTPS in production (not an issue in development)

#### 3. Deprecated APIs
**Issue**: Using deprecated browser APIs
**Fix**: Update to modern equivalents

---

## Testing Different Pages

Run Lighthouse on all major pages:

### 1. Login Page
```
URL: http://localhost:3003/
Expected: High accessibility, good performance
```

### 2. Dashboard Page
```
URL: http://localhost:3003/dashboard
Expected: High performance, accessibility
Note: Must be logged in
```

### 3. Storybook
```
URL: http://localhost:6006/
Expected: Component documentation accessible
```

---

## Mobile Testing

### How to Test Mobile Experience:

1. **Open Chrome DevTools**
2. **Click Device Toolbar icon** (Ctrl+Shift+M)
3. **Select device**: iPhone 12 Pro, Pixel 5, etc.
4. **Run Lighthouse** with "Mobile" selected
5. **Check scores**: Should be similar to desktop

### Mobile-Specific Checks:
- [ ] Tap targets ≥48x48px
- [ ] No horizontal scroll
- [ ] Text readable without zooming
- [ ] Viewport meta tag present

---

## Automated Lighthouse CI (Optional)

For continuous testing, you can add Lighthouse CI to your pipeline.

### Install Lighthouse CI:
```bash
npm install -D @lhci/cli
```

### Create config file: `lighthouserc.js`
```javascript
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview',
      url: ['http://localhost:4173/'],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### Run Lighthouse CI:
```bash
npx lhci autorun
```

---

## Recording Results

### Create a Lighthouse Report Document:

**File**: `LIGHTHOUSE_RESULTS_PHASE0.md`

```markdown
# Lighthouse Audit Results - Phase 0

**Date**: 2025-11-17
**Tester**: [Your Name]
**Environment**: Development
**URLs Tested**:
- http://localhost:3003/ (Login Page)
- http://localhost:3003/dashboard (Dashboard)

---

## Login Page Results

### Scores:
- Performance: ____ / 100
- Accessibility: ____ / 100
- Best Practices: ____ / 100
- SEO: ____ / 100

### Key Metrics:
- First Contentful Paint: ____ ms
- Time to Interactive: ____ ms
- Largest Contentful Paint: ____ ms
- Cumulative Layout Shift: ____

### Issues Found:
1. [Issue description]
   - Severity: High/Medium/Low
   - Fix: [How to fix]

---

## Dashboard Page Results

[Same structure as above]

---

## Action Items:
- [ ] Fix issue #1
- [ ] Fix issue #2
- [ ] Re-run audit after fixes
```

---

## Quick Fixes for Common Failures

### If Performance <90:

1. **Check bundle size**:
   ```bash
   npm run build
   # Look for bundle size warnings
   ```

2. **Analyze bundle**:
   - Install: `npm install -D rollup-plugin-visualizer`
   - Add to vite.config.ts
   - See what's making bundle large

3. **Remove unused code**:
   - Check for unused imports
   - Remove debugging console.logs

### If Accessibility <90:

1. **Run axe DevTools**:
   - Install: Chrome extension "axe DevTools"
   - Run scan
   - Fix all critical issues

2. **Check color contrast**:
   - Use: https://webaim.org/resources/contrastchecker/
   - Ensure all text meets 4.5:1 ratio

3. **Test keyboard navigation**:
   - Tab through entire page
   - Ensure all interactive elements focusable

### If Best Practices <90:

1. **Fix console errors**:
   - Open console (F12)
   - Fix all red errors

2. **Update dependencies**:
   ```bash
   npm audit
   npm audit fix
   ```

3. **Check for security issues**:
   - Use HTTPS in production
   - Validate all user inputs

---

## Example: Perfect Lighthouse Score

### What a 100/100 looks like:

```
Performance:        ████████████████████ 100
Accessibility:      ████████████████████ 100
Best Practices:     ████████████████████ 100
SEO:                ███████████████████░  95

Metrics:
- First Contentful Paint:    0.8 s
- Speed Index:                1.2 s
- Largest Contentful Paint:   1.5 s
- Time to Interactive:        1.6 s
- Total Blocking Time:        20 ms
- Cumulative Layout Shift:    0.001
```

**Key Characteristics:**
- Fast load times (<2 seconds)
- Zero console errors
- All images have alt text
- Perfect color contrast
- Fully keyboard accessible
- No deprecated APIs
- Secure (HTTPS)

---

## Troubleshooting

### "Lighthouse failed to load"
- **Solution**: Ensure app is running at the URL
- **Solution**: Try closing other tabs
- **Solution**: Restart Chrome

### Scores vary between runs
- **Normal**: Scores can vary ±5 points
- **Solution**: Run 3 times, take average
- **Solution**: Close background apps
- **Solution**: Test in Incognito mode

### Can't achieve 100 in all categories
- **Acceptable**: 90+ is excellent
- **Focus on**: Accessibility and Performance
- **Note**: Some Lighthouse checks may not apply

---

## Next Steps After Audit

1. **Record all scores** in LIGHTHOUSE_RESULTS_PHASE0.md
2. **Create issues** for any score <90
3. **Prioritize fixes**: Accessibility first, then Performance
4. **Re-run audit** after fixes
5. **Get sign-off** from Technical Lead
6. **Proceed to Phase 1** only after meeting all criteria

---

**Resources:**
- Lighthouse Docs: https://developer.chrome.com/docs/lighthouse/
- Web Vitals: https://web.dev/vitals/
- WCAG Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Contrast Checker: https://webaim.org/resources/contrastchecker/
- axe DevTools: https://www.deque.com/axe/devtools/

---

**⚠️ Remember**: Phase 0 cannot be marked complete until Lighthouse scores meet minimum requirements!
