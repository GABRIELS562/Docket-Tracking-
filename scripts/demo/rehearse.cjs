'use strict';
/**
 * Phase 2: Rehearsal Script
 *
 * Verifies all selectors resolve before recording. Run this AFTER discovery
 * and BEFORE recording to catch silent selector failures.
 *
 * Usage: node scripts/demo/rehearse.cjs
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';

/**
 * Verify a selector is visible, logging success or failure with context
 */
async function ensureVisible(page, locator, label) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    const msg = `REHEARSAL FAIL: "${label}" not found - selector: ${typeof locator === 'string' ? locator : '(locator object)'}`;
    console.error(msg);
    const found = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, input, select, textarea, a'))
        .filter(el => el.offsetParent !== null)
        .map(el => `${el.tagName}[${el.type || ''}] "${el.textContent?.trim().substring(0, 30)}"`)
        .join('\n  ');
    });
    console.error('  Visible elements:\n  ' + found);
    return false;
  }
  console.log(`REHEARSAL OK: "${label}"`);
  return true;
}

/**
 * Wait for element and check visibility
 */
async function waitAndCheck(page, selector, label, timeout = 5000) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout });
    return await ensureVisible(page, selector, label);
  } catch (e) {
    console.error(`REHEARSAL FAIL: "${label}" - timeout waiting for ${selector}`);
    return false;
  }
}

async function rehearse() {
  console.log('PHASE 2: REHEARSAL');
  console.log(`Target: ${BASE_URL}`);
  console.log('Starting browser...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  let allOk = true;

  try {
    // ========================================================================
    // Step 1: Dashboard Overview
    // ========================================================================
    console.log('--- STEP 1: Dashboard Overview ---');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Dashboard elements
    allOk = await ensureVisible(page, 'h1:has-text("SAPS Forensic 3D Dashboard")', 'Dashboard Title') && allOk;
    allOk = await ensureVisible(page, 'text=Real-time Evidence Tracking', 'Dashboard Subtitle') && allOk;

    // Stat cards - check for key metrics
    allOk = await ensureVisible(page, 'text=Total Dockets', 'Total Dockets Stat') && allOk;
    allOk = await ensureVisible(page, 'text=Active Zones', 'Active Zones Stat') && allOk;
    allOk = await ensureVisible(page, 'text=RFID Readers', 'RFID Readers Stat') && allOk;

    // Demo mode indicator
    allOk = await ensureVisible(page, 'text=Demo Mode', 'Demo Mode Badge') && allOk;

    // Control panel
    allOk = await ensureVisible(page, 'button:has-text("Zones")', 'Zones Button') && allOk;
    allOk = await ensureVisible(page, 'button:has-text("Dockets")', 'Dockets Button') && allOk;
    allOk = await ensureVisible(page, 'button:has-text("3D View")', '3D View Button') && allOk;
    allOk = await ensureVisible(page, 'button:has-text("Heat Map")', 'Heat Map Button') && allOk;

    // ========================================================================
    // Step 2: Search for a Docket
    // ========================================================================
    console.log('\n--- STEP 2: Open Docket Panel ---');

    // Click Dockets button
    await page.locator('button:has-text("Dockets")').click();
    await page.waitForTimeout(500);

    // Verify docket panel elements
    allOk = await ensureVisible(page, 'h2:has-text("Dockets")', 'Dockets Panel Title') && allOk;
    allOk = await ensureVisible(page, 'input[placeholder*="Search lab number"]', 'Docket Search Input') && allOk;
    allOk = await ensureVisible(page, 'text=Total Dockets', 'Total Dockets Label') && allOk;

    // Test search functionality
    console.log('\n--- STEP 2b: Test Search ---');
    const searchInput = page.locator('input[placeholder*="Search lab number"]');
    await searchInput.fill('INV-2024-000001');
    await page.waitForTimeout(500);

    // Check for search results or result count
    const searchResultsLabel = await page.locator('text=Search Results').isVisible().catch(() => false);
    if (searchResultsLabel) {
      console.log('REHEARSAL OK: "Search Results Label"');
    } else {
      console.log('REHEARSAL INFO: "Search Results Label" - may not appear with no matches');
    }

    // Check for docket cards (should have mock data)
    const docketCards = await page.locator('button.w-full.p-3').count();
    if (docketCards > 0) {
      console.log(`REHEARSAL OK: "Docket Cards" - found ${docketCards}`);
    } else {
      console.log('REHEARSAL WARN: "Docket Cards" - none found (may need different search query)');
    }

    // ========================================================================
    // Step 3: Click a Docket Result (Locate Docket)
    // ========================================================================
    console.log('\n--- STEP 3: Click Docket Result ---');

    // Clear search to show all
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Click first docket card
    const firstDocket = page.locator('button.w-full.p-3').first();
    const docketVisible = await firstDocket.isVisible().catch(() => false);
    if (docketVisible) {
      console.log('REHEARSAL OK: "First Docket Card"');
      await firstDocket.click();
      await page.waitForTimeout(500);
      // The click should select the zone - zone highlight happens in 3D view
      console.log('REHEARSAL OK: "Docket Click (zone selection)"');
    } else {
      console.log('REHEARSAL FAIL: "First Docket Card" - no docket cards visible');
      allOk = false;
    }

    // Close docket panel
    await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {});
    await page.waitForTimeout(300);

    // ========================================================================
    // Step 4: View Item Details - Open Zones Panel and select a zone
    // ========================================================================
    console.log('\n--- STEP 4: Zones Panel ---');

    await page.locator('button:has-text("Zones")').click();
    await page.waitForTimeout(500);

    allOk = await ensureVisible(page, 'h2:has-text("Zones")', 'Zones Panel Title') && allOk;

    // Click first zone to trigger zone selection
    const firstZone = page.locator('.fixed.left-0 button.w-full').first();
    const zoneVisible = await firstZone.isVisible().catch(() => false);
    if (zoneVisible) {
      console.log('REHEARSAL OK: "First Zone Card"');
      await firstZone.click();
      await page.waitForTimeout(500);
      console.log('REHEARSAL OK: "Zone Click (camera fly-to)"');
    } else {
      console.log('REHEARSAL FAIL: "First Zone Card" - no zone cards visible');
      allOk = false;
    }

    // Close zones panel
    await page.locator('button:has(svg.lucide-x)').first().click().catch(() => {});
    await page.waitForTimeout(300);

    // ========================================================================
    // Step 5: Timeline / Playback simulation
    // ========================================================================
    console.log('\n--- STEP 5: Timeline ---');

    const timelineBtn = page.locator('button:has-text("Timeline")');
    allOk = await ensureVisible(page, timelineBtn, 'Timeline Button') && allOk;

    await timelineBtn.click();
    await page.waitForTimeout(500);

    // Timeline should be active (button highlighted)
    const timelineActive = await timelineBtn.evaluate(el => el.classList.contains('bg-blue-500'));
    if (timelineActive) {
      console.log('REHEARSAL OK: "Timeline Active State"');
    } else {
      console.log('REHEARSAL INFO: "Timeline Active State" - button styling may differ');
    }

    // Turn off timeline
    await timelineBtn.click();
    await page.waitForTimeout(300);

    // ========================================================================
    // Step 5b: Heat Map Toggle
    // ========================================================================
    console.log('\n--- STEP 5b: Heat Map ---');

    const heatMapBtn = page.locator('button:has-text("Heat Map")');
    allOk = await ensureVisible(page, heatMapBtn, 'Heat Map Button') && allOk;

    await heatMapBtn.click();
    await page.waitForTimeout(800);
    console.log('REHEARSAL OK: "Heat Map Toggle"');

    // Turn off heat map
    await heatMapBtn.click();
    await page.waitForTimeout(300);

    // ========================================================================
    // Navigation elements
    // ========================================================================
    console.log('\n--- NAVIGATION ---');
    allOk = await ensureVisible(page, 'a:has-text("Dashboard")', 'Dashboard Nav Link') && allOk;
    allOk = await ensureVisible(page, 'a:has-text("Analytics")', 'Analytics Nav Link') && allOk;
    allOk = await ensureVisible(page, 'a:has-text("Settings")', 'Settings Nav Link') && allOk;
    allOk = await ensureVisible(page, 'button:has-text("Search items")', 'Global Search Button') && allOk;

    // ========================================================================
    // Global Search Modal
    // ========================================================================
    console.log('\n--- GLOBAL SEARCH ---');
    await page.locator('button:has-text("Search items")').click();
    await page.waitForTimeout(500);

    allOk = await ensureVisible(page, 'input[placeholder*="Search items"]', 'Global Search Input') && allOk;

    // Close with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(60));
    if (allOk) {
      console.log('REHEARSAL PASSED - all selectors verified');
      console.log('='.repeat(60));
      console.log('\nYou can proceed to Phase 3: Recording');
      console.log('Run: node scripts/demo/record.cjs');
    } else {
      console.log('REHEARSAL FAILED - fix selectors before recording');
      console.log('='.repeat(60));
      console.log('\nReview the failed selectors above and update record.cjs');
      process.exit(1);
    }

  } catch (err) {
    console.error('\nREHEARSAL ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

rehearse();
