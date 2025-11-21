# Login Page - Test Data

## Quick Test Credentials

Use these credentials to test the login page. These are the same accounts created during registration testing.

---

## Primary Test Account

**For quick copy-paste testing:**

```
Email: john.smith@acmefinancial.com
Password: SecurePass123!
```

**Full Account Details:**

- **Name**: John Smith
- **Company**: Acme Financial Solutions
- **Email**: john.smith@acmefinancial.com
- **Password**: SecurePass123!
- **Department**: Finance
- **Role**: Chief Financial Officer

---

## Alternative Test Accounts

### Account 2 - Technology Company (UK)

```
Email: sarah.johnson@techcorp.co.uk
Password: TechSecure2024#
```

**Full Details:**

- **Name**: Sarah Johnson
- **Company**: TechCorp Industries Ltd
- **Email**: sarah.johnson@techcorp.co.uk
- **Password**: TechSecure2024#
- **Department**: IT
- **Role**: Chief Technology Officer

---

### Account 3 - Healthcare Company (Canada)

```
Email: michael.brown@healthcareplus.ca
Password: Health@Pass456
```

**Full Details:**

- **Name**: Michael Brown
- **Company**: HealthCare Plus LLC
- **Email**: michael.brown@healthcareplus.ca
- **Password**: Health@Pass456
- **Department**: Operations
- **Role**: Operations Manager

---

## Test Scenarios

### ✅ Valid Login Tests

#### Test 1: Login with Primary Account

1. Navigate to `http://localhost:3000/login`
2. Enter email: `john.smith@acmefinancial.com`
3. Enter password: `SecurePass123!`
4. Click "Sign In"
5. **Expected**: Redirect to `/dashboard` (currently showing loading for 2 seconds)

#### Test 2: Login with Remember Me

1. Navigate to `http://localhost:3000/login`
2. Enter email: `sarah.johnson@techcorp.co.uk`
3. Enter password: `TechSecure2024#`
4. Check "Remember me" checkbox
5. Click "Sign In"
6. **Expected**: Redirect to `/dashboard` with remember me flag set

#### Test 3: Login After Registration

1. Complete registration at `/signup`
2. Automatically redirected to `/login?registered=true`
3. **Expected**: Green success message displayed
4. Enter credentials and login
5. **Expected**: Success message auto-dismisses after 5 seconds

---

### ❌ Validation Error Tests

#### Test 4: Empty Form Submission

1. Navigate to `http://localhost:3000/login`
2. Leave all fields empty
3. Click "Sign In"
4. **Expected**:
   - "Email is required" error below email field
   - "Password is required" error below password field
   - Both errors in red (#DC2626)

#### Test 5: Invalid Email Format

1. Navigate to `http://localhost:3000/login`
2. Enter email: `not-an-email`
3. Enter password: `anything`
4. Tab out of email field
5. **Expected**: "Please enter a valid email address" error in red

#### Test 6: Invalid Email - No @ Symbol

1. Enter email: `johnemail.com`
2. Tab out
3. **Expected**: "Please enter a valid email address" error

#### Test 7: Invalid Email - No Domain

1. Enter email: `john@`
2. Tab out
3. **Expected**: "Please enter a valid email address" error

#### Test 8: Missing Password

1. Enter email: `john.smith@acmefinancial.com`
2. Leave password empty
3. Click "Sign In"
4. **Expected**: "Password is required" error in red

---

### 🔄 Real-time Validation Tests

#### Test 9: Error Clearing on Typing

1. Click "Sign In" with empty form (triggers errors)
2. Start typing in email field
3. **Expected**: Email error disappears immediately
4. Start typing in password field
5. **Expected**: Password error disappears immediately

#### Test 10: onBlur Validation

1. Click into email field
2. Click out without entering anything
3. **Expected**: "Email is required" error appears
4. Click into password field
5. Click out without entering anything
6. **Expected**: "Password is required" error appears

---

### 🔑 Password Visibility Tests

#### Test 11: Show/Hide Password

1. Enter password: `SecurePass123!`
2. **Expected**: Password displayed as dots (••••••••••••••)
3. Click "Show" button
4. **Expected**: Password visible as text, button changes to "Hide"
5. Click "Hide" button
6. **Expected**: Password hidden again as dots

---

### 🎨 UI/UX Tests

#### Test 12: Loading State

1. Fill in valid credentials
2. Click "Sign In"
3. **Expected**:
   - Button text changes to "Signing in..."
   - Spinner appears on button
   - Email and password inputs disabled
   - Cannot click button again
4. After 2 seconds:
   - Navigate to dashboard

#### Test 13: Dark Mode

1. Enable dark mode in system/browser
2. Navigate to `/login`
3. **Expected**:
   - Dark background gradient
   - Lighter particle animations
   - Proper text contrast
   - Dark form container

#### Test 14: Responsive Design

1. Resize browser to mobile width (<640px)
2. **Expected**:
   - Form remains centered
   - All fields stack properly
   - Canvas animation scales
   - Buttons remain full width

---

### 🔗 Navigation Tests

#### Test 15: Forgot Password Link

1. Click "Forgot password?" link
2. **Expected**: Navigate to `/forgot-password`

#### Test 16: Sign Up Link

1. Click "Sign up" link in "Don't have an account?"
2. **Expected**: Navigate to `/signup`

#### Test 17: From Landing Page

1. Navigate to `/` (landing page)
2. Click "Sign In" button in navigation
3. **Expected**: Navigate to `/login`

#### Test 18: From Signup Page

1. Navigate to `/signup`
2. Scroll to bottom
3. Click "Sign in" link
4. **Expected**: Navigate to `/login`

---

### ♿ Accessibility Tests

#### Test 19: Keyboard Navigation

1. Navigate to `/login`
2. Press Tab key repeatedly
3. **Expected** Tab order:
   - Email field
   - Password field
   - Show/Hide button
   - Remember me checkbox
   - Forgot password link
   - Sign In button
   - Sign up link

#### Test 20: Enter Key Submission

1. Fill in email
2. Fill in password
3. Press Enter key
4. **Expected**: Form submits (same as clicking Sign In)

#### Test 21: Focus Indicators

1. Tab through all fields
2. **Expected**: Blue focus ring visible on all interactive elements

---

## Password Requirements Reminder

For testing registration → login flow, passwords must meet these requirements:

- ✓ At least 8 characters
- ✓ One uppercase letter (A-Z)
- ✓ One lowercase letter (a-z)
- ✓ One number (0-9)
- ✓ One special character (!@#$%^&\*...)
- ✓ No repeating characters (e.g., aaa, 111)

**Valid Password Examples:**

- `SecurePass123!`
- `TechSecure2024#`
- `Health@Pass456`
- `MyP@ssw0rd`
- `Test1234!@#`

**Invalid Password Examples:**

- `password` (no uppercase, no number, no special char)
- `PASSWORD123` (no lowercase, no special char)
- `Pass123` (too short, no special char)
- `Pass111!` (repeating characters: 111)

---

## Browser Console Testing

### Expected Console Output on Successful Login:

```javascript
Login attempt: {
  email: "john.smith@acmefinancial.com",
  password: "***",
  rememberMe: true
}
```

### No Errors Expected:

- No TypeScript errors
- No React warnings
- No network errors (when backend integrated)
- No accessibility warnings

---

## API Integration Notes

**Current Behavior** (No Backend):

- Form validates client-side
- Simulates 2-second API call
- Always succeeds and navigates to `/dashboard`

**Future Behavior** (With Backend):

- Replace simulation with actual API call:
  ```typescript
  const response = await fetch('/api/v1/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: formData.email,
      password: formData.password,
      remember_me: formData.rememberMe,
    }),
  })
  ```
- Store JWT tokens in localStorage/cookies
- Handle actual auth errors
- Implement token refresh logic

---

## Common Issues & Troubleshooting

### Issue 1: "Email is required" shows immediately

**Cause**: Field marked as touched without user interaction
**Fix**: Errors only show after blur or submit

### Issue 2: Password toggle not working

**Cause**: JavaScript disabled or event handler issue
**Fix**: Check browser console for errors

### Issue 3: Form doesn't submit

**Cause**: Validation errors present
**Fix**: Check all fields have valid values

### Issue 4: Success message doesn't appear after registration

**Cause**: URL parameter not set
**Fix**: Ensure signup page redirects to `/login?registered=true`

### Issue 5: Dark mode colors incorrect

**Cause**: Theme toggle not working
**Fix**: Check `document.documentElement.classList` contains 'dark'

---

## Quick Test Checklist

Before considering login page complete, verify:

- [ ] Form renders without errors
- [ ] Canvas animation runs smoothly
- [ ] Email validation works (required + format)
- [ ] Password validation works (required)
- [ ] Show/Hide password toggle works
- [ ] Remember me checkbox works
- [ ] All errors display in red
- [ ] Errors clear when typing
- [ ] Submit button shows loading state
- [ ] Inputs disabled during submission
- [ ] Navigate to dashboard on success
- [ ] Forgot password link works
- [ ] Sign up link works
- [ ] Success message shows after registration
- [ ] Dark mode works correctly
- [ ] Responsive on mobile
- [ ] All links have cursor pointer
- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] No console errors
- [ ] All 26 unit tests pass

---

## Running Unit Tests

```bash
cd frontend
npm test Login.test.tsx
```

**Expected Output:**

```
 ✓ Login Component (26)
   ✓ Initial Render (4)
   ✓ Form Validation (5)
   ✓ Form Submission (5)
   ✓ Password Visibility Toggle (1)
   ✓ Remember Me (2)
   ✓ Links and Navigation (3)
   ✓ Accessibility (2)
   ✓ Error Messages (1)
   ✓ Dark Mode (1)
   ✓ Success Message (2)

Test Files  1 passed (1)
     Tests  26 passed (26)
```

---

**Last Updated**: 2025-11-21
**Status**: ✅ Ready for Testing
**Test Coverage**: 26 unit tests
