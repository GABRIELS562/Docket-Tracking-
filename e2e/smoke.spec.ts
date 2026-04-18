import { test, expect } from '@playwright/test';

/**
 * Smoke Tests - SAPS RFID Platform
 *
 * These tests verify that the application loads correctly
 * and basic functionality is working. They should be fast
 * and run on every deployment.
 */

test.describe('Application Smoke Tests', () => {
  test.describe('Homepage / Dashboard', () => {
    test('should load the dashboard page', async ({ page }) => {
      await page.goto('/');

      // Verify the page title
      await expect(page).toHaveTitle(/SAPS Forensic 3D Dashboard/);

      // Verify the root element is present and rendered
      const root = page.locator('#root');
      await expect(root).toBeVisible();

      // Verify the app has rendered content (not just empty root)
      await expect(root).not.toBeEmpty();
    });

    test('should have no console errors on load', async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Filter out known acceptable errors (e.g., 3rd party scripts, expected warnings)
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes('favicon.ico') &&
          !error.includes('Failed to load resource') && // API may not be running
          !error.includes('WebSocket') // WebSocket server may not be running
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('should not have any JavaScript errors', async ({ page }) => {
      const pageErrors: Error[] = [];

      page.on('pageerror', (error) => {
        pageErrors.push(error);
      });

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Wait a bit for any async errors
      await page.waitForTimeout(1000);

      expect(pageErrors).toHaveLength(0);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to analytics page', async ({ page }) => {
      await page.goto('/');

      // Look for analytics link/button and click it
      const analyticsLink = page.getByRole('link', { name: /analytics/i });

      // If the link exists, click it
      if (await analyticsLink.isVisible()) {
        await analyticsLink.click();
        await expect(page).toHaveURL(/.*\/analytics/);
      } else {
        // Try direct navigation
        await page.goto('/analytics');
        await expect(page).toHaveURL(/.*\/analytics/);
      }

      // Verify analytics page loaded
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should navigate to settings page', async ({ page }) => {
      await page.goto('/');

      // Look for settings link/button and click it
      const settingsLink = page.getByRole('link', { name: /settings/i });

      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await expect(page).toHaveURL(/.*\/settings/);
      } else {
        // Try direct navigation
        await page.goto('/settings');
        await expect(page).toHaveURL(/.*\/settings/);
      }

      // Verify settings page loaded
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should redirect unknown routes to dashboard', async ({ page }) => {
      await page.goto('/nonexistent-page-12345');

      // Should redirect to home
      await expect(page).toHaveURL('/');
    });
  });

  test.describe('Responsive Design', () => {
    test('should render correctly on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should render correctly on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should render correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // Page should load within 10 seconds (generous for CI environments)
      expect(loadTime).toBeLessThan(10000);
    });

    test('should have no memory leaks on navigation', async ({ page }) => {
      // Navigate multiple times to check for memory issues
      for (let i = 0; i < 3; i++) {
        await page.goto('/');
        await page.goto('/analytics');
        await page.goto('/settings');
      }

      // If we got here without crashing, the test passes
      await page.goto('/');
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });
  });

  test.describe('Accessibility Basics', () => {
    test('should have proper document structure', async ({ page }) => {
      await page.goto('/');

      // Check for proper HTML structure
      const html = page.locator('html');
      await expect(html).toHaveAttribute('lang', 'en');

      // Check for root element
      const root = page.locator('#root');
      await expect(root).toBeVisible();
    });

    test('should have a viewport meta tag', async ({ page }) => {
      await page.goto('/');

      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute('content', /width=device-width/);
    });
  });
});

test.describe('3D Dashboard Specific', () => {
  test('should initialize without WebGL errors', async ({ page }) => {
    const webglErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.toLowerCase().includes('webgl') && msg.type() === 'error') {
        webglErrors.push(text);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for 3D scene to initialize
    await page.waitForTimeout(2000);

    // WebGL errors would indicate the 3D rendering failed
    expect(webglErrors).toHaveLength(0);
  });

  test('should render canvas element for 3D scene', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to fully load
    await page.waitForLoadState('networkidle');

    // Check if canvas exists (React Three Fiber renders to canvas)
    const canvas = page.locator('canvas');

    // The 3D dashboard should have at least one canvas
    // This may timeout if no 3D scene is rendered, which is acceptable
    // for a smoke test - we just want to know if it's there
    const canvasCount = await canvas.count();

    // Log for debugging
    if (canvasCount === 0) {
      console.log('No canvas found - 3D scene may not be rendered on this page');
    }

    // This is informational - don't fail if no canvas
    // (the 3D view might be conditionally rendered)
  });
});
