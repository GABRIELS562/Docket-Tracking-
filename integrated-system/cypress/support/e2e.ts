// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import '@testing-library/cypress/add-commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global configuration
Cypress.Commands.add('login', (email?: string, password?: string) => {
  const testEmail = email || Cypress.env('testUser').email;
  const testPassword = password || Cypress.env('testUser').password;
  
  cy.visit('/login');
  cy.get('[data-cy=email-input]').type(testEmail);
  cy.get('[data-cy=password-input]').type(testPassword);
  cy.get('[data-cy=login-button]').click();
  cy.url().should('not.include', '/login');
});

Cypress.Commands.add('seedDatabase', () => {
  cy.task('seedDatabase');
});

Cypress.Commands.add('clearDatabase', () => {
  cy.task('clearDatabase');
});

Cypress.Commands.add('createTestDocket', (docketData?: any) => {
  const defaultData = {
    docket_number: `TEST-${Date.now()}`,
    title: 'Test Document',
    description: 'Test description',
    category: 'Legal',
    priority: 'medium',
    department_id: 1
  };
  
  const data = { ...defaultData, ...docketData };
  
  return cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/dockets`,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    },
    body: data
  });
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // This is useful for handling application errors that don't affect the test
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  return true;
});

// Custom assertions
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>;
      seedDatabase(): Chainable<void>;
      clearDatabase(): Chainable<void>;
      createTestDocket(docketData?: any): Chainable<Response<any>>;
    }
  }
}