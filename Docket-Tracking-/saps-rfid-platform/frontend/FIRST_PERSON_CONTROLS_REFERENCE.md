# First-Person Controls in React Three Fiber - Implementation Reference

## Current Implementation Analysis

Your codebase (`/Users/user/Docket-Tracking-v1/Docket-Tracking-/Docket-Tracking-/saps-rfid-platform/frontend/src/components/3d/CinematicCamera.tsx`) already has a solid WASD walk mode implementation (lines 64-503). Here are professional patterns and improvements from the R3F ecosystem:

---

## 1. Drei's KeyboardControls Component (Official Method)

The `@react-three/drei` library (v10.7.7 installed) provides `KeyboardControls` for standardized input handling.

### Basic Implementation

```tsx
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, KeyboardControlsEntry } from '@react-three/drei';
import { useMemo } from 'react';

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  sprint = 'sprint',
}

export default function Scene() {
  const map = useMemo<KeyboardControlsEntry<Controls>[]>(
    () => [
      { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
      { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
      { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
      { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
      { name: Controls.jump, keys: ['Space'] },
      { name: Controls.sprint, keys: ['Shift'] },
    ],
    []
  );

  return (
    <KeyboardControls map={map}>
      <Canvas>
        <FirstPersonCamera />
        {/* Your 3D content */}
      </Canvas>
    </KeyboardControls>
  );
}
```

### FirstPersonCamera Component using KeyboardControls

```tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

interface FirstPersonCameraProps {
  moveSpeed?: number;
  lookSpeed?: number;
  height?: number;
}

export function FirstPersonCamera({
  moveSpeed = 10,
  lookSpeed = 0.002,
  height = 1.7,
}: FirstPersonCameraProps) {
  const { camera } = useThree();
  const [, get] = useKeyboardControls();

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const pointerLocked = useRef(false);

  // Pointer lock for mouse look
  useEffect(() => {
    const handleClick = () => {
      document.body.requestPointerLock();
    };

    const handlePointerLockChange = () => {
      pointerLocked.current = document.pointerLockElement === document.body;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!pointerLocked.current) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= movementX * lookSpeed;
      euler.current.x -= movementY * lookSpeed;
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

      camera.quaternion.setFromEuler(euler.current);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, lookSpeed]);

  useFrame((_, delta) => {
    const { forward, back, left, right, sprint } = get();

    const speed = (sprint ? moveSpeed * 2 : moveSpeed) * delta;

    // Get forward and right vectors
    direction.current.set(0, 0, 0);

    if (forward) direction.current.z -= 1;
    if (back) direction.current.z += 1;
    if (left) direction.current.x -= 1;
    if (right) direction.current.x += 1;

    // Normalize diagonal movement
    if (direction.current.length() > 0) {
      direction.current.normalize();
    }

    // Apply camera rotation to movement direction
    direction.current.applyEuler(euler.current);
    direction.current.y = 0; // Keep movement horizontal
    direction.current.normalize();

    // Apply velocity
    velocity.current.x = direction.current.x * speed;
    velocity.current.z = direction.current.z * speed;

    // Update camera position
    camera.position.x += velocity.current.x;
    camera.position.z += velocity.current.z;
    camera.position.y = height; // Keep at eye level

    // Damping
    velocity.current.multiplyScalar(0.9);
  });

  return null;
}
```

---

## 2. Advanced FPS Controls with PointerLockControls

Using drei's `PointerLockControls` for professional FPS-style camera:

```tsx
import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

export function FPSControls() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const [, get] = useKeyboardControls();

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [isLocked, setIsLocked] = useState(false);

  useFrame((_, delta) => {
    if (!isLocked) return;

    const { forward, back, left, right, sprint, jump } = get();

    const speed = (sprint ? 20 : 10) * delta;

    // Get movement direction
    const moveX = Number(right) - Number(left);
    const moveZ = Number(back) - Number(forward);

    direction.current.set(moveX, 0, moveZ).normalize();

    // Apply camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const angle = Math.atan2(cameraDirection.x, cameraDirection.z);
    direction.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

    // Apply movement
    velocity.current.x = direction.current.x * speed;
    velocity.current.z = direction.current.z * speed;

    if (jump && camera.position.y === 1.7) {
      velocity.current.y = 5; // Jump velocity
    }

    // Apply gravity
    velocity.current.y -= 9.8 * delta;

    // Update position
    camera.position.add(velocity.current.clone().multiplyScalar(delta));

    // Ground collision
    if (camera.position.y < 1.7) {
      camera.position.y = 1.7;
      velocity.current.y = 0;
    }

    // Damping
    velocity.current.multiplyScalar(0.98);
  });

  return (
    <PointerLockControls
      ref={controlsRef}
      onLock={() => setIsLocked(true)}
      onUnlock={() => setIsLocked(false)}
    />
  );
}
```

---

## 3. Professional Warehouse Walkthrough Pattern

Based on architectural visualization best practices:

```tsx
import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

interface WarehouseWalkthroughProps {
  boundaries?: { minX: number; maxX: number; minZ: number; maxZ: number };
  collisionObjects?: THREE.Mesh[];
  walkSpeed?: number;
  eyeHeight?: number;
  enableCollision?: boolean;
}

export function WarehouseWalkthrough({
  boundaries = { minX: -45, maxX: 45, minZ: -35, maxZ: 35 },
  collisionObjects = [],
  walkSpeed = 12,
  eyeHeight = 1.7,
  enableCollision = true,
}: WarehouseWalkthroughProps) {
  const { camera, raycaster } = useThree();
  const [, get] = useKeyboardControls();

  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [pointerLocked, setPointerLocked] = useState(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  // Collision detection
  const checkCollision = (newPosition: THREE.Vector3): boolean => {
    if (!enableCollision || collisionObjects.length === 0) return false;

    const rayDirections = [
      new THREE.Vector3(1, 0, 0),   // right
      new THREE.Vector3(-1, 0, 0),  // left
      new THREE.Vector3(0, 0, 1),   // forward
      new THREE.Vector3(0, 0, -1),  // backward
    ];

    for (const rayDir of rayDirections) {
      raycaster.set(newPosition, rayDir);
      const intersects = raycaster.intersectObjects(collisionObjects, true);
      if (intersects.length > 0 && intersects[0].distance < 1.0) {
        return true; // Collision detected
      }
    }

    return false;
  };

  // Mouse look
  useEffect(() => {
    const handlePointerLockChange = () => {
      setPointerLocked(document.pointerLockElement === document.body);
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!pointerLocked) return;

      euler.current.setFromQuaternion(camera.quaternion);
      euler.current.y -= event.movementX * 0.002;
      euler.current.x -= event.movementY * 0.002;

      // Clamp vertical look angle
      euler.current.x = THREE.MathUtils.clamp(
        euler.current.x,
        -Math.PI / 2.5,  // Don't look too far up
        Math.PI / 2.5    // Don't look too far down
      );

      camera.quaternion.setFromEuler(euler.current);
    };

    const handleClick = () => {
      if (!pointerLocked) {
        document.body.requestPointerLock();
      }
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera, pointerLocked]);

  useFrame((_, delta) => {
    if (!pointerLocked) return;

    const { forward, back, left, right, sprint } = get();

    const speed = (sprint ? walkSpeed * 1.8 : walkSpeed) * delta;

    // Calculate movement direction
    direction.current.set(0, 0, 0);

    const forwardVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();

    camera.getWorldDirection(forwardVector);
    forwardVector.y = 0;
    forwardVector.normalize();

    rightVector.crossVectors(forwardVector, new THREE.Vector3(0, 1, 0));

    if (forward) direction.current.add(forwardVector);
    if (back) direction.current.sub(forwardVector);
    if (right) direction.current.add(rightVector);
    if (left) direction.current.sub(rightVector);

    // Normalize diagonal movement
    if (direction.current.length() > 0) {
      direction.current.normalize().multiplyScalar(speed);
    }

    // Calculate new position
    const newPosition = camera.position.clone().add(direction.current);

    // Boundary constraints
    newPosition.x = THREE.MathUtils.clamp(newPosition.x, boundaries.minX, boundaries.maxX);
    newPosition.z = THREE.MathUtils.clamp(newPosition.z, boundaries.minZ, boundaries.maxZ);
    newPosition.y = eyeHeight;

    // Check collision
    if (!checkCollision(newPosition)) {
      camera.position.copy(newPosition);
    }
  });

  return null;
}
```

---

## 4. Mini-Map Integration for Warehouse Navigation

```tsx
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export function MiniMap() {
  const { camera } = useThree();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useFrame(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 200, 200);

    // Draw warehouse outline (90m x 70m scaled to canvas)
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 180);

    // Draw camera position and direction
    const scale = 180 / 90; // Canvas size / warehouse width
    const centerX = 100;
    const centerY = 100;

    const camX = centerX + camera.position.x * scale;
    const camZ = centerY + camera.position.z * scale;

    // Camera dot
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(camX, camZ, 5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camX, camZ);
    ctx.lineTo(camX + direction.x * 20, camZ + direction.z * 20);
    ctx.stroke();
  });

  return (
    <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'fixed', top: 20, right: 20 }}>
        <canvas ref={canvasRef} width={200} height={200} />
      </div>
    </Html>
  );
}
```

---

## 5. Hybrid Approach: Orbit + Walk Mode Toggle

Your current implementation is excellent! Here are some enhancements:

```tsx
import { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

type ControlMode = 'orbit' | 'walk' | 'fly';

export function HybridControls() {
  const { camera } = useThree();
  const orbitRef = useRef<any>(null);
  const [mode, setMode] = useState<ControlMode>('orbit');
  const [, get] = useKeyboardControls();

  const walkState = useRef({
    velocity: new THREE.Vector3(),
    euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    pointerLocked: false,
  });

  // Toggle control mode
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        setMode((prev) => (prev === 'walk' ? 'orbit' : 'walk'));
      }
      if (e.key === 'f' || e.key === 'F') {
        setMode((prev) => (prev === 'fly' ? 'orbit' : 'fly'));
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, []);

  // Disable OrbitControls in walk/fly mode
  useEffect(() => {
    if (orbitRef.current) {
      orbitRef.current.enabled = mode === 'orbit';
    }
  }, [mode]);

  // Walk mode logic
  useFrame((_, delta) => {
    if (mode === 'walk' && walkState.current.pointerLocked) {
      const { forward, back, left, right, sprint } = get();
      const speed = (sprint ? 20 : 12) * delta;

      const direction = new THREE.Vector3();
      const forwardVec = new THREE.Vector3();
      const rightVec = new THREE.Vector3();

      camera.getWorldDirection(forwardVec);
      forwardVec.y = 0;
      forwardVec.normalize();

      rightVec.crossVectors(forwardVec, new THREE.Vector3(0, 1, 0));

      if (forward) direction.add(forwardVec);
      if (back) direction.sub(forwardVec);
      if (right) direction.add(rightVec);
      if (left) direction.sub(rightVec);

      if (direction.length() > 0) {
        direction.normalize().multiplyScalar(speed);
        camera.position.add(direction);
        camera.position.y = 1.7; // Eye height
      }
    } else if (mode === 'fly' && walkState.current.pointerLocked) {
      const { forward, back, left, right, jump, sprint } = get();
      const speed = (sprint ? 30 : 15) * delta;

      const direction = new THREE.Vector3();

      if (forward) direction.z -= 1;
      if (back) direction.z += 1;
      if (right) direction.x += 1;
      if (left) direction.x -= 1;
      if (jump) direction.y += 1;

      if (direction.length() > 0) {
        direction.normalize().multiplyScalar(speed);
        direction.applyQuaternion(camera.quaternion);
        camera.position.add(direction);
      }
    }
  });

  // Pointer lock for walk/fly mode
  useEffect(() => {
    if (mode === 'orbit') {
      document.exitPointerLock();
      return;
    }

    const handleClick = () => {
      if (!walkState.current.pointerLocked) {
        document.body.requestPointerLock();
      }
    };

    const handlePointerLockChange = () => {
      walkState.current.pointerLocked = document.pointerLockElement === document.body;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!walkState.current.pointerLocked) return;

      walkState.current.euler.setFromQuaternion(camera.quaternion);
      walkState.current.euler.y -= e.movementX * 0.002;
      walkState.current.euler.x -= e.movementY * 0.002;
      walkState.current.euler.x = THREE.MathUtils.clamp(
        walkState.current.euler.x,
        -Math.PI / 2,
        Math.PI / 2
      );

      camera.quaternion.setFromEuler(walkState.current.euler);
    };

    document.addEventListener('click', handleClick);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mode, camera]);

  return (
    <>
      <OrbitControls
        ref={orbitRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
      />

      {/* UI Indicator */}
      <Html position={[0, 0, 0]} style={{ pointerEvents: 'none' }}>
        <div style={{
          position: 'fixed',
          top: 20,
          left: 20,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
        }}>
          <div>Mode: {mode.toUpperCase()}</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {mode === 'orbit' && 'G: Walk Mode | F: Fly Mode'}
            {mode === 'walk' && 'WASD: Move | G: Orbit Mode | Click to lock'}
            {mode === 'fly' && 'WASD: Move | Space: Up | F: Orbit Mode'}
          </div>
        </div>
      </Html>
    </>
  );
}
```

---

## 6. Performance Optimizations for Large Warehouses

```tsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';

export function OptimizedWarehouse() {
  const [, get] = useKeyboardControls();
  const frustum = useRef(new THREE.Frustum());
  const cameraViewProjectionMatrix = useRef(new THREE.Matrix4());

  // Generate warehouse items (thousands)
  const items = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 10000; i++) {
      arr.push({
        position: [
          Math.random() * 80 - 40,
          Math.random() * 10,
          Math.random() * 60 - 30,
        ] as [number, number, number],
        id: i,
      });
    }
    return arr;
  }, []);

  // Frustum culling
  useFrame(({ camera }) => {
    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.current.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.current.setFromProjectionMatrix(cameraViewProjectionMatrix.current);
  });

  return (
    <Instances limit={items.length}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />

      {items.map((item) => (
        <Instance key={item.id} position={item.position} />
      ))}
    </Instances>
  );
}
```

---

## 7. Complete Setup Example

```tsx
// App.tsx
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky } from '@react-three/drei';
import { Suspense } from 'react';
import { FPSControls } from './FPSControls';
import { Warehouse } from './Warehouse';

enum Controls {
  forward = 'forward',
  back = 'back',
  left = 'left',
  right = 'right',
  jump = 'jump',
  sprint = 'sprint',
}

const keyMap = [
  { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
  { name: Controls.back, keys: ['ArrowDown', 'KeyS'] },
  { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
  { name: Controls.right, keys: ['ArrowRight', 'KeyD'] },
  { name: Controls.jump, keys: ['Space'] },
  { name: Controls.sprint, keys: ['ShiftLeft', 'ShiftRight'] },
];

export default function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas
        camera={{ position: [0, 1.7, 10], fov: 75 }}
        gl={{ antialias: true }}
      >
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        <Suspense fallback={null}>
          <Warehouse />
          <FPSControls />
        </Suspense>
      </Canvas>

      {/* UI Overlay */}
      <div style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px 20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
      }}>
        Click to lock pointer | WASD: Move | Shift: Sprint | Space: Jump
      </div>
    </KeyboardControls>
  );
}
```

---

## 8. Best Practices & Tips

### Smooth Movement
- Always use `delta` time for frame-independent movement
- Apply damping/lerping for smooth acceleration/deceleration
- Normalize direction vectors to prevent diagonal speed advantage

### Collision Detection
- Use raycasting for simple collision checks
- Consider `three-mesh-bvh` for complex geometry
- Implement sliding along walls instead of full stop

### Performance
- Use instancing for repeated objects (drei's `<Instances>`)
- Implement frustum culling for large scenes
- LOD (Level of Detail) for distant objects
- Octree spatial partitioning for massive warehouses

### UX Improvements
- Show pointer lock instructions
- Add mini-map for navigation
- Display current position/zone
- Smooth transitions between control modes
- Add sound effects for footsteps

### Accessibility
- Provide alternative control schemes
- Allow key rebinding
- Toggle between mouse look and click-drag
- Adjustable movement speed

---

## Resources

1. **Official drei docs**: https://drei.docs.pmnd.rs/
2. **R3F Examples**: https://docs.pmnd.rs/react-three-fiber/getting-started/examples
3. **Three.js FPS Controls**: https://threejs.org/examples/#misc_controls_pointerlock
4. **Professional warehouse viz**: https://www.amp.ai (AMP Robotics)
5. **R3F Discord**: Excellent community support

---

## Implementation Priority for Your Project

Based on your current code, I recommend:

1. **Keep your current WASD implementation** in `CinematicCamera.tsx` - it's solid
2. **Add PointerLockControls** for true FPS mouse look (currently using OrbitControls)
3. **Implement collision detection** with warehouse walls/objects
4. **Add mini-map** for better navigation awareness
5. **Optimize with instancing** if you have 1000+ items to render

Your hybrid approach (Orbit + Walk modes) is professional and user-friendly!
