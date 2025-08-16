/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Authentication Commands
Cypress.Commands.add('loginViaAPI', (email: string, password: string) => {
  cy.request({
    method: 'POST',
    url: `${Cypress.env('apiUrl')}/auth/login`,
    body: { email, password }
  }).then((response) => {
    window.localStorage.setItem('authToken', response.body.token);
  });
});

Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('authToken');
  cy.visit('/login');
});

// Navigation Commands
Cypress.Commands.add('navigateTo', (page: string) => {
  const routes = {
    dashboard: '/',
    dockets: '/search',
    storage: '/storage',
    rfid: '/rfid',
    analytics: '/analytics',
    audit: '/audit',
    settings: '/settings'
  };
  
  cy.visit(routes[page] || page);
});

// Data Interaction Commands
Cypress.Commands.add('fillDocketForm', (docketData) => {
  if (docketData.title) {
    cy.get('[data-cy=docket-title]').clear().type(docketData.title);
  }
  if (docketData.description) {
    cy.get('[data-cy=docket-description]').clear().type(docketData.description);
  }
  if (docketData.category) {
    cy.get('[data-cy=docket-category]').select(docketData.category);
  }
  if (docketData.priority) {
    cy.get('[data-cy=docket-priority]').select(docketData.priority);
  }
});

Cypress.Commands.add('searchDockets', (searchTerm: string) => {
  cy.get('[data-cy=search-input]').clear().type(searchTerm);
  cy.get('[data-cy=search-button]').click();
});

// Waiting and Loading Commands
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-cy=loading]').should('not.exist');
});

Cypress.Commands.add('waitForSpinner', () => {
  cy.get('.spinner, .loading-spinner').should('not.exist');
});

// API Helper Commands
Cypress.Commands.add('apiRequest', (method: string, endpoint: string, body?: any) => {
  const token = window.localStorage.getItem('authToken');
  
  return cy.request({
    method,
    url: `${Cypress.env('apiUrl')}${endpoint}`,
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body,
    failOnStatusCode: false
  });
});

// File Upload Commands
Cypress.Commands.add('uploadFile', (fileName: string, selector: string) => {
  cy.fixture(fileName).then(fileContent => {
    cy.get(selector).attachFile({
      fileContent: fileContent.toString(),
      fileName: fileName,
      mimeType: 'application/pdf'
    });
  });
});

// RFID Testing Commands
Cypress.Commands.add('simulateRFIDScan', (tagId: string, location?: any) => {
  cy.apiRequest('POST', '/rfid/scan', {
    tagId,
    readerId: 'TEST-READER-001',
    signalStrength: 0.85,
    location: location || { lat: 40.7128, lng: -74.0060 }
  });
});

// Audit Testing Commands
Cypress.Commands.add('checkAuditLog', (action: string, entityType: string) => {
  cy.apiRequest('GET', `/audit/logs?action=${action}&entityType=${entityType}`)
    .then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.logs).to.have.length.greaterThan(0);
    });
});

// Performance Testing Commands
Cypress.Commands.add('measurePageLoad', (pageName: string) => {
  cy.window().then((win) => {
    const startTime = Date.now();
    cy.visit('/').then(() => {
      const loadTime = Date.now() - startTime;
      cy.log(`Page Load Time for ${pageName}: ${loadTime}ms`);
      expect(loadTime).to.be.lessThan(3000); // 3 second threshold
    });
  });
});

// Mobile Testing Commands
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE size
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad size
});

// Accessibility Testing Commands
Cypress.Commands.add('checkA11y', () => {
  cy.injectAxe();
  cy.checkA11y();
});

// Database Testing Commands
Cypress.Commands.add('resetTestData', () => {
  cy.task('clearDatabase');
  cy.task('seedDatabase');
});

// Error Testing Commands
Cypress.Commands.add('simulateNetworkError', () => {
  cy.intercept('**', { forceNetworkError: true });
});

Cypress.Commands.add('simulateSlowNetwork', () => {
  cy.intercept('**', (req) => {
    req.reply((res) => {
      res.setDelay(2000); // 2 second delay
    });
  });
});

// Declare custom command types
declare global {
  namespace Cypress {
    interface Chainable {
      loginViaAPI(email: string, password: string): Chainable<void>;
      logout(): Chainable<void>;
      navigateTo(page: string): Chainable<void>;
      fillDocketForm(docketData: any): Chainable<void>;
      searchDockets(searchTerm: string): Chainable<void>;
      waitForLoad(): Chainable<void>;
      waitForSpinner(): Chainable<void>;
      apiRequest(method: string, endpoint: string, body?: any): Chainable<Response<any>>;
      uploadFile(fileName: string, selector: string): Chainable<void>;
      simulateRFIDScan(tagId: string, location?: any): Chainable<void>;
      checkAuditLog(action: string, entityType: string): Chainable<void>;
      measurePageLoad(pageName: string): Chainable<void>;
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      checkA11y(): Chainable<void>;
      resetTestData(): Chainable<void>;
      simulateNetworkError(): Chainable<void>;
      simulateSlowNetwork(): Chainable<void>;
    }
  }
}