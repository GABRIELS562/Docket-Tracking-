# React Three Fiber FPS Controls - Quick Reference Cheat Sheet

## TL;DR - Copy-Paste Solutions

### 1. Basic FPS with PointerLockControls (30 seconds)

```tsx
import { PointerLockControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

function FPS() {
  const keys = useRef({ w: false, a: false, s: false, d: false });
  const { camera } = useThree();

  useEffect(() => {
    const onKeyDown = (e) => { keys.current[e.key] = true; };
    const onKeyUp = (e) => { keys.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 10 * delta;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    if (keys.current.w) camera.position.add(forward.multiplyScalar(speed));
    if (keys.current.s) camera.position.sub(forward.multiplyScalar(speed));
    // Add A and D...
  });

  return <PointerLockControls />;
}
```

---

### 2. With KeyboardControls (Recommended)

```tsx
import { KeyboardControls, useKeyboardControls, PointerLockControls } from '@react-three/drei';

// Wrap Canvas
<KeyboardControls map={[
  { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
  { name: 'back', keys: ['KeyS', 'ArrowDown'] },
  { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'right', keys: ['KeyD', 'ArrowRight'] },
  { name: 'sprint', keys: ['ShiftLeft'] },
]}>
  <Canvas>...</Canvas>
</KeyboardControls>

// Inside Canvas
function Controls() {
  const [, get] = useKeyboardControls();
  const { camera } = useThree();

  useFrame((_, delta) => {
    const { forward, back, left, right, sprint } = get();
    const speed = (sprint ? 20 : 10) * delta;
    // Move camera based on keys...
  });

  return <PointerLockControls />;
}
```

---

### 3. Hybrid Orbit + FPS Toggle

```tsx
function HybridControls() {
  const [mode, setMode] = useState('orbit');
  const { camera } = useThree();

  useEffect(() => {
    const toggle = (e) => {
      if (e.key === 'g') setMode(mode === 'orbit' ? 'fps' : 'orbit');
    };
    window.addEventListener('keypress', toggle);
    return () => window.removeEventListener('keypress', toggle);
  }, [mode]);

  return mode === 'orbit' ? <OrbitControls /> : <FPSControls />;
}
```

---

## Common Patterns

### Smooth Acceleration

```tsx
const velocity = useRef(new THREE.Vector3());

useFrame((_, delta) => {
  const targetVel = calculateMovement(); // Returns Vector3
  velocity.current.lerp(targetVel, 10 * delta); // Smooth!
  camera.position.add(velocity.current);
});
```

### Boundary Collision

```tsx
camera.position.x = THREE.MathUtils.clamp(
  camera.position.x,
  minX,
  maxX
);
```

### Raycast Collision

```tsx
const raycaster = new THREE.Raycaster();
raycaster.set(camera.position, direction);
const intersects = raycaster.intersectObjects(walls);
if (intersects.length > 0 && intersects[0].distance < 1.0) {
  // Collision detected
}
```

### Head Bob

```tsx
const bobTime = useRef(0);
useFrame((_, delta) => {
  bobTime.current += delta * 8;
  camera.position.y = baseHeight + Math.sin(bobTime.current) * 0.05;
});
```

---

## Drei Components You Need

| Component | Purpose | Usage |
|-----------|---------|-------|
| `PointerLockControls` | FPS mouse look | `<PointerLockControls />` |
| `KeyboardControls` | Standardized input | Wrap `<Canvas>` |
| `useKeyboardControls` | Access key state | `const [, get] = useKeyboardControls()` |
| `OrbitControls` | 3rd person camera | `<OrbitControls />` |
| `FirstPersonControls` | Built-in FPS (old) | Not recommended, use PointerLockControls |

---

## Key Differences

### OrbitControls vs PointerLockControls

| Feature | OrbitControls | PointerLockControls |
|---------|--------------|-------------------|
| Mouse Look | Rotates around target | True FPS look |
| Best For | Inspection, overview | First-person games |
| Pointer Lock | No | Yes |
| Target | Always has target | Camera-relative |

### Your Current Setup

File: `/frontend/src/components/3d/CinematicCamera.tsx`

**What you have:**
- OrbitControls for most modes ✓
- WASD movement in walk mode ✓
- Boundary collision ✓
- Smooth GSAP animations ✓

**What to add for true FPS:**
- PointerLockControls in walk mode
- Lerp acceleration
- Mini-map
- UI instructions

---

## Quick Fixes

### Problem: Diagonal movement is faster

```tsx
// Wrong
if (forward) camera.position.z -= speed;
if (right) camera.position.x += speed;

// Right
direction.normalize(); // <-- Add this!
camera.position.add(direction.multiplyScalar(speed));
```

### Problem: Movement ignores camera rotation

```tsx
// Wrong
camera.position.x += speed;

// Right
const forward = new THREE.Vector3();
camera.getWorldDirection(forward);
forward.y = 0; // Keep horizontal
forward.normalize();
camera.position.add(forward.multiplyScalar(speed));
```

### Problem: Mouse look with OrbitControls feels wrong

```tsx
// Solution: Use PointerLockControls instead
<PointerLockControls />
```

---

## Performance Tips

```tsx
// Use instancing for repeated objects
import { Instances, Instance } from '@react-three/drei';

<Instances limit={10000}>
  <boxGeometry />
  <meshStandardMaterial />
  {items.map(item => <Instance key={item.id} {...item} />)}
</Instances>

// Frustum culling
const frustum = new THREE.Frustum();
useFrame(({ camera }) => {
  camera.updateMatrixWorld();
  const matrix = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse
  );
  frustum.setFromProjectionMatrix(matrix);
  // Use frustum.intersectsObject(mesh) to check visibility
});
```

---

## Complete Working Example (Drop-in)

```tsx
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, KeyboardControls, useKeyboardControls } from '@react-three/drei';
import { useRef, useState } from 'react';
import * as THREE from 'three';

const keyMap = [
  { name: 'forward', keys: ['KeyW'] },
  { name: 'back', keys: ['KeyS'] },
  { name: 'left', keys: ['KeyA'] },
  { name: 'right', keys: ['KeyD'] },
  { name: 'sprint', keys: ['ShiftLeft'] },
];

function Player() {
  const { camera } = useThree();
  const [, get] = useKeyboardControls();
  const velocity = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const { forward, back, left, right, sprint } = get();
    const speed = (sprint ? 20 : 10) * delta;

    const direction = new THREE.Vector3();
    const frontVector = new THREE.Vector3(0, 0, Number(back) - Number(forward));
    const sideVector = new THREE.Vector3(Number(right) - Number(left), 0, 0);

    direction.subVectors(frontVector, sideVector).normalize();
    direction.applyEuler(camera.rotation);
    direction.y = 0;

    const target = direction.multiplyScalar(speed);
    velocity.current.lerp(target, 10 * delta);
    camera.position.add(velocity.current);
    camera.position.y = 1.7; // Eye height
  });

  return <PointerLockControls />;
}

function App() {
  return (
    <KeyboardControls map={keyMap}>
      <Canvas camera={{ position: [0, 1.7, 5] }}>
        <ambientLight />
        <Player />
        <mesh>
          <boxGeometry />
          <meshStandardMaterial />
        </mesh>
      </Canvas>
    </KeyboardControls>
  );
}

export default App;
```

---

## UI Components

### Pointer Lock Instructions

```tsx
const [locked, setLocked] = useState(false);

return !locked && (
  <div className="fixed inset-0 flex items-center justify-center bg-black/50">
    <div className="bg-white p-8 rounded-lg text-center">
      <h2>First Person Mode</h2>
      <p>Click to start</p>
      <p>WASD to move, mouse to look, ESC to exit</p>
    </div>
  </div>
);
```

### Mini-Map

```tsx
function MiniMap({ position, direction }) {
  return (
    <div className="fixed top-4 right-4 w-40 h-40 bg-black/70 rounded-lg">
      <canvas ref={ref} width={160} height={160} />
    </div>
  );
}
```

---

## Debugging

```tsx
// Show camera info
useFrame(() => {
  console.log('Position:', camera.position);
  console.log('Rotation:', camera.rotation);
  console.log('Direction:', camera.getWorldDirection(new THREE.Vector3()));
});

// Check pointer lock
useEffect(() => {
  const check = () => console.log('Locked:', !!document.pointerLockElement);
  document.addEventListener('pointerlockchange', check);
  return () => document.removeEventListener('pointerlockchange', check);
}, []);
```

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| PointerLock | ✓ | ✓ | ✓ | ✓ |
| GamepadAPI | ✓ | ✓ | ✗ | ✓ |
| WebXR | ✓ | ✓ | Partial | ✓ |

---

## Resources

- **Drei Docs**: https://drei.docs.pmnd.rs/
- **R3F Docs**: https://docs.pmnd.rs/react-three-fiber/
- **Three.js Examples**: https://threejs.org/examples/
- **Your Implementation**: `/frontend/src/components/3d/CinematicCamera.tsx`
- **Enhanced Version**: `/frontend/src/components/3d/EnhancedFirstPersonControls.tsx`

---

## One-Line Solutions

```tsx
// Toggle FPS mode
const [fps, setFps] = useState(false);

// Smooth camera transition
gsap.to(camera.position, { x, y, z, duration: 1 });

// Check if key is pressed
const isPressed = keysPressed.current.has('w');

// Normalize diagonal movement
direction.normalize();

// Apply boundaries
pos.x = THREE.MathUtils.clamp(pos.x, min, max);

// Get camera forward direction
camera.getWorldDirection(forward);

// Smooth lerp
velocity.lerp(target, 10 * delta);
```

---

## Next Steps

1. Use `EnhancedFirstPersonControls.tsx` (already created)
2. Replace OrbitControls with PointerLockControls in walk mode
3. Add UI overlays (instructions, mini-map)
4. Test on different devices
5. Optimize for large scenes

Done!
