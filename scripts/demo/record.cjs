'use strict';
/**
 * Phase 3: Recording Script
 *
 * Records a polished demo video of the Docket Tracking application with:
 * - SVG cursor overlay
 * - Subtitle bar for narration
 * - Natural pacing and smooth mouse movements
 * - Professional storytelling flow
 *
 * Usage:
 *   node scripts/demo/record.cjs           # Record video
 *   node scripts/demo/record.cjs --rehearse  # Run rehearsal only
 *
 * Output: scripts/demo/screenshots/demo-docket-tracking.webm
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3000';
const VIDEO_DIR = path.join(__dirname, 'screenshots');
const OUTPUT_NAME = 'demo-docket-tracking.webm';
const REHEARSAL = process.argv.includes('--rehearse');

// ============================================================================
// Helper Functions (from ui-demo skill)
// ============================================================================

/**
 * Inject an SVG arrow cursor that follows mouse movements
 */
async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-cursor')) return;
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    cursor.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
    cursor.style.cssText = `
      position: fixed; z-index: 999999; pointer-events: none;
      width: 24px; height: 24px;
      transition: left 0.1s, top 0.1s;
      filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
    `;
    cursor.style.left = '0px';
    cursor.style.top = '0px';
    document.body.appendChild(cursor);
    document.addEventListener('mousemove', (e) => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top = e.clientY + 'px';
    });
  });
}

/**
 * Inject a subtitle bar at the bottom of the viewport
 */
async function injectSubtitleBar(page) {
  await page.evaluate(() => {
    if (document.getElementById('demo-subtitle')) return;
    const bar = document.createElement('div');
    bar.id = 'demo-subtitle';
    bar.style.cssText = `
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998;
      text-align: center; padding: 12px 24px;
      background: rgba(0, 0, 0, 0.75);
      color: white; font-family: -apple-system, "Segoe UI", sans-serif;
      font-size: 16px; font-weight: 500; letter-spacing: 0.3px;
      transition: opacity 0.3s;
      pointer-events: none;
    `;
    bar.textContent = '';
    bar.style.opacity = '0';
    document.body.appendChild(bar);
  });
}

/**
 * Show or hide subtitle text
 */
async function showSubtitle(page, text) {
  await page.evaluate((t) => {
    const bar = document.getElementById('demo-subtitle');
    if (!bar) return;
    if (t) {
      bar.textContent = t;
      bar.style.opacity = '1';
    } else {
      bar.style.opacity = '0';
    }
  }, text);
  if (text) await page.waitForTimeout(800);
}

/**
 * Verify a selector is visible
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
 * Move mouse to element and click with natural motion
 */
async function moveAndClick(page, locator, label, opts = {}) {
  const { postClickDelay = 800, ...clickOpts } = opts;
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: moveAndClick skipped - "${label}" not visible`);
    return false;
  }
  try {
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const box = await el.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await page.waitForTimeout(400);
    }
    await el.click(clickOpts);
  } catch (e) {
    console.error(`WARNING: moveAndClick failed on "${label}": ${e.message}`);
    return false;
  }
  await page.waitForTimeout(postClickDelay);
  return true;
}

/**
 * Type text slowly with visible character-by-character input
 */
async function typeSlowly(page, locator, text, label, charDelay = 35) {
  const el = typeof locator === 'string' ? page.locator(locator).first() : locator;
  const visible = await el.isVisible().catch(() => false);
  if (!visible) {
    console.error(`WARNING: typeSlowly skipped - "${label}" not visible`);
    return false;
  }
  await moveAndClick(page, el, label);
  await el.fill('');
  await el.pressSequentially(text, { delay: charDelay });
  await page.waitForTimeout(500);
  return true;
}

/**
 * Pan cursor across multiple elements
 */
async function panElements(page, selector, maxCount = 6) {
  const elements = await page.locator(selector).all();
  for (let i = 0; i < Math.min(elements.length, maxCount); i++) {
    try {
      const box = await elements[i].boundingBox();
      if (box && box.y < 700) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(600);
      }
    } catch (e) {
      console.warn(`WARNING: panElements skipped element ${i} (selector: "${selector}"): ${e.message}`);
    }
  }
}

/**
 * Smooth scroll to a position
 */
async function smoothScroll(page, top = 400) {
  await page.evaluate((t) => window.scrollTo({ top: t, behavior: 'smooth' }), top);
  await page.waitForTimeout(1500);
}

// ============================================================================
// Rehearsal Mode
// ============================================================================

async function runRehearsal(browser) {
  console.log('Running REHEARSAL mode...\n');
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  let allOk = true;

  // Navigate to app
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const steps = [
    { label: 'Dashboard Title', selector: 'h1:has-text("SAPS Forensic 3D Dashboard")' },
    { label: 'Demo Mode Badge', selector: 'text=Demo Mode' },
    { label: 'Total Dockets Stat', selector: 'text=Total Dockets' },
    { label: 'Active Zones Stat', selector: 'text=Active Zones' },
    { label: 'RFID Readers Stat', selector: 'text=RFID Readers' },
    { label: 'Dockets Button', selector: 'button:has-text("Dockets")' },
    { label: 'Zones Button', selector: 'button:has-text("Zones")' },
    { label: 'Heat Map Button', selector: 'button:has-text("Heat Map")' },
    { label: 'Timeline Button', selector: 'button:has-text("Timeline")' },
    { label: 'Global Search Button', selector: 'button:has-text("Search items")' },
  ];

  for (const step of steps) {
    if (!await ensureVisible(page, step.selector, step.label)) {
      allOk = false;
    }
  }

  // Open docket panel and check search
  await page.locator('button:has-text("Dockets")').click();
  await page.waitForTimeout(500);
  if (!await ensureVisible(page, 'input[placeholder*="Search lab number"]', 'Docket Search Input')) {
    allOk = false;
  }

  await context.close();

  if (!allOk) {
    console.error('\nREHEARSAL FAILED - fix selectors before recording');
    process.exit(1);
  }
  console.log('\nREHEARSAL PASSED - all selectors verified');
}

// ============================================================================
// Recording Mode
// ============================================================================

async function runRecording(browser) {
  console.log('Running RECORDING mode...\n');

  // Ensure output directory exists
  if (!fs.existsSync(VIDEO_DIR)) {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });
  }

  const context = await browser.newContext({
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  try {
    // ==========================================================================
    // STEP 1: Dashboard Overview
    // ==========================================================================
    console.log('Recording Step 1: Dashboard Overview');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Wait for 3D to initialize

    await injectCursor(page);
    await injectSubtitleBar(page);

    await showSubtitle(page, 'Step 1 - Dashboard Overview');
    await page.waitForTimeout(2000);

    // Pan across the stat cards
    console.log('  Panning stat cards...');
    await panElements(page, '.bg-gradient-to-br', 3);
    await page.waitForTimeout(1000);

    // Hover over the title
    const title = page.locator('h1:has-text("SAPS Forensic 3D Dashboard")');
    const titleBox = await title.boundingBox();
    if (titleBox) {
      await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2, { steps: 10 });
      await page.waitForTimeout(800);
    }

    // Show demo mode badge
    const demoBadge = page.locator('text=Demo Mode');
    const demoBox = await demoBadge.boundingBox().catch(() => null);
    if (demoBox) {
      await page.mouse.move(demoBox.x + demoBox.width / 2, demoBox.y + demoBox.height / 2, { steps: 8 });
      await page.waitForTimeout(600);
    }

    await page.waitForTimeout(1500);
    await showSubtitle(page, '');

    // ==========================================================================
    // STEP 2: Search for a Docket
    // ==========================================================================
    console.log('Recording Step 2: Search for a Docket');

    await showSubtitle(page, 'Step 2 - Search for a Docket');
    await page.waitForTimeout(1500);

    // Open Dockets panel
    await moveAndClick(page, 'button:has-text("Dockets")', 'Dockets Button', { postClickDelay: 1000 });

    // Type in search
    const searchInput = page.locator('input[placeholder*="Search lab number"]');
    await typeSlowly(page, searchInput, 'INV-2024-00001', 'Search Input', 40);
    await page.waitForTimeout(1500);

    // Show results count area
    const resultsArea = page.locator('text=Search Results');
    if (await resultsArea.isVisible().catch(() => false)) {
      const resultsBox = await resultsArea.boundingBox();
      if (resultsBox) {
        await page.mouse.move(resultsBox.x + resultsBox.width / 2, resultsBox.y + resultsBox.height / 2, { steps: 8 });
        await page.waitForTimeout(600);
      }
    }

    await page.waitForTimeout(1000);
    await showSubtitle(page, '');

    // ==========================================================================
    // STEP 3: Locate Docket
    // ==========================================================================
    console.log('Recording Step 3: Locate Docket');

    await showSubtitle(page, 'Step 3 - Locate Docket in 3D View');
    await page.waitForTimeout(1500);

    // Clear search to show all dockets
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Click first docket card to select its zone
    const firstDocket = page.locator('button.w-full.p-3').first();
    if (await firstDocket.isVisible()) {
      // Get docket info for display
      const docketText = await firstDocket.locator('.font-mono.font-bold').first().textContent().catch(() => 'Docket');
      console.log(`  Clicking docket: ${docketText}`);

      await moveAndClick(page, firstDocket, 'First Docket Card', { postClickDelay: 1500 });

      // The 3D view should highlight the zone - pause for camera animation
      await page.waitForTimeout(2000);
    }

    // Close docket panel to show 3D view clearly
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await moveAndClick(page, closeBtn, 'Close Docket Panel', { postClickDelay: 1000 });

    await page.waitForTimeout(1500);
    await showSubtitle(page, '');

    // ==========================================================================
    // STEP 4: View Zone Details
    // ==========================================================================
    console.log('Recording Step 4: View Zone Details');

    await showSubtitle(page, 'Step 4 - View Zone and Item Details');
    await page.waitForTimeout(1500);

    // Open Zones panel
    await moveAndClick(page, 'button:has-text("Zones")', 'Zones Button', { postClickDelay: 1000 });

    // Pan across zone cards
    const zoneCards = page.locator('.fixed.left-0 button.w-full');
    const zoneCount = await zoneCards.count();
    console.log(`  Found ${zoneCount} zone cards`);

    // Pan first 4 zones
    for (let i = 0; i < Math.min(4, zoneCount); i++) {
      const card = zoneCards.nth(i);
      const box = await card.boundingBox().catch(() => null);
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
        await page.waitForTimeout(700);
      }
    }

    // Click a zone to trigger camera fly-to
    if (zoneCount > 0) {
      await moveAndClick(page, zoneCards.nth(1), 'Zone Card', { postClickDelay: 2000 });
    }

    // Close zones panel
    await moveAndClick(page, page.locator('button:has(svg.lucide-x)').first(), 'Close Zones Panel', { postClickDelay: 1000 });

    await page.waitForTimeout(1500);
    await showSubtitle(page, '');

    // ==========================================================================
    // STEP 5: Signal Strength / Proximity Features
    // ==========================================================================
    console.log('Recording Step 5: Proximity & Signal Features');

    await showSubtitle(page, 'Step 5 - Heat Map & Real-time Tracking');
    await page.waitForTimeout(1500);

    // Enable Heat Map
    await moveAndClick(page, 'button:has-text("Heat Map")', 'Heat Map Button', { postClickDelay: 2000 });

    // Let the heat map render
    await page.waitForTimeout(2000);

    // Pan control panel to show various view modes
    const controlPanel = page.locator('.rounded-full.border.border-blue-500\\/30').first();
    if (await controlPanel.isVisible()) {
      const buttons = await controlPanel.locator('button').all();
      console.log(`  Control panel has ${buttons.length} buttons`);

      // Move across a few buttons
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        const box = await buttons[i].boundingBox().catch(() => null);
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 6 });
          await page.waitForTimeout(400);
        }
      }
    }

    // Toggle Timeline
    await moveAndClick(page, 'button:has-text("Timeline")', 'Timeline Button', { postClickDelay: 1500 });

    // Let it show
    await page.waitForTimeout(1500);

    // Turn off timeline
    await moveAndClick(page, 'button:has-text("Timeline")', 'Timeline Button (off)', { postClickDelay: 800 });

    // Turn off heat map
    await moveAndClick(page, 'button:has-text("Heat Map")', 'Heat Map Button (off)', { postClickDelay: 1000 });

    await showSubtitle(page, '');

    // ==========================================================================
    // FINAL: Quick tour of view modes
    // ==========================================================================
    console.log('Recording: View modes tour');

    await showSubtitle(page, 'Multiple View Modes');
    await page.waitForTimeout(1500);

    // Switch to Top View
    await moveAndClick(page, 'button:has-text("Top View")', 'Top View', { postClickDelay: 2000 });

    // Switch to Walk Mode
    await moveAndClick(page, 'button:has-text("Walk Mode")', 'Walk Mode', { postClickDelay: 2000 });

    // Back to 3D View
    await moveAndClick(page, 'button:has-text("3D View")', '3D View', { postClickDelay: 2000 });

    await showSubtitle(page, '');

    // ==========================================================================
    // ENDING
    // ==========================================================================
    console.log('Recording: Ending');

    await showSubtitle(page, 'RFID Docket Tracking - Real-time 3D Visualization');
    await page.waitForTimeout(3000);

    await showSubtitle(page, '');
    await page.waitForTimeout(1500);

    console.log('Recording complete.');

  } catch (err) {
    console.error('RECORDING ERROR:', err.message);
    console.error(err.stack);
  } finally {
    // Close context to finalize video
    await context.close();

    // Copy video to output path
    const video = page.video();
    if (video) {
      const src = await video.path();
      const dest = path.join(VIDEO_DIR, OUTPUT_NAME);
      try {
        fs.copyFileSync(src, dest);
        console.log('\nVideo saved:', dest);
      } catch (e) {
        console.error('ERROR: Failed to copy video:', e.message);
        console.error('  Source:', src);
        console.error('  Destination:', dest);
      }
    }
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

(async () => {
  console.log('='.repeat(60));
  console.log('DOCKET TRACKING DEMO RECORDER');
  console.log('='.repeat(60));
  console.log(`Target: ${BASE_URL}`);
  console.log(`Mode: ${REHEARSAL ? 'REHEARSAL' : 'RECORDING'}`);
  console.log(`Output: ${path.join(VIDEO_DIR, OUTPUT_NAME)}`);
  console.log('');

  const browser = await chromium.launch({ headless: true });

  try {
    if (REHEARSAL) {
      await runRehearsal(browser);
    } else {
      await runRecording(browser);
    }
  } finally {
    await browser.close();
  }
})();
