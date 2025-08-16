/**
 * E2E tests for docket management workflows
 */

describe('Docket Management', () => {
  beforeEach(() => {
    cy.resetTestData();
    cy.login();
  });

  describe('Docket Search and Browse', () => {
    it('should display dockets list on search page', () => {
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=dockets-list]').should('be.visible');
      cy.get('[data-cy=docket-item]').should('have.length.greaterThan', 0);
      cy.get('[data-cy=pagination]').should('be.visible');
    });

    it('should search dockets by keyword', () => {
      cy.navigateTo('dockets');
      
      const searchTerm = 'contract';
      cy.searchDockets(searchTerm);
      
      cy.waitForLoad();
      cy.get('[data-cy=docket-item]').each(($el) => {
        cy.wrap($el).should('contain.text', searchTerm);
      });
    });

    it('should filter dockets by category', () => {
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=category-filter]').select('Legal');
      cy.get('[data-cy=apply-filters-button]').click();
      
      cy.waitForLoad();
      cy.get('[data-cy=docket-item]').should('contain.text', 'Legal');
    });

    it('should filter dockets by status', () => {
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=status-filter]').select('active');
      cy.get('[data-cy=apply-filters-button]').click();
      
      cy.waitForLoad();
      cy.get('[data-cy=docket-status]').should('contain.text', 'Active');
    });

    it('should handle empty search results', () => {
      cy.navigateTo('dockets');
      
      cy.searchDockets('nonexistentdocument123456');
      
      cy.get('[data-cy=no-results]')
        .should('be.visible')
        .and('contain.text', 'No documents found');
    });
  });

  describe('Docket Creation', () => {
    it('should create new docket with valid data', () => {
      cy.navigateTo('dockets');
      cy.get('[data-cy=create-docket-button]').click();
      
      const docketData = {
        title: 'Test Document Creation',
        description: 'This is a test document created via E2E test',
        category: 'Legal',
        priority: 'high'
      };
      
      cy.fillDocketForm(docketData);
      cy.get('[data-cy=save-docket-button]').click();
      
      cy.waitForLoad();
      cy.get('[data-cy=success-message]')
        .should('be.visible')
        .and('contain.text', 'Document created successfully');
      
      // Verify docket appears in list
      cy.navigateTo('dockets');
      cy.searchDockets(docketData.title);
      cy.get('[data-cy=docket-item]').should('contain.text', docketData.title);
    });

    it('should validate required fields', () => {
      cy.navigateTo('dockets');
      cy.get('[data-cy=create-docket-button]').click();
      
      cy.get('[data-cy=save-docket-button]').click();
      
      cy.get('[data-cy=docket-title]').should('have.class', 'error');
      cy.get('[data-cy=docket-description]').should('have.class', 'error');
      cy.get('[data-cy=error-message]')
        .should('be.visible')
        .and('contain.text', 'Required fields');
    });

    it('should auto-generate docket number', () => {
      cy.navigateTo('dockets');
      cy.get('[data-cy=create-docket-button]').click();
      
      cy.get('[data-cy=docket-number]')
        .should('not.be.empty')
        .and('match', /^DOC-\d{4}-\d{4}$/);
    });
  });

  describe('Docket Viewing and Editing', () => {
    it('should view docket details', () => {
      cy.navigateTo('dockets');
      cy.get('[data-cy=docket-item]').first().click();
      
      cy.get('[data-cy=docket-details]').should('be.visible');
      cy.get('[data-cy=docket-title]').should('not.be.empty');
      cy.get('[data-cy=docket-description]').should('not.be.empty');
      cy.get('[data-cy=docket-metadata]').should('be.visible');
    });

    it('should edit docket information', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        
        cy.visit(`/dockets/${docketId}`);
        cy.get('[data-cy=edit-docket-button]').click();
        
        const newTitle = 'Updated Test Document';
        cy.get('[data-cy=docket-title]').clear().type(newTitle);
        cy.get('[data-cy=save-docket-button]').click();
        
        cy.waitForLoad();
        cy.get('[data-cy=success-message]')
          .should('be.visible')
          .and('contain.text', 'Document updated');
        
        cy.get('[data-cy=docket-title]').should('contain.text', newTitle);
      });
    });

    it('should update docket status', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        
        cy.visit(`/dockets/${docketId}`);
        cy.get('[data-cy=status-dropdown]').select('archived');
        cy.get('[data-cy=update-status-button]').click();
        
        cy.waitForLoad();
        cy.get('[data-cy=docket-status]').should('contain.text', 'Archived');
        
        // Verify audit log
        cy.checkAuditLog('STATUS_CHANGE', 'DOCKET');
      });
    });
  });

  describe('Document Attachment', () => {
    it('should upload document attachment', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        
        cy.visit(`/dockets/${docketId}`);
        cy.get('[data-cy=attachments-tab]').click();
        
        cy.uploadFile('test-document.pdf', '[data-cy=file-upload]');
        cy.get('[data-cy=upload-button]').click();
        
        cy.waitForLoad();
        cy.get('[data-cy=attachment-item]')
          .should('be.visible')
          .and('contain.text', 'test-document.pdf');
      });
    });

    it('should download document attachment', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        
        // First upload a file
        cy.visit(`/dockets/${docketId}`);
        cy.uploadFile('test-document.pdf', '[data-cy=file-upload]');
        
        // Then download it
        cy.get('[data-cy=download-attachment]').click();
        
        // Verify download (file should be in downloads folder)
        cy.readFile('cypress/downloads/test-document.pdf').should('exist');
      });
    });
  });

  describe('RFID Integration', () => {
    it('should assign RFID tag to docket', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        
        cy.visit(`/dockets/${docketId}`);
        cy.get('[data-cy=rfid-tab]').click();
        
        const tagId = 'RFID-TEST-001';
        cy.get('[data-cy=rfid-tag-input]').type(tagId);
        cy.get('[data-cy=assign-tag-button]').click();
        
        cy.waitForLoad();
        cy.get('[data-cy=assigned-tag]').should('contain.text', tagId);
        
        // Verify audit log
        cy.checkAuditLog('RFID_ASSIGNED', 'DOCKET');
      });
    });

    it('should track docket location via RFID', () => {
      cy.createTestDocket().then((response) => {
        const docketId = response.body.id;
        const tagId = 'RFID-TEST-002';
        
        // Assign RFID tag
        cy.visit(`/dockets/${docketId}`);
        cy.get('[data-cy=rfid-tab]').click();
        cy.get('[data-cy=rfid-tag-input]').type(tagId);
        cy.get('[data-cy=assign-tag-button]').click();
        
        // Simulate RFID scan
        cy.simulateRFIDScan(tagId, { lat: 40.7128, lng: -74.0060 });
        
        // Check location update
        cy.reload();
        cy.get('[data-cy=current-location]')
          .should('be.visible')
          .and('not.contain.text', 'Unknown');
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should select multiple dockets', () => {
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=select-all-checkbox]').click();
      cy.get('[data-cy=docket-checkbox]').should('be.checked');
      cy.get('[data-cy=bulk-actions]').should('be.visible');
    });

    it('should bulk update status', () => {
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=docket-checkbox]').first().click();
      cy.get('[data-cy=docket-checkbox]').eq(1).click();
      
      cy.get('[data-cy=bulk-status-update]').select('archived');
      cy.get('[data-cy=apply-bulk-action]').click();
      
      cy.waitForLoad();
      cy.get('[data-cy=success-message]')
        .should('be.visible')
        .and('contain.text', 'Documents updated');
    });
  });

  describe('Performance', () => {
    it('should load dockets list within performance threshold', () => {
      cy.measurePageLoad('Dockets List');
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=dockets-list]').should('be.visible');
    });

    it('should handle large result sets', () => {
      cy.navigateTo('dockets');
      
      // Test with large page size
      cy.get('[data-cy=page-size-select]').select('100');
      cy.waitForLoad();
      
      cy.get('[data-cy=docket-item]').should('have.length.lessThan', 101);
      cy.get('[data-cy=loading]').should('not.exist');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should work on mobile viewport', () => {
      cy.setMobileViewport();
      cy.navigateTo('dockets');
      
      cy.get('[data-cy=mobile-menu-button]').should('be.visible');
      cy.get('[data-cy=dockets-list]').should('be.visible');
      
      // Test mobile search
      cy.get('[data-cy=mobile-search-button]').click();
      cy.get('[data-cy=search-input]').should('be.visible');
    });
  });
});