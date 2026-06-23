'use strict';
/**
 * Phase 1: Discovery Script
 *
 * Explores the Docket Tracking application to map out all interactive elements
 * on each page/state. Run this BEFORE writing the demo script.
 *
 * Usage: node scripts/demo/discover.cjs
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';

async function dumpInteractiveElements(page, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PAGE/STATE: ${label}`);
  console.log('='.repeat(60));

  // Dump all interactive elements
  const fields = await page.evaluate(() => {
    const els = [];
    document.querySelectorAll('input, select, textarea, button, [contenteditable], a, [role="button"]').forEach(el => {
      if (el.offsetParent !== null) {
        els.push({
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          text: el.textContent?.trim().substring(0, 60) || '',
          contentEditable: el.contentEditable === 'true',
          role: el.getAttribute('role') || '',
          className: el.className?.substring?.(0, 80) || '',
          ariaLabel: el.getAttribute('aria-label') || '',
          dataTestId: el.getAttribute('data-testid') || '',
        });
      }
    });
    return els;
  });

  console.log('\nINTERACTIVE ELEMENTS:');
  console.log(JSON.stringify(fields, null, 2));

  // Dump key visual containers
  const containers = await page.evaluate(() => {
    const result = [];
    // Look for stat cards, panels, modals
    document.querySelectorAll('[class*="card"], [class*="panel"], [class*="modal"], [class*="stat"], [class*="dashboard"]').forEach(el => {
      if (el.offsetParent !== null && el.textContent?.trim()) {
        result.push({
          tag: el.tagName,
          className: el.className?.substring?.(0, 100) || '',
          text: el.textContent?.trim().substring(0, 100) || '',
        });
      }
    });
    return result.slice(0, 20); // Limit output
  });

  if (containers.length > 0) {
    console.log('\nKEY CONTAINERS:');
    console.log(JSON.stringify(containers, null, 2));
  }

  return fields;
}

async function discover() {
  console.log('PHASE 1: DISCOVERY');
  console.log(`Target: ${BASE_URL}`);
  console.log('Starting browser...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    // ========================================================================
    // State 1: Dashboard (3D View - Default)
    // ========================================================================
    console.log('Navigating to Dashboard...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for 3D to load

    await dumpInteractiveElements(page, 'Dashboard (3D View)');

    // Check for visible stat cards
    const statCards = await page.locator('.bg-gradient-to-br').count();
    console.log(`\nStat cards found: ${statCards}`);

    // Check for control panel buttons
    const controlButtons = await page.locator('button:has-text("Zones"), button:has-text("Dockets"), button:has-text("3D View"), button:has-text("Top View")').count();
    console.log(`Control panel buttons found: ${controlButtons}`);

    // ========================================================================
    // State 2: Open Docket Panel
    // ========================================================================
    console.log('\n--- Opening Docket Panel ---');
    const docketsBtn = page.locator('button:has-text("Dockets")');
    if (await docketsBtn.isVisible()) {
      await docketsBtn.click();
      await page.waitForTimeout(500);
      await dumpInteractiveElements(page, 'Dashboard + Docket Panel Open');
    }

    // Check for search input in docket panel
    const searchInput = page.locator('input[placeholder*="Search"]');
    const searchVisible = await searchInput.isVisible().catch(() => false);
    console.log(`\nSearch input visible: ${searchVisible}`);

    // ========================================================================
    // State 3: Type in search and check results
    // ========================================================================
    if (searchVisible) {
      console.log('\n--- Testing Search ---');
      await searchInput.fill('INV-2024');
      await page.waitForTimeout(500);

      // Check for docket cards in results
      const docketCards = await page.locator('.font-mono.font-bold').count();
      console.log(`Docket result cards found: ${docketCards}`);
    }

    // Close panel
    await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {});
    await page.waitForTimeout(300);

    // ========================================================================
    // State 4: Open Zones Panel
    // ========================================================================
    console.log('\n--- Opening Zones Panel ---');
    const zonesBtn = page.locator('button:has-text("Zones")');
    if (await zonesBtn.isVisible()) {
      await zonesBtn.click();
      await page.waitForTimeout(500);
      await dumpInteractiveElements(page, 'Dashboard + Zones Panel Open');
    }

    // Check for zone items
    const zoneItems = await page.locator('.rounded-lg.border').count();
    console.log(`\nZone items found: ${zoneItems}`);

    // Close zones panel
    await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {});
    await page.waitForTimeout(300);

    // ========================================================================
    // State 5: Global Search (Cmd+K style)
    // ========================================================================
    console.log('\n--- Testing Global Search ---');
    const searchBtn = page.locator('button:has-text("Search items")');
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(500);
      await dumpInteractiveElements(page, 'Global Search Open');
    }

    // Close search
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ========================================================================
    // State 6: Control Panel Buttons
    // ========================================================================
    console.log('\n--- Mapping Control Panel Buttons ---');
    const controlPanel = await page.locator('.rounded-full.border').filter({ hasText: 'Zones' }).first();
    if (await controlPanel.isVisible()) {
      const buttons = await controlPanel.locator('button').all();
      console.log(`Control panel buttons: ${buttons.length}`);
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`  - Button: "${text?.trim()}"`);
      }
    }

    // ========================================================================
    // State 7: Analytics Page
    // ========================================================================
    console.log('\n--- Navigating to Analytics ---');
    const analyticsLink = page.locator('a:has-text("Analytics")');
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();
      await page.waitForTimeout(1000);
      await dumpInteractiveElements(page, 'Analytics Page');
    }

    // Go back to dashboard
    const dashboardLink = page.locator('a:has-text("Dashboard")');
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForTimeout(1000);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    console.log('DISCOVERY SUMMARY');
    console.log('='.repeat(60));
    console.log(`
KEY SELECTORS FOUND:

Dashboard:
  - Header: h1:has-text("SAPS Forensic 3D Dashboard")
  - Stat Cards: .bg-gradient-to-br (3 cards: Dockets, Zones, Readers)
  - Demo Mode Badge: text="Demo Mode"
  - Connection Status: text="Connected" or text="Disconnected"

Control Panel (bottom center):
  - Zones Toggle: button:has-text("Zones")
  - Dockets Toggle: button:has-text("Dockets")
  - 3D View: button:has-text("3D View")
  - Top View: button:has-text("Top View")
  - Walk Mode: button:has-text("Walk Mode")
  - Heat Map: button:has-text("Heat Map")
  - Timeline: button:has-text("Timeline")
  - Floor Plan Modes: button:has-text("3D"), button:has-text("2D"), button:has-text("Split")

Navigation:
  - Dashboard: a:has-text("Dashboard")
  - Analytics: a:has-text("Analytics")
  - Settings: a:has-text("Settings")
  - Global Search: button:has-text("Search items")

Docket Panel (right side):
  - Search Input: input[placeholder*="Search lab number"]
  - Docket Cards: .font-mono.font-bold (lab numbers)
  - Close Button: button:has(svg.lucide-x)

Zones Panel (left side):
  - Zone Cards: button.rounded-lg.border
  - Close Button: button:has(svg.lucide-x)

Global Search Modal:
  - Input: input[placeholder*="Search items"]
  - Results: Contains item cards with zone navigation buttons
`);

  } catch (err) {
    console.error('DISCOVERY ERROR:', err.message);
  } finally {
    await browser.close();
    console.log('\nDiscovery complete.');
  }
}

discover();
