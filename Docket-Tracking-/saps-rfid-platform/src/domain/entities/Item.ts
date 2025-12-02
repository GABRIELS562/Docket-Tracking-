import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import type { ItemNumber } from '../value-objects/ItemNumber';
import type { RfidEpc } from '../value-objects/RfidEpc';
import type { ReferenceId } from '../value-objects/ReferenceId';

/**
 * Item status enumeration
 *
 * Generic status values applicable to any inventory tracking system
 */
export enum ItemStatus {
  /** Item is registered and actively being tracked */
  REGISTERED = 'registered',

  /** Item is currently in transit between zones */
  IN_TRANSIT = 'in_transit',

  /** Item is currently being processed/examined */
  IN_PROCESSING = 'in_processing',

  /** Item has been archived for long-term storage */
  ARCHIVED = 'archived',

  /** Item has been disposed of or removed from inventory */
  DISPOSED = 'disposed',

  /** Item hasn't been seen for an extended period */
  MISSING = 'missing',
}

/**
 * Item category enumeration
 *
 * Generic categories applicable to any inventory tracking system.
 * Tenants can extend with custom categories via metadata.
 */
export enum ItemCategory {
  EQUIPMENT = 'equipment',
  CONSUMABLE = 'consumable',
  ELECTRONIC = 'electronic',
  DOCUMENT = 'document',
  MATERIAL = 'material',
  TOOL = 'tool',
  APPAREL = 'apparel',
  CONTAINER = 'container',
  SAMPLE = 'sample',
  OTHER = 'other',
}

/**
 * Properties for creating or reconstituting an Item
 */
export interface ItemProps {
  readonly id: string;
  readonly itemNumber: ItemNumber;
  readonly rfidEpc: RfidEpc;
  readonly referenceId: ReferenceId;
  readonly serialNumber?: string;
  readonly description: string;
  readonly category: ItemCategory;
  readonly currentZoneId: string | null;
  readonly lastSeenAt: Date | null;
  readonly lastSeenReaderId: string | null;
  readonly locationConfidence: number | null;
  readonly status: ItemStatus;
  readonly isActive: boolean;
  readonly receivedBy?: string;
  readonly receivedAt?: Date;
  readonly handledBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Item Entity - Core Aggregate Root
 *
 * @description
 * Represents a trackable item in the inventory system.
 * An item is the central entity in the tracking system, containing
 * all business rules for location tracking, status transitions, and
 * chain of custody management.
 *
 * Business Rules:
 * - An item must have a unique item number and RFID EPC
 * - Status transitions must follow valid state machine rules
 * - Archived items cannot be moved or modified
 * - Missing status is automatically determined by time since last seen
 * - Location confidence must be between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const result = Item.create({
 *   itemNumber,
 *   rfidEpc,
 *   referenceId,
 *   description: 'Laptop Computer',
 *   category: ItemCategory.ELECTRONIC
 * });
 * ```
 */
export class Item {
  private constructor(private props: ItemProps) {}

  /**
   * Creates a new Item entity
   *
   * @param params - Item creation parameters
   * @returns Result containing Item or Error
   */
  static create(params: {
    id: string;
    itemNumber: ItemNumber;
    rfidEpc: RfidEpc;
    referenceId: ReferenceId;
    serialNumber?: string;
    description: string;
    category: ItemCategory;
    receivedBy?: string;
    metadata?: Record<string, unknown>;
  }): Result<Item, Error> {

    // Validate description
    if (params.description.trim().length === 0) {
      return err(new Error('Description cannot be empty'));
    }

    // Validate ID
    if (params.id.trim().length === 0) {
      return err(new Error('ID cannot be empty'));
    }

    const now = new Date();

    const item = new Item({
      id: params.id,
      itemNumber: params.itemNumber,
      rfidEpc: params.rfidEpc,
      referenceId: params.referenceId,
      serialNumber: params.serialNumber?.trim(),
      description: params.description.trim(),
      category: params.category,
      currentZoneId: null,
      lastSeenAt: null,
      lastSeenReaderId: null,
      locationConfidence: null,
      status: ItemStatus.REGISTERED,
      isActive: true,
      receivedBy: params.receivedBy,
      receivedAt: params.receivedBy ? now : undefined,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata ?? {},
    });

    return ok(item);
  }

  /**
   * Reconstitutes an Item from persistence
   *
   * @param props - Complete item properties from database
   * @returns Item instance
   */
  static fromPersistence(props: ItemProps): Item {
    return new Item(props);
  }

  /**
   * Alias for fromPersistence - reconstitutes an Item from stored properties
   *
   * @param props - Complete item properties
   * @returns Item instance
   */
  static reconstitute(props: ItemProps): Item {
    return new Item(props);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getId(): string {
    return this.props.id;
  }

  getItemNumber(): ItemNumber {
    return this.props.itemNumber;
  }

  getRfidEpc(): RfidEpc {
    return this.props.rfidEpc;
  }

  getReferenceId(): ReferenceId {
    return this.props.referenceId;
  }

  getSerialNumber(): string | undefined {
    return this.props.serialNumber;
  }

  getDescription(): string {
    return this.props.description;
  }

  getCategory(): ItemCategory {
    return this.props.category;
  }

  getCurrentZoneId(): string | null {
    return this.props.currentZoneId;
  }

  getLastSeenAt(): Date | null {
    return this.props.lastSeenAt ? new Date(this.props.lastSeenAt) : null;
  }

  getLastSeenReaderId(): string | null {
    return this.props.lastSeenReaderId;
  }

  getLocationConfidence(): number | null {
    return this.props.locationConfidence;
  }

  getStatus(): ItemStatus {
    return this.props.status;
  }

  isActive(): boolean {
    return this.props.isActive;
  }

  getReceivedBy(): string | undefined {
    return this.props.receivedBy;
  }

  getReceivedAt(): Date | undefined {
    return this.props.receivedAt ? new Date(this.props.receivedAt) : undefined;
  }

  getHandledBy(): string | undefined {
    return this.props.handledBy;
  }

  getCreatedAt(): Date {
    return new Date(this.props.createdAt);
  }

  getUpdatedAt(): Date {
    return new Date(this.props.updatedAt);
  }

  getMetadata(): Record<string, unknown> {
    return { ...this.props.metadata };
  }

  // ============================================================================
  // Business Logic Methods
  // ============================================================================

  /**
   * Updates the item's current location
   *
   * Business Rules:
   * - Cannot update location of archived or disposed items
   * - If item was missing, automatically mark as registered
   * - Location confidence must be between 0.0 and 1.0
   *
   * @param zoneId - The new zone ID
   * @param readerId - The reader that detected the item
   * @param confidence - Location confidence (0.0 to 1.0)
   * @param timestamp - When the item was detected
   * @returns Result indicating success or failure
   */
  updateLocation(
    zoneId: string,
    readerId: string,
    confidence: number,
    timestamp: Date = new Date()
  ): Result<void, Error> {
    // Check if item is archived or disposed
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Cannot update location of archived item'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Cannot update location of disposed item'));
    }

    // Validate confidence
    if (confidence < 0 || confidence > 1) {
      return err(new Error('Location confidence must be between 0.0 and 1.0'));
    }

    // Validate zone ID
    if (zoneId.trim().length === 0) {
      return err(new Error('Zone ID cannot be empty'));
    }

    // Validate reader ID
    if (readerId.trim().length === 0) {
      return err(new Error('Reader ID cannot be empty'));
    }

    // Update location
    this.props.currentZoneId = zoneId;
    this.props.lastSeenAt = timestamp;
    this.props.lastSeenReaderId = readerId;
    this.props.locationConfidence = confidence;
    this.props.updatedAt = new Date();

    // If was missing, restore to registered status
    if (this.props.status === ItemStatus.MISSING) {
      this.props.status = ItemStatus.REGISTERED;
    }

    return ok(undefined);
  }

  /**
   * Marks the item as in transit
   *
   * @returns Result indicating success or failure
   */
  markInTransit(): Result<void, Error> {
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Cannot move archived item'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Cannot move disposed item'));
    }

    this.props.status = ItemStatus.IN_TRANSIT;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the item as in processing
   *
   * @param handledBy - Who is processing the item
   * @returns Result indicating success or failure
   */
  markInProcessing(handledBy?: string): Result<void, Error> {
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Cannot process archived item'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Cannot process disposed item'));
    }

    this.props.status = ItemStatus.IN_PROCESSING;
    this.props.handledBy = handledBy;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Archives the item
   *
   * Business Rule: Once archived, an item cannot be modified
   *
   * @returns Result indicating success or failure
   */
  archive(): Result<void, Error> {
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Item is already archived'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Cannot archive disposed item'));
    }

    this.props.status = ItemStatus.ARCHIVED;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the item as disposed
   *
   * Business Rule: Disposed items are permanently removed from active tracking
   *
   * @returns Result indicating success or failure
   */
  dispose(): Result<void, Error> {
    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Item is already disposed'));
    }

    this.props.status = ItemStatus.DISPOSED;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the item as missing
   *
   * Business Rule: Archived or disposed items cannot be missing
   *
   * @returns Result indicating success or failure
   */
  markAsMissing(): Result<void, Error> {
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Archived items cannot be marked as missing'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Disposed items cannot be marked as missing'));
    }

    this.props.status = ItemStatus.MISSING;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Updates the item's metadata
   *
   * @param metadata - New metadata to merge
   * @returns Result indicating success or failure
   */
  updateMetadata(metadata: Record<string, unknown>): Result<void, Error> {
    if (this.props.status === ItemStatus.ARCHIVED) {
      return err(new Error('Cannot update metadata of archived item'));
    }

    if (this.props.status === ItemStatus.DISPOSED) {
      return err(new Error('Cannot update metadata of disposed item'));
    }

    this.props.metadata = {
      ...this.props.metadata,
      ...metadata,
    };
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Checks if the item is missing based on time since last seen
   *
   * @param thresholdHours - Hours without detection before considered missing
   * @returns true if item should be marked missing
   */
  shouldBeMarkedMissing(thresholdHours: number = 48): boolean {
    // Not applicable for archived or disposed items
    if (
      this.props.status === ItemStatus.ARCHIVED ||
      this.props.status === ItemStatus.DISPOSED ||
      this.props.status === ItemStatus.MISSING
    ) {
      return false;
    }

    // Never seen - can't be missing yet
    if (!this.props.lastSeenAt) {
      return false;
    }

    const hoursSinceLastSeen =
      (Date.now() - this.props.lastSeenAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastSeen > thresholdHours;
  }

  /**
   * Returns the number of days since the item was last seen
   *
   * @returns Days since last seen, or null if never seen
   */
  getDaysSinceLastSeen(): number | null {
    if (!this.props.lastSeenAt) {
      return null;
    }

    const diff = Date.now() - this.props.lastSeenAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Returns the number of hours since the item was last seen
   *
   * @returns Hours since last seen, or null if never seen
   */
  getHoursSinceLastSeen(): number | null {
    if (!this.props.lastSeenAt) {
      return null;
    }

    const diff = Date.now() - this.props.lastSeenAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  }

  /**
   * Checks if the item is currently missing
   */
  isMissing(): boolean {
    return this.props.status === ItemStatus.MISSING;
  }

  /**
   * Checks if the item is archived
   */
  isArchived(): boolean {
    return this.props.status === ItemStatus.ARCHIVED;
  }

  /**
   * Checks if the item is disposed
   */
  isDisposed(): boolean {
    return this.props.status === ItemStatus.DISPOSED;
  }

  /**
   * Checks if the item is in processing
   */
  isInProcessing(): boolean {
    return this.props.status === ItemStatus.IN_PROCESSING;
  }

  /**
   * Checks if the item has a reliable location
   *
   * @param minimumConfidence - Minimum confidence threshold (default: 0.7)
   * @returns true if location confidence is above threshold
   */
  hasReliableLocation(minimumConfidence: number = 0.7): boolean {
    return (
      this.props.locationConfidence !== null && this.props.locationConfidence >= minimumConfidence
    );
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Returns properties for persistence
   */
  toPersistence(): ItemProps {
    return { ...this.props };
  }

  /**
   * Returns a plain object representation
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.props.id,
      itemNumber: this.props.itemNumber.getValue(),
      rfidEpc: this.props.rfidEpc.getValue(),
      referenceId: this.props.referenceId.getValue(),
      serialNumber: this.props.serialNumber,
      description: this.props.description,
      category: this.props.category,
      currentZoneId: this.props.currentZoneId,
      lastSeenAt: this.props.lastSeenAt,
      lastSeenReaderId: this.props.lastSeenReaderId,
      locationConfidence: this.props.locationConfidence,
      status: this.props.status,
      isActive: this.props.isActive,
      receivedBy: this.props.receivedBy,
      receivedAt: this.props.receivedAt,
      handledBy: this.props.handledBy,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
      metadata: this.props.metadata,
    };
  }
}
