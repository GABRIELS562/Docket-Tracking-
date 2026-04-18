// Zone rendering functions

import { Zone } from '@/lib/api';
import { ZonePosition } from './types';
import { hexToRgba, getZoneColor } from './utils';

export interface DrawZoneParams {
  ctx: CanvasRenderingContext2D;
  zone: Zone;
  pos: ZonePosition;
  isSelected: boolean;
}

export function drawZone({ ctx, zone, pos, isSelected }: DrawZoneParams): void {
  const occupancyPercent = zone.currentOccupancy / zone.capacity;
  const zoneColor = getZoneColor(zone.zoneType);

  drawZoneTile(ctx, pos, zoneColor, occupancyPercent, zone.zoneType, isSelected);
  drawZoneLabel(ctx, pos);
  drawOccupancyInfo(ctx, pos, zone.currentOccupancy, zone.capacity, occupancyPercent);
  drawWarningIndicator(ctx, pos, occupancyPercent);
}

function drawZoneTile(
  ctx: CanvasRenderingContext2D,
  pos: ZonePosition,
  zoneColor: string,
  occupancyPercent: number,
  zoneType: string,
  isSelected: boolean
): void {
  const rectX = pos.x - pos.width / 2;
  const rectY = pos.y - pos.height / 2;

  ctx.strokeStyle = isSelected ? '#3b82f6' : zoneColor;
  ctx.lineWidth = isSelected ? 4 : 2;

  const baseOpacity = zoneType === 'corridor' ? 0.2 : 0.3;
  ctx.fillStyle = isSelected
    ? 'rgba(59, 130, 246, 0.4)'
    : hexToRgba(zoneColor, baseOpacity + occupancyPercent * 0.2);

  ctx.beginPath();
  ctx.roundRect(rectX, rectY, pos.width, pos.height, 8);
  ctx.fill();
  ctx.stroke();
}

function drawZoneLabel(ctx: CanvasRenderingContext2D, pos: ZonePosition): void {
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pos.label, pos.x, pos.y - 5);
}

function drawOccupancyInfo(
  ctx: CanvasRenderingContext2D,
  pos: ZonePosition,
  currentOccupancy: number,
  capacity: number,
  occupancyPercent: number
): void {
  // Occupancy text
  ctx.font = '9px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(`${currentOccupancy}/${capacity}`, pos.x, pos.y + 10);

  // Occupancy bar
  const barWidth = Math.min(pos.width * 0.8, 90);
  const barHeight = 5;
  const barX = pos.x - barWidth / 2;
  const barY = pos.y + 22;

  ctx.fillStyle = '#374151';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  ctx.fillStyle = occupancyPercent > 0.8 ? '#ef4444' : '#10b981';
  ctx.fillRect(barX, barY, barWidth * occupancyPercent, barHeight);
}

function drawWarningIndicator(
  ctx: CanvasRenderingContext2D,
  pos: ZonePosition,
  occupancyPercent: number
): void {
  if (occupancyPercent > 0.9) {
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(pos.x + pos.width / 2 - 10, pos.y - pos.height / 2 + 10, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}
