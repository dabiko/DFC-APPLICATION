# Billing System - Storybook Testing Guide

**Project**: Digital Filing Cabinet (DFC)
**Feature**: Billing & Subscription Management
**Date**: 2025-11-20

---

## 🚀 Getting Started

### 1. Start Storybook

```bash
cd frontend
npm run storybook
```

Storybook should open at `http://localhost:6006`

---

## 📚 Component Testing Checklist

### **1. PlanCard Component**
**Location**: Billing → PlanCard

#### Stories to Test:
- ✅ **Default** - Basic plan card
- ✅ **Recommended** - Professional plan with blue highlight
- ✅ **CurrentPlan** - Shows "Current Plan" badge
- ✅ **AnnualBilling** - Enterprise plan with annual pricing
- ✅ **WithDiscount** - Shows "Save 17%" badge
- ✅ **TrialPlan** - Free trial display
- ✅ **Loading** - Button in loading state
- ✅ **Disabled** - Card in disabled state
- ✅ **AllPlans** - All 4 plans side-by-side
- ✅ **AnnualComparison** - Annual billing comparison
- ✅ **CurrentInComparison** - Highlight current plan in grid

#### What to Check:
- [ ] Pricing displays correctly (monthly vs annual)
- [ ] Feature list shows checkmarks
- [ ] Badges appear correctly (Current, Recommended, Save %)
- [ ] Buttons are properly styled and respond to clicks
- [ ] Card borders highlight for recommended/current plans
- [ ] Responsive layout works on mobile (resize browser)
- [ ] Loading spinner shows on button
- [ ] Disabled state grays out the card

---

### **2. SubscriptionPlans Component**
**Location**: Billing → SubscriptionPlans

#### Stories to Test:
- ✅ **Default** - All plans, no current plan
- ✅ **WithBasicPlan** - User on Basic plan
- ✅ **WithProfessionalPlan** - User on Professional plan
- ✅ **WithEnterprisePlan** - User on Enterprise plan
- ✅ **OnTrial** - User on trial
- ✅ **WithoutTrial** - Hide trial option
- ✅ **Loading** - All cards loading
- ✅ **RecommendEnterprise** - Enterprise recommended
- ✅ **NewUser** - No plan, recommend trial

#### What to Check:
- [ ] Billing cycle toggle works (Monthly/Annual)
- [ ] Discount indicator shows for annual billing
- [ ] Plans display in responsive grid (1-4 columns)
- [ ] Current plan is highlighted with badge
- [ ] Recommended plan has blue border
- [ ] "Select Plan" button triggers action (check Actions tab)
- [ ] Header and description text are clear
- [ ] Contact sales link is present
- [ ] Money-back guarantee notice shows

---

### **3. PaymentMethodForm Component**
**Location**: Billing → PaymentMethodForm

#### Stories to Test:
- ✅ **Default** - Empty form
- ✅ **WithInitialData** - Pre-filled form
- ✅ **Loading** - Form submitting
- ✅ **WithError** - Payment error shown
- ✅ **CardDeclined** - Declined error
- ✅ **NetworkError** - Network error
- ✅ **WithoutCancel** - No cancel button
- ✅ **ValidationDemo** - With test card numbers
- ✅ **Mobile** - Mobile view
- ✅ **VisaCard** - Visa brand detection
- ✅ **MastercardCard** - Mastercard detection
- ✅ **AmexCard** - Amex detection (4-digit CVV)

#### What to Check:
- [ ] Security notice banner displays
- [ ] Card number auto-formats (4-4-4-4)
- [ ] Card brand detected and shown (Visa, Mastercard, etc.)
- [ ] Expiry date formats as MM/YY
- [ ] CVV length adapts (3 for most, 4 for Amex)
- [ ] Real-time validation shows errors
- [ ] Billing address fields work
- [ ] Submit button shows loading spinner
- [ ] Error alert displays at top
- [ ] Try test cards from ValidationDemo story

**Test Cards to Try:**
```
Visa: 4242 4242 4242 4242
Mastercard: 5555 5555 5555 4444
Amex: 3782 822463 10005
Discover: 6011 1111 1111 1117
```

---

### **4. CurrentSubscription Component**
**Location**: Billing → CurrentSubscription

#### Stories to Test:
- ✅ **BasicMonthly** - Basic plan, monthly billing
- ✅ **ProfessionalAnnual** - Professional, annual billing
- ✅ **Enterprise** - Enterprise plan with unlimited features
- ✅ **Trial** - Active trial period
- ✅ **TrialEndingSoon** - Trial with 3 days left
- ✅ **Cancelled** - Cancelled but still active
- ✅ **HighStorageUsage** - 85% storage used
- ✅ **CriticalUsage** - 97% usage (red bars)
- ✅ **LowUsage** - Minimal usage
- ✅ **PastDue** - Payment past due
- ✅ **Expired** - Expired subscription
- ✅ **Loading** - Buttons loading
- ✅ **MinimalActions** - No action buttons
- ✅ **NoAutoRenewal** - Auto-renewal off

#### What to Check:
- [ ] Plan name and pricing display correctly
- [ ] Status badges show correct colors (Active=green, Trial=blue, etc.)
- [ ] Next billing date countdown shows days remaining
- [ ] Usage bars display with correct colors:
  - Green: <80%
  - Yellow: 80-95%
  - Red: >95%
- [ ] Progress bars animate smoothly
- [ ] Action buttons appear based on status
- [ ] Trial countdown shows for trial subscriptions
- [ ] Cancellation notice shows when cancelled
- [ ] Unlimited plans don't show progress bars
- [ ] Auto-renewal status displays

---

### **5. BillingHistory Component**
**Location**: Billing → BillingHistory

#### Stories to Test:
- ✅ **Default** - List of paid invoices
- ✅ **MixedStatuses** - Paid, pending, failed, refunded
- ✅ **WithPagination** - Multiple pages
- ✅ **Empty** - No invoices
- ✅ **Loading** - Loading spinner
- ✅ **WithFailedInvoices** - Failed invoices with retry
- ✅ **LargeDataset** - 100 invoices
- ✅ **SingleInvoice** - One invoice
- ✅ **HighValueInvoices** - $999+ invoices
- ✅ **RecentOnly** - Recent invoices
- ✅ **Mobile** - Mobile card view
- ✅ **WithoutDownload** - No download button
- ✅ **OnlyPagination** - Pagination only

#### What to Check:
- [ ] Invoice table displays on desktop
- [ ] Cards display on mobile (resize to mobile)
- [ ] Status badges show correct colors
- [ ] Filters work (Status, Date From, Date To)
- [ ] Clear Filters button appears when filters active
- [ ] Pagination controls work
- [ ] Download button triggers action
- [ ] Retry button shows for failed invoices
- [ ] Empty state shows when no invoices
- [ ] Loading spinner shows correctly
- [ ] Invoice dates format properly
- [ ] Amounts format with currency symbol

---

### **6. UsageMetrics Component**
**Location**: Billing → UsageMetrics

#### Stories to Test:
- ✅ **LowUsage** - 25% usage (green bars)
- ✅ **ModerateUsage** - 60% usage
- ✅ **HighUsage** - 85% usage (yellow bars)
- ✅ **CriticalUsage** - 97% usage (red bars + alerts)
- ✅ **UnlimitedPlan** - Enterprise with unlimited
- ✅ **StorageCritical** - Only storage critical
- ✅ **MultipleCritical** - Multiple critical alerts
- ✅ **WithoutUpgradePrompt** - No upgrade button
- ✅ **FreshAccount** - New account, minimal usage
- ✅ **AtCapacity** - 100% usage
- ✅ **MidTierUsage** - Professional plan usage
- ✅ **WithDismissedAlerts** - Some alerts dismissed

#### What to Check:
- [ ] 4 metric cards display in grid (Storage, Documents, Users, API Calls)
- [ ] Progress bars show correct colors based on usage:
  - Green: <80%
  - Yellow: 80-95%
  - Red: >95%
- [ ] Usage badges show (Low, Moderate, High, Critical)
- [ ] Alerts display at top (warning = yellow, critical = red)
- [ ] Dismiss button works on alerts
- [ ] Upgrade prompt shows when usage high
- [ ] Unlimited values show "Unlimited" text
- [ ] No progress bar for unlimited resources
- [ ] Percentages calculate correctly
- [ ] Responsive grid (2 columns on desktop, 1 on mobile)
- [ ] Warning messages appear in cards at 80%+

---

### **7. UpgradeDowngradeModal Component**
**Location**: Billing → Modals → UpgradeDowngrade

#### Stories to Test:
- ✅ **UpgradeBasicToProfessional** - Upgrade flow
- ✅ **UpgradeProfessionalToEnterprise** - Higher tier upgrade
- ✅ **DowngradeProfessionalToBasic** - Downgrade flow
- ✅ **WithAnnualBilling** - Annual billing cycle
- ✅ **WithError** - Error message display
- ✅ **WithoutProration** - No proration preview

#### What to Check:
- [ ] Modal opens when button clicked
- [ ] Current plan displays at top
- [ ] Plan selection works with radio buttons
- [ ] Price difference shows (+/- amount)
- [ ] Billing cycle toggle works (Monthly/Annual)
- [ ] Annual shows "Save ~17%" badge
- [ ] Proration preview loads and displays:
  - Credit from current plan
  - New plan charge
  - Total amount due
- [ ] "Upgrade Plan" or "Change Plan" button text adapts
- [ ] Modal closes on Cancel or X button
- [ ] Error alert shows at top when error present
- [ ] Loading spinner shows on Confirm button
- [ ] Current plan option is disabled
- [ ] Price updates when billing cycle changes

---

### **8. CancellationModal Component**
**Location**: Billing → Modals → Cancellation

#### Stories to Test:
- ✅ **CancellationDefault** - Professional plan cancellation
- ✅ **CancellationWithError** - Error during cancellation
- ✅ **CancellationBasicPlan** - Basic plan cancellation
- ✅ **CancellationEnterprisePlan** - Enterprise cancellation

#### What to Check:

**Step 1 - Confirmation:**
- [ ] Warning alert shows with plan name
- [ ] "What you'll lose" list displays
- [ ] Downgrade suggestion shows
- [ ] "Keep Subscription" and "Continue to Cancel" buttons work
- [ ] Clicking "Continue" moves to Step 2

**Step 2 - Feedback:**
- [ ] Reason dropdown shows 8 options
- [ ] Feedback textarea works
- [ ] Can submit without filling (optional)
- [ ] "Back" button returns to Step 1
- [ ] "Continue" moves to Step 3

**Step 3 - Final Confirmation:**
- [ ] Two radio options show:
  - Cancel at end of period (recommended)
  - Cancel immediately
- [ ] Billing date displays correctly
- [ ] Warning shows for immediate cancellation
- [ ] Info notice shows for end-of-period
- [ ] "Back" button returns to Step 2
- [ ] "Confirm Cancellation" button works
- [ ] Loading spinner shows during cancellation
- [ ] Error alert displays if error occurs

---

## 🎨 Visual Testing Checklist

### Responsive Design
Test each component at these breakpoints:
- [ ] **Mobile**: 375px width (iPhone SE)
- [ ] **Tablet**: 768px width (iPad)
- [ ] **Desktop**: 1440px width

### Color Contrast
- [ ] Text is readable on all backgrounds
- [ ] Buttons have sufficient contrast
- [ ] Status badges are distinguishable
- [ ] Progress bars have clear colors

### Typography
- [ ] Font sizes are consistent
- [ ] Headings use proper hierarchy
- [ ] Body text is readable (14-16px)
- [ ] Small text is not too small (<12px)

### Spacing
- [ ] Consistent padding in cards
- [ ] Proper spacing between elements
- [ ] Grid gaps are uniform
- [ ] Buttons have appropriate padding

---

## 🔧 Interactive Testing

### Test All Actions
Open the **Actions** tab in Storybook bottom panel and verify:

1. **PlanCard**: `selected` action fires when clicking "Select Plan"
2. **SubscriptionPlans**: `plan-selected` action with planId and billingCycle
3. **PaymentMethodForm**: `submitted` action with form data
4. **CurrentSubscription**: All button actions (upgrade, cancel, etc.)
5. **BillingHistory**: `download-clicked`, `retry-payment-clicked`, `filter-changed`
6. **UsageMetrics**: `upgrade-clicked`, `alert-dismissed`
7. **UpgradeDowngradeModal**: `plan-selected` with plan and cycle
8. **CancellationModal**: `submitted` with cancellation request

### Test All Controls
Use the **Controls** tab to modify props in real-time:

1. Toggle `loading` state on/off
2. Change `isCurrentPlan` and `isRecommended`
3. Switch `billingCycle` between monthly/annual
4. Modify usage percentages to see color changes
5. Add/remove error messages
6. Toggle `showUpgradePrompt`

---

## 🐛 Common Issues to Look For

### Layout Issues
- [ ] Text overflow in small containers
- [ ] Buttons breaking to multiple lines
- [ ] Cards not aligning in grid
- [ ] Modal content overflowing

### Interaction Issues
- [ ] Buttons not responding to clicks
- [ ] Form fields not accepting input
- [ ] Dropdowns not opening
- [ ] Modals not closing

### Visual Issues
- [ ] Colors not matching design
- [ ] Icons not loading
- [ ] Badges overlapping text
- [ ] Progress bars not filling correctly

### Data Issues
- [ ] Prices not formatting correctly
- [ ] Dates showing as "Invalid Date"
- [ ] Percentages calculating wrong
- [ ] Numbers not formatting with commas

---

## 📝 Testing Scenarios

### Scenario 1: New User Exploring Plans
1. Open **SubscriptionPlans → NewUser**
2. Toggle between Monthly and Annual
3. Check that trial is recommended
4. Click "Select Plan" on different plans
5. Verify actions fire in Actions tab

### Scenario 2: Upgrading from Basic to Professional
1. Open **SubscriptionPlans → WithBasicPlan**
2. Note current plan is highlighted
3. Open **UpgradeDowngradeModal → UpgradeBasicToProfessional**
4. Select Professional plan
5. Toggle billing cycle
6. Check proration preview loads
7. Click "Upgrade Plan"

### Scenario 3: Payment Method Entry
1. Open **PaymentMethodForm → ValidationDemo**
2. Read test card numbers
3. Enter Visa test card: 4242 4242 4242 4242
4. See brand detection show "Visa"
5. Enter expiry: 12/25
6. Enter CVV: 123
7. Fill billing address
8. Click "Add Payment Method"
9. Check Actions tab for submitted data

### Scenario 4: Monitoring Usage
1. Open **CurrentSubscription → HighStorageUsage**
2. Note storage at 85% (yellow bar)
3. Open **UsageMetrics → HighUsage**
4. See warning alerts at top
5. Check upgrade prompt shows
6. Open **UsageMetrics → CriticalUsage**
7. See critical alerts (red)
8. Verify all 4 metrics display

### Scenario 5: Cancelling Subscription
1. Open **CancellationModal → CancellationDefault**
2. Click "Cancel Subscription" to open modal
3. Step 1: Read warnings, click "Continue to Cancel"
4. Step 2: Select reason, add feedback, click "Continue"
5. Step 3: Choose cancellation timing, click "Confirm"
6. Check Actions tab for cancellation request

### Scenario 6: Viewing Billing History
1. Open **BillingHistory → MixedStatuses**
2. See different status badges (Paid, Failed, etc.)
3. Try status filter dropdown
4. Try date filters
5. Click "Clear Filters"
6. Click "Download" on an invoice
7. Click "Retry" on a failed invoice
8. Check Actions tab for clicks

---

## ✅ Sign-Off Checklist

After testing all components, verify:

- [ ] All 8 components load without errors
- [ ] All 90+ stories render correctly
- [ ] No console errors in browser DevTools
- [ ] Responsive design works at all breakpoints
- [ ] All interactive elements respond to user input
- [ ] Loading states display correctly
- [ ] Error states display correctly
- [ ] Empty states display correctly
- [ ] Actions fire correctly (check Actions tab)
- [ ] Controls work (check Controls tab)
- [ ] Colors and styling match design expectations
- [ ] Typography is consistent and readable
- [ ] Spacing and layout look professional
- [ ] Forms validate input correctly
- [ ] Modals open/close properly
- [ ] No broken images or icons

---

## 📸 Screenshots to Capture

For documentation/review, capture screenshots of:

1. **SubscriptionPlans → AllPlans** (desktop)
2. **CurrentSubscription → ProfessionalAnnual** with high usage
3. **PaymentMethodForm → ValidationDemo**
4. **BillingHistory → MixedStatuses** (desktop view)
5. **UsageMetrics → CriticalUsage** with alerts
6. **UpgradeDowngradeModal** opened
7. **CancellationModal** Step 3
8. **Mobile views** of key components

---

## 🔍 Accessibility Quick Check

While testing, also check:
- [ ] Can navigate with Tab key
- [ ] Can activate buttons with Enter/Space
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Modals trap focus
- [ ] Color is not the only indicator (use badges/text too)

---

## 📞 Reporting Issues

If you find any issues, note:
1. **Component Name**: e.g., "PlanCard"
2. **Story Name**: e.g., "WithDiscount"
3. **Issue Type**: Layout, Interaction, Visual, Data
4. **Description**: What's wrong
5. **Expected**: What should happen
6. **Screenshot**: If visual issue

---

## 🎉 Testing Complete!

Once you've tested all components and scenarios:
1. ✅ All components working correctly
2. ✅ Ready for state management integration
3. ✅ Ready for backend API connection
4. ✅ Ready for further development

---

**Happy Testing! 🚀**

**Guide Version**: 1.0
**Last Updated**: 2025-11-20
