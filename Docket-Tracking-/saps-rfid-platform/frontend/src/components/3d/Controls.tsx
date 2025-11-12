import { OrbitControls } from '@react-three/drei';

/**
 * Camera Controls
 *
 * Provides intuitive 3D navigation with OrbitControls:
 * - Left click + drag: Rotate camera around target
 * - Right click + drag: Pan camera
 * - Scroll wheel: Zoom in/out
 * - Touch: Pinch to zoom, swipe to rotate
 *
 * Features:
 * - Damping for smooth motion
 * - Zoom limits (prevent too close/too far)
 * - Vertical rotation limits (prevent upside-down view)
 * - Auto-rotation on idle (disabled by default)
 */
const Controls = () => {
  return (
    <OrbitControls
      // Smooth damping
      enableDamping
      dampingFactor={0.05}

      // Zoom limits
      minDistance={10}
      maxDistance={300}

      // Vertical rotation limits (prevent flipping upside down)
      minPolarAngle={Math.PI / 6}  // 30 degrees from top
      maxPolarAngle={Math.PI / 2.2}  // Almost horizontal

      // Panning settings
      enablePan
      panSpeed={1}

      // Rotation speed
      rotateSpeed={0.5}

      // Target position (what camera looks at)
      target={[0, 0, 0]}

      // Auto-rotate on idle (optional)
      autoRotate={false}
      autoRotateSpeed={0.5}
    />
  );
};

export default Controls;
