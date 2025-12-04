import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * First-Person Walk Controls
 *
 * Proper FPS-style camera controls using PointerLockControls from drei.
 * Based on best practices from R3F community and Three.js examples.
 *
 * Features:
 * - WASD/Arrow keys for movement
 * - Mouse look with pointer lock
 * - Shift for sprint
 * - Smooth acceleration/deceleration
 * - Boundary collision
 * - Constant eye height
 */

interface FirstPersonControlsProps {
  moveSpeed?: number;
  sprintMultiplier?: number;
  eyeHeight?: number;
  boundaries?: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  onExit?: () => void;
}

const FirstPersonControls = ({
  moveSpeed = 15,
  sprintMultiplier = 1.8,
  eyeHeight = 1.7,
  boundaries = { minX: -42, maxX: 42, minZ: -32, maxZ: 32 },
  onExit,
}: FirstPersonControlsProps) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Key states - use refs to avoid re-renders
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  // Velocity for smooth movement
  const velocity = useRef(new THREE.Vector3());

  // Reusable vectors - created once, reused every frame (prevents GC stutter)
  const vectors = useMemo(() => ({
    direction: new THREE.Vector3(),
    frontVector: new THREE.Vector3(),
    sideVector: new THREE.Vector3(),
  }), []);

  // Set initial camera position at eye height
  useEffect(() => {
    camera.position.y = eyeHeight;
  }, [camera, eyeHeight]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = true;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = true;
          break;
        case 'Escape':
          // Exit walk mode on escape
          onExit?.();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keys.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keys.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keys.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keys.current.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          keys.current.sprint = false;
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      // Clear keys on cleanup
      keys.current = {
        forward: false,
        backward: false,
        left: false,
        right: false,
        sprint: false,
      };
    };
  }, [onExit]);

  // Handle pointer lock release
  const handleUnlock = useCallback(() => {
    // Clear all keys when pointer is released
    keys.current = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
    };
  }, []);

  // Movement update - runs every frame
  useFrame((_, delta) => {
    if (!controlsRef.current) return;

    const { direction, frontVector, sideVector } = vectors;

    // Calculate input direction
    frontVector.set(
      0,
      0,
      Number(keys.current.backward) - Number(keys.current.forward)
    );

    sideVector.set(
      Number(keys.current.left) - Number(keys.current.right),
      0,
      0
    );

    // Combine and apply camera rotation
    direction
      .subVectors(frontVector, sideVector)
      .normalize()
      .applyEuler(camera.rotation);

    // Keep movement horizontal (no flying)
    direction.y = 0;

    // Calculate speed with sprint multiplier
    const currentSpeed = keys.current.sprint
      ? moveSpeed * sprintMultiplier
      : moveSpeed;

    // Target velocity
    const targetVelocity = direction.multiplyScalar(currentSpeed * delta);

    // Smooth acceleration/deceleration (lerp factor)
    velocity.current.lerp(targetVelocity, 0.2);

    // Apply velocity to camera
    const newX = camera.position.x + velocity.current.x;
    const newZ = camera.position.z + velocity.current.z;

    // Boundary collision
    camera.position.x = Math.max(boundaries.minX, Math.min(boundaries.maxX, newX));
    camera.position.z = Math.max(boundaries.minZ, Math.min(boundaries.maxZ, newZ));

    // Maintain constant eye height
    camera.position.y = eyeHeight;
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onUnlock={handleUnlock}
      pointerSpeed={0.8}
    />
  );
};

export default FirstPersonControls;
