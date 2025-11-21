# Billing System - Quick Reference Card

## 🚀 Quick Start

```bash
cd frontend
npm run storybook
```

Open browser to: `http://localhost:6006`

---

## 📦 Components Built (8 Total)

| Component | Purpose | Stories | Location |
|-----------|---------|---------|----------|
| **PlanCard** | Display pricing plan | 11 | Billing → PlanCard |
| **SubscriptionPlans** | Plan comparison grid | 9 | Billing → SubscriptionPlans |
| **PaymentMethodForm** | Credit card form | 13 | Billing → PaymentMethodForm |
| **CurrentSubscription** | Active subscription dashboard | 15 | Billing → CurrentSubscription |
| **BillingHistory** | Invoice list & download | 13 | Billing → BillingHistory |
| **UsageMetrics** | Usage dashboard with alerts | 12 | Billing → UsageMetrics |
| **UpgradeDowngradeModal** | Plan change modal | 6 | Billing → Modals → UpgradeDowngrade |
| **CancellationModal** | Cancellation flow | 4 | Billing → Modals → Cancellation |

**Total Stories**: 90+

---

## 🎯 Must-Test Stories

### 1. Complete User Journey
```
SubscriptionPlans → NewUser
  ↓
UpgradeDowngradeModal → UpgradeBasicToProfessional
  ↓
PaymentMethodForm → ValidationDemo
  ↓
CurrentSubscription → ProfessionalAnnual
  ↓
UsageMetrics → HighUsage
  ↓
BillingHistory → MixedStatuses
```

### 2. Critical States
- **PlanCard** → AllPlans (see all 4 plans)
- **CurrentSubscription** → CriticalUsage (red alerts)
- **PaymentMethodForm** → WithError (error handling)
- **CancellationModal** → CancellationDefault (full flow)

### 3. Edge Cases
- **BillingHistory** → Empty (no data)
- **UsageMetrics** → UnlimitedPlan (Enterprise)
- **SubscriptionPlans** → Loading (loading state)

---

## 🧪 Test Cards

```
Visa:        4242 4242 4242 4242
Mastercard:  5555 5555 5555 4444
Amex:        3782 822463 10005  (4-digit CVV)
Discover:    6011 1111 1111 1117
```

Use expiry: `12/25` | CVV: `123` (or `1234` for Amex)

---

## 📱 Responsive Breakpoints

| Device | Width | Test Method |
|--------|-------|-------------|
| Mobile | 375px | Resize browser or use Mobile story |
| Tablet | 768px | Resize browser |
| Desktop | 1440px | Default view |

---

## 🎨 Visual Checks

### Status Colors
- **Green**: Active, Paid, Low usage (<80%)
- **Blue**: Trial, Info
- **Yellow**: Warning, High usage (80-95%)
- **Red**: Error, Critical usage (>95%), Failed

### Badges
- **Current Plan**: Green badge
- **Recommended**: Blue border + blue badge
- **Save %**: Yellow badge on annual billing

### Progress Bars
- Green: <80% usage
- Yellow: 80-95% usage
- Red: >95% usage

---

## ⚡ Quick Actions Test

Open **Actions** tab at bottom and click buttons to verify:

| Component | Actions to Test |
|-----------|----------------|
| PlanCard | Select Plan |
| SubscriptionPlans | Plan selected (monthly/annual) |
| PaymentMethodForm | Submit, Cancel |
| CurrentSubscription | Upgrade, Downgrade, Cancel, Manage Payment |
| BillingHistory | Download, Retry Payment, Filter Changed |
| UsageMetrics | Upgrade, Dismiss Alert |
| UpgradeDowngradeModal | Confirm plan change |
| CancellationModal | Confirm cancellation |

---

## 🐛 Common Issues to Check

### Layout
- [ ] Cards align in grid
- [ ] No text overflow
- [ ] Buttons don't wrap awkwardly
- [ ] Modal content fits viewport

### Interaction
- [ ] All buttons clickable
- [ ] Forms accept input
- [ ] Modals open/close
- [ ] Dropdowns work

### Visual
- [ ] Colors match (no missing styles)
- [ ] Progress bars fill correctly
- [ ] Badges don't overlap
- [ ] Currency symbols show ($)

### Data
- [ ] Prices format correctly ($29.99)
- [ ] Dates display properly (Nov 20, 2025)
- [ ] Percentages calculate (85.5%)
- [ ] Large numbers have commas (125,000)

---

## 📋 5-Minute Smoke Test

1. **Open Storybook** (npm run storybook)
2. **Navigate**: Billing → SubscriptionPlans → AllPlans
3. **Check**: All 4 plans display, toggle monthly/annual
4. **Navigate**: Billing → CurrentSubscription → HighStorageUsage
5. **Check**: Progress bars show, badges display
6. **Navigate**: Billing → PaymentMethodForm → ValidationDemo
7. **Enter**: Test Visa card, see brand detection
8. **Navigate**: Billing → Modals → Cancellation → CancellationDefault
9. **Check**: 3-step flow works, buttons respond
10. **Resize**: Browser to mobile width (375px)
11. **Check**: Layout adapts, no broken UI

✅ **If all pass**: System is working!

---

## 📁 File Locations

```
frontend/src/
├── config/
│   └── subscriptionPlans.ts          # Plans configuration
├── types/
│   └── billing.ts                     # TypeScript types
├── services/
│   └── billingService.ts              # API layer
├── utils/
│   └── paymentValidation.ts           # Card validation
└── components/
    └── Billing/
        ├── PlanCard.tsx               # Component files
        ├── PlanCard.stories.tsx       # Storybook stories
        ├── SubscriptionPlans.tsx
        ├── SubscriptionPlans.stories.tsx
        ├── PaymentMethodForm.tsx
        ├── PaymentMethodForm.stories.tsx
        ├── CurrentSubscription.tsx
        ├── CurrentSubscription.stories.tsx
        ├── BillingHistory.tsx
        ├── BillingHistory.stories.tsx
        ├── UsageMetrics.tsx
        ├── UsageMetrics.stories.tsx
        ├── UpgradeDowngradeModal.tsx
        ├── CancellationModal.tsx
        ├── BillingModals.stories.tsx
        └── index.ts                   # Exports
```

---

## 💡 Pro Tips

1. **Use Controls Tab**: Change props in real-time without editing code
2. **Use Actions Tab**: See all events that fire
3. **Use Docs Tab**: Read auto-generated documentation
4. **Use Viewport Tool**: Test responsive without resizing browser
5. **Use Measure Tool**: Check spacing and alignment
6. **Keyboard Navigation**: Press Tab to navigate, Enter to activate

---

## 🔗 Related Docs

- Full Testing Guide: `docs/billing-storybook-testing-guide.md`
- Implementation Plan: `docs/billing-implementation-plan.md`
- Progress Report: `docs/billing-implementation-progress.md`

---

## ✅ Sign-Off

After testing:
- [ ] All 8 components work
- [ ] All 90+ stories render
- [ ] No console errors
- [ ] Mobile responsive works
- [ ] Actions fire correctly
- [ ] Ready for next phase

---

**Quick Reference v1.0** | Last Updated: 2025-11-20
