import { useEffect, useRef, useState } from 'react';
import { Zone, Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface FloorPlan2DProps {
  zones: Zone[];
  dockets: Docket[];
}

// Zone positions in 2D canvas coordinates - FSL-PAROW First Floor ACTUAL Layout
const ZONE_2D_POSITIONS: Record<
  number,
  { x: number; y: number; width: number; height: number; label: string }
> = {
  // FAR LEFT - Large Office Accommodation
  1: { x: 120, y: 384, width: 140, height: 240, label: 'Office Accommodation' },

  // TOP CURVED SECTION - 4 Small Exam Rooms
  2: { x: 310, y: 120, width: 85, height: 65, label: 'Exam 1' },
  3: { x: 430, y: 100, width: 85, height: 65, label: 'Exam 2' },
  4: { x: 594, y: 100, width: 85, height: 65, label: 'Exam 3' },
  5: { x: 714, y: 120, width: 85, height: 65, label: 'Exam 4' },

  // CENTER - Large E.I.M.S Area
  6: { x: 512, y: 340, width: 200, height: 180, label: 'E.I.M.S Center' },

  // RIGHT SIDE - Offices
  7: { x: 884, y: 260, width: 110, height: 80, label: 'Admin' },
  8: { x: 884, y: 360, width: 110, height: 70, label: 'Support' },

  // STAIRWELL - Central Left
  9: { x: 340, y: 384, width: 60, height: 60, label: 'Stairs' },

  // BOTTOM CURVED SECTION - Auditorium
  10: { x: 512, y: 600, width: 180, height: 100, label: 'Auditorium' },

  // BOTTOM CENTER - Entrance
  11: { x: 512, y: 720, width: 100, height: 60, label: 'Entrance' },

  // STORAGE - Right Side
  12: { x: 850, y: 500, width: 120, height: 90, label: 'Storage' },
};

export default function FloorPlan2D({ zones, dockets }: FloorPlan2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [floorPlanImage, setFloorPlanImage] = useState<HTMLImageElement | null>(null);
  const { selectedZoneId, setSelectedZone } = useStore();

  // Load floor plan image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setFloorPlanImage(img);
    img.onerror = () => {
      console.warn('Floor plan image not found, using procedural rendering');
      setFloorPlanImage(null);
    };
    img.src = '/floorplan.png';
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 1024;
    canvas.height = 768;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw floor plan image or procedural layout
    if (floorPlanImage) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(floorPlanImage, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1.0;
    } else {
      // Procedural floor plan rendering
      drawProceduralFloorPlan(ctx);
    }

    // Draw zones
    zones.forEach((zone) => {
      const pos = ZONE_2D_POSITIONS[zone.zoneId];
      if (!pos) return;

      const isSelected = selectedZoneId === zone.zoneId;
      const occupancyPercent = zone.currentOccupancy / zone.capacity;
      const zoneColor = getZoneColor(zone.zoneType);

      // Zone rectangle with actual size
      const rectX = pos.x - pos.width / 2;
      const rectY = pos.y - pos.height / 2;

      ctx.strokeStyle = isSelected ? '#3b82f6' : zoneColor;
      ctx.lineWidth = isSelected ? 4 : 2;

      // Color based on zone type and occupancy
      const baseOpacity = zone.zoneType === 'corridor' ? 0.2 : 0.3;
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.4)'
        : hexToRgba(zoneColor, baseOpacity + occupancyPercent * 0.2);

      ctx.beginPath();
      ctx.roundRect(rectX, rectY, pos.width, pos.height, 8);
      ctx.fill();
      ctx.stroke();

      // Zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pos.label, pos.x, pos.y - 5);

      // Occupancy info
      ctx.font = '9px Inter, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`${zone.currentOccupancy}/${zone.capacity}`, pos.x, pos.y + 10);

      // Occupancy bar
      const barWidth = Math.min(pos.width * 0.8, 90);
      const barHeight = 5;
      const barX = pos.x - barWidth / 2;
      const barY = pos.y + 22;

      ctx.fillStyle = '#374151';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = occupancyPercent > 0.8 ? '#ef4444' : '#10b981';
      ctx.fillRect(barX, barY, barWidth * occupancyPercent, barHeight);

      // Warning indicator for near capacity
      if (occupancyPercent > 0.9) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pos.x + pos.width / 2 - 10, pos.y - pos.height / 2 + 10, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw dockets
    dockets.forEach((docket) => {
      if (!docket.currentZone) return;

      const pos = ZONE_2D_POSITIONS[docket.currentZone.id];
      if (!pos) return;

      // Random offset within zone boundaries
      const offsetX = (Math.random() - 0.5) * (pos.width * 0.7);
      const offsetY = (Math.random() - 0.5) * (pos.height * 0.7);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(pos.x + offsetX, pos.y + offsetY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Small glow effect
      ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
      ctx.beginPath();
      ctx.arc(pos.x + offsetX, pos.y + offsetY, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw connection lines from entrance to main areas
    const entrancePos = ZONE_2D_POSITIONS[11]; // Main Entrance
    if (entrancePos) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      // Connect entrance to key zones: E.I.M.S, Auditorium, Office, Stairs
      [6, 10, 1, 9].forEach((zoneId) => {
        const zonePos = ZONE_2D_POSITIONS[zoneId];
        if (zonePos) {
          ctx.beginPath();
          ctx.moveTo(entrancePos.x, entrancePos.y);
          ctx.lineTo(zonePos.x, zonePos.y);
          ctx.stroke();
        }
      });

      ctx.setLineDash([]);
    }

    // Draw curved sections indicators
    drawCurvedSections(ctx);
  }, [zones, dockets, selectedZoneId, floorPlanImage]);

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Find clicked zone (with updated hit detection)
    for (const zone of zones) {
      const pos = ZONE_2D_POSITIONS[zone.zoneId];
      if (!pos) continue;

      const rectX = pos.x - pos.width / 2;
      const rectY = pos.y - pos.height / 2;

      if (x >= rectX && x <= rectX + pos.width && y >= rectY && y <= rectY + pos.height) {
        setSelectedZone(zone.zoneId);
        return;
      }
    }

    // Click outside any zone
    setSelectedZone(null);
  };

  return (
    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="max-w-full max-h-full cursor-pointer border border-gray-700 rounded-lg"
      />
    </div>
  );
}

function drawProceduralFloorPlan(ctx: CanvasRenderingContext2D) {
  // Grid background
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

  // Building outline - FSL-PAROW ACTUAL shape
  ctx.strokeStyle = '#4b5563';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  // Main central building
  ctx.beginPath();
  ctx.rect(250, 200, 524, 480);
  ctx.stroke();

  // Far left wing - Office Accommodation (large)
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

  // Title
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FSL-PAROW', 512, 40);
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('First Floor - Architectural Layout', 512, 58);
}

function drawCurvedSections(ctx: CanvasRenderingContext2D) {
  // Draw TOP curved section visual indicator (exam rooms)
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 5]);

  ctx.beginPath();
  ctx.arc(512, 150, 220, Math.PI * 0.75, Math.PI * 0.25, true);
  ctx.stroke();

  // Draw BOTTOM curved section visual indicator (auditorium)
  ctx.strokeStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(512, 630, 190, Math.PI * 0.25, Math.PI * 0.75);
  ctx.stroke();

  ctx.setLineDash([]);
}

function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace('#', '');

  // Parse r, g, b values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getZoneColor(zoneType: string): string {
  const colors: Record<string, string> = {
    storage: '#3b82f6',
    lab: '#ec4899',
    office: '#1e40af',
    corridor: '#6b7280',
    entrance: '#8b5cf6',
  };
  return colors[zoneType] || '#6b7280';
}
