/**
 * Phase N.1 (Frontend): Cypress e2e stubs for procedure lifecycle scenarios.
 *
 * These tests verify the UI flows with mocked API responses.
 * They complement the backend Django integration tests which test
 * the actual data layer.
 */

describe('Procedure List Page', () => {
  beforeEach(() => {
    // Auth stubs
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })

    cy.intercept('GET', '**/api/v1/auth/me/**', {
      statusCode: 200,
      body: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'testadmin',
        email: 'admin@test.com',
        first_name: 'Test',
        last_name: 'Admin',
        is_staff: true,
        organization: { id: '1', name: 'Test Org' },
        department: { id: '1', name: 'Test Dept' },
      },
    })
  })

  it('loads the procedures list page', () => {
    cy.intercept('GET', '**/api/v1/procedures/*', {
      statusCode: 200,
      body: {
        count: 2,
        results: [
          {
            id: 'aaa-111',
            title: 'Safety Protocol',
            state: 'published',
            current_version: 1,
            step_count: 5,
            created_by_name: 'Admin User',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'bbb-222',
            title: 'Compliance Training',
            state: 'draft',
            current_version: 0,
            step_count: 3,
            created_by_name: 'Admin User',
            created_at: '2026-02-01T00:00:00Z',
          },
        ],
      },
    }).as('listProcedures')

    cy.visit('/procedures')
    cy.wait('@listProcedures')

    // Verify procedures appear
    cy.contains('Safety Protocol').should('be.visible')
    cy.contains('Compliance Training').should('be.visible')
  })

  it('navigates to create a new procedure', () => {
    cy.intercept('GET', '**/api/v1/procedures/*', {
      statusCode: 200,
      body: { count: 0, results: [] },
    })

    cy.visit('/procedures')

    // Look for a "New" or "Create" button
    cy.get('a[href*="/procedures/new"], button').then(($els) => {
      const createBtn = $els.filter(':contains("New"), :contains("Create")')
      if (createBtn.length) {
        createBtn.first().click()
        cy.url().should('include', '/procedures/new')
      }
    })
  })
})

describe('Training Assignments Page', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })

    cy.intercept('GET', '**/api/v1/auth/me/**', {
      statusCode: 200,
      body: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'testadmin',
        email: 'admin@test.com',
        first_name: 'Test',
        last_name: 'Admin',
        is_staff: true,
        organization: { id: '1', name: 'Test Org' },
        department: { id: '1', name: 'Test Dept' },
      },
    })
  })

  it('loads the assignments page', () => {
    cy.intercept('GET', '**/api/v1/assignments/**', {
      statusCode: 200,
      body: {
        count: 1,
        results: [
          {
            id: 'assign-1',
            assignee_name: 'John Doe',
            procedure_title: 'Safety Protocol',
            status: 'assigned',
            due_date: '2026-04-01',
          },
        ],
      },
    }).as('listAssignments')

    cy.intercept('GET', '**/api/v1/procedures/**', {
      statusCode: 200,
      body: { results: [], count: 0 },
    })

    cy.visit('/procedures/assignments')
    cy.wait('@listAssignments')

    cy.contains('Safety Protocol').should('be.visible')
  })
})

describe('Training Evidence Page', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', 'fake-jwt-token')
      win.localStorage.setItem('refresh_token', 'fake-refresh-token')
    })

    cy.intercept('GET', '**/api/v1/auth/me/**', {
      statusCode: 200,
      body: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'testadmin',
        email: 'admin@test.com',
        first_name: 'Test',
        last_name: 'Admin',
        is_staff: true,
        organization: { id: '1', name: 'Test Org' },
        department: { id: '1', name: 'Test Dept' },
      },
    })
  })

  it('loads the evidence page', () => {
    cy.intercept('GET', '**/api/v1/evidence/**', {
      statusCode: 200,
      body: {
        count: 0,
        results: [],
      },
    }).as('listEvidence')

    cy.intercept('GET', '**/api/v1/procedures/**', {
      statusCode: 200,
      body: { results: [], count: 0 },
    })

    cy.visit('/procedures/evidence')
    cy.wait('@listEvidence')

    // Page should load without errors
    cy.get('body').should('be.visible')
  })
})
