# SAPS Forensic 3D Dashboard

3D/4D visualization dashboard for real-time RFID evidence tracking.

## Setup
```bash
npm install
npm run dev
```

Open http://localhost:3000

Backend must be running at http://localhost:8080

## Features
- **3D Building Visualization**: Interactive radial forensic facility layout
- **Real-time RFID Tracking**: Live particle visualization of evidence dockets
- **WebSocket Updates**: Instant zone occupancy and reader status updates
- **Multiple View Modes**: 3D, Top-down, First-person walkthrough
- **Heat Maps**: Visual representation of zone occupancy
- **Chain of Custody**: Historical movement trails

## Architecture
- React 18 + TypeScript
- Three.js with React Three Fiber
- Socket.io for real-time updates
- TanStack Query for API state
- Zustand for global state
- Tailwind CSS for UI

## API Endpoints
- `GET /api/zones` - Fetch all zones
- `GET /api/dockets` - Search dockets
- `GET /api/readers` - Fetch RFID readers
- `WebSocket: ws://localhost:8080` - Real-time updates
