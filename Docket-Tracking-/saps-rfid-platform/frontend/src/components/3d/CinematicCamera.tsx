import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useSceneStore, CAMERA_PRESETS } from '../../stores/sceneStore';

/**
 * Cinematic Camera System
 *
 * Professional-grade camera animation system with GSAP integration:
 * - Smooth fly-to animations with easing
 * - Cinematic zone tours
 * - Item tracking with dynamic follow
 * - Orbit animations around points of interest
 * - Shake effects for events
 * - Focus pulls and depth transitions
 *
 * Inspired by: AMP Robotics 3D Factory Walkthrough
 * Reference: https://waelyasmina.net/articles/animating-camera-transitions-in-three-js-using-gsap/
 */

interface CameraTarget {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

// Zone tour waypoints - Cinematic warehouse tour
// Each stop focuses on a key zone with dramatic camera angles
const ZONE_TOUR_WAYPOINTS: CameraTarget[] = [
  // 1. Hero entrance shot - dramatic low angle from docks
  { position: new THREE.Vector3(0, 6, -55), lookAt: new THREE.Vector3(0, 5, 0) },
  // 2. Sweep to receiving dock - show R1, R2 readers
  { position: new THREE.Vector3(-35, 12, -45), lookAt: new THREE.Vector3(-20, 3, -28) },
  // 3. Shipping dock reveal - show S1, S2 readers
  { position: new THREE.Vector3(35, 12, -45), lookAt: new THREE.Vector3(20, 3, -28) },
  // 4. Rise over storage - bird's eye transition
  { position: new THREE.Vector3(0, 50, 0), lookAt: new THREE.Vector3(0, 0, 0) },
  // 5. Dive into Storage A - dramatic descent
  { position: new THREE.Vector3(-25, 8, 5), lookAt: new THREE.Vector3(-12, 3, 0) },
  // 6. Slide through to Storage B
  { position: new THREE.Vector3(25, 8, 5), lookAt: new THREE.Vector3(12, 3, 0) },
  // 7. Processing Zone - workflow view
  { position: new THREE.Vector3(-48, 12, 20), lookAt: new THREE.Vector3(-35, 2, 15) },
  // 8. Secure Vault - dramatic security cage reveal
  { position: new THREE.Vector3(-52, 8, 38), lookAt: new THREE.Vector3(-35, 2, 25) },
  // 9. Inside vault looking out - POV shot
  { position: new THREE.Vector3(-35, 3, 25), lookAt: new THREE.Vector3(-20, 2, 10) },
  // 10. Staging Area - outbound operations
  { position: new THREE.Vector3(42, 10, 12), lookAt: new THREE.Vector3(32, 2, 5) },
  // 11. Final cinematic sweep - low dramatic angle
  { position: new THREE.Vector3(65, 12, -45), lookAt: new THREE.Vector3(-10, 3, 10) },
  // 12. End with overview
  { position: new THREE.Vector3(70, 55, 50), lookAt: new THREE.Vector3(0, 0, 0) },
];

const CinematicCamera = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isAnimatingRef = useRef(false);
  const lookAtTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const dampedLookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  // Use individual selectors to avoid re-renders when unrelated state changes
  const cameraPosition = useSceneStore((s) => s.cameraPosition);
  const cameraTarget = useSceneStore((s) => s.cameraTarget);
  const isAnimatingCamera = useSceneStore((s) => s.isAnimatingCamera);
  const selectedItem = useSceneStore((s) => s.selectedItem);
  const setIsAnimatingCamera = useSceneStore((s) => s.setIsAnimatingCamera);

  /**
   * Fly camera to a specific position with cinematic easing
   */
  const flyTo = useCallback(
    (
      targetPosition: [number, number, number],
      lookAtPoint: [number, number, number],
      duration = 2,
      onComplete?: () => void
    ) => {
      if (!controlsRef.current) return;

      // Kill any existing animation
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      isAnimatingRef.current = true;
      setIsAnimatingCamera(true);

      const startPos = camera.position.clone();
      const endPos = new THREE.Vector3(...targetPosition);
      const startLookAt = controlsRef.current.target.clone();
      const endLookAt = new THREE.Vector3(...lookAtPoint);

      // Create smooth animation with GSAP
      const progress = { value: 0 };

      timelineRef.current = gsap.timeline({
        onComplete: () => {
          isAnimatingRef.current = false;
          setIsAnimatingCamera(false);
          onComplete?.();
        },
      });

      timelineRef.current.to(progress, {
        value: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = progress.value;

          // Smooth interpolation with slight overshoot for cinematic feel
          const eased = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

          // Update camera position
          camera.position.lerpVectors(startPos, endPos, eased);

          // Update look-at target
          lookAtTargetRef.current.lerpVectors(startLookAt, endLookAt, eased);
          controlsRef.current.target.copy(lookAtTargetRef.current);
        },
      });

      return timelineRef.current;
    },
    [camera, setIsAnimatingCamera]
  );

  /**
   * Cinematic orbit around a point
   */
  const orbitAround = useCallback(
    (
      center: [number, number, number],
      radius: number,
      height: number,
      duration = 8,
      loops = 1
    ) => {
      if (!controlsRef.current) return;

      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      isAnimatingRef.current = true;
      setIsAnimatingCamera(true);

      const centerVec = new THREE.Vector3(...center);
      const startAngle = Math.atan2(
        camera.position.z - center[2],
        camera.position.x - center[0]
      );

      const progress = { angle: startAngle };

      timelineRef.current = gsap.timeline({
        repeat: loops - 1,
        onComplete: () => {
          isAnimatingRef.current = false;
          setIsAnimatingCamera(false);
        },
      });

      timelineRef.current.to(progress, {
        angle: startAngle + Math.PI * 2,
        duration,
        ease: 'none',
        onUpdate: () => {
          const x = centerVec.x + Math.cos(progress.angle) * radius;
          const z = centerVec.z + Math.sin(progress.angle) * radius;
          camera.position.set(x, height, z);
          controlsRef.current.target.copy(centerVec);
        },
      });

      return timelineRef.current;
    },
    [camera, setIsAnimatingCamera]
  );

  /**
   * Run a cinematic tour through all zones
   */
  const runZoneTour = useCallback(() => {
    if (!controlsRef.current) return;

    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    isAnimatingRef.current = true;
    setIsAnimatingCamera(true);

    timelineRef.current = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
        setIsAnimatingCamera(false);
      },
    });

    let prevPosition = camera.position.clone();
    let prevLookAt = controlsRef.current.target.clone();

    ZONE_TOUR_WAYPOINTS.forEach((_waypoint, _index) => {
      const progress = { value: 0 };
      const startPos = prevPosition.clone();
      const startLookAt = prevLookAt.clone();

      timelineRef.current!.to(progress, {
        value: 1,
        duration: 2.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          const t = progress.value;
          camera.position.lerpVectors(startPos, _waypoint.position, t);
          lookAtTargetRef.current.lerpVectors(startLookAt, _waypoint.lookAt, t);
          controlsRef.current.target.copy(lookAtTargetRef.current);
        },
      });

      // Pause at each waypoint
      timelineRef.current!.to({}, { duration: 1.5 });

      prevPosition = _waypoint.position.clone();
      prevLookAt = _waypoint.lookAt.clone();
    });

    return timelineRef.current;
  }, [camera, setIsAnimatingCamera]);

  /**
   * Camera shake effect for events (item arrival, alert, etc.)
   */
  const shake = useCallback(
    (intensity = 0.5, duration = 0.5) => {
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
    },
    [camera]
  );

  /**
   * Focus pull - dramatic depth transition
   */
  const focusPull = useCallback(
    (target: [number, number, number], pullDistance = 10, duration = 1.5) => {
      const targetVec = new THREE.Vector3(...target);
      const direction = targetVec.clone().sub(camera.position).normalize();
      const pullPosition = camera.position.clone().add(direction.multiplyScalar(pullDistance));

      // First pull back slightly, then zoom in
      timelineRef.current = gsap.timeline();

      const pullBackPos = camera.position.clone().sub(direction.multiplyScalar(5));

      timelineRef.current
        .to(camera.position, {
          x: pullBackPos.x,
          y: pullBackPos.y,
          z: pullBackPos.z,
          duration: duration * 0.3,
          ease: 'power2.out',
        })
        .to(camera.position, {
          x: pullPosition.x,
          y: pullPosition.y,
          z: pullPosition.z,
          duration: duration * 0.7,
          ease: 'power2.in',
        });

      return timelineRef.current;
    },
    [camera]
  );

  // Track last animated position to detect new requests
  const lastAnimatedPosRef = useRef({ x: 0, y: 0, z: 0 });

  // Respond to store camera changes - triggers when goToPreset is called
  useEffect(() => {
    if (!isAnimatingCamera) return;

    // Check if this is a new position request (not the same as current animation target)
    const posChanged =
      lastAnimatedPosRef.current.x !== cameraPosition.x ||
      lastAnimatedPosRef.current.y !== cameraPosition.y ||
      lastAnimatedPosRef.current.z !== cameraPosition.z;

    if (posChanged) {
      // Update tracked position
      lastAnimatedPosRef.current = { ...cameraPosition };

      // Kill any existing animation before starting new one
      if (timelineRef.current) {
        timelineRef.current.kill();
      }

      flyTo(
        [cameraPosition.x, cameraPosition.y, cameraPosition.z],
        [cameraTarget.x, cameraTarget.y, cameraTarget.z],
        1.5
      );
    }
  }, [isAnimatingCamera, cameraPosition, cameraTarget, flyTo]);

  // Follow selected item
  useEffect(() => {
    if (selectedItem) {
      const [x, y, z] = selectedItem.position;
      const offset = 20;
      flyTo(
        [x + offset, y + offset * 0.8, z + offset],
        [x, y, z],
        1.2
      );
    }
  }, [selectedItem, flyTo]);

  // Map number keys to preset names (using imported CAMERA_PRESETS from sceneStore)
  const presetKeyMap: Record<string, string> = {
    '1': 'overview',
    '2': 'topDown',
    '3': 'docks',
    '4': 'receiving',
    '5': 'shipping',
    '6': 'storage',
    '7': 'secureEvidence',
    '8': 'processing',
    '9': 'cinematic',
    '0': 'isometric',
    'v': 'vaultSecurity',
    'h': 'heroShot',
  };

  // Keyboard handler for presets and animations (no walk mode - handled by FirstPersonControls)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();

      // G key toggles walk mode (switches to FirstPersonControls component)
      if (key === 'g') {
        const store = useSceneStore.getState();
        store.setCameraMode('walk');
        console.log('🚶 Entering Walk Mode...');
        return;
      }

      // Camera presets
      const presetName = presetKeyMap[event.key] || presetKeyMap[key];
      if (presetName && CAMERA_PRESETS[presetName]) {
        const preset = CAMERA_PRESETS[presetName];
        flyTo(preset.position, preset.target, 1.5);
        console.log(`📷 Camera: ${preset.name}`);
        return;
      }

      // Special animation commands
      switch (key) {
        case 't':
          runZoneTour();
          console.log('🎬 Starting cinematic zone tour...');
          break;
        case 'o':
          orbitAround([0, 0, 0], 80, 50, 15, 1);
          console.log('🔄 Starting orbit animation...');
          break;
        case 'escape':
          if (timelineRef.current) {
            timelineRef.current.kill();
            isAnimatingRef.current = false;
            setIsAnimatingCamera(false);
            console.log('⏹️ Animation stopped');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runZoneTour, orbitAround, setIsAnimatingCamera, flyTo]);

  // Smooth damped look-at update (walk mode is handled by FirstPersonControls)
  useFrame(() => {
    if (controlsRef.current && !isAnimatingRef.current) {
      dampedLookAtRef.current.lerp(lookAtTargetRef.current, 0.1);
    }
  });

  // Expose methods globally for external control
  useEffect(() => {
    (window as any).cinematicCamera = {
      flyTo,
      orbitAround,
      runZoneTour,
      shake,
      focusPull,
    };

    return () => {
      delete (window as any).cinematicCamera;
    };
  }, [flyTo, orbitAround, runZoneTour, shake, focusPull]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={300}
      minPolarAngle={Math.PI / 10}
      maxPolarAngle={Math.PI / 2.05}
      enablePan
      panSpeed={1.2}
      screenSpacePanning
      rotateSpeed={0.6}
      target={[0, 0, 0]}
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
  );
};

export default CinematicCamera;
