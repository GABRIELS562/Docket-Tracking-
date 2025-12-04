import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore, CAMERA_PRESETS } from '../../stores/sceneStore';

/**
 * Enhanced Camera Controls
 *
 * Professional camera system with:
 * - Smooth orbit controls
 * - Camera presets with animated transitions
 * - Auto-rotation mode
 * - Fly-to-item animations
 * - Touch support
 * - Keyboard shortcuts
 */
const Controls = () => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // Use individual selectors to avoid re-renders when unrelated state changes
  const cameraPosition = useSceneStore((s) => s.cameraPosition);
  const cameraTarget = useSceneStore((s) => s.cameraTarget);
  const isAnimatingCamera = useSceneStore((s) => s.isAnimatingCamera);
  const setIsAnimatingCamera = useSceneStore((s) => s.setIsAnimatingCamera);

  // Ref for tracking animation state
  const animationState = useRef({
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    targetTarget: new THREE.Vector3(),
    progress: 1,
    duration: 1.5,
  });

  // Smooth camera animation
  useFrame((_state, delta) => {
    if (!controlsRef.current) return;

    // Handle camera animation
    if (animationState.current.progress < 1) {
      animationState.current.progress += delta / animationState.current.duration;
      const t = easeInOutCubic(Math.min(animationState.current.progress, 1));

      // Interpolate position
      const newPos = new THREE.Vector3().lerpVectors(
        animationState.current.startPosition,
        animationState.current.targetPosition,
        t
      );
      camera.position.copy(newPos);

      // Interpolate target
      const newTarget = new THREE.Vector3().lerpVectors(
        animationState.current.startTarget,
        animationState.current.targetTarget,
        t
      );
      controlsRef.current.target.copy(newTarget);

      if (animationState.current.progress >= 1) {
        setIsAnimatingCamera(false);
      }
    }
  });

  // Trigger animation when camera position changes in store
  useEffect(() => {
    if (isAnimatingCamera && controlsRef.current) {
      animationState.current = {
        startPosition: camera.position.clone(),
        targetPosition: new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z),
        startTarget: controlsRef.current.target.clone(),
        targetTarget: new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z),
        progress: 0,
        duration: 1.5,
      };
    }
  }, [isAnimatingCamera, cameraPosition, cameraTarget, camera]);

  // Keyboard shortcuts for camera presets
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Number keys 1-0 for presets + letter keys for special views
      const presetKeys: Record<string, string> = {
        '1': 'overview',
        '2': 'topDown',
        '3': 'docks',
        '4': 'receiving',
        '5': 'shipping',
        '6': 'storage',
        '7': 'secureEvidence',  // Vault view
        '8': 'processing',
        '9': 'cinematic',
        '0': 'isometric',
        'g': 'walkMode',        // G for Ground/Walk mode (WASD to move)
        'v': 'vaultSecurity',   // V for Vault inside view
        'h': 'heroShot',        // H for Hero shot
        // Note: S key removed to not conflict with WASD movement
      };

      const key = event.key.toLowerCase();
      const presetName = presetKeys[event.key] || presetKeys[key];

      if (presetName && CAMERA_PRESETS[presetName]) {
        goToPreset(presetName);
      }

      // R for reset
      if (key === 'r') {
        goToPreset('overview');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Go to camera preset
  const goToPreset = (presetName: string) => {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset || !controlsRef.current) return;

    const store = useSceneStore.getState();
    store.setCameraPosition({ x: preset.position[0], y: preset.position[1], z: preset.position[2] });
    store.setCameraTarget({ x: preset.target[0], y: preset.target[1], z: preset.target[2] });
    store.setIsAnimatingCamera(true);
  };

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault

      // Smooth damping
      enableDamping
      dampingFactor={0.05}

      // Zoom limits
      minDistance={15}
      maxDistance={250}

      // Vertical rotation limits
      minPolarAngle={Math.PI / 8}
      maxPolarAngle={Math.PI / 2.1}

      // Panning settings
      enablePan
      panSpeed={1.2}
      screenSpacePanning={true}

      // Rotation speed
      rotateSpeed={0.6}

      // Initial target
      target={[0, 0, 0]}

      // Touch support
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}

      // Mouse buttons
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN,
      }}

      // Auto-rotate when idle (optional)
      autoRotate={false}
      autoRotateSpeed={0.3}
    />
  );
};

/**
 * Easing function for smooth animations
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default Controls;
