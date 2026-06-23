# Demo Recording Scripts

This directory contains scripts for recording polished demo videos of the Docket Tracking application using Playwright.

## Prerequisites

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Ensure Playwright browsers are installed:
   ```bash
   npx playwright install chromium
   ```

## Three-Phase Process

Following the [ECC ui-demo skill](../../ECC/skills/ui-demo/SKILL.md), demo recording uses a three-phase process:

### Phase 1: Discover

Explore the application and map out all interactive elements:

```bash
npm run demo:discover
```

This script navigates through the app and dumps all visible interactive elements, helping you understand what selectors are available before writing the recording script.

### Phase 2: Rehearse

Verify all selectors resolve correctly before recording:

```bash
npm run demo:rehearse
```

This script runs through the demo flow without recording, checking that every selector resolves. If any selectors fail, the script will exit with an error showing what elements are actually visible.

### Phase 3: Record

Create the final demo video:

```bash
npm run demo:record
```

Output: `scripts/demo/screenshots/demo-docket-tracking.webm`

## Demo Flow

The recording script showcases the following features:

1. **Dashboard Overview** - Pan across stat cards showing total dockets, zones, and readers
2. **Search for a Docket** - Open docket panel and type in search query
3. **Locate Docket** - Click a result to highlight the zone in 3D view
4. **View Zone Details** - Open zones panel and navigate to specific zones
5. **Proximity Features** - Enable heat map and timeline playback
6. **View Modes** - Quick tour of 3D, Top, and Walk view modes

## Customization

### Environment Variables

- `QA_BASE_URL` - Override the base URL (default: `http://localhost:3000`)

### Video Settings

- Resolution: 1280x720
- Format: WebM
- Output: `scripts/demo/screenshots/demo-docket-tracking.webm`

## Features

The recording includes:

- **SVG Cursor Overlay** - Visible arrow cursor that follows mouse movements
- **Subtitle Bar** - Step-by-step narration at the bottom of the screen
- **Natural Pacing** - Deliberate pauses between actions for clarity
- **Smooth Mouse Movements** - No cursor teleportation
- **Visible Typing** - Character-by-character text input

## Troubleshooting

### Video file not found

The video is initially saved with a random name by Playwright. The script copies it to the final output path. Check `scripts/demo/screenshots/` for any `.webm` files.

### Cursor disappears after navigation

The cursor overlay is re-injected after each page navigation. If you add new navigation steps, ensure `injectCursor(page)` and `injectSubtitleBar(page)` are called.

### Selectors not found

Run the discover script to see what elements are actually visible, then update the selectors in `record.cjs`.
