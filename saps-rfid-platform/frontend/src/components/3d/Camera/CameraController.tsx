/**
 * UNIFIED CAMERA CONTROLLER
 *
 * Single camera controller that manages all camera modes:
 * - Orbit: Default mouse orbit around target
 * - Walk: First-person WASD navigation with pointer lock
 * - Cinematic: GSAP-powered animations and tours
 * - Follow: Track a specific item (auto-orbit)
 *
 * This replaces:
 * - CinematicCamera.tsx
 * - Controls.tsx
 * - FirstPersonControls.tsx (integrated)
 *
 * Features:
 * - Smooth GSAP animations for all transitions
 * - Keyboard shortcuts (1-0 for presets, G for walk mode, T for tour)
 * - Camera shake effects
 * - Cinematic warehouse tour
 * - Zone/item fly-to
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCameraStore } from '../../../stores/cameraStore';
import { useWarehouseStore } from '../../../stores/warehouseStore';
import type { Vector3 } from '../../../core/types';

// ============================================================================
// TOUR WAYPOINTS (Cinematic warehouse tour)
// ============================================================================

const TOUR_WAYPOINTS: Array<{ position: Vector3; target: Vector3; duration: number; pause: number; name?: string }> = [
  // 1. Start inside warehouse - interior overview
  { position: { x: 0, y: 12, z: 0 }, target: { x: 0, y: 0, z: -10 }, duration: 2, pause: 1.5, name: 'Interior Overview' },
  // 2. RFID readers in storage - show the readers!
  { position: { x: -5, y: 5, z: -5 }, target: { x: -12.5, y: 3, z: -10 }, duration: 2, pause: 2, name: 'Storage RFID Readers' },
  // 3. Receiving dock interior - showing portal readers
  { position: { x: -22, y: 4, z: -25 }, target: { x: -25, y: 3.5, z: -32 }, duration: 2, pause: 2, name: 'Receiving Portal Readers' },
  // 4. Pan across to shipping interior
  { position: { x: 22, y: 4, z: -25 }, target: { x: 22, y: 3.5, z: -32 }, duration: 2.5, pause: 2, name: 'Shipping Portal Readers' },
  // 5. Inside Storage A - close to items and readers
  { position: { x: -12, y: 4, z: -8 }, target: { x: -12.5, y: 3, z: -15 }, duration: 2, pause: 2, name: 'Storage A Interior' },
  // 6. Inside Storage B
  { position: { x: 12, y: 4, z: -8 }, target: { x: 12.5, y: 3, z: -15 }, duration: 2, pause: 1.5, name: 'Storage B Interior' },
  // 7. Processing area interior - eye level
  { position: { x: -30, y: 3, z: 12 }, target: { x: -30, y: 3, z: 18 }, duration: 2, pause: 2, name: 'Processing Floor' },
  // 8. Secure Vault entrance - dramatic
  { position: { x: -22, y: 3, z: 22 }, target: { x: -30, y: 2, z: 28 }, duration: 2, pause: 2, name: 'Secure Vault Entry' },
  // 9. Inside vault - POV showing dual readers
  { position: { x: -30, y: 3, z: 28 }, target: { x: -25, y: 3, z: 23 }, duration: 1.5, pause: 2.5, name: 'Inside Secure Vault' },
  // 10. Staging area interior
  { position: { x: 32, y: 4, z: 8 }, target: { x: 32.5, y: 2, z: 5 }, duration: 2, pause: 1.5, name: 'Staging Interior' },
  // 11. Final sweeping interior view
  { position: { x: 0, y: 15, z: 10 }, target: { x: 0, y: 0, z: -15 }, duration: 2.5, pause: 1, name: 'Final Interior View' },
  // 12. End with overview
  { position: { x: 50, y: 35, z: 40 }, target: { x: 0, y: 0, z: 0 }, duration: 2, pause: 0, name: 'Overview' },
];

// ============================================================================
// COMPONENT
// ============================================================================

const CameraController = () => {
  const { camera } = useThree();

  // Refs
  const orbitRef = useRef<any>(null);
  const pointerLockRef = useRef<any>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // Camera store selectors (individual for performance)
  const mode = useCameraStore((s) => s.mode);
  const isAnimating = useCameraStore((s) => s.isAnimating);
  const animationTarget = useCameraStore((s) => s.animationTarget);
  const animationDuration = useCameraStore((s) => s.animationDuration);
  const isTourRunning = useCameraStore((s) => s.isTourRunning);
  const tourWaypointIndex = useCameraStore((s) => s.tourWaypointIndex);

  // Camera store actions
  const toggleWalkMode = useCameraStore((s) => s.toggleWalkMode);
  const setWalkLocked = useCameraStore((s) => s.setWalkLocked);
  const startAnimation = useCameraStore((s) => s.startAnimation);
  const endAnimation = useCameraStore((s) => s.endAnimation);
  const goToPreset = useCameraStore((s) => s.goToPreset);
  const startTour = useCameraStore((s) => s.startTour);
  const stopTour = useCameraStore((s) => s.stopTour);
  const nextTourWaypoint = useCameraStore((s) => s.nextTourWaypoint);

  // Warehouse store
  const warehouse = useWarehouseStore((s) => s.currentWarehouse);
  const getPresetByShortcut = useWarehouseStore((s) => s.getPresetByShortcut);

  // Walk mode state (refs to avoid re-renders)
  // Now supports: Arrow keys for directional movement (turn + move), WASD for strafe
  const walkState = useRef({
    velocity: new THREE.Vector3(),
    yaw: 0, // Camera rotation around Y axis (radians)
    keys: {
      forward: false,
      backward: false,
      strafeLeft: false,
      strafeRight: false,
      turnLeft: false,
      turnRight: false,
      sprint: false,
    },
  });

  // Pre-allocated vectors for performance (never recreated)
  const vectors = useMemo(() => ({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0), // Pre-allocated up vector for walk mode
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    currentPos: new THREE.Vector3(),
    currentTarget: new THREE.Vector3(),
  }), []);

  // ========== GSAP Animation Handler ==========
  useEffect(() => {
    if (!isAnimating || !animationTarget || !orbitRef.current) return;

    // Kill any existing animation
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const { startPos, endPos, startTarget, endTarget, currentPos, currentTarget } = vectors;

    startPos.copy(camera.position);
    startTarget.copy(orbitRef.current.target);
    endPos.set(animationTarget.position.x, animationTarget.position.y, animationTarget.position.z);
    endTarget.set(animationTarget.target.x, animationTarget.target.y, animationTarget.target.z);

    const progress = { value: 0 };

    timelineRef.current = gsap.timeline({
      onComplete: () => {
        endAnimation();
      },
    });

    timelineRef.current.to(progress, {
      value: 1,
      duration: animationDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        currentPos.lerpVectors(startPos, endPos, progress.value);
        currentTarget.lerpVectors(startTarget, endTarget, progress.value);
        camera.position.copy(currentPos);
        if (orbitRef.current) {
          orbitRef.current.target.copy(currentTarget);
        }
      },
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [isAnimating, animationTarget, animationDuration, camera, endAnimation, vectors]);

  // ========== Tour Handler ==========
  useEffect(() => {
    if (!isTourRunning || !orbitRef.current) return;

    const waypoint = TOUR_WAYPOINTS[tourWaypointIndex];
    if (!waypoint) {
      stopTour();
      return;
    }

    // Animate to waypoint
    startAnimation({
      position: waypoint.position,
      target: waypoint.target,
    }, waypoint.duration);

    // Schedule next waypoint
    const timer = setTimeout(() => {
      if (tourWaypointIndex < TOUR_WAYPOINTS.length - 1) {
        nextTourWaypoint();
      } else {
        stopTour();
      }
    }, (waypoint.duration + waypoint.pause) * 1000);

    return () => clearTimeout(timer);
  }, [isTourRunning, tourWaypointIndex, startAnimation, stopTour, nextTourWaypoint]);

  // ========== Keyboard Handler ==========
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();

      // G = Toggle walk mode
      if (key === 'g') {
        e.preventDefault();
        if (mode === 'walk') {
          toggleWalkMode();
          console.log('Exiting walk mode');
        } else {
          // Initialize yaw based on current camera direction
          const dir = new THREE.Vector3();
          camera.getWorldDirection(dir);
          walkState.current.yaw = Math.atan2(-dir.x, -dir.z);
          toggleWalkMode();
          console.log('Walk mode: Arrow keys to move/turn, WASD to strafe, Shift to run, G to exit');
        }
        return;
      }

      // T = Start/stop tour
      if (key === 't') {
        e.preventDefault();
        if (isTourRunning) {
          stopTour();
          console.log('Tour stopped');
        } else {
          startTour();
          console.log('Starting cinematic tour...');
        }
        return;
      }

      // Escape = Stop animations/tour, exit walk mode
      if (key === 'escape') {
        if (timelineRef.current) {
          timelineRef.current.kill();
          endAnimation();
        }
        if (isTourRunning) {
          stopTour();
        }
        return;
      }

      // Camera presets by shortcut
      if (warehouse) {
        const preset = getPresetByShortcut(key) || getPresetByShortcut(e.key);
        if (preset) {
          e.preventDefault();
          goToPreset(preset);
          console.log(`Camera: ${preset.name}`);
          return;
        }
      }

      // Walk mode movement keys
      // Arrow keys: Up/Down = move, Left/Right = TURN
      // WASD: W/S = move forward/back, A/D = strafe left/right
      if (mode === 'walk') {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            walkState.current.keys.forward = true;
            break;
          case 'KeyS':
          case 'ArrowDown':
            walkState.current.keys.backward = true;
            break;
          case 'KeyA':
            walkState.current.keys.strafeLeft = true;
            break;
          case 'KeyD':
            walkState.current.keys.strafeRight = true;
            break;
          case 'ArrowLeft':
            walkState.current.keys.turnLeft = true;
            break;
          case 'ArrowRight':
            walkState.current.keys.turnRight = true;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            walkState.current.keys.sprint = true;
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          walkState.current.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          walkState.current.keys.backward = false;
          break;
        case 'KeyA':
          walkState.current.keys.strafeLeft = false;
          break;
        case 'KeyD':
          walkState.current.keys.strafeRight = false;
          break;
        case 'ArrowLeft':
          walkState.current.keys.turnLeft = false;
          break;
        case 'ArrowRight':
          walkState.current.keys.turnRight = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          walkState.current.keys.sprint = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mode, warehouse, isTourRunning, toggleWalkMode, goToPreset, getPresetByShortcut, startTour, stopTour, endAnimation]);

  // ========== Walk Mode Movement ==========
  // Simpler directional controls: Arrow keys to turn, WASD/Arrows to move
  // No pointer lock required - all keyboard-based
  useFrame((_, delta) => {
    if (mode !== 'walk') return;

    const { keys, velocity } = walkState.current;
    const { forward, right, direction, up } = vectors;

    // Handle turning with arrow keys
    const turnSpeed = 2.0; // radians per second
    if (keys.turnLeft) {
      walkState.current.yaw += turnSpeed * delta;
    }
    if (keys.turnRight) {
      walkState.current.yaw -= turnSpeed * delta;
    }

    // Calculate forward direction based on yaw
    forward.set(
      -Math.sin(walkState.current.yaw),
      0,
      -Math.cos(walkState.current.yaw)
    ).normalize();

    // Get right direction (using pre-allocated up vector)
    right.crossVectors(forward, up).normalize();

    // Build movement direction
    direction.set(0, 0, 0);
    if (keys.forward) direction.add(forward);
    if (keys.backward) direction.sub(forward);
    if (keys.strafeRight) direction.add(right);
    if (keys.strafeLeft) direction.sub(right);

    if (direction.length() > 0) {
      direction.normalize();
    }

    // Calculate speed
    const baseSpeed = 15;
    const sprintMultiplier = 1.8;
    const speed = keys.sprint ? baseSpeed * sprintMultiplier : baseSpeed;

    // Target velocity
    const targetVelocity = direction.clone().multiplyScalar(speed * delta);

    // Smooth acceleration
    velocity.lerp(targetVelocity, 0.2);

    // Apply movement with boundary checking
    if (warehouse) {
      const bounds = warehouse.walkBoundaries;
      const newX = camera.position.x + velocity.x;
      const newZ = camera.position.z + velocity.z;

      camera.position.x = THREE.MathUtils.clamp(newX, bounds.minX, bounds.maxX);
      camera.position.z = THREE.MathUtils.clamp(newZ, bounds.minZ, bounds.maxZ);
    } else {
      camera.position.add(velocity);
    }

    // Keep eye height constant
    camera.position.y = 1.7;

    // Update camera rotation based on yaw (look in the forward direction)
    const lookTarget = new THREE.Vector3(
      camera.position.x + forward.x * 10,
      camera.position.y,
      camera.position.z + forward.z * 10
    );
    camera.lookAt(lookTarget);
  });

  // ========== Pointer Lock Handlers ==========
  // Optional - can still use pointer lock for mouse look if desired
  const handlePointerLock = useCallback(() => {
    setWalkLocked(true);
    console.log('Mouse look enabled - WASD/arrows to move, mouse to look');
  }, [setWalkLocked]);

  const handlePointerUnlock = useCallback(() => {
    setWalkLocked(false);
    // Clear movement keys
    walkState.current.keys = {
      forward: false,
      backward: false,
      strafeLeft: false,
      strafeRight: false,
      turnLeft: false,
      turnRight: false,
      sprint: false,
    };
    walkState.current.velocity.set(0, 0, 0);
  }, [setWalkLocked]);

  // ========== Camera Shake ==========
  const shake = useCallback((intensity = 0.5, duration = 0.5) => {
    const originalPos = camera.position.clone();

    gsap.to(camera.position, {
      x: originalPos.x + (Math.random() - 0.5) * intensity,
      y: originalPos.y + (Math.random() - 0.5) * intensity,
      z: originalPos.z + (Math.random() - 0.5) * intensity,
      duration: duration / 10,
      repeat: 10,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => {
        camera.position.copy(originalPos);
      },
    });
  }, [camera]);

  // Expose camera utilities globally for external control
  useEffect(() => {
    (window as any).cameraController = {
      shake,
      flyTo: (pos: Vector3, target: Vector3, duration?: number) => {
        startAnimation({ position: pos, target }, duration);
      },
      startTour,
      stopTour,
    };

    return () => {
      delete (window as any).cameraController;
    };
  }, [shake, startAnimation, startTour, stopTour]);

  // ========== Render ==========
  return (
    <>
      {/* Orbit Controls - always rendered but may be disabled */}
      {mode !== 'walk' && (
        <OrbitControls
          ref={orbitRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={250}
          minPolarAngle={Math.PI / 10}
          maxPolarAngle={Math.PI / 2.05}
          enablePan
          panSpeed={1.2}
          screenSpacePanning
          rotateSpeed={0.6}
          target={[0, 0, 0]}
          enabled={!isAnimating && mode === 'orbit'}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />
      )}

      {/* Pointer Lock Controls for walk mode */}
      {mode === 'walk' && (
        <PointerLockControls
          ref={pointerLockRef}
          onLock={handlePointerLock}
          onUnlock={handlePointerUnlock}
        />
      )}
    </>
  );
};

export default CameraController;
