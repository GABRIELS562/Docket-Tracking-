/**
 * E2E tests for authentication workflows
 */

describe('Authentication', () => {
  beforeEach(() => {
    cy.clearDatabase();
    cy.seedDatabase();
  });

  describe('Login Flow', () => {
    it('should allow valid user to login', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=email-input]')
        .should('be.visible')
        .type(Cypress.env('testUser').email);
      
      cy.get('[data-cy=password-input]')
        .type(Cypress.env('testUser').password);
      
      cy.get('[data-cy=login-button]').click();
      
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should reject invalid credentials', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=email-input]').type('invalid@example.com');
      cy.get('[data-cy=password-input]').type('wrongpassword');
      cy.get('[data-cy=login-button]').click();
      
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');
      
      cy.url().should('include', '/login');
    });

    it('should validate required fields', () => {
      cy.visit('/login');
      
      cy.get('[data-cy=login-button]').click();
      
      cy.get('[data-cy=email-input]').should('have.class', 'error');
      cy.get('[data-cy=password-input]').should('have.class', 'error');
    });

    it('should handle network errors gracefully', () => {
      cy.visit('/login');
      cy.simulateNetworkError();
      
      cy.get('[data-cy=email-input]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=password-input]').type(Cypress.env('testUser').password);
      cy.get('[data-cy=login-button]').click();
      
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain', 'Network error');
    });
  });

  describe('Logout Flow', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should logout user and redirect to login page', () => {
      cy.get('[data-cy=user-menu]').click();
      cy.get('[data-cy=logout-button]').click();
      
      cy.url().should('include', '/login');
      cy.get('[data-cy=login-form]').should('be.visible');
    });
  });

  describe('Session Management', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/');
      cy.url().should('include', '/login');
    });

    it('should maintain session across page refreshes', () => {
      cy.login();
      cy.reload();
      
      cy.url().should('not.include', '/login');
      cy.get('[data-cy=user-menu]').should('be.visible');
    });

    it('should handle expired tokens', () => {
      cy.login();
      
      // Simulate expired token
      cy.window().then((win) => {
        win.localStorage.setItem('authToken', 'expired.token.here');
      });
      
      cy.reload();
      cy.url().should('include', '/login');
    });
  });

  describe('Password Reset', () => {
    it('should send password reset email', () => {
      cy.visit('/login');
      cy.get('[data-cy=forgot-password-link]').click();
      
      cy.url().should('include', '/forgot-password');
      cy.get('[data-cy=email-input]').type(Cypress.env('testUser').email);
      cy.get('[data-cy=reset-button]').click();
      
      cy.get('[data-cy=success-message]')
        .should('be.visible')
        .and('contain', 'Reset link sent');
    });
  });
});