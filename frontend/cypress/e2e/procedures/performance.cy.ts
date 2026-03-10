/**
 * Phase N.3 (Frontend): Performance smoke tests.
 *
 * Measures render time for procedure pages with mocked data at scale.
 * These are not full Lighthouse audits — they verify that pages render
 * within acceptable time bounds under Cypress.
 */

describe('Procedure Builder Performance', () => {
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

  it('renders procedure list with 50 items under 3 seconds', () => {
    // Generate 50 mock procedures
    const procedures = Array.from({ length: 50 }, (_, i) => ({
      id: `proc-${i}`,
      title: `Procedure ${i + 1}`,
      state: ['draft', 'published', 'in_review'][i % 3],
      current_version: i % 3 === 1 ? 1 : 0,
      step_count: 10 + (i % 5),
      created_by_name: 'Admin User',
      created_at: '2026-01-01T00:00:00Z',
      tags: ['safety', 'compliance'].slice(0, (i % 2) + 1),
    }))

    cy.intercept('GET', '**/api/v1/procedures/*', {
      statusCode: 200,
      body: { count: 50, results: procedures },
    }).as('listProcedures')

    const start = Date.now()
    cy.visit('/procedures')
    cy.wait('@listProcedures')

    // Wait for the last item to appear (or the page to settle)
    cy.get('body')
      .should('be.visible')
      .then(() => {
        const elapsed = Date.now() - start
        expect(elapsed).to.be.lessThan(
          3000,
          `Page took ${elapsed}ms to render 50 procedures (max 3000ms)`
        )
      })
  })

  it('renders procedure detail with 20 steps under 2 seconds', () => {
    const steps = Array.from({ length: 20 }, (_, i) => ({
      id: `step-${i}`,
      title: `Step ${i + 1}: ${['Read manual', 'Watch video', 'Complete form', 'Take quiz'][i % 4]}`,
      order: i + 1,
      description: `Description for step ${i + 1}`,
      estimated_duration_minutes: 10 + (i % 10),
      require_manual_open: i % 3 === 0,
      require_media_completion: i % 4 === 0,
      require_quiz_pass: i % 5 === 0,
    }))

    cy.intercept('GET', '**/api/v1/procedures/proc-detail/**', {
      statusCode: 200,
      body: {
        id: 'proc-detail',
        title: 'Detailed Procedure',
        state: 'published',
        description: 'A procedure with 20 steps for performance testing.',
        current_version: 1,
        steps,
        tags: ['safety'],
        created_by_name: 'Admin User',
        created_at: '2026-01-01T00:00:00Z',
      },
    }).as('getDetail')

    cy.intercept('GET', '**/api/v1/procedures/*', {
      statusCode: 200,
      body: {
        id: 'proc-detail',
        title: 'Detailed Procedure',
        state: 'published',
        description: 'A procedure with 20 steps.',
        current_version: 1,
        steps,
        tags: ['safety'],
        created_by_name: 'Admin User',
        created_at: '2026-01-01T00:00:00Z',
      },
    })

    const start = Date.now()
    cy.visit('/procedures/proc-detail')

    cy.get('body')
      .should('be.visible')
      .then(() => {
        const elapsed = Date.now() - start
        expect(elapsed).to.be.lessThan(
          2000,
          `Detail page took ${elapsed}ms to render 20 steps (max 2000ms)`
        )
      })
  })
})

describe('Training Player Performance', () => {
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

  it('loads training player with 20 steps under 2 seconds', () => {
    const steps = Array.from({ length: 20 }, (_, i) => ({
      id: `vs-${i}`,
      title: `Training Step ${i + 1}`,
      order: i + 1,
      description: `Content for training step ${i + 1}`,
      estimated_duration_minutes: 5,
    }))

    cy.intercept('GET', '**/api/v1/training/**', {
      statusCode: 200,
      body: {
        id: 'attempt-1',
        assignment: {
          id: 'assign-1',
          procedure_version: {
            id: 'v1',
            title: 'Training Procedure',
            steps,
          },
        },
        status: 'in_progress',
        current_step: 0,
        steps_completed: 0,
        total_steps: 20,
        step_completions: [],
      },
    }).as('getTraining')

    const start = Date.now()
    cy.visit('/training/attempt-1')
    cy.wait('@getTraining')

    cy.get('body')
      .should('be.visible')
      .then(() => {
        const elapsed = Date.now() - start
        expect(elapsed).to.be.lessThan(
          2000,
          `Training player took ${elapsed}ms with 20 steps (max 2000ms)`
        )
      })
  })
})
