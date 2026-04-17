import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { Zone } from '@/lib/api';
import * as THREE from 'three';

interface FloorPlanOverlayProps {
  zones: Zone[];
  opacity?: number;
}

export default function FloorPlanOverlay({ zones, opacity = 0.7 }: FloorPlanOverlayProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    // Try to load floor plan image
    const loader = new THREE.TextureLoader();
    loader.load(
      '/floorplan.png',
      (loadedTexture) => {
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        setTexture(loadedTexture);
      },
      undefined,
      (error) => {
        console.warn('Floor plan image not found at /floorplan.png. Using placeholder grid.');
        // Create a procedural grid texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d')!;

        // Dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 2048, 2048);

        // Draw grid
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;

        // Vertical lines
        for (let x = 0; x <= 2048; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 2048);
          ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= 2048; y += 128) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(2048, y);
          ctx.stroke();
        }

        // Draw center circle for reception
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(1024, 1024, 200, 0, Math.PI * 2);
        ctx.stroke();

        // Draw radial lines for lab blocks
        const labAngles = [30, 60, 90, 120, 150]; // Degrees
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 3;

        labAngles.forEach((angle) => {
          const rad = (angle * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(1024, 1024);
          ctx.lineTo(1024 + Math.cos(rad) * 600, 1024 + Math.sin(rad) * 600);
          ctx.stroke();

          // Draw lab block rectangles
          const x = 1024 + Math.cos(rad) * 500;
          const y = 1024 + Math.sin(rad) * 500;
          ctx.strokeRect(x - 80, y - 80, 160, 160);
        });

        // Add labels
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('RECEPTION', 1024, 1024);

        const labNames = ['Explosives', 'Chemistry', 'Fraud', 'Biology', 'Ballistics'];
        labAngles.forEach((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x = 1024 + Math.cos(rad) * 500;
          const y = 1024 + Math.sin(rad) * 500;
          ctx.fillStyle = '#ec4899';
          ctx.font = 'bold 18px Arial';
          ctx.fillText(labNames[i], x, y + 5);
        });

        const placeholderTexture = new THREE.CanvasTexture(canvas);
        placeholderTexture.minFilter = THREE.LinearFilter;
        placeholderTexture.magFilter = THREE.LinearFilter;
        setTexture(placeholderTexture);
      }
    );
  }, []);

  if (!texture) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
