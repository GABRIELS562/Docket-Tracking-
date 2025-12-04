import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Enhanced First-Person Controls for Warehouse Navigation
 *
 * Features:
 * - True FPS mouse look with PointerLockControls
 * - WASD + Arrow key movement
 * - Sprint mode (Shift)
 * - Smooth acceleration/deceleration
 * - Boundary collision detection
 * - Adjustable eye height
 * - Movement on ground plane only
 * - Clean pointer lock/unlock handling
 *
 * Usage:
 * ```tsx
 * <Canvas>
 *   <EnhancedFirstPersonControls
 *     moveSpeed={12}
 *     sprintMultiplier={1.8}
 *     eyeHeight={1.7}
 *     boundaries={{ minX: -42, maxX: 42, minZ: -32, maxZ: 32 }}
 *   />
 * </Canvas>
 * ```
 */

interface EnhancedFirstPersonControlsProps {
  /** Base movement speed (units per second) */
  moveSpeed?: number;
  /** Sprint speed multiplier */
  sprintMultiplier?: number;
  /** Camera height above ground (meters) */
  eyeHeight?: number;
  /** Mouse look sensitivity */
  lookSpeed?: number;
  /** Warehouse boundaries for collision */
  boundaries?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  /** Enable/disable controls */
  enabled?: boolean;
  /** Callback when pointer lock state changes */
  onLockChange?: (locked: boolean) => void;
}

export function EnhancedFirstPersonControls({
  moveSpeed = 12,
  sprintMultiplier = 1.8,
  eyeHeight = 1.7,
  lookSpeed = 0.002,
  boundaries = { minX: -42, maxX: 42, minZ: -32, maxZ: 32 },
  enabled = true,
  onLockChange,
}: EnhancedFirstPersonControlsProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Movement state
  const keysPressed = useRef<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());

  // Handle keyboard input
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        keysPressed.current.add(key);
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled]);

  // Handle pointer lock state changes
  useEffect(() => {
    const handleLock = () => {
      setIsLocked(true);
      onLockChange?.(true);
      console.log('🎮 First-person mode active. WASD to move, mouse to look, ESC to exit.');
    };

    const handleUnlock = () => {
      setIsLocked(false);
      onLockChange?.(false);
      keysPressed.current.clear();
      velocity.current.set(0, 0, 0);
    };

    const controls = controlsRef.current;
    if (controls) {
      controls.addEventListener('lock', handleLock);
      controls.addEventListener('unlock', handleUnlock);

      return () => {
        controls.removeEventListener('lock', handleLock);
        controls.removeEventListener('unlock', handleUnlock);
      };
    }
  }, [onLockChange]);

  // Movement logic
  useFrame((_, delta) => {
    if (!enabled || !isLocked || !controlsRef.current) return;

    // Determine movement direction based on keys
    direction.current.set(0, 0, 0);

    const forward = keysPressed.current.has('w') || keysPressed.current.has('arrowup');
    const back = keysPressed.current.has('s') || keysPressed.current.has('arrowdown');
    const left = keysPressed.current.has('a') || keysPressed.current.has('arrowleft');
    const right = keysPressed.current.has('d') || keysPressed.current.has('arrowright');
    const sprint = keysPressed.current.has('shift');

    // Get camera forward and right vectors (ignoring Y)
    const forwardVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();

    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0;
    forwardVector.normalize();

    rightVector.crossVectors(forwardVector, new THREE.Vector3(0, 1, 0));

    // Accumulate movement direction
    if (forward) direction.current.add(forwardVector);
    if (back) direction.current.sub(forwardVector);
    if (right) direction.current.add(rightVector);
    if (left) direction.current.sub(rightVector);

    // Normalize to prevent faster diagonal movement
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Calculate speed with sprint
    const currentSpeed = sprint ? moveSpeed * sprintMultiplier : moveSpeed;
    const targetVelocity = direction.current.multiplyScalar(currentSpeed);

    // Smooth acceleration (lerp towards target velocity)
    velocity.current.lerp(targetVelocity, 10 * delta);

    // Calculate new position
    const newPosition = camera.position.clone();
    newPosition.x += velocity.current.x * delta;
    newPosition.z += velocity.current.z * delta;

    // Apply boundary constraints
    newPosition.x = THREE.MathUtils.clamp(newPosition.x, boundaries.minX, boundaries.maxX);
    newPosition.z = THREE.MathUtils.clamp(newPosition.z, boundaries.minZ, boundaries.maxZ);
    newPosition.y = eyeHeight;

    // Update camera position
    camera.position.copy(newPosition);
  });

  if (!enabled) return null;

  return (
    <PointerLockControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
      selector="#canvas-container" // Optional: specify click target
    />
  );
}

/**
 * UI Component: Instructions Overlay
 *
 * Display instructions for first-person controls
 */
export function FirstPersonInstructions({ isLocked }: { isLocked: boolean }) {
  if (isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        padding: '30px',
        borderRadius: '12px',
        fontFamily: 'system-ui, sans-serif',
        textAlign: 'center',
        maxWidth: '400px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
        First-Person Mode
      </h3>

      <div style={{ textAlign: 'left', lineHeight: '1.8' }}>
        <div style={{ marginBottom: '15px' }}>
          <div style={{ color: '#60a5fa', fontWeight: '500', marginBottom: '8px' }}>
            Movement
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            <div>W / ↑ - Move forward</div>
            <div>S / ↓ - Move backward</div>
            <div>A / ← - Strafe left</div>
            <div>D / → - Strafe right</div>
            <div style={{ color: '#fbbf24' }}>Shift - Sprint</div>
          </div>
        </div>

        <div>
          <div style={{ color: '#60a5fa', fontWeight: '500', marginBottom: '8px' }}>
            Camera
          </div>
          <div style={{ fontSize: '14px', color: '#d1d5db' }}>
            <div>Mouse - Look around</div>
            <div>ESC - Exit first-person mode</div>
          </div>
        </div>
      </div>

      <button
        onClick={() => {
          const canvas = document.querySelector('canvas');
          if (canvas) canvas.click();
        }}
        style={{
          marginTop: '25px',
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          pointerEvents: 'auto',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Click to Start
      </button>
    </div>
  );
}

/**
 * UI Component: Active Status Indicator
 *
 * Shows when first-person mode is active
 */
export function FirstPersonStatusIndicator({ isLocked }: { isLocked: boolean }) {
  if (!isLocked) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '20px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#10b981',
          animation: 'pulse 2s infinite',
        }}
      />
      <span style={{ color: '#d1d5db' }}>
        First-Person Mode Active
      </span>
      <span style={{ color: '#9ca3af', marginLeft: '10px' }}>|</span>
      <span style={{ color: '#fbbf24' }}>Shift: Sprint</span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span style={{ color: '#60a5fa' }}>ESC: Exit</span>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

/**
 * Mini-Map Component for Warehouse Navigation
 *
 * Shows top-down view of warehouse with player position
 */
interface MiniMapProps {
  cameraPosition: THREE.Vector3;
  cameraDirection: THREE.Vector3;
  boundaries: { minX: number; maxX: number; minZ: number; maxZ: number };
  size?: number;
}

export function MiniMap({ cameraPosition, cameraDirection, boundaries, size = 180 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(0, 0, size, size);

      // Calculate scale
      const warehouseWidth = boundaries.maxX - boundaries.minX;
      const warehouseDepth = boundaries.maxZ - boundaries.minZ;
      const scale = (size - 20) / Math.max(warehouseWidth, warehouseDepth);

      const centerX = size / 2;
      const centerY = size / 2;

      // Draw warehouse outline
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        10,
        10,
        warehouseWidth * scale,
        warehouseDepth * scale
      );

      // Draw grid
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= warehouseWidth; i += 10) {
        const x = 10 + i * scale;
        ctx.beginPath();
        ctx.moveTo(x, 10);
        ctx.lineTo(x, 10 + warehouseDepth * scale);
        ctx.stroke();
      }
      for (let i = 0; i <= warehouseDepth; i += 10) {
        const y = 10 + i * scale;
        ctx.beginPath();
        ctx.moveTo(10, y);
        ctx.lineTo(10 + warehouseWidth * scale, y);
        ctx.stroke();
      }

      // Convert camera position to canvas coordinates
      const camX = 10 + (cameraPosition.x - boundaries.minX) * scale;
      const camZ = 10 + (cameraPosition.z - boundaries.minZ) * scale;

      // Draw player position (blue dot)
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(camX, camZ, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw direction indicator (arrow)
      const arrowLength = 15;
      const arrowX = camX + Math.sin(Math.atan2(cameraDirection.x, cameraDirection.z)) * arrowLength;
      const arrowZ = camZ + Math.cos(Math.atan2(cameraDirection.x, cameraDirection.z)) * arrowLength;

      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(camX, camZ);
      ctx.lineTo(arrowX, arrowZ);
      ctx.stroke();

      // Draw coordinates
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(
        `X: ${cameraPosition.x.toFixed(1)} Z: ${cameraPosition.z.toFixed(1)}`,
        10,
        size - 5
      );
    };

    render();
    const interval = setInterval(render, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [cameraPosition, cameraDirection, boundaries, size]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '12px',
        padding: '10px',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 1000,
      }}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          display: 'block',
          borderRadius: '8px',
        }}
      />
    </div>
  );
}

export default EnhancedFirstPersonControls;
