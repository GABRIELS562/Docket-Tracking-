// Docket marker rendering

import { Docket } from '@/lib/api';
import { ZonePositionsMap } from './types';

export function drawDockets(
  ctx: CanvasRenderingContext2D,
  dockets: Docket[],
  zonePositions: ZonePositionsMap
): void {
  dockets.forEach((docket) => {
    if (!docket.currentZone) return;

    const pos = zonePositions[docket.currentZone.id];
    if (!pos) return;

    // Random offset within zone boundaries
    const offsetX = (Math.random() - 0.5) * (pos.width * 0.7);
    const offsetY = (Math.random() - 0.5) * (pos.height * 0.7);

    // Docket marker
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(pos.x + offsetX, pos.y + offsetY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.beginPath();
    ctx.arc(pos.x + offsetX, pos.y + offsetY, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}
