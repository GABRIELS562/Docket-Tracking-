# FPS Controls Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Input Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Keyboard          Mouse              Gamepad        Touch       │
│  ┌─────┐          ┌─────┐            ┌─────┐       ┌─────┐     │
│  │WASD │          │Move │            │Stick│       │Drag │     │
│  │Shift│          │Click│            │Button│      │Pinch│     │
│  └──┬──┘          └──┬──┘            └──┬──┘       └──┬──┘     │
│     │                │                  │             │         │
└─────┼────────────────┼──────────────────┼─────────────┼─────────┘
      │                │                  │             │
      ▼                ▼                  ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Input Management Layer                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌───────────────────┐                 │
│  │ KeyboardControls │    │PointerLockControls│                 │
│  │   (from drei)    │    │   (from drei)     │                 │
│  │                  │    │                   │                 │
│  │ - Key mapping    │    │ - Mouse capture   │                 │
│  │ - State tracking │    │ - Look rotation   │                 │
│  └────────┬─────────┘    └────────┬──────────┘                 │
│           │                       │                             │
└───────────┼───────────────────────┼─────────────────────────────┘
            │                       │
            ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Control Logic Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │             EnhancedFirstPersonControls.tsx                │ │
│  │                                                             │ │
│  │  useFrame((_, delta) => {                                  │ │
│  │    // 1. Get input state                                   │ │
│  │    const { forward, back, left, right, sprint } = get();  │ │
│  │                                                             │ │
│  │    // 2. Calculate movement direction                      │ │
│  │    const direction = calculateDirection();                 │ │
│  │                                                             │ │
│  │    // 3. Apply physics/acceleration                        │ │
│  │    velocity.lerp(targetVelocity, 10 * delta);             │ │
│  │                                                             │ │
│  │    // 4. Check collisions                                  │ │
│  │    if (!checkCollision(newPosition)) {                     │ │
│  │      camera.position.add(velocity);                        │ │
│  │    }                                                        │ │
│  │                                                             │ │
│  │    // 5. Apply constraints                                 │ │
│  │    clampToBoundaries();                                    │ │
│  │  });                                                        │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Camera Update Layer                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                Three.js Camera                          │    │
│  │                                                          │    │
│  │  camera.position.x = newX                              │    │
│  │  camera.position.y = eyeHeight                         │    │
│  │  camera.position.z = newZ                              │    │
│  │  camera.quaternion.setFromEuler(rotation)              │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
└───────────────────────────────┬───────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Render Layer                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  React Three Fiber → Three.js → WebGL → GPU → Screen            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Presses 'W'
      │
      ▼
KeyboardControls captures event
      │
      ▼
useKeyboardControls hook provides state
      │
      ▼
useFrame callback reads state
      │
      ▼
Calculate movement direction
      │
      ▼
Apply camera rotation to direction
      │
      ▼
Smooth acceleration with lerp
      │
      ▼
Check boundary collision
      │
      ├─── Collision? ──► Stop movement
      │
      └─── No Collision ──► Update camera position
                              │
                              ▼
                        Render new frame
                              │
                              ▼
                        User sees movement
```

---

## Component Architecture

```
Scene.tsx
│
├── Canvas
│   │
│   ├── KeyboardControls (Wrapper)
│   │   │
│   │   ├── Camera Modes (Conditional)
│   │   │   │
│   │   │   ├── OrbitControls (Orbit mode)
│   │   │   │   └── CinematicCamera.tsx
│   │   │   │
│   │   │   └── PointerLockControls (Walk mode)
│   │   │       └── EnhancedFirstPersonControls.tsx
│   │   │
│   │   ├── Scene Objects
│   │   │   ├── Warehouse.tsx
│   │   │   ├── RFIDItems.tsx
│   │   │   └── Lighting.tsx
│   │   │
│   │   └── Post-Processing
│   │       └── EffectComposer
│   │
│   └── UI Overlays (HTML)
│       │
│       ├── FirstPersonInstructions (when not locked)
│       ├── FirstPersonStatusIndicator (when locked)
│       ├── MiniMap (navigation aid)
│       └── Crosshair (aiming reference)
│
└── Stores (Zustand)
    ├── sceneStore.ts (camera presets)
    └── filterStore.ts (item filtering)
```

---

## Control Mode State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    Control Mode State                        │
└─────────────────────────────────────────────────────────────┘

         ┌───────────────┐
         │  ORBIT MODE   │
         │  (default)    │
         └───────┬───────┘
                 │
     Press 'G' or│Click preset
                 │
                 ▼
         ┌───────────────┐
    ┌────│  WALK MODE    │────┐
    │    │  (FPS ready)  │    │
    │    └───────┬───────┘    │
    │            │             │
    │   Click to │ lock        │ Press ESC
    │   pointer  │             │ or Press '1'
    │            │             │
    │            ▼             │
    │    ┌───────────────┐    │
    └───▶│ WALK ACTIVE   │────┘
         │ (pointer lock)│
         └───────────────┘

State Transitions:
- ORBIT → WALK: User presses 'G' or selects walk preset
- WALK → WALK ACTIVE: User clicks canvas (pointer lock)
- WALK ACTIVE → WALK: User presses ESC (pointer unlock)
- WALK → ORBIT: User presses '1' or selects orbit preset
```

---

## Movement Calculation Pipeline

```
┌────────────────────────────────────────────────────────────────┐
│                  Movement Calculation Flow                      │
└────────────────────────────────────────────────────────────────┘

1. INPUT READING
   ┌─────────────────────────────────────────┐
   │ const { forward, back, left, right,     │
   │         sprint } = get();                │
   └────────────────┬────────────────────────┘
                    │
                    ▼
2. DIRECTION CALCULATION
   ┌─────────────────────────────────────────┐
   │ direction = new Vector3(                 │
   │   (right ? 1 : 0) - (left ? 1 : 0),     │
   │   0,                                     │
   │   (back ? 1 : 0) - (forward ? 1 : 0)    │
   │ )                                        │
   └────────────────┬────────────────────────┘
                    │
                    ▼
3. NORMALIZATION
   ┌─────────────────────────────────────────┐
   │ if (direction.length() > 0) {            │
   │   direction.normalize();                 │
   │ }                                        │
   │ // Prevents faster diagonal movement    │
   └────────────────┬────────────────────────┘
                    │
                    ▼
4. CAMERA-RELATIVE ROTATION
   ┌─────────────────────────────────────────┐
   │ const forward = new Vector3();           │
   │ camera.getWorldDirection(forward);       │
   │ forward.y = 0;                           │
   │ forward.normalize();                     │
   │                                          │
   │ const right = new Vector3();             │
   │ right.crossVectors(                      │
   │   forward,                               │
   │   new Vector3(0, 1, 0)                   │
   │ );                                       │
   └────────────────┬────────────────────────┘
                    │
                    ▼
5. SPEED CALCULATION
   ┌─────────────────────────────────────────┐
   │ const speed = (sprint ?                  │
   │   moveSpeed * 1.8 : moveSpeed) * delta  │
   └────────────────┬────────────────────────┘
                    │
                    ▼
6. VELOCITY SMOOTHING
   ┌─────────────────────────────────────────┐
   │ targetVelocity = direction * speed       │
   │ velocity.lerp(targetVelocity, 10*delta) │
   │ // Smooth acceleration/deceleration     │
   └────────────────┬────────────────────────┘
                    │
                    ▼
7. POSITION UPDATE
   ┌─────────────────────────────────────────┐
   │ newPosition = camera.position + velocity │
   └────────────────┬────────────────────────┘
                    │
                    ▼
8. COLLISION CHECK
   ┌─────────────────────────────────────────┐
   │ if (checkCollision(newPosition)) {       │
   │   // Stop or slide along wall           │
   │ } else {                                 │
   │   camera.position = newPosition;         │
   │ }                                        │
   └────────────────┬────────────────────────┘
                    │
                    ▼
9. BOUNDARY CLAMPING
   ┌─────────────────────────────────────────┐
   │ camera.position.x = clamp(x, minX, maxX)│
   │ camera.position.z = clamp(z, minZ, maxZ)│
   │ camera.position.y = eyeHeight           │
   └─────────────────────────────────────────┘
```

---

## Collision Detection Systems

```
┌────────────────────────────────────────────────────────────────┐
│                    Collision Detection                          │
└────────────────────────────────────────────────────────────────┘

METHOD 1: BOUNDARY BOX (Simple, Fast)
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│   ┌─────────────────────────────────────────────┐           │
│   │         Warehouse Boundary                   │           │
│   │  (minX, maxX, minZ, maxZ)                   │           │
│   │                                              │           │
│   │    if (x < minX || x > maxX) → Blocked      │           │
│   │    if (z < minZ || z > maxZ) → Blocked      │           │
│   │                                              │           │
│   │         👤 ← Player position                 │           │
│   │                                              │           │
│   └─────────────────────────────────────────────┘           │
│                                                               │
│  Pros: Very fast, no computation overhead                    │
│  Cons: Only rectangular boundaries                           │
└─────────────────────────────────────────────────────────────┘

METHOD 2: RAYCASTING (Accurate, Medium Cost)
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│           🧱 Wall                                            │
│            │                                                 │
│            │ ← Raycast hits wall                            │
│            │                                                 │
│       ─────┼────► Raycast (forward)                         │
│            │                                                 │
│        👤 ─┼────► Raycast (right)                           │
│       Player│                                                │
│            └────► Raycast (down)                            │
│                                                              │
│  raycaster.set(position, direction);                        │
│  intersects = raycaster.intersectObjects(walls);            │
│  if (intersects[0].distance < threshold) → Blocked          │
│                                                              │
│  Pros: Works with any geometry                              │
│  Cons: Higher CPU cost                                      │
└─────────────────────────────────────────────────────────────┘

METHOD 3: PHYSICS ENGINE (Most Accurate, Highest Cost)
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  Using @react-three/rapier or @react-three/cannon           │
│                                                               │
│  <RigidBody type="dynamic" colliders="ball">                │
│    <mesh>                        ← Player (physics body)    │
│      <sphereGeometry />                                     │
│    </mesh>                                                  │
│  </RigidBody>                                               │
│                                                              │
│  <RigidBody type="fixed">       ← Walls (static)           │
│    <Wall />                                                 │
│  </RigidBody>                                               │
│                                                              │
│  Pros: Realistic physics, handles complex scenarios         │
│  Cons: Heavy, overkill for simple warehouses               │
└─────────────────────────────────────────────────────────────┘

RECOMMENDED FOR YOUR PROJECT: METHOD 1 + METHOD 2
- Use boundary box for warehouse edges (fast)
- Use raycasting for shelves/objects (accurate)
```

---

## Performance Optimization Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    Performance Pipeline                         │
└────────────────────────────────────────────────────────────────┘

LEVEL 1: INPUT (Minimal Cost)
┌─────────────────────────────────────────────────────────────┐
│ KeyboardControls: O(1) key lookup                           │
│ PointerLockControls: Direct DOM events                      │
└─────────────────────────────────────────────────────────────┘

LEVEL 2: LOGIC (Low Cost)
┌─────────────────────────────────────────────────────────────┐
│ Movement calculation: ~0.1ms                                │
│ Vector operations: Hardware accelerated                     │
│ Boundary checks: O(1) comparisons                           │
└─────────────────────────────────────────────────────────────┘

LEVEL 3: COLLISION (Variable Cost)
┌─────────────────────────────────────────────────────────────┐
│ Boundary box: ~0.01ms ✓                                     │
│ Raycasting: ~0.1-1ms (depends on scene complexity)          │
│ Physics engine: ~1-5ms (if used)                            │
└─────────────────────────────────────────────────────────────┘

LEVEL 4: RENDERING (Highest Cost)
┌─────────────────────────────────────────────────────────────┐
│ Frustum culling: Only render visible objects                │
│ Instancing: Batch similar objects                           │
│ LOD: Reduce detail for distant objects                      │
│ Post-processing: Adaptive quality based on FPS              │
└─────────────────────────────────────────────────────────────┘

TARGET BUDGET (60 FPS = 16.67ms per frame)
┌─────────────────────────────────────────────────────────────┐
│ Input + Logic:     0.5ms  (  3%)                            │
│ Collision:         1.0ms  (  6%)                            │
│ Physics (Three.js): 2.0ms  ( 12%)                            │
│ Rendering:        10.0ms  ( 60%)                            │
│ Post-processing:   2.0ms  ( 12%)                            │
│ Buffer:            1.2ms  (  7%)                            │
│ ────────────────────────────────────────                    │
│ Total:            16.7ms  (100%)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with Your Current System

```
Current Implementation (CinematicCamera.tsx)
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐              ┌──────────────┐           │
│  │ OrbitControls│◄─────────────│ sceneStore   │           │
│  │              │  currentPreset│              │           │
│  └──────┬───────┘              └──────────────┘           │
│         │                                                   │
│         │  if (preset === 'walkMode')                      │
│         │    → Custom WASD logic                           │
│         │    → OrbitControls still active                  │
│         │    → Mouse rotates around target                 │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────────────────┐                             │
│  │ useFrame() {              │                             │
│  │   // WASD movement        │                             │
│  │   camera.position.x += dx │                             │
│  │   target.x += dx          │                             │
│  │ }                         │                             │
│  └──────────────────────────┘                             │
│                                                              │
└────────────────────────────────────────────────────────────┘

Enhanced Implementation (Recommended)
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐              ┌──────────────┐           │
│  │ sceneStore   │              │ Mode Selector│           │
│  │ currentPreset│──────────────►│              │           │
│  └──────────────┘              └──────┬───────┘           │
│                                        │                    │
│                    ┌───────────────────┼──────────────┐    │
│                    │                   │              │    │
│         preset === 'orbit'   preset === 'walkMode'   │    │
│                    │                   │              │    │
│                    ▼                   ▼              │    │
│         ┌──────────────────┐ ┌───────────────────┐   │    │
│         │ OrbitControls    │ │ PointerLockControls│  │    │
│         │ + CinematicCamera│ │ + EnhancedFPS     │   │    │
│         └──────────────────┘ └───────────────────┘   │    │
│                                                              │
└────────────────────────────────────────────────────────────┘

Key Difference:
- Current: OrbitControls always active, manual WASD
- Enhanced: Switch control systems based on mode
```

---

## File Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── 3d/
│   │       ├── CinematicCamera.tsx         (Current - Hybrid)
│   │       ├── EnhancedFirstPersonControls.tsx (New - Pure FPS)
│   │       ├── Controls.tsx                (Legacy - Orbit only)
│   │       ├── Scene.tsx                   (Main container)
│   │       └── Warehouse.tsx               (3D models)
│   │
│   └── stores/
│       └── sceneStore.ts                   (Camera presets)
│
├── FIRST_PERSON_CONTROLS_REFERENCE.md      (Complete guide)
├── INTEGRATION_GUIDE.md                    (How to integrate)
├── PROFESSIONAL_EXAMPLES.md                (Real-world patterns)
├── FPS_CONTROLS_CHEATSHEET.md             (Quick reference)
├── FPS_CONTROLS_SUMMARY.md                (This summary)
└── FPS_CONTROLS_ARCHITECTURE.md           (You are here)
```

---

## Decision Matrix

```
┌────────────────────────────────────────────────────────────────┐
│         When to Use Which Control System?                      │
├────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OrbitControls                                                  │
│  ├─ Use Case: Inspection, overview, presentation               │
│  ├─ User Intent: View object from all angles                   │
│  ├─ Camera Movement: Rotates around target point               │
│  └─ Example: Product viewers, 3D model showcase                │
│                                                                  │
│  PointerLockControls (FPS)                                     │
│  ├─ Use Case: First-person exploration, games                  │
│  ├─ User Intent: Feel like being inside the scene              │
│  ├─ Camera Movement: Direct camera rotation                    │
│  └─ Example: Warehouse tours, virtual showrooms, FPS games     │
│                                                                  │
│  CinematicCamera (Custom)                                      │
│  ├─ Use Case: Automated tours, storytelling                    │
│  ├─ User Intent: Watch guided presentation                     │
│  ├─ Camera Movement: Pre-programmed paths                      │
│  └─ Example: Product launches, architectural walkthroughs      │
│                                                                  │
│  Hybrid (Current Implementation)                               │
│  ├─ Use Case: Flexible multi-purpose visualization             │
│  ├─ User Intent: Switch between modes as needed                │
│  ├─ Camera Movement: Mode-dependent                            │
│  └─ Example: Professional visualization tools, your project ✓  │
│                                                                  │
└────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

Your warehouse RFID platform uses a **hybrid approach** which is ideal for professional visualization tools. The architecture supports multiple camera modes, smooth transitions, and provides users with flexibility.

The main architectural improvement opportunity is switching from OrbitControls to PointerLockControls specifically in walk mode to provide true first-person mouse look, which is more intuitive for warehouse navigation.
