import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import { InvalidZoneError } from '../errors/InvalidZoneError';
import { ZoneCapacityExceededError } from '../errors/ZoneCapacityExceededError';

/**
 * Zone type enumeration
 */
export enum ZoneType {
  /** Evidence storage area */
  STORAGE = 'storage',

  /** Examination laboratory */
  EXAMINATION = 'examination',

  /** Transit area (receiving/dispatch) */
  TRANSIT = 'transit',

  /** Long-term archive storage */
  ARCHIVE = 'archive',

  /** Office space */
  OFFICE = 'office',

  /** Corridor or hallway */
  CORRIDOR = 'corridor',

  /** Entrance or exit point */
  ENTRANCE = 'entrance',
}

/**
 * Coordinates for 2D/3D visualization
 */
export interface Coordinates {
  x: number;
  y: number;
  z?: number;
}

/**
 * Properties for creating or reconstituting a Zone
 */
export interface ZoneProps {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly zoneType: ZoneType;
  readonly capacity: number;
  readonly currentOccupancy: number;
  readonly floorNumber?: number;
  readonly building?: string;
  readonly coordinates?: Coordinates;
  readonly parentZoneId: string | null;
  readonly readerIds: string[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Zone Entity
 *
 * @description
 * Represents a physical zone or location within the forensic laboratory.
 * Zones contain business rules for capacity management, occupancy tracking,
 * and hierarchical organization.
 *
 * Business Rules:
 * - Zones have a maximum capacity that cannot be exceeded
 * - Current occupancy must never be negative
 * - Zone codes must be unique
 * - Zones can have parent zones (hierarchical structure)
 * - Multiple RFID readers can be assigned to a zone
 *
 * @example
 * ```typescript
 * const result = Zone.create({
 *   id: 'zone-001',
 *   name: 'Evidence Storage A',
 *   code: 'STOR-A',
 *   zoneType: ZoneType.STORAGE,
 *   capacity: 500
 * });
 * ```
 */
export class Zone {
  private constructor(private props: ZoneProps) {}

  /**
   * Creates a new Zone entity
   *
   * @param params - Zone creation parameters
   * @returns Result containing Zone or Error
   */
  static create(params: {
    id: string;
    name: string;
    code: string;
    description?: string;
    zoneType: ZoneType;
    capacity: number;
    floorNumber?: number;
    building?: string;
    coordinates?: Coordinates;
    parentZoneId?: string;
    readerIds?: string[];
  }): Result<Zone, InvalidZoneError> {
    // Validate ID
    if (params.id.trim().length === 0) {
      return err(new InvalidZoneError('Zone ID cannot be empty'));
    }

    // Validate name
    if (params.name.trim().length === 0) {
      return err(new InvalidZoneError('Zone name cannot be empty'));
    }

    // Validate code
    if (params.code.trim().length === 0) {
      return err(new InvalidZoneError('Zone code cannot be empty'));
    }

    // Validate code format (alphanumeric with hyphens/underscores)
    if (!/^[A-Z0-9_-]+$/i.test(params.code)) {
      return err(
        new InvalidZoneError('Zone code must contain only alphanumeric characters, hyphens, or underscores')
      );
    }

    // Validate capacity
    if (params.capacity < 0) {
      return err(new InvalidZoneError('Capacity cannot be negative'));
    }

    // Validate coordinates if provided
    if (params.coordinates) {
      const { x, y, z } = params.coordinates;
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return err(new InvalidZoneError('Coordinates must be finite numbers'));
      }
      if (z !== undefined && !Number.isFinite(z)) {
        return err(new InvalidZoneError('Z-coordinate must be a finite number'));
      }
    }

    const now = new Date();

    const zone = new Zone({
      id: params.id,
      name: params.name.trim(),
      code: params.code.trim().toUpperCase(),
      description: params.description?.trim(),
      zoneType: params.zoneType,
      capacity: params.capacity,
      currentOccupancy: 0,
      floorNumber: params.floorNumber,
      building: params.building?.trim(),
      coordinates: params.coordinates,
      parentZoneId: params.parentZoneId ?? null,
      readerIds: params.readerIds ?? [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return ok(zone);
  }

  /**
   * Reconstitutes a Zone from persistence
   *
   * @param props - Complete zone properties from database
   * @returns Zone instance
   */
  static fromPersistence(props: ZoneProps): Zone {
    return new Zone(props);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getId(): string {
    return this.props.id;
  }

  getName(): string {
    return this.props.name;
  }

  getCode(): string {
    return this.props.code;
  }

  getDescription(): string | undefined {
    return this.props.description;
  }

  getZoneType(): ZoneType {
    return this.props.zoneType;
  }

  getCapacity(): number {
    return this.props.capacity;
  }

  getCurrentOccupancy(): number {
    return this.props.currentOccupancy;
  }

  getFloorNumber(): number | undefined {
    return this.props.floorNumber;
  }

  getBuilding(): string | undefined {
    return this.props.building;
  }

  getCoordinates(): Coordinates | undefined {
    return this.props.coordinates ? { ...this.props.coordinates } : undefined;
  }

  getParentZoneId(): string | null {
    return this.props.parentZoneId;
  }

  getReaderIds(): string[] {
    return [...this.props.readerIds];
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getCreatedAt(): Date {
    return new Date(this.props.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Adds a docket to the zone
   *
   * Business Rule: Cannot exceed zone capacity
   *
   * @returns Result indicating success or failure
   */
  addDocket(): Result<void, ZoneCapacityExceededError> {
    if (this.isAtCapacity()) {
      return err(
        new ZoneCapacityExceededError(this.props.id, this.props.currentOccupancy, this.props.capacity)
      );
    }

    this.props.currentOccupancy++;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Removes a docket from the zone
   *
   * Business Rule: Occupancy cannot go negative
   *
   * @returns Result indicating success or failure
   */
  removeDocket(): Result<void, Error> {
    if (this.props.currentOccupancy === 0) {
      return err(new Error('Cannot remove docket from empty zone'));
    }

    this.props.currentOccupancy--;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Sets the occupancy directly (for bulk operations)
   *
   * @param occupancy - New occupancy value
   * @returns Result indicating success or failure
   */
  setOccupancy(occupancy: number): Result<void, Error> {
    if (occupancy < 0) {
      return err(new Error('Occupancy cannot be negative'));
    }

    if (occupancy > this.props.capacity) {
      return err(new Error(`Occupancy ${occupancy} exceeds capacity ${this.props.capacity}`));
    }

    this.props.currentOccupancy = occupancy;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Adds a reader to this zone
   *
   * @param readerId - The reader ID to add
   */
  addReader(readerId: string): void {
    if (readerId.trim().length === 0) {
      return;
    }

    if (!this.props.readerIds.includes(readerId)) {
      this.props.readerIds.push(readerId);
      this.props.updatedAt = new Date();
    }
  }

  /**
   * Removes a reader from this zone
   *
   * @param readerId - The reader ID to remove
   */
  removeReader(readerId: string): void {
    const index = this.props.readerIds.indexOf(readerId);
    if (index !== -1) {
      this.props.readerIds.splice(index, 1);
      this.props.updatedAt = new Date();
    }
  }

  /**
   * Updates the zone's capacity
   *
   * Business Rule: New capacity cannot be less than current occupancy
   *
   * @param newCapacity - The new capacity value
   * @returns Result indicating success or failure
   */
  updateCapacity(newCapacity: number): Result<void, Error> {
    if (newCapacity < 0) {
      return err(new Error('Capacity cannot be negative'));
    }

    if (newCapacity < this.props.currentOccupancy) {
      return err(
        new Error(
          `Cannot set capacity to ${newCapacity} when current occupancy is ${this.props.currentOccupancy}`
        )
      );
    }

    this.props.capacity = newCapacity;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Deactivates the zone
   *
   * Business Rule: Cannot deactivate a zone with dockets
   *
   * @returns Result indicating success or failure
   */
  deactivate(): Result<void, Error> {
    if (this.props.currentOccupancy > 0) {
      return err(new Error('Cannot deactivate zone with dockets'));
    }

    this.props.isActive = false;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Activates the zone
   */
  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Checks if the zone is at capacity
   */
  isAtCapacity(): boolean {
    return this.props.currentOccupancy >= this.props.capacity;
  }

  /**
   * Checks if the zone is empty
   */
  isEmpty(): boolean {
    return this.props.currentOccupancy === 0;
  }

  /**
   * Returns the occupancy percentage
   *
   * @returns Percentage (0-100)
   */
  getOccupancyPercentage(): number {
    if (this.props.capacity === 0) {
      return 0;
    }
    return (this.props.currentOccupancy / this.props.capacity) * 100;
  }

  /**
   * Returns the number of available slots
   */
  getAvailableCapacity(): number {
    return Math.max(0, this.props.capacity - this.props.currentOccupancy);
  }

  /**
   * Returns the occupancy status classification
   *
   * @param warningThreshold - Percentage for warning status (default: 70%)
   * @param criticalThreshold - Percentage for critical status (default: 90%)
   * @returns Status classification
   */
  getOccupancyStatus(
    warningThreshold: number = 70,
    criticalThreshold: number = 90
  ): 'normal' | 'warning' | 'critical' | 'full' {
    const percentage = this.getOccupancyPercentage();

    if (this.isAtCapacity()) {
      return 'full';
    }

    if (percentage >= criticalThreshold) {
      return 'critical';
    }

    if (percentage >= warningThreshold) {
      return 'warning';
    }

    return 'normal';
  }

  /**
   * Checks if a reader is assigned to this zone
   *
   * @param readerId - The reader ID to check
   */
  hasReader(readerId: string): boolean {
    return this.props.readerIds.includes(readerId);
  }

  /**
   * Returns the number of readers assigned to this zone
   */
  getReaderCount(): number {
    return this.props.readerIds.length;
  }

  /**
   * Checks if this zone has a parent zone
   */
  hasParent(): boolean {
    return this.props.parentZoneId !== null;
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Returns properties for persistence
   */
  toPersistence(): ZoneProps {
    return { ...this.props };
  }

  /**
   * Returns a plain object representation
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      code: this.props.code,
      description: this.props.description,
      zoneType: this.props.zoneType,
      capacity: this.props.capacity,
      currentOccupancy: this.props.currentOccupancy,
      occupancyPercentage: this.getOccupancyPercentage(),
      occupancyStatus: this.getOccupancyStatus(),
      availableCapacity: this.getAvailableCapacity(),
      floorNumber: this.props.floorNumber,
      building: this.props.building,
      coordinates: this.props.coordinates,
      parentZoneId: this.props.parentZoneId,
      readerIds: this.props.readerIds,
      readerCount: this.getReaderCount(),
      isActive: this.props.isActive,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
  }
}
