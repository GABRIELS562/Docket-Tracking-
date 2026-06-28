import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Zone } from '@/lib/api';

const ZONE_POSITIONS: Record<number, [number, number]> = {
  1: [-18, 10],
  2: [-10, 18],
  3: [0, 20],
  4: [10, 18],
  5: [18, 10],
  6: [0, 5],
  7: [0, 0],
  8: [0, -12],
};

interface Props {
  zones: Zone[];
}

export default function HeatMapOverlay({ zones }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureRef = useRef<THREE.CanvasTexture | null>(null);

  // Create canvas texture
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    canvasRef.current = canvas;

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    textureRef.current = tex;

    return tex;
  }, []);

  // Get color based on occupancy percentage
  const getHeatColor = (percentage: number): string => {
    if (percentage >= 80) return '#ef4444'; // Red - High
    if (percentage >= 50) return '#fb923c'; // Orange - Medium
    if (percentage >= 20) return '#fcd34d'; // Yellow - Low
    return '#10b981'; // Green - Empty/Minimal
  };

  // Draw heat map on canvas
  const updateHeatMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw radial gradients for each zone
    zones.forEach((zone) => {
      const position = ZONE_POSITIONS[zone.zoneId];
      if (!position) return;

      const occupancyPercent = (zone.currentOccupancy / zone.capacity) * 100;
      const color = getHeatColor(occupancyPercent);

      // Convert 3D world coordinates to canvas coordinates
      // World space: -60 to 60 (120 units)
      // Canvas space: 0 to 1024 (1024 pixels)
      const x = ((position[0] + 60) / 120) * canvas.width;
      const y = ((60 - position[1]) / 120) * canvas.height; // Flip Y for canvas

      // Radius based on zone size and occupancy
      const baseRadius = 80;
      const radiusMultiplier = 0.5 + (occupancyPercent / 100) * 0.5; // 0.5 to 1.0
      const radius = baseRadius * radiusMultiplier;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

      // Parse color and create gradient with opacity
      const rgbColor = hexToRgb(color);
      if (rgbColor) {
        // Center is more opaque, edges fade out
        gradient.addColorStop(0, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.7)`);
        gradient.addColorStop(0.5, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0.4)`);
        gradient.addColorStop(1, `rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, 0)`);
      }

      // Draw circle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Add pulsing ring for high occupancy zones
      if (occupancyPercent >= 80) {
        ctx.strokeStyle = `rgba(255, 100, 100, 0.6)`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Update texture
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [zones]);

  // Update heat map when zones change
  useEffect(() => {
    updateHeatMap();
  }, [updateHeatMap]);

  // Pulse animation for high-occupancy zones
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Redraw canvas with animation
    if (Math.floor(time * 2) % 5 === 0) {
      updateHeatMap();
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.15, 0]} // Slightly above ground
      receiveShadow={false}
    >
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
