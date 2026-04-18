import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Custom test fixtures for SAPS RFID Platform E2E tests
 *
 * Extends Playwright's base test with custom page objects and utilities.
 */

/**
 * Dashboard Page Object
 * Encapsulates interactions with the main 3D dashboard
 */
export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getCanvas() {
    return this.page.locator('canvas').first();
  }

  async hasCanvas() {
    const canvas = this.page.locator('canvas');
    return (await canvas.count()) > 0;
  }

  async getZoneCards() {
    // Zone cards typically display zone information
    return this.page.locator('[data-testid="zone-card"]');
  }

  async getNotifications() {
    return this.page.locator('[data-testid="notification"]');
  }

  async getSidebar() {
    return this.page.locator('[data-testid="sidebar"], nav, aside').first();
  }
}

/**
 * Analytics Page Object
 */
export class AnalyticsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/analytics');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForCharts() {
    // Wait for Recharts to render
    await this.page.waitForSelector('svg.recharts-surface', { timeout: 10000 }).catch(() => {
      // Charts may not be present on all builds
    });
  }

  async getCharts() {
    return this.page.locator('.recharts-wrapper');
  }
}

/**
 * Settings Page Object
 */
export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getForm() {
    return this.page.locator('form').first();
  }

  async getInputs() {
    return this.page.locator('input, select, textarea');
  }
}

/**
 * Navigation helper
 */
export class Navigation {
  constructor(private readonly page: Page) {}

  async goToDashboard() {
    const link = this.page.getByRole('link', { name: /dashboard|home/i });
    if (await link.isVisible()) {
      await link.click();
    } else {
      await this.page.goto('/');
    }
    await this.page.waitForURL('/');
  }

  async goToAnalytics() {
    const link = this.page.getByRole('link', { name: /analytics/i });
    if (await link.isVisible()) {
      await link.click();
    } else {
      await this.page.goto('/analytics');
    }
    await this.page.waitForURL(/\/analytics/);
  }

  async goToSettings() {
    const link = this.page.getByRole('link', { name: /settings/i });
    if (await link.isVisible()) {
      await link.click();
    } else {
      await this.page.goto('/settings');
    }
    await this.page.waitForURL(/\/settings/);
  }
}

/**
 * Test utilities
 */
export const testUtils = {
  /**
   * Wait for the app to be fully interactive
   */
  async waitForAppReady(page: Page) {
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('#root:not(:empty)', { timeout: 30000 });
  },

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(page: Page, name: string) {
    await page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });
  },

  /**
   * Check for console errors (excluding expected ones)
   */
  async collectConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out expected errors
        if (
          !text.includes('favicon.ico') &&
          !text.includes('Failed to load resource') &&
          !text.includes('WebSocket')
        ) {
          errors.push(text);
        }
      }
    });

    return errors;
  },

  /**
   * Mock API responses for testing without backend
   */
  async mockApiResponses(page: Page) {
    await page.route('**/api/**', (route) => {
      const url = route.request().url();

      // Mock different endpoints
      if (url.includes('/zones')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      if (url.includes('/dockets') || url.includes('/items')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      if (url.includes('/readers')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      // Default mock for unknown endpoints
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  },
};

/**
 * Extended test fixture with page objects
 */
interface Fixtures {
  dashboardPage: DashboardPage;
  analyticsPage: AnalyticsPage;
  settingsPage: SettingsPage;
  navigation: Navigation;
}

export const test = base.extend<Fixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  analyticsPage: async ({ page }, use) => {
    const analyticsPage = new AnalyticsPage(page);
    await use(analyticsPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  navigation: async ({ page }, use) => {
    const navigation = new Navigation(page);
    await use(navigation);
  },
});

export { expect };
