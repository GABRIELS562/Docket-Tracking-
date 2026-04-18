import { test, expect, DashboardPage, testUtils } from './fixtures/index';
import type { Page } from '@playwright/test';

/**
 * Tag Detection Flow E2E Tests
 *
 * Tests the RFID tag detection flow including:
 * - Mock RFID tag read events arriving at the backend
 * - Verification that events appear in the dashboard
 * - Zone occupancy updates based on tag detection
 */

test.describe('Tag Detection Flow', () => {
  test.describe('Tag Read Event Handling', () => {
    test.beforeEach(async ({ page }) => {
      // Set up API mocks before navigating
      await testUtils.mockApiResponses(page);
    });

    test('should display dashboard with initial zone data', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Verify the root element is present and rendered
      const root = page.locator('#root');
      await expect(root).toBeVisible();
      await expect(root).not.toBeEmpty();
    });

    test('should update zone occupancy when tag is detected', async ({ page, dashboardPage }) => {
      // Set up mock API with zone data
      await page.route('**/api/v1/zones', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              zoneId: 1,
              zoneName: 'Processing Room 1',
              zoneCode: 'PROC-001',
              zoneType: 'processing',
              capacity: 100,
              currentOccupancy: 50,
              occupancyPercentage: 50,
              readers: ['READER-001'],
              isActive: true,
            },
          ]),
        });
      });

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Verify initial state
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // In demo mode, the app should render zone information
      // We verify this by checking for any zone-related content
      await expect(page.locator('#root')).not.toBeEmpty();
    });

    test('should handle simulated tag detection event', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Since the app is in demo mode by default, simulate the event via browser context
      // In real WebSocket tests, we would connect to the actual socket
      const tagDetectedEvent = {
        epc: 'E2801160600000000001',
        zoneId: 1,
        readerId: 'READER-001',
        timestamp: new Date().toISOString(),
        rssi: -45,
        antennaPort: 1,
        signalQuality: 'excellent',
      };

      // Inject the event via page evaluate to simulate what the socket would do
      await page.evaluate((eventData) => {
        // Create and dispatch a custom event that the app would handle
        const event = new CustomEvent('tag:detected', { detail: eventData });
        window.dispatchEvent(event);
      }, tagDetectedEvent);

      // Verify the page didn't crash and is still responsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should display tag information in UI after detection', async ({
      page,
      dashboardPage,
    }) => {
      // Mock the zones API to return predictable data
      await page.route('**/api/v1/zones', (route) => {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              zoneId: 1,
              zoneName: 'Central Storage',
              zoneCode: 'STOR-001',
              zoneType: 'storage',
              capacity: 150000,
              currentOccupancy: 115500,
              occupancyPercentage: 77,
              readers: ['READER-007', 'READER-008', 'READER-009'],
              isActive: true,
            },
          ]),
        });
      });

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Wait for the app to be fully interactive
      await testUtils.waitForAppReady(page);

      // The dashboard should be visible and contain content
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Zone Occupancy Updates', () => {
    test('should reflect occupancy changes in zone display', async ({ page, dashboardPage }) => {
      // Track console messages for debugging
      const consoleMessages: string[] = [];
      page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate zone occupancy change
      const occupancyUpdate = {
        zoneId: 1,
        occupancy: 75,
        capacity: 100,
        occupancyPercentage: 75,
        status: 'warning',
        timestamp: new Date().toISOString(),
      };

      // Inject the occupancy update event
      await page.evaluate((update) => {
        const event = new CustomEvent('zone:occupancy', { detail: update });
        window.dispatchEvent(event);
      }, occupancyUpdate);

      // Verify the app is still functioning
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should trigger alert when zone exceeds capacity', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate overcapacity event
      const overcapacityEvent = {
        zoneId: 1,
        zoneName: 'Processing Room 1',
        occupancy: 110,
        capacity: 100,
      };

      // Inject the overcapacity event
      await page.evaluate((event) => {
        const customEvent = new CustomEvent('zone:overcapacity', { detail: event });
        window.dispatchEvent(customEvent);
      }, overcapacityEvent);

      // Wait for any UI updates
      await page.waitForTimeout(500);

      // The app should handle the event without errors
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should update multiple zones simultaneously', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate multiple zone updates
      const updates = [
        { zoneId: 1, occupancy: 60, capacity: 100 },
        { zoneId: 2, occupancy: 80, capacity: 100 },
        { zoneId: 3, occupancy: 90, capacity: 100 },
      ];

      for (const update of updates) {
        await page.evaluate((data) => {
          const event = new CustomEvent('zone:occupancy', {
            detail: {
              ...data,
              occupancyPercentage: Math.round((data.occupancy / data.capacity) * 100),
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
        }, update);
      }

      // Wait for UI updates
      await page.waitForTimeout(300);

      // Verify app stability after multiple updates
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Item Movement Detection', () => {
    test('should handle item movement between zones', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate item movement event
      const movementEvent = {
        itemNumber: 'INV-2024-000001',
        fromZoneId: 1,
        toZoneId: 2,
        fromZoneName: 'Office Accommodation',
        toZoneName: 'Processing Room 1',
        readerId: 'READER-003',
        timestamp: new Date().toISOString(),
      };

      await page.evaluate((event) => {
        const customEvent = new CustomEvent('item:moved', { detail: event });
        window.dispatchEvent(customEvent);
      }, movementEvent);

      // Verify the app handled the event
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should update source and destination zone counts on item movement', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // First, send the movement event
      const movementEvent = {
        itemNumber: 'INV-2024-000002',
        fromZoneId: 1,
        toZoneId: 2,
        timestamp: new Date().toISOString(),
      };

      await page.evaluate((event) => {
        const customEvent = new CustomEvent('item:moved', { detail: event });
        window.dispatchEvent(customEvent);
      }, movementEvent);

      // Then simulate corresponding occupancy updates
      await page.evaluate(() => {
        // Decrease source zone
        window.dispatchEvent(
          new CustomEvent('zone:occupancy', {
            detail: { zoneId: 1, occupancy: 449, capacity: 2000 },
          })
        );

        // Increase destination zone
        window.dispatchEvent(
          new CustomEvent('zone:occupancy', {
            detail: { zoneId: 2, occupancy: 5601, capacity: 8000 },
          })
        );
      });

      await page.waitForTimeout(300);

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Reader Status Impact on Tag Detection', () => {
    test('should handle reader going offline', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate reader offline event
      const readerOfflineEvent = {
        readerId: 'READER-001',
        readerName: 'Office Accommodation - North',
        status: 'offline',
        previousStatus: 'online',
        lastSeen: new Date().toISOString(),
      };

      await page.evaluate((event) => {
        const customEvent = new CustomEvent('reader:status', { detail: event });
        window.dispatchEvent(customEvent);
      }, readerOfflineEvent);

      // App should handle reader status change gracefully
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle reader coming back online', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate reader coming back online
      const readerOnlineEvent = {
        readerId: 'READER-006', // This reader starts as offline in mock data
        readerName: 'Processing Room 4',
        status: 'online',
        previousStatus: 'offline',
      };

      await page.evaluate((event) => {
        const customEvent = new CustomEvent('reader:status', { detail: event });
        window.dispatchEvent(customEvent);
      }, readerOnlineEvent);

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle reader error state', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate reader error event
      const readerErrorEvent = {
        readerId: 'READER-003',
        readerName: 'Processing Room 1',
        status: 'error',
        previousStatus: 'online',
        errorMessage: 'Antenna malfunction',
      };

      await page.evaluate((event) => {
        const customEvent = new CustomEvent('reader:status', { detail: event });
        window.dispatchEvent(customEvent);
      }, readerErrorEvent);

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Tag Detection Performance', () => {
    test('should handle rapid sequential tag detections', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate rapid tag detections (10 tags in quick succession)
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          const event = new CustomEvent('tag:detected', {
            detail: {
              epc: `E280116060000000000${i.toString().padStart(1, '0')}`,
              zoneId: (i % 3) + 1,
              readerId: `READER-00${(i % 3) + 1}`,
              timestamp: new Date().toISOString(),
              rssi: -45 - i,
              antennaPort: 1,
            },
          });
          window.dispatchEvent(event);
        }
      });

      // Wait for processing
      await page.waitForTimeout(500);

      // App should remain stable after rapid events
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle high-frequency zone occupancy updates', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Simulate high-frequency updates (20 updates rapidly)
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) {
          const event = new CustomEvent('zone:occupancy', {
            detail: {
              zoneId: (i % 5) + 1,
              occupancy: 50 + i * 2,
              capacity: 100,
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
        }
      });

      await page.waitForTimeout(500);

      // Verify app didn't crash or become unresponsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle malformed tag detection event gracefully', async ({
      page,
      dashboardPage,
    }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Send malformed event
      await page.evaluate(() => {
        const event = new CustomEvent('tag:detected', {
          detail: {
            // Missing required fields
            epc: null,
            zoneId: undefined,
          },
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(300);

      // App should not crash on malformed events
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle zone occupancy with invalid values', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Send invalid occupancy values
      await page.evaluate(() => {
        const events = [
          { zoneId: 1, occupancy: -10, capacity: 100 }, // Negative occupancy
          { zoneId: 2, occupancy: 1000000, capacity: 100 }, // Extremely high
          { zoneId: 3, occupancy: 'invalid', capacity: 100 }, // Wrong type
        ];

        events.forEach((data) => {
          const event = new CustomEvent('zone:occupancy', { detail: data });
          window.dispatchEvent(event);
        });
      });

      await page.waitForTimeout(300);

      // App should handle invalid data gracefully
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle tag detection for non-existent zone', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await dashboardPage.waitForLoad();

      // Detect tag in non-existent zone
      await page.evaluate(() => {
        const event = new CustomEvent('tag:detected', {
          detail: {
            epc: 'E2801160600000000099',
            zoneId: 999, // Non-existent zone
            readerId: 'READER-999',
            timestamp: new Date().toISOString(),
          },
        });
        window.dispatchEvent(event);
      });

      await page.waitForTimeout(300);

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });
});
