import type { Result } from 'neverthrow';
import { ok, err } from 'neverthrow';

import type { LabNumber } from '../value-objects/LabNumber';
import type { RfidEpc } from '../value-objects/RfidEpc';
import type { CaseNumber } from '../value-objects/CaseNumber';

/**
 * Docket status enumeration
 */
export enum DocketStatus {
  /** Docket is registered and actively being tracked */
  REGISTERED = 'registered',

  /** Docket is currently in transit between zones */
  IN_TRANSIT = 'in_transit',

  /** Docket is currently being examined in a lab */
  IN_EXAMINATION = 'in_examination',

  /** Docket has been archived for long-term storage */
  ARCHIVED = 'archived',

  /** Docket has been disposed of */
  DISPOSED = 'disposed',

  /** Docket hasn't been seen for an extended period */
  MISSING = 'missing',
}

/**
 * Docket category enumeration
 */
export enum DocketCategory {
  FIREARM = 'firearm',
  DRUG = 'drug',
  DIGITAL = 'digital',
  BIOLOGICAL = 'biological',
  DOCUMENT = 'document',
  WEAPON = 'weapon',
  CLOTHING = 'clothing',
  OTHER = 'other',
}

/**
 * Properties for creating or reconstituting a Docket
 */
export interface DocketProps {
  readonly id: string;
  readonly labNumber: LabNumber;
  readonly rfidEpc: RfidEpc;
  readonly caseNumber: CaseNumber;
  readonly exhibitNumber?: string;
  readonly description: string;
  readonly category: DocketCategory;
  readonly currentZoneId: string | null;
  readonly lastSeenAt: Date | null;
  readonly lastSeenReaderId: string | null;
  readonly locationConfidence: number | null;
  readonly status: DocketStatus;
  readonly isActive: boolean;
  readonly receivedBy?: string;
  readonly receivedAt?: Date;
  readonly handledBy?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Docket Entity - Core Aggregate Root
 *
 * @description
 * Represents a physical evidence docket in the forensic laboratory.
 * A docket is the central entity in the tracking system, containing
 * all business rules for location tracking, status transitions, and
 * chain of custody management.
 *
 * Business Rules:
 * - A docket must have a unique lab number and RFID EPC
 * - Status transitions must follow valid state machine rules
 * - Archived dockets cannot be moved or modified
 * - Missing status is automatically determined by time since last seen
 * - Location confidence must be between 0.0 and 1.0
 *
 * @example
 * ```typescript
 * const result = Docket.create({
 *   labNumber,
 *   rfidEpc,
 *   caseNumber,
 *   description: '9mm Pistol',
 *   category: DocketCategory.FIREARM
 * });
 * ```
 */
export class Docket {
  private constructor(private props: DocketProps) {}

  /**
   * Creates a new Docket entity
   *
   * @param params - Docket creation parameters
   * @returns Result containing Docket or Error
   */
  static create(params: {
    id: string;
    labNumber: LabNumber;
    rfidEpc: RfidEpc;
    caseNumber: CaseNumber;
    exhibitNumber?: string;
    description: string;
    category: DocketCategory;
    receivedBy?: string;
    metadata?: Record<string, unknown>;
  }): Result<Docket, Error> {

    // Validate description
    if (params.description.trim().length === 0) {
      return err(new Error('Description cannot be empty'));
    }

    // Validate ID
    if (params.id.trim().length === 0) {
      return err(new Error('ID cannot be empty'));
    }

    const now = new Date();

    const docket = new Docket({
      id: params.id,
      labNumber: params.labNumber,
      rfidEpc: params.rfidEpc,
      caseNumber: params.caseNumber,
      exhibitNumber: params.exhibitNumber?.trim(),
      description: params.description.trim(),
      category: params.category,
      currentZoneId: null,
      lastSeenAt: null,
      lastSeenReaderId: null,
      locationConfidence: null,
      status: DocketStatus.REGISTERED,
      isActive: true,
      receivedBy: params.receivedBy,
      receivedAt: params.receivedBy ? now : undefined,
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata ?? {},
    });

    return ok(docket);
  }

  /**
   * Reconstitutes a Docket from persistence
   *
   * @param props - Complete docket properties from database
   * @returns Docket instance
   */
  static fromPersistence(props: DocketProps): Docket {
    return new Docket(props);
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getId(): string {
    return this.props.id;
  }

  getLabNumber(): LabNumber {
    return this.props.labNumber;
  }

  getRfidEpc(): RfidEpc {
    return this.props.rfidEpc;
  }

  getCaseNumber(): CaseNumber {
    return this.props.caseNumber;
  }

  getExhibitNumber(): string | undefined {
    return this.props.exhibitNumber;
  }

  getDescription(): string {
    return this.props.description;
  }

  getCategory(): DocketCategory {
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

  getStatus(): DocketStatus {
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
   * Updates the docket's current location
   *
   * Business Rules:
   * - Cannot update location of archived or disposed dockets
   * - If docket was missing, automatically mark as registered
   * - Location confidence must be between 0.0 and 1.0
   *
   * @param zoneId - The new zone ID
   * @param readerId - The reader that detected the docket
   * @param confidence - Location confidence (0.0 to 1.0)
   * @param timestamp - When the docket was detected
   * @returns Result indicating success or failure
   */
  updateLocation(
    zoneId: string,
    readerId: string,
    confidence: number,
    timestamp: Date = new Date()
  ): Result<void, Error> {
    // Check if docket is archived or disposed
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Cannot update location of archived docket'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Cannot update location of disposed docket'));
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
    if (this.props.status === DocketStatus.MISSING) {
      this.props.status = DocketStatus.REGISTERED;
    }

    return ok(undefined);
  }

  /**
   * Marks the docket as in transit
   *
   * @returns Result indicating success or failure
   */
  markInTransit(): Result<void, Error> {
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Cannot move archived docket'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Cannot move disposed docket'));
    }

    this.props.status = DocketStatus.IN_TRANSIT;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the docket as in examination
   *
   * @param handledBy - Who is examining the docket
   * @returns Result indicating success or failure
   */
  markInExamination(handledBy?: string): Result<void, Error> {
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Cannot examine archived docket'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Cannot examine disposed docket'));
    }

    this.props.status = DocketStatus.IN_EXAMINATION;
    this.props.handledBy = handledBy;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Archives the docket
   *
   * Business Rule: Once archived, a docket cannot be modified
   *
   * @returns Result indicating success or failure
   */
  archive(): Result<void, Error> {
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Docket is already archived'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Cannot archive disposed docket'));
    }

    this.props.status = DocketStatus.ARCHIVED;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the docket as disposed
   *
   * Business Rule: Disposed dockets are permanently removed from active tracking
   *
   * @returns Result indicating success or failure
   */
  dispose(): Result<void, Error> {
    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Docket is already disposed'));
    }

    this.props.status = DocketStatus.DISPOSED;
    this.props.isActive = false;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Marks the docket as missing
   *
   * Business Rule: Archived or disposed dockets cannot be missing
   *
   * @returns Result indicating success or failure
   */
  markAsMissing(): Result<void, Error> {
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Archived dockets cannot be marked as missing'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Disposed dockets cannot be marked as missing'));
    }

    this.props.status = DocketStatus.MISSING;
    this.props.updatedAt = new Date();
    return ok(undefined);
  }

  /**
   * Updates the docket's metadata
   *
   * @param metadata - New metadata to merge
   * @returns Result indicating success or failure
   */
  updateMetadata(metadata: Record<string, unknown>): Result<void, Error> {
    if (this.props.status === DocketStatus.ARCHIVED) {
      return err(new Error('Cannot update metadata of archived docket'));
    }

    if (this.props.status === DocketStatus.DISPOSED) {
      return err(new Error('Cannot update metadata of disposed docket'));
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
   * Checks if the docket is missing based on time since last seen
   *
   * @param thresholdHours - Hours without detection before considered missing
   * @returns true if docket should be marked missing
   */
  shouldBeMarkedMissing(thresholdHours: number = 48): boolean {
    // Not applicable for archived or disposed dockets
    if (
      this.props.status === DocketStatus.ARCHIVED ||
      this.props.status === DocketStatus.DISPOSED ||
      this.props.status === DocketStatus.MISSING
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
   * Returns the number of days since the docket was last seen
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
   * Returns the number of hours since the docket was last seen
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
   * Checks if the docket is currently missing
   */
  isMissing(): boolean {
    return this.props.status === DocketStatus.MISSING;
  }

  /**
   * Checks if the docket is archived
   */
  isArchived(): boolean {
    return this.props.status === DocketStatus.ARCHIVED;
  }

  /**
   * Checks if the docket is disposed
   */
  isDisposed(): boolean {
    return this.props.status === DocketStatus.DISPOSED;
  }

  /**
   * Checks if the docket is in examination
   */
  isInExamination(): boolean {
    return this.props.status === DocketStatus.IN_EXAMINATION;
  }

  /**
   * Checks if the docket has a reliable location
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
  toPersistence(): DocketProps {
    return { ...this.props };
  }

  /**
   * Returns a plain object representation
   */
  toObject(): Record<string, unknown> {
    return {
      id: this.props.id,
      labNumber: this.props.labNumber.getValue(),
      rfidEpc: this.props.rfidEpc.getValue(),
      caseNumber: this.props.caseNumber.getValue(),
      exhibitNumber: this.props.exhibitNumber,
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
