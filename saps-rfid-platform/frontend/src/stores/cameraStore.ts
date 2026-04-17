/**
 * CAMERA STORE
 *
 * Dedicated state management for camera position, mode, and animations.
 * Separated from warehouse store for cleaner separation of concerns.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Vector3, CameraPreset, CameraMode } from '../core/types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface CameraState {
  // ========== Position ==========
  /** Current camera position */
  position: Vector3;

  /** Current look-at target */
  target: Vector3;

  /** Field of view */
  fov: number;

  // ========== Mode ==========
  /** Current camera mode */
  mode: CameraMode;

  /** Previous mode (for returning from walk mode) */
  previousMode: CameraMode | null;

  /** Is walk mode currently locked (pointer lock active) */
  isWalkLocked: boolean;

  // ========== Animation ==========
  /** Is camera currently animating */
  isAnimating: boolean;

  /** Animation target (position and target) */
  animationTarget: { position: Vector3; target: Vector3 } | null;

  /** Animation duration in seconds */
  animationDuration: number;

  // ========== Focus ==========
  /** Currently focused item ID */
  focusedItemId: string | null;

  /** Currently focused zone ID */
  focusedZoneId: string | null;

  // ========== Tour ==========
  /** Is cinematic tour running */
  isTourRunning: boolean;

  /** Current tour waypoint index */
  tourWaypointIndex: number;

  // ========== Actions ==========
  /** Set camera position and target directly */
  setPosition: (position: Vector3, target: Vector3) => void;

  /** Animate to a camera preset */
  goToPreset: (preset: CameraPreset) => void;

  /** Fly to a zone */
  flyToZone: (zoneId: string, zoneCenter: Vector3, cameraPreset?: { position: Vector3; target: Vector3; fov?: number }) => void;

  /** Fly to an item */
  flyToItem: (itemId: string, itemPosition: Vector3) => void;

  /** Set camera mode */
  setMode: (mode: CameraMode) => void;

  /** Toggle walk mode */
  toggleWalkMode: () => void;

  /** Set walk lock state */
  setWalkLocked: (locked: boolean) => void;

  /** Start animation */
  startAnimation: (target: { position: Vector3; target: Vector3 }, duration?: number) => void;

  /** End animation */
  endAnimation: () => void;

  /** Start tour */
  startTour: () => void;

  /** Stop tour */
  stopTour: () => void;

  /** Advance to next tour waypoint */
  nextTourWaypoint: () => void;

  /** Clear focus */
  clearFocus: () => void;

  /** Reset to default state */
  reset: (defaultPreset?: CameraPreset) => void;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_POSITION: Vector3 = { x: 70, y: 55, z: 50 };
const DEFAULT_TARGET: Vector3 = { x: 0, y: 0, z: 0 };
const DEFAULT_FOV = 50;

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useCameraStore = create<CameraState>()(
  subscribeWithSelector((set, get) => ({
    // ========== Initial State ==========
    position: DEFAULT_POSITION,
    target: DEFAULT_TARGET,
    fov: DEFAULT_FOV,
    mode: 'orbit',
    previousMode: null,
    isWalkLocked: false,
    isAnimating: false,
    animationTarget: null,
    animationDuration: 1.5,
    focusedItemId: null,
    focusedZoneId: null,
    isTourRunning: false,
    tourWaypointIndex: 0,

    // ========== Actions ==========

    setPosition: (position: Vector3, target: Vector3) => {
      set({ position, target });
    },

    goToPreset: (preset: CameraPreset) => {
      set({
        isAnimating: true,
        animationTarget: {
          position: preset.position,
          target: preset.target,
        },
        animationDuration: preset.transitionDuration || 1.5,
        fov: preset.fov,
        focusedItemId: null,
        focusedZoneId: null,
      });
    },

    flyToZone: (zoneId: string, zoneCenter: Vector3, cameraPreset?: { position: Vector3; target: Vector3 }) => {
      const targetPos = cameraPreset?.position || {
        x: zoneCenter.x + 20,
        y: zoneCenter.y + 15,
        z: zoneCenter.z + 20,
      };
      const targetLookAt = cameraPreset?.target || zoneCenter;

      set({
        isAnimating: true,
        animationTarget: {
          position: targetPos,
          target: targetLookAt,
        },
        animationDuration: 1.5,
        focusedZoneId: zoneId,
        focusedItemId: null,
      });
    },

    flyToItem: (itemId: string, itemPosition: Vector3) => {
      const offset = { x: 12, y: 10, z: 12 };
      set({
        isAnimating: true,
        animationTarget: {
          position: {
            x: itemPosition.x + offset.x,
            y: itemPosition.y + offset.y,
            z: itemPosition.z + offset.z,
          },
          target: itemPosition,
        },
        animationDuration: 1.2,
        focusedItemId: itemId,
        focusedZoneId: null,
      });
    },

    setMode: (mode: CameraMode) => {
      const current = get().mode;
      set({
        mode,
        previousMode: current,
        isWalkLocked: mode === 'walk' ? get().isWalkLocked : false,
      });
    },

    toggleWalkMode: () => {
      const current = get().mode;
      if (current === 'walk') {
        // Return to previous mode or orbit
        set({
          mode: get().previousMode || 'orbit',
          previousMode: null,
          isWalkLocked: false,
        });
      } else {
        set({
          mode: 'walk',
          previousMode: current,
        });
      }
    },

    setWalkLocked: (locked: boolean) => {
      set({ isWalkLocked: locked });
    },

    startAnimation: (target: { position: Vector3; target: Vector3 }, duration = 1.5) => {
      set({
        isAnimating: true,
        animationTarget: target,
        animationDuration: duration,
      });
    },

    endAnimation: () => {
      const target = get().animationTarget;
      if (target) {
        set({
          position: target.position,
          target: target.target,
          isAnimating: false,
          animationTarget: null,
        });
      } else {
        set({
          isAnimating: false,
          animationTarget: null,
        });
      }
    },

    startTour: () => {
      set({
        isTourRunning: true,
        tourWaypointIndex: 0,
        mode: 'cinematic',
        previousMode: get().mode,
      });
    },

    stopTour: () => {
      set({
        isTourRunning: false,
        tourWaypointIndex: 0,
        mode: get().previousMode || 'orbit',
        previousMode: null,
      });
    },

    nextTourWaypoint: () => {
      set((state) => ({
        tourWaypointIndex: state.tourWaypointIndex + 1,
      }));
    },

    clearFocus: () => {
      set({
        focusedItemId: null,
        focusedZoneId: null,
      });
    },

    reset: (defaultPreset?: CameraPreset) => {
      set({
        position: defaultPreset?.position || DEFAULT_POSITION,
        target: defaultPreset?.target || DEFAULT_TARGET,
        fov: defaultPreset?.fov || DEFAULT_FOV,
        mode: 'orbit',
        previousMode: null,
        isWalkLocked: false,
        isAnimating: false,
        animationTarget: null,
        focusedItemId: null,
        focusedZoneId: null,
        isTourRunning: false,
        tourWaypointIndex: 0,
      });
    },
  }))
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/** Get camera position */
export const useCameraPosition = () =>
  useCameraStore((s) => s.position);

/** Get camera target */
export const useCameraTarget = () =>
  useCameraStore((s) => s.target);

/** Get camera mode */
export const useCameraMode = () =>
  useCameraStore((s) => s.mode);

/** Get animation state */
export const useCameraAnimating = () =>
  useCameraStore((s) => s.isAnimating);

/** Get walk locked state */
export const useWalkLocked = () =>
  useCameraStore((s) => s.isWalkLocked);

/** Get tour running state */
export const useTourRunning = () =>
  useCameraStore((s) => s.isTourRunning);

export default useCameraStore;
