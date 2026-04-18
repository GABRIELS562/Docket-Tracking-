// Background and structural rendering for the floor plan

export function drawProceduralFloorPlan(ctx: CanvasRenderingContext2D): void {
  drawGrid(ctx);
  drawBuildingOutline(ctx);
  drawTitle(ctx);
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 1;

  for (let x = 0; x <= 1024; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 768);
    ctx.stroke();
  }

  for (let y = 0; y <= 768; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }
}

function drawBuildingOutline(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  // Main central building
  ctx.beginPath();
  ctx.rect(250, 200, 524, 480);
  ctx.stroke();

  // Far left wing - Office Accommodation
  ctx.beginPath();
  ctx.rect(50, 264, 170, 240);
  ctx.stroke();

  // Right wing - Admin/Support
  ctx.beginPath();
  ctx.rect(800, 220, 170, 240);
  ctx.stroke();

  // TOP curved section indicator
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(512, 150, 220, Math.PI * 0.75, Math.PI * 0.25, true);
  ctx.stroke();

  // BOTTOM curved section indicator - Auditorium
  ctx.beginPath();
  ctx.arc(512, 630, 190, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();
}

function drawTitle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FSL-PAROW', 512, 40);
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('First Floor - Architectural Layout', 512, 58);
}

export function drawCurvedSections(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);

  // TOP curved section (exam rooms)
  ctx.beginPath();
  ctx.arc(512, 150, 220, Math.PI * 0.75, Math.PI * 0.25, true);
  ctx.stroke();

  // BOTTOM curved section (auditorium)
  ctx.strokeStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(512, 630, 190, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  ctx.setLineDash([]);
}

export function drawConnectionLines(
  ctx: CanvasRenderingContext2D,
  entrancePos: { x: number; y: number },
  targetPositions: Array<{ x: number; y: number }>
): void {
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);

  targetPositions.forEach((pos) => {
    ctx.beginPath();
    ctx.moveTo(entrancePos.x, entrancePos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  });

  ctx.setLineDash([]);
}
