# First-Person Controls Integration Guide

## Quick Start: Replace Your Current Walk Mode

### Option 1: Drop-in Replacement (Recommended)

Replace the walk mode logic in your `CinematicCamera.tsx` with `EnhancedFirstPersonControls.tsx`:

```tsx
// Scene.tsx or wherever you render your 3D scene
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CinematicCamera from './components/3d/CinematicCamera';
import EnhancedFirstPersonControls, {
  FirstPersonInstructions,
  FirstPersonStatusIndicator,
  MiniMap
} from './components/3d/EnhancedFirstPersonControls';
import { useSceneStore } from './stores/sceneStore';
import { useThree } from '@react-three/fiber';

function SceneContent() {
  const currentPreset = useSceneStore((s) => s.currentPreset);
  const [isFirstPersonLocked, setIsFirstPersonLocked] = useState(false);
  const { camera } = useThree();
  const [cameraDir, setCameraDir] = useState(new THREE.Vector3());

  // Update camera direction for mini-map
  useFrame(() => {
    camera.getWorldDirection(cameraDir);
  });

  const isWalkMode = currentPreset === 'walkMode';

  return (
    <>
      {/* Use CinematicCamera for all modes EXCEPT walk mode */}
      {!isWalkMode && <CinematicCamera />}

      {/* Use EnhancedFirstPersonControls for walk mode */}
      {isWalkMode && (
        <EnhancedFirstPersonControls
          moveSpeed={15}
          sprintMultiplier={1.8}
          eyeHeight={1.7}
          boundaries={{ minX: -42, maxX: 42, minZ: -32, maxZ: 32 }}
          onLockChange={setIsFirstPersonLocked}
        />
      )}

      {/* UI Overlays */}
      {isWalkMode && !isFirstPersonLocked && <FirstPersonInstructions isLocked={false} />}
      {isWalkMode && isFirstPersonLocked && <FirstPersonStatusIndicator isLocked={true} />}

      {/* Mini-map when in first-person mode */}
      {isWalkMode && isFirstPersonLocked && (
        <MiniMap
          cameraPosition={camera.position}
          cameraDirection={cameraDir}
          boundaries={{ minX: -42, maxX: 42, minZ: -32, maxZ: 32 }}
        />
      )}
    </>
  );
}

export default function Scene() {
  return (
    <div className="relative w-full h-full">
      <Canvas
        camera={{
          position: [60, 45, 60],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        <SceneContent />
        <Warehouse />
        {/* Other scene content */}
      </Canvas>
    </div>
  );
}
```

---

## Option 2: Use Drei's KeyboardControls (More Flexible)

Wrap your entire Canvas with `KeyboardControls`:

```tsx
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, KeyboardControlsEntry } from '@react-three/drei';
import { useMemo } from 'react';

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  sprint = 'sprint',
}

export default function App() {
  const keyMap = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
      { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
      { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
      { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
      { name: Controls.sprint, keys: ['ShiftLeft', 'ShiftRight'] },
    ],
    []
  );

  return (
    <KeyboardControls map={keyMap}>
      <Canvas>
        {/* Your scene */}
      </Canvas>
    </KeyboardControls>
  );
}
```

Then in your controls component:

```tsx
import { useKeyboardControls } from '@react-three/drei';

function MyControls() {
  const [, get] = useKeyboardControls();

  useFrame((_, delta) => {
    const { forward, back, left, right, sprint } = get();

    // Use the key states
    if (forward) {
      // Move forward
    }
  });
}
```

---

## Comparison: Your Current Implementation vs Enhanced

### Current (CinematicCamera.tsx)

**Pros:**
- Already integrated with your store
- Works with your preset system
- Hybrid approach (Orbit + Walk)
- Smooth GSAP animations

**Cons:**
- Uses OrbitControls in walk mode (not true FPS)
- Mouse look still rotates around a target point
- Manual keyboard state management

### Enhanced (EnhancedFirstPersonControls.tsx)

**Pros:**
- True FPS mouse look with PointerLockControls
- Smoother movement with lerp acceleration
- Clean pointer lock UI
- Built-in mini-map
- Better TypeScript types
- Separate concerns (one component = one control mode)

**Cons:**
- Requires integration with your existing preset system
- Separate component to manage

---

## Recommended Hybrid Approach

Keep the best of both worlds:

```tsx
// CinematicCamera.tsx - Modified

import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useSceneStore, CAMERA_PRESETS } from '../../stores/sceneStore';

const CinematicCamera = () => {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  const fpsRef = useRef<any>(null);
  const currentPreset = useSceneStore((s) => s.currentPreset);
  const isWalkMode = currentPreset === 'walkMode';

  // ... your existing GSAP animation code ...

  // Walk mode state
  const keysPressed = useRef<Set<string>>(new Set());
  const velocity = useRef(new THREE.Vector3());
  const walkSpeed = 15;
  const eyeHeight = 1.7;

  // Keyboard handlers (same as before)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      const walkKeys = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'];

      if (walkKeys.includes(key)) {
        keysPressed.current.add(key);
        if (isWalkMode) {
          e.preventDefault();
        }
      }

      // ... preset switching code ...
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isWalkMode]);

  // Walk mode movement (improved)
  useFrame((_, delta) => {
    if (!isWalkMode || !fpsRef.current?.isLocked) return;

    const direction = new THREE.Vector3();
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const isForward = keysPressed.current.has('w') || keysPressed.current.has('arrowup');
    const isBack = keysPressed.current.has('s') || keysPressed.current.has('arrowdown');
    const isLeft = keysPressed.current.has('a') || keysPressed.current.has('arrowleft');
    const isRight = keysPressed.current.has('d') || keysPressed.current.has('arrowright');
    const isSprint = keysPressed.current.has('shift');

    if (isForward) direction.add(forward);
    if (isBack) direction.sub(forward);
    if (isRight) direction.add(right);
    if (isLeft) direction.sub(right);

    if (direction.length() > 0) {
      direction.normalize();
      const speed = (isSprint ? walkSpeed * 1.8 : walkSpeed) * delta;
      const targetVelocity = direction.multiplyScalar(speed);

      // Smooth acceleration
      velocity.current.lerp(targetVelocity, 10 * delta);

      const newX = camera.position.x + velocity.current.x;
      const newZ = camera.position.z + velocity.current.z;

      // Boundaries
      const boundaryX = 42;
      const boundaryZMin = -32;
      const boundaryZMax = 32;

      camera.position.x = THREE.MathUtils.clamp(newX, -boundaryX, boundaryX);
      camera.position.z = THREE.MathUtils.clamp(newZ, boundaryZMin, boundaryZMax);
      camera.position.y = eyeHeight;
    }
  });

  return (
    <>
      {/* OrbitControls for non-walk modes */}
      {!isWalkMode && (
        <OrbitControls
          ref={orbitRef}
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
        />
      )}

      {/* PointerLockControls for walk mode */}
      {isWalkMode && (
        <PointerLockControls ref={fpsRef} />
      )}
    </>
  );
};

export default CinematicCamera;
```

---

## Key Improvements to Implement

### 1. Replace OrbitControls with PointerLockControls in Walk Mode

```tsx
import { PointerLockControls } from '@react-three/drei';

// In your component:
{isWalkMode && <PointerLockControls ref={fpsRef} />}
```

### 2. Add Smooth Acceleration

```tsx
// Instead of:
camera.position.x += direction.x * speed;

// Use:
const targetVelocity = direction.multiplyScalar(speed);
velocity.current.lerp(targetVelocity, 10 * delta);
camera.position.add(velocity.current);
```

### 3. Add UI Feedback

```tsx
import { FirstPersonInstructions, FirstPersonStatusIndicator } from './EnhancedFirstPersonControls';

// In Scene.tsx overlay section:
{isWalkMode && !isLocked && <FirstPersonInstructions />}
{isWalkMode && isLocked && <FirstPersonStatusIndicator />}
```

### 4. Add Mini-Map

```tsx
import { MiniMap } from './EnhancedFirstPersonControls';

{isWalkMode && isLocked && (
  <MiniMap
    cameraPosition={camera.position}
    cameraDirection={cameraDirection}
    boundaries={{ minX: -42, maxX: 42, minZ: -32, maxZ: 32 }}
  />
)}
```

---

## Testing Checklist

After integration, test:

- [ ] Click to enter first-person mode
- [ ] WASD movement works smoothly
- [ ] Mouse look is responsive (no lag)
- [ ] Shift sprint works
- [ ] Boundaries prevent walking through walls
- [ ] ESC exits pointer lock
- [ ] Switching back to orbit mode works
- [ ] No console errors
- [ ] Performance is acceptable (60fps target)
- [ ] Works on different screen sizes
- [ ] Mini-map updates correctly

---

## Performance Tips

### For Large Warehouses (10,000+ items)

1. **Use Instancing**
```tsx
import { Instances, Instance } from '@react-three/drei';

<Instances limit={10000}>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map((item) => (
    <Instance key={item.id} position={item.position} />
  ))}
</Instances>
```

2. **Implement Frustum Culling**
```tsx
const frustum = useRef(new THREE.Frustum());

useFrame(({ camera }) => {
  camera.updateMatrixWorld();
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.current.setFromProjectionMatrix(matrix);

  // Only render items in frustum
});
```

3. **Use LOD (Level of Detail)**
```tsx
import { Lod } from '@react-three/drei';

<Lod distances={[0, 10, 20]}>
  <DetailedMesh /> {/* Close */}
  <SimpleMesh />   {/* Medium */}
  <BillboardMesh /> {/* Far */}
</Lod>
```

---

## Next Steps

1. **Start with Option 1** (drop-in replacement) for fastest results
2. **Add collision detection** for shelves/walls if needed
3. **Implement mini-map** for better spatial awareness
4. **Add sound effects** for footsteps (optional)
5. **Consider multiplayer** if you want collaborative warehouse tours

---

## Resources

- **PointerLockControls Docs**: https://threejs.org/docs/#examples/en/controls/PointerLockControls
- **Drei PointerLockControls**: https://drei.docs.pmnd.rs/#controls/pointerlockcontrols
- **R3F Hooks**: https://docs.pmnd.rs/react-three-fiber/api/hooks
- **Your Current Implementation**: `/frontend/src/components/3d/CinematicCamera.tsx` (lines 437-503)

---

## Support

If you run into issues:
1. Check browser console for errors
2. Verify pointer lock is supported: `'pointerLockElement' in document`
3. Ensure camera is not being controlled by multiple systems simultaneously
4. Check boundaries are set correctly for your warehouse dimensions
