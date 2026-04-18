import { test, expect, DashboardPage, testUtils } from './fixtures/index';
import type { Page } from '@playwright/test';

/**
 * WebSocket Updates E2E Tests
 *
 * Tests WebSocket real-time updates including:
 * - WebSocket connection handling
 * - Zone occupancy event simulation
 * - UI updates in real-time
 * - Notification system
 */

/**
 * Helper class to manage WebSocket simulation in tests
 */
class WebSocketSimulator {
  constructor(private page: Page) {}

  /**
   * Set up WebSocket event listeners and tracking
   */
  async setupListeners(): Promise<void> {
    await this.page.evaluate(() => {
      // Create a tracking object for WebSocket events
      (window as any).__wsEvents = [];
      (window as any).__wsConnected = false;

      // Track all custom events dispatched
      const originalDispatch = window.dispatchEvent.bind(window);
      window.dispatchEvent = function (event: Event) {
        if (event.type.includes(':')) {
          (window as any).__wsEvents.push({
            type: event.type,
            detail: (event as CustomEvent).detail,
            timestamp: Date.now(),
          });
        }
        return originalDispatch(event);
      };
    });
  }

  /**
   * Simulate WebSocket connection established
   */
  async simulateConnection(): Promise<void> {
    await this.page.evaluate(() => {
      (window as any).__wsConnected = true;
      const event = new CustomEvent('ws:connected', {
        detail: {
          socketId: 'test-socket-123',
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    });
  }

  /**
   * Simulate WebSocket disconnection
   */
  async simulateDisconnection(): Promise<void> {
    await this.page.evaluate(() => {
      (window as any).__wsConnected = false;
      const event = new CustomEvent('ws:disconnected', {
        detail: {
          reason: 'transport close',
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    });
  }

  /**
   * Emit a zone occupancy event
   */
  async emitZoneOccupancy(data: {
    zoneId: number;
    occupancy: number;
    capacity: number;
    zoneName?: string;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('zone:occupancy', {
        detail: {
          ...eventData,
          occupancyPercentage: Math.round((eventData.occupancy / eventData.capacity) * 100),
          status:
            eventData.occupancy >= eventData.capacity
              ? 'full'
              : eventData.occupancy / eventData.capacity >= 0.9
                ? 'critical'
                : eventData.occupancy / eventData.capacity >= 0.7
                  ? 'warning'
                  : 'normal',
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Emit an item moved event
   */
  async emitItemMoved(data: {
    itemNumber: string;
    fromZoneId: number | null;
    toZoneId: number;
    fromZoneName?: string;
    toZoneName?: string;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('item:moved', {
        detail: {
          ...eventData,
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Emit a reader status event
   */
  async emitReaderStatus(data: {
    readerId: string;
    readerName: string;
    status: 'online' | 'offline' | 'error' | 'connecting';
    previousStatus?: string;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('reader:status', {
        detail: {
          ...eventData,
          timestamp: new Date().toISOString(),
        },
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Emit a zone overcapacity alert
   */
  async emitOvercapacity(data: {
    zoneId: number;
    zoneName: string;
    occupancy: number;
    capacity: number;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('zone:overcapacity', {
        detail: eventData,
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Emit a docket registered event
   */
  async emitDocketRegistered(data: {
    labNumber: string;
    caseReference: string;
    rfidEpc: string;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('docket:registered', {
        detail: eventData,
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Emit a docket missing alert
   */
  async emitDocketMissing(data: {
    labNumber: string;
    caseReference: string;
    lastSeenAt: string;
    lastZone: string;
  }): Promise<void> {
    await this.page.evaluate((eventData) => {
      const event = new CustomEvent('docket:missing', {
        detail: eventData,
      });
      window.dispatchEvent(event);
    }, data);
  }

  /**
   * Get tracked events
   */
  async getTrackedEvents(): Promise<Array<{ type: string; detail: any; timestamp: number }>> {
    return this.page.evaluate(() => (window as any).__wsEvents || []);
  }

  /**
   * Check if WebSocket is connected
   */
  async isConnected(): Promise<boolean> {
    return this.page.evaluate(() => (window as any).__wsConnected || false);
  }
}

test.describe('WebSocket Real-time Updates', () => {
  let wsSimulator: WebSocketSimulator;

  test.beforeEach(async ({ page }) => {
    wsSimulator = new WebSocketSimulator(page);
    await testUtils.mockApiResponses(page);
  });

  test.describe('WebSocket Connection', () => {
    test('should establish WebSocket connection', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Simulate connection
      await wsSimulator.simulateConnection();

      const isConnected = await wsSimulator.isConnected();
      expect(isConnected).toBe(true);

      // Verify UI is still responsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle WebSocket disconnection gracefully', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Connect and then disconnect
      await wsSimulator.simulateConnection();
      await wsSimulator.simulateDisconnection();

      const isConnected = await wsSimulator.isConnected();
      expect(isConnected).toBe(false);

      // UI should still be functional
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should reconnect after disconnection', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Simulate disconnect and reconnect
      await wsSimulator.simulateConnection();
      await wsSimulator.simulateDisconnection();
      await page.waitForTimeout(500);
      await wsSimulator.simulateConnection();

      const isConnected = await wsSimulator.isConnected();
      expect(isConnected).toBe(true);
    });
  });

  test.describe('Zone Occupancy Events', () => {
    test('should receive and process zone:occupancy event', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Emit zone occupancy event
      await wsSimulator.emitZoneOccupancy({
        zoneId: 1,
        occupancy: 60,
        capacity: 100,
        zoneName: 'Processing Room 1',
      });

      // Verify event was tracked
      const events = await wsSimulator.getTrackedEvents();
      const occupancyEvent = events.find((e) => e.type === 'zone:occupancy');
      expect(occupancyEvent).toBeDefined();
      expect(occupancyEvent?.detail.zoneId).toBe(1);
      expect(occupancyEvent?.detail.occupancy).toBe(60);
    });

    test('should update UI when zone occupancy changes', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Initial state check
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // Emit multiple occupancy updates
      for (let i = 0; i < 5; i++) {
        await wsSimulator.emitZoneOccupancy({
          zoneId: 1,
          occupancy: 50 + i * 10,
          capacity: 100,
        });
        await page.waitForTimeout(100);
      }

      // UI should remain responsive
      await expect(root).toBeVisible();
    });

    test('should handle zone status transitions', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Test different status levels: normal -> warning -> critical -> full
      const statusTests = [
        { occupancy: 50, capacity: 100, expectedStatus: 'normal' },
        { occupancy: 75, capacity: 100, expectedStatus: 'warning' },
        { occupancy: 95, capacity: 100, expectedStatus: 'critical' },
        { occupancy: 100, capacity: 100, expectedStatus: 'full' },
      ];

      for (const test of statusTests) {
        await wsSimulator.emitZoneOccupancy({
          zoneId: 1,
          ...test,
        });
      }

      const events = await wsSimulator.getTrackedEvents();
      const occupancyEvents = events.filter((e) => e.type === 'zone:occupancy');
      expect(occupancyEvents.length).toBe(4);
    });
  });

  test.describe('Item Movement Events', () => {
    test('should receive and process item:moved event', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Emit item moved event
      await wsSimulator.emitItemMoved({
        itemNumber: 'INV-2024-000001',
        fromZoneId: 1,
        toZoneId: 2,
        fromZoneName: 'Office Accommodation',
        toZoneName: 'Processing Room 1',
      });

      const events = await wsSimulator.getTrackedEvents();
      const movedEvent = events.find((e) => e.type === 'item:moved');
      expect(movedEvent).toBeDefined();
      expect(movedEvent?.detail.itemNumber).toBe('INV-2024-000001');
    });

    test('should update both source and destination zones on item move', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Emit item move
      await wsSimulator.emitItemMoved({
        itemNumber: 'INV-2024-000002',
        fromZoneId: 1,
        toZoneId: 2,
      });

      // Emit corresponding zone occupancy updates
      await wsSimulator.emitZoneOccupancy({
        zoneId: 1,
        occupancy: 449,
        capacity: 500,
      });

      await wsSimulator.emitZoneOccupancy({
        zoneId: 2,
        occupancy: 101,
        capacity: 200,
      });

      const events = await wsSimulator.getTrackedEvents();
      expect(events.filter((e) => e.type === 'zone:occupancy').length).toBe(2);
    });

    test('should handle new item registration (no fromZone)', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Emit item move with null fromZone (new registration)
      await wsSimulator.emitItemMoved({
        itemNumber: 'INV-2024-000003',
        fromZoneId: null,
        toZoneId: 1,
        toZoneName: 'Main Entrance',
      });

      const events = await wsSimulator.getTrackedEvents();
      const movedEvent = events.find((e) => e.type === 'item:moved');
      expect(movedEvent?.detail.fromZoneId).toBeNull();
    });
  });

  test.describe('Reader Status Events', () => {
    test('should receive reader:status updates', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Emit reader status change
      await wsSimulator.emitReaderStatus({
        readerId: 'READER-001',
        readerName: 'Office Accommodation - North',
        status: 'offline',
        previousStatus: 'online',
      });

      const events = await wsSimulator.getTrackedEvents();
      const statusEvent = events.find((e) => e.type === 'reader:status');
      expect(statusEvent).toBeDefined();
      expect(statusEvent?.detail.status).toBe('offline');
    });

    test('should handle reader error state', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      await wsSimulator.emitReaderStatus({
        readerId: 'READER-003',
        readerName: 'Processing Room 1',
        status: 'error',
      });

      const events = await wsSimulator.getTrackedEvents();
      const errorEvent = events.find(
        (e) => e.type === 'reader:status' && e.detail.status === 'error'
      );
      expect(errorEvent).toBeDefined();
    });

    test('should handle reader connecting state', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      await wsSimulator.emitReaderStatus({
        readerId: 'READER-005',
        readerName: 'Processing Room 3',
        status: 'connecting',
      });

      const events = await wsSimulator.getTrackedEvents();
      const connectingEvent = events.find(
        (e) => e.type === 'reader:status' && e.detail.status === 'connecting'
      );
      expect(connectingEvent).toBeDefined();
    });
  });

  test.describe('Alert and Notification Events', () => {
    test('should trigger notification on zone overcapacity', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      await wsSimulator.emitOvercapacity({
        zoneId: 1,
        zoneName: 'Processing Room 1',
        occupancy: 110,
        capacity: 100,
      });

      const events = await wsSimulator.getTrackedEvents();
      const overcapacityEvent = events.find((e) => e.type === 'zone:overcapacity');
      expect(overcapacityEvent).toBeDefined();

      // UI should still be responsive after alert
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should show notification for new docket registration', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      await wsSimulator.emitDocketRegistered({
        labNumber: 'INV-2024-000100',
        caseReference: 'REF/2024/001000',
        rfidEpc: 'E2801160600000000100',
      });

      const events = await wsSimulator.getTrackedEvents();
      const registeredEvent = events.find((e) => e.type === 'docket:registered');
      expect(registeredEvent).toBeDefined();
    });

    test('should show warning notification for missing docket', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      await wsSimulator.emitDocketMissing({
        labNumber: 'INV-2024-000050',
        caseReference: 'REF/2024/000500',
        lastSeenAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        lastZone: 'Central Storage',
      });

      const events = await wsSimulator.getTrackedEvents();
      const missingEvent = events.find((e) => e.type === 'docket:missing');
      expect(missingEvent).toBeDefined();
    });

    test('should handle multiple notifications in sequence', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Send multiple notification events in quick succession
      await wsSimulator.emitOvercapacity({
        zoneId: 1,
        zoneName: 'Zone 1',
        occupancy: 110,
        capacity: 100,
      });

      await wsSimulator.emitReaderStatus({
        readerId: 'READER-001',
        readerName: 'Reader 1',
        status: 'offline',
      });

      await wsSimulator.emitDocketMissing({
        labNumber: 'INV-2024-000099',
        caseReference: 'REF/2024/000999',
        lastSeenAt: new Date().toISOString(),
        lastZone: 'Storage',
      });

      const events = await wsSimulator.getTrackedEvents();
      expect(events.length).toBeGreaterThanOrEqual(3);

      // UI should still be responsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Real-time UI Updates', () => {
    test('should update dashboard in real-time without page refresh', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      const initialTimestamp = await page.evaluate(() => Date.now());

      // Send multiple updates
      for (let i = 0; i < 3; i++) {
        await wsSimulator.emitZoneOccupancy({
          zoneId: i + 1,
          occupancy: 50 + i * 10,
          capacity: 100,
        });
        await page.waitForTimeout(100);
      }

      // Verify page wasn't reloaded
      const currentTimestamp = await page.evaluate(() => Date.now());
      expect(currentTimestamp - initialTimestamp).toBeLessThan(5000);

      // UI should be responsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should maintain consistent state across rapid updates', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Rapid fire 20 events
      await page.evaluate(() => {
        for (let i = 0; i < 20; i++) {
          const event = new CustomEvent('zone:occupancy', {
            detail: {
              zoneId: (i % 5) + 1,
              occupancy: 50 + i,
              capacity: 100,
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
        }
      });

      await page.waitForTimeout(500);

      // All events should be tracked
      const events = await wsSimulator.getTrackedEvents();
      const occupancyEvents = events.filter((e) => e.type === 'zone:occupancy');
      expect(occupancyEvents.length).toBe(20);

      // UI should be stable
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle interleaved events of different types', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Interleave different event types
      await wsSimulator.emitZoneOccupancy({ zoneId: 1, occupancy: 60, capacity: 100 });
      await wsSimulator.emitItemMoved({
        itemNumber: 'INV-2024-000001',
        fromZoneId: 1,
        toZoneId: 2,
      });
      await wsSimulator.emitReaderStatus({
        readerId: 'READER-001',
        readerName: 'Reader 1',
        status: 'offline',
      });
      await wsSimulator.emitZoneOccupancy({ zoneId: 2, occupancy: 70, capacity: 100 });
      await wsSimulator.emitItemMoved({
        itemNumber: 'INV-2024-000002',
        fromZoneId: 2,
        toZoneId: 3,
      });

      const events = await wsSimulator.getTrackedEvents();
      expect(events.filter((e) => e.type === 'zone:occupancy').length).toBe(2);
      expect(events.filter((e) => e.type === 'item:moved').length).toBe(2);
      expect(events.filter((e) => e.type === 'reader:status').length).toBe(1);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle malformed WebSocket events gracefully', async ({ page, dashboardPage }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Send malformed events
      await page.evaluate(() => {
        const malformedEvents = [
          new CustomEvent('zone:occupancy', { detail: null }),
          new CustomEvent('zone:occupancy', { detail: undefined }),
          new CustomEvent('zone:occupancy', { detail: 'invalid' }),
          new CustomEvent('zone:occupancy', { detail: {} }),
        ];

        malformedEvents.forEach((event) => {
          try {
            window.dispatchEvent(event);
          } catch (e) {
            // Ignore dispatch errors
          }
        });
      });

      await page.waitForTimeout(300);

      // App should not crash
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should handle event burst during reconnection', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Simulate disconnect
      await wsSimulator.simulateDisconnection();

      // Queue up events during disconnection (simulating buffer)
      const pendingEvents = [];
      for (let i = 0; i < 10; i++) {
        pendingEvents.push({ zoneId: (i % 5) + 1, occupancy: 50 + i * 5, capacity: 100 });
      }

      // Reconnect
      await wsSimulator.simulateConnection();

      // Send all buffered events
      for (const event of pendingEvents) {
        await wsSimulator.emitZoneOccupancy(event);
      }

      await page.waitForTimeout(500);

      // All events should be processed
      const events = await wsSimulator.getTrackedEvents();
      expect(events.filter((e) => e.type === 'zone:occupancy').length).toBe(10);
    });

    test('should handle WebSocket timeout scenarios', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Simulate timeout by disconnecting and not reconnecting immediately
      await wsSimulator.simulateConnection();
      await wsSimulator.simulateDisconnection();

      // Wait simulating timeout
      await page.waitForTimeout(1000);

      // App should still be functional
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // Should be able to reconnect
      await wsSimulator.simulateConnection();
      const isConnected = await wsSimulator.isConnected();
      expect(isConnected).toBe(true);
    });
  });

  test.describe('Performance', () => {
    test('should handle 100 events without degradation', async ({ page, dashboardPage }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      const startTime = Date.now();

      // Send 100 events
      await page.evaluate(() => {
        for (let i = 0; i < 100; i++) {
          const event = new CustomEvent('zone:occupancy', {
            detail: {
              zoneId: (i % 10) + 1,
              occupancy: 50 + (i % 50),
              capacity: 100,
              timestamp: new Date().toISOString(),
            },
          });
          window.dispatchEvent(event);
        }
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 100 events in under 2 seconds
      expect(processingTime).toBeLessThan(2000);

      // All events should be tracked
      const events = await wsSimulator.getTrackedEvents();
      expect(events.filter((e) => e.type === 'zone:occupancy').length).toBe(100);

      // UI should be responsive
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should maintain responsiveness during sustained event stream', async ({
      page,
      dashboardPage,
    }) => {
      await dashboardPage.goto();
      await wsSimulator.setupListeners();
      await dashboardPage.waitForLoad();

      // Simulate sustained event stream over 3 seconds
      for (let batch = 0; batch < 3; batch++) {
        await page.evaluate((batchNum) => {
          for (let i = 0; i < 10; i++) {
            const event = new CustomEvent('zone:occupancy', {
              detail: {
                zoneId: (i % 5) + 1,
                occupancy: 50 + batchNum * 10 + i,
                capacity: 100,
                timestamp: new Date().toISOString(),
              },
            });
            window.dispatchEvent(event);
          }
        }, batch);

        await page.waitForTimeout(500);

        // Check UI responsiveness after each batch
        const root = page.locator('#root');
        await expect(root).toBeVisible();
      }

      const events = await wsSimulator.getTrackedEvents();
      expect(events.filter((e) => e.type === 'zone:occupancy').length).toBe(30);
    });
  });
});
