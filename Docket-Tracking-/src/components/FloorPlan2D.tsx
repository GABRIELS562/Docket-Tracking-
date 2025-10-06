import { useEffect, useRef, useState } from 'react';
import { Zone, Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';

interface FloorPlan2DProps {
  zones: Zone[];
  dockets: Docket[];
}

// Zone positions in 2D canvas coordinates (matching 3D layout)
const ZONE_2D_POSITIONS: Record<number, { x: number; y: number; label: string }> = {
  1: { x: 200, y: 350, label: 'Explosives Lab' },
  2: { x: 300, y: 200, label: 'Chemistry Lab' },
  3: { x: 512, y: 150, label: 'Fraud Lab' },
  4: { x: 724, y: 200, label: 'Biology Lab' },
  5: { x: 824, y: 350, label: 'Ballistics Lab' },
  6: { x: 512, y: 450, label: 'Security Hub' },
  7: { x: 512, y: 512, label: 'Main Entrance' },
  8: { x: 512, y: 700, label: 'Auditorium' },
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

      // Zone rectangle
      ctx.strokeStyle = isSelected ? '#3b82f6' : getZoneColor(zone.zoneType);
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.fillStyle = isSelected
        ? 'rgba(59, 130, 246, 0.3)'
        : `rgba(59, 130, 246, ${occupancyPercent * 0.3})`;

      ctx.beginPath();
      ctx.roundRect(pos.x - 60, pos.y - 40, 120, 80, 8);
      ctx.fill();
      ctx.stroke();

      // Zone label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pos.label, pos.x, pos.y - 10);

      // Occupancy info
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(
        `${zone.currentOccupancy}/${zone.capacity}`,
        pos.x,
        pos.y + 10
      );

      // Occupancy bar
      const barWidth = 80;
      const barHeight = 6;
      const barX = pos.x - barWidth / 2;
      const barY = pos.y + 20;

      ctx.fillStyle = '#374151';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      ctx.fillStyle = occupancyPercent > 0.8 ? '#ef4444' : '#10b981';
      ctx.fillRect(barX, barY, barWidth * occupancyPercent, barHeight);
    });

    // Draw dockets
    dockets.forEach((docket) => {
      if (!docket.currentZone) return;

      const pos = ZONE_2D_POSITIONS[docket.currentZone.id];
      if (!pos) return;

      // Random offset within zone
      const offsetX = (Math.random() - 0.5) * 80;
      const offsetY = (Math.random() - 0.5) * 60;

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(pos.x + offsetX, pos.y + offsetY, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw connection lines from reception
    const receptionPos = ZONE_2D_POSITIONS[7];
    if (receptionPos) {
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      [1, 2, 3, 4, 5].forEach((zoneId) => {
        const labPos = ZONE_2D_POSITIONS[zoneId];
        if (labPos) {
          ctx.beginPath();
          ctx.moveTo(receptionPos.x, receptionPos.y);
          ctx.lineTo(labPos.x, labPos.y);
          ctx.stroke();
        }
      });

      ctx.setLineDash([]);
    }
  }, [zones, dockets, selectedZoneId, floorPlanImage]);

  // Handle click
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    // Find clicked zone
    for (const zone of zones) {
      const pos = ZONE_2D_POSITIONS[zone.zoneId];
      if (!pos) continue;

      if (
        x >= pos.x - 60 &&
        x <= pos.x + 60 &&
        y >= pos.y - 40 &&
        y <= pos.y + 40
      ) {
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

  // Central reception circle
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 3;
  ctx.fillStyle = 'rgba(251, 191, 36, 0.1)';
  ctx.beginPath();
  ctx.arc(512, 512, 80, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Title
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RECEPTION', 512, 520);
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
