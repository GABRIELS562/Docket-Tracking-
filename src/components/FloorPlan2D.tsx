import { useEffect, useRef, useState, useCallback } from 'react';
import { Zone, Docket } from '@/lib/api';
import { useStore } from '@/store/useStore';
import {
  ZONE_2D_POSITIONS,
  drawProceduralFloorPlan,
  drawCurvedSections,
  drawConnectionLines,
  drawZone,
  drawDockets,
} from './floorplan';

interface FloorPlan2DProps {
  zones: Zone[];
  dockets: Docket[];
}

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 768;
const ENTRANCE_ZONE_ID = 11;
const CONNECTED_ZONE_IDS = [6, 10, 1, 9];

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

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    // Clear and draw background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (floorPlanImage) {
      ctx.globalAlpha = 0.7;
      ctx.drawImage(floorPlanImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1.0;
    } else {
      drawProceduralFloorPlan(ctx);
    }

    // Draw zones
    zones.forEach((zone) => {
      const pos = ZONE_2D_POSITIONS[zone.zoneId];
      if (!pos) return;
      drawZone({ ctx, zone, pos, isSelected: selectedZoneId === zone.zoneId });
    });

    // Draw dockets
    drawDockets(ctx, dockets, ZONE_2D_POSITIONS);

    // Draw connection lines from entrance
    const entrancePos = ZONE_2D_POSITIONS[ENTRANCE_ZONE_ID];
    if (entrancePos) {
      const targetPositions = CONNECTED_ZONE_IDS.map((id) => ZONE_2D_POSITIONS[id]).filter(Boolean);
      drawConnectionLines(ctx, entrancePos, targetPositions);
    }

    drawCurvedSections(ctx);
  }, [zones, dockets, selectedZoneId, floorPlanImage]);

  // Handle click to select zone
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

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

      setSelectedZone(null);
    },
    [zones, setSelectedZone]
  );

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
