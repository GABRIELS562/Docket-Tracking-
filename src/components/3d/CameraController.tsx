import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useSearchStore } from '@/store/useSearchStore';
import * as THREE from 'three';

interface CameraControllerProps {
  /** Zone positions map - zoneId to [x, y, z] */
  zonePositions: Map<number, [number, number, number]>;
  /** Default camera position when not targeting a zone */
  defaultPosition?: [number, number, number];
  /** How long the fly-to animation takes in seconds */
  flyDuration?: number;
}

/**
 * Camera controller that handles smooth fly-to animations for zone focusing
 * Works with OrbitControls by animating the camera position and updating the controls target
 */
export default function CameraController({
  zonePositions,
  defaultPosition: _defaultPosition = [50, 40, 50],
  flyDuration = 1.5,
}: CameraControllerProps) {
  // Note: defaultPosition is kept for potential future "reset to default" functionality
  const { camera } = useThree();
  const { targetZoneId, isCameraFlying, setCameraFlying } = useSearchStore();

  // Animation state
  const startPosition = useRef(new THREE.Vector3());
  const endPosition = useRef(new THREE.Vector3());
  const startLookAt = useRef(new THREE.Vector3());
  const endLookAt = useRef(new THREE.Vector3());
  const animationProgress = useRef(0);
  const isAnimating = useRef(false);

  // Start fly-to animation when target zone changes
  useEffect(() => {
    if (targetZoneId !== null && isCameraFlying) {
      const targetPos = zonePositions.get(targetZoneId);
      if (!targetPos) return;

      // Capture current camera state
      startPosition.current.copy(camera.position);

      // Get current look-at direction
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      startLookAt.current.copy(camera.position).add(direction.multiplyScalar(10));

      // Calculate target camera position - orbit around the zone at a nice angle
      const zoneCenter = new THREE.Vector3(targetPos[0], targetPos[1] + 2, targetPos[2]);
      const cameraOffset = new THREE.Vector3(15, 12, 15); // Offset from zone center
      endPosition.current.copy(zoneCenter).add(cameraOffset);

      // Look at the zone center, slightly above ground
      endLookAt.current.set(targetPos[0], targetPos[1] + 2, targetPos[2]);

      // Start animation
      animationProgress.current = 0;
      isAnimating.current = true;
    }
  }, [targetZoneId, isCameraFlying, camera, zonePositions]);

  // Animate camera each frame
  useFrame((_, delta) => {
    if (!isAnimating.current) return;

    // Progress the animation
    animationProgress.current += delta / flyDuration;

    if (animationProgress.current >= 1) {
      // Animation complete
      animationProgress.current = 1;
      isAnimating.current = false;
      setCameraFlying(false);
    }

    // Easing function for smooth animation (ease-out cubic)
    const t = 1 - Math.pow(1 - animationProgress.current, 3);

    // Interpolate camera position
    camera.position.lerpVectors(startPosition.current, endPosition.current, t);

    // Interpolate look-at target and apply
    const currentLookAt = new THREE.Vector3();
    currentLookAt.lerpVectors(startLookAt.current, endLookAt.current, t);
    camera.lookAt(currentLookAt);
  });

  return null;
}
