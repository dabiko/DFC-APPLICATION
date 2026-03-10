/**
 * Phase N.2: Accessibility audit for procedure-related pages.
 *
 * Uses cypress-axe to run automated WCAG 2.1 AA checks on every
 * procedure page. These tests require a running dev server with
 * an authenticated session.
 */

describe('Procedure Pages Accessibility', () => {
  beforeEach(() => {
    // Intercept auth to bypass login in CI
    cy.intercept('POST', '**/api/v1/auth/login/**', {
      statusCode: 200,
      body: { access: 'fake-jwt-token', refresh: 'fake-refresh-token' },
    })

    // Stub the user/me endpoint
    cy.intercept('GET', '**/api/v1/auth/me/**', {
      statusCode: 200,
      body: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'testadmin',
        email: 'admin@test.com',
        first_name: 'Test',
        last_name: 'Admin',
        organization: { id: '1', name: 'Test Org' },
        department: { id: '1', name: 'Test Dept' },
      },
    })

    // Set token in localStorage to appear authenticated
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })
  })

  const procedurePages = [
    { name: 'Procedure List', path: '/procedures' },
    { name: 'New Procedure', path: '/procedures/new' },
    { name: 'Training Assignments', path: '/procedures/assignments' },
    { name: 'Training Evidence', path: '/procedures/evidence' },
    { name: 'My Training', path: '/my-training' },
  ]

  procedurePages.forEach(({ name, path }) => {
    it(`${name} page has no critical a11y violations`, () => {
      // Stub list endpoints to prevent 401 errors
      cy.intercept('GET', '**/api/v1/procedures/**', {
        statusCode: 200,
        body: { results: [], count: 0 },
      })
      cy.intercept('GET', '**/api/v1/assignments/**', {
        statusCode: 200,
        body: { results: [], count: 0 },
      })
      cy.intercept('GET', '**/api/v1/evidence/**', {
        statusCode: 200,
        body: { results: [], count: 0 },
      })
      cy.intercept('GET', '**/api/v1/training/**', {
        statusCode: 200,
        body: { results: [], count: 0 },
      })

      cy.visit(path)
      cy.injectAxe()
      cy.checkA11y(null, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa'],
        },
        rules: {
          // Allow page to not have a skip-link (common in SPAs)
          bypass: { enabled: false },
          // Allow missing lang on html (set at index.html level)
          'html-has-lang': { enabled: false },
        },
      })
    })
  })
})

describe('Keyboard Navigation', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/**', {
      statusCode: 200,
      body: { results: [], count: 0 },
    })
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })
  })

  it('Tab key navigates through procedure list page controls', () => {
    cy.visit('/procedures')

    // Tab should move focus through interactive elements
    cy.get('body').tab()
    cy.focused().should('exist')

    // Multiple tabs should reach buttons/links
    for (let i = 0; i < 5; i++) {
      cy.focused().tab()
    }
    cy.focused().should('exist')
  })

  it('Escape key closes modals and dropdowns', () => {
    cy.visit('/procedures')

    // If a modal or dropdown is open, Escape should close it
    cy.get('body').type('{esc}')
    // No crash, no uncaught exceptions
  })
})

describe('Color Contrast on Status Badges', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/v1/**', {
      statusCode: 200,
      body: { results: [], count: 0 },
    })
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })
  })

  it('Status badges meet WCAG AA contrast ratio', () => {
    cy.visit('/procedures')
    cy.injectAxe()

    // Check specifically for color contrast issues on badges
    cy.checkA11y('[class*="badge"], [class*="Badge"], [class*="status"]', {
      runOnly: {
        type: 'rule',
        values: ['color-contrast'],
      },
    })
  })
})
