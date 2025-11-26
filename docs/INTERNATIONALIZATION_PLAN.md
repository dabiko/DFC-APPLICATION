# Internationalization (i18n) Implementation Plan

**Created:** 2025-11-26
**Status:** Planned (Not Started)
**Priority:** Future Enhancement
**Languages:** English (en), French (fr)

---

## Executive Summary

This document outlines the enterprise internationalization (i18n) strategy for the DFC Application, enabling users to interact with the application in their preferred language (English or French).

---

## Recommended Solution: react-i18next

This is the most widely adopted i18n library for React applications, used by companies like Airbnb, Netflix, and Microsoft.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   English   │  │   French    │  │  (Future)   │         │
│  │     🇬🇧      │  │     🇫🇷      │  │   🇪🇸 🇩🇪 🇨🇳   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  TRANSLATION LAYER                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              react-i18next                           │   │
│  │  • Hooks: useTranslation()                          │   │
│  │  • Components: <Trans />                            │   │
│  │  • HOC: withTranslation()                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 TRANSLATION FILES                           │
│  frontend/src/locales/                                      │
│  ├── en/                                                    │
│  │   ├── common.json      (shared terms)                   │
│  │   ├── dashboard.json   (dashboard page)                 │
│  │   ├── documents.json   (document management)            │
│  │   ├── auth.json        (login, signup)                  │
│  │   └── errors.json      (error messages)                 │
│  └── fr/                                                    │
│      ├── common.json                                        │
│      ├── dashboard.json                                     │
│      └── ...                                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                 PERSISTENCE LAYER                           │
│  • localStorage (user preference)                          │
│  • Browser language detection (fallback)                   │
│  • User profile setting (database)                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Frontend Setup

| Task | Effort | Description |
|------|--------|-------------|
| Install dependencies | Low | `react-i18next`, `i18next`, `i18next-browser-languagedetector` |
| Configure i18n | Low | Setup language detection, fallback, namespaces |
| Create translation files | Medium | JSON files for each language/namespace |
| Replace hardcoded strings | High | ~200-400 strings across all components |
| Language switcher UI | Low | Dropdown/toggle in header or settings |
| Date/number formatting | Medium | Use `Intl` API or `date-fns` with locales |

### 2. Backend Setup (Optional but recommended)

| Task | Effort | Description |
|------|--------|-------------|
| User language preference | Low | Add `preferred_language` field to User model |
| API error messages | Medium | Return translated error messages |
| Email templates | Medium | Localized email notifications |

### 3. Translation Management (For scale)

| Option | Best For | Cost |
|--------|----------|------|
| Manual JSON files | Small teams | Free |
| Crowdin/Lokalise | Medium teams | $40-100/mo |
| In-house translators | Enterprise | Variable |

---

## Implementation Phases

### Phase 1: Foundation (1-2 days)
- [ ] Install and configure i18n library
- [ ] Create folder structure for translations
- [ ] Setup language switcher component
- [ ] Implement language persistence

### Phase 2: Core Pages (3-5 days)
- [ ] Extract strings from: Login, Signup, Dashboard, Sidebar
- [ ] Create English (base) and French translation files
- [ ] Implement date/time/number formatting

### Phase 3: Full Coverage (5-7 days)
- [ ] Extract strings from all remaining pages
- [ ] Translate error messages, tooltips, placeholders
- [ ] Handle pluralization and interpolation

### Phase 4: Polish (1-2 days)
- [ ] RTL support preparation (for future Arabic, Hebrew)
- [ ] Testing and QA
- [ ] Documentation

---

## Example Code Structure

### Component Usage

```typescript
// Usage in components (after setup)
import { useTranslation } from 'react-i18next'

function TrashPage() {
  const { t } = useTranslation('trash')

  return (
    <div>
      <h1>{t('title')}</h1>  {/* "Trash" or "Corbeille" */}
      <p>{t('itemCount', { count: 5 })}</p>  {/* "5 items" or "5 éléments" */}
      <button>{t('common:actions.delete')}</button>  {/* Shared translation */}
    </div>
  )
}
```

### Translation Files

```json
// locales/en/trash.json
{
  "title": "Trash",
  "itemCount": "{{count}} item",
  "itemCount_plural": "{{count}} items",
  "emptyTrash": "Empty Trash",
  "restoreItem": "Restore",
  "permanentDelete": "Delete Permanently",
  "retentionWarning": {
    "title": "Trash Retention Policy",
    "autoDelete": "Items in trash are automatically deleted after {{days}} days",
    "restoreInfo": "Restoring a folder also restores all its contents",
    "permanentWarning": "Permanently deleted items cannot be recovered"
  }
}

// locales/fr/trash.json
{
  "title": "Corbeille",
  "itemCount": "{{count}} élément",
  "itemCount_plural": "{{count}} éléments",
  "emptyTrash": "Vider la corbeille",
  "restoreItem": "Restaurer",
  "permanentDelete": "Supprimer définitivement",
  "retentionWarning": {
    "title": "Politique de rétention de la corbeille",
    "autoDelete": "Les éléments dans la corbeille sont automatiquement supprimés après {{days}} jours",
    "restoreInfo": "La restauration d'un dossier restaure également tout son contenu",
    "permanentWarning": "Les éléments supprimés définitivement ne peuvent pas être récupérés"
  }
}
```

### i18n Configuration

```typescript
// frontend/src/i18n/config.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'documents', 'trash', 'errors'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

export default i18n
```

### Language Switcher Component

```typescript
// frontend/src/components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="..."
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.flag} {lang.name}
        </option>
      ))}
    </select>
  )
}
```

---

## Enterprise Best Practices

1. **Namespace separation** - Organize translations by feature/page
2. **Fallback chain** - `fr-CA → fr → en` (graceful degradation)
3. **Lazy loading** - Load only needed language files
4. **Pluralization** - Handle singular/plural forms correctly
5. **Interpolation** - Dynamic values in translations
6. **Context** - Same word, different translations based on context
7. **Missing key handling** - Log missing translations in development
8. **Type safety** - TypeScript support for translation keys

---

## Dependencies to Install

```bash
# Core i18n packages
npm install react-i18next i18next i18next-browser-languagedetector

# Optional: For loading translations from backend
npm install i18next-http-backend

# Optional: For date formatting with locales
npm install date-fns
```

---

## Folder Structure

```
frontend/src/
├── i18n/
│   ├── config.ts           # i18n configuration
│   └── index.ts            # Export
├── locales/
│   ├── en/
│   │   ├── common.json     # Shared terms (buttons, labels)
│   │   ├── auth.json       # Login, signup, password reset
│   │   ├── dashboard.json  # Dashboard page
│   │   ├── documents.json  # Document management
│   │   ├── folders.json    # Folder management
│   │   ├── trash.json      # Trash page
│   │   ├── favorites.json  # Favorites page
│   │   ├── settings.json   # Settings page
│   │   └── errors.json     # Error messages
│   └── fr/
│       ├── common.json
│       ├── auth.json
│       └── ... (same structure)
└── components/
    └── LanguageSwitcher.tsx
```

---

## Estimated Effort

| Phase | Duration |
|-------|----------|
| Phase 1: Foundation | 1-2 days |
| Phase 2: Core Pages | 3-5 days |
| Phase 3: Full Coverage | 5-7 days |
| Phase 4: Polish | 1-2 days |
| **Total** | **10-16 days** |

---

## Questions to Address Before Implementation

1. **Scope**: Start with main user-facing pages, or full coverage including admin sections?
2. **Backend**: Should error messages from the API also be translated, or frontend-only for now?
3. **User Preference**: Store language preference in user profile (database) or just localStorage?
4. **Translation Source**: Manual translation or use translation service?

---

## References

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [ICU Message Format](https://unicode-org.github.io/icu/userguide/format_parse/messages/)

---

**Note:** This plan is saved for future implementation. When ready to proceed, start with Phase 1 (Foundation) to set up the infrastructure.
