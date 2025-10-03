import { injectable, inject } from 'tsyringe';
import { Result, ok, err } from 'neverthrow';

import type { Docket, DocketCategory } from '../../../domain/entities/Docket';
import { LabNumber } from '../../../domain/value-objects/LabNumber';
import { RfidEpc } from '../../../domain/value-objects/RfidEpc';
import type { IDocketRepository } from '../../../domain/repositories/IDocketRepository';
import type { IEventBus } from '../../interfaces/IEventBus';
import type { ILogger } from '../../interfaces/ILogger';
import type { DocketDTO } from '../../dto/DocketDTO';
import { DocketMapper } from '../../mappers/DocketMapper';
import { DocketRegisteredEvent } from '../../../domain/events/DocketRegisteredEvent';

/**
 * Input for registering a new docket
 */
export interface RegisterDocketInput {
  /**
   * Forensic lab number (e.g., "FSL-2025-000123")
   */
  readonly labNumber: string;

  /**
   * Case reference number
   */
  readonly caseNumber: string;

  /**
   * Optional exhibit number
   */
  readonly exhibitNumber?: string;

  /**
   * Description of the evidence
   */
  readonly description: string;

  /**
   * Evidence category
   */
  readonly category: DocketCategory;

  /**
   * RFID EPC tag value (24 hex characters)
   */
  readonly rfidEpc: string;

  /**
   * Who received this evidence
   */
  readonly receivedBy?: string;

  /**
   * Additional metadata
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Use Case: Register Docket
 *
 * @description
 * Registers a new evidence docket in the RFID tracking system.
 *
 * Business Flow:
 * 1. Validate input (lab number format, EPC format)
 * 2. Check if lab number already exists (prevent duplicates)
 * 3. Check if EPC already assigned (prevent duplicates)
 * 4. Create Docket entity with business rules
 * 5. Save to repository
 * 6. Emit DocketRegisteredEvent
 * 7. Return DTO
 *
 * Used when: Forensic technician scans QR code on evidence bag
 * and assigns an RFID tag to it.
 *
 * @example
 * ```typescript
 * const useCase = container.resolve(RegisterDocketUseCase);
 *
 * const result = await useCase.execute({
 *   labNumber: 'FSL-2025-000123',
 *   caseNumber: 'CAS-2025-0456',
 *   description: '9mm Pistol',
 *   category: DocketCategory.FIREARM,
 *   rfidEpc: 'E28011606000204DECA48DA',
 *   receivedBy: 'Officer Smith'
 * });
 *
 * if (result.isOk()) {
 *   const docket = result.value;
 *   console.log(`Docket registered: ${docket.labNumber}`);
 * }
 * ```
 */
@injectable()
export class RegisterDocketUseCase {
  constructor(
    @inject('IDocketRepository') private readonly docketRepo: IDocketRepository,
    @inject('IEventBus') private readonly eventBus: IEventBus,
    @inject('ILogger') private readonly logger: ILogger
  ) {}

  async execute(input: RegisterDocketInput): Promise<Result<DocketDTO, Error>> {
    // Step 1: Create value objects (validates format)
    const labNumberResult = LabNumber.create(input.labNumber);
    if (labNumberResult.isErr()) {
      this.logger.warn('Invalid lab number format', { labNumber: input.labNumber });
      return err(labNumberResult.error);
    }
    const labNumber = labNumberResult.value;

    const epcResult = RfidEpc.create(input.rfidEpc);
    if (epcResult.isErr()) {
      this.logger.warn('Invalid EPC format', { epc: input.rfidEpc });
      return err(epcResult.error);
    }
    const epc = epcResult.value;

    // Step 2: Check if lab number already exists
    const labNumberExistsResult = await this.docketRepo.existsByLabNumber(labNumber);
    if (labNumberExistsResult.isErr()) {
      return err(labNumberExistsResult.error);
    }
    if (labNumberExistsResult.value) {
      const error = new Error(`Lab number ${labNumber.getValue()} already exists`);
      this.logger.warn('Duplicate lab number attempted', {
        labNumber: labNumber.getValue(),
      });
      return err(error);
    }

    // Step 3: Check if EPC already exists
    const epcExistsResult = await this.docketRepo.existsByEpc(epc);
    if (epcExistsResult.isErr()) {
      return err(epcExistsResult.error);
    }
    if (epcExistsResult.value) {
      const error = new Error(`EPC ${epc.getValue()} is already assigned`);
      this.logger.warn('Duplicate EPC attempted', { epc: epc.getValue() });
      return err(error);
    }

    // Step 4: Create Docket entity
    const docketResult = Docket.create({
      id: this.generateDocketId(),
      labNumber,
      caseNumber: input.caseNumber,
      exhibitNumber: input.exhibitNumber,
      description: input.description,
      category: input.category,
      rfidEpc: epc,
      receivedBy: input.receivedBy,
      metadata: input.metadata,
    });

    if (docketResult.isErr()) {
      this.logger.error('Failed to create docket entity', {
        error: docketResult.error.message,
      });
      return err(docketResult.error);
    }
    const docket = docketResult.value;

    // Step 5: Save to repository
    const saveResult = await this.docketRepo.save(docket);
    if (saveResult.isErr()) {
      this.logger.error('Failed to save docket', {
        labNumber: labNumber.getValue(),
        error: saveResult.error.message,
      });
      return err(saveResult.error);
    }

    // Step 6: Emit domain event
    const event = new DocketRegisteredEvent(
      docket.getId(),
      labNumber.getValue(),
      epc.getValue(),
      input.caseNumber,
      input.category,
      input.receivedBy
    );
    await this.eventBus.publish(event);

    this.logger.info('Docket registered successfully', {
      docketId: docket.getId(),
      labNumber: labNumber.getValue(),
      epc: epc.getValue(),
    });

    // Step 7: Return DTO
    const dto = DocketMapper.toDTO(docket);
    return ok(dto);
  }

  /**
   * Generates a unique docket ID
   * Format: docket-{timestamp}-{random}
   */
  private generateDocketId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `docket-${timestamp}-${random}`;
  }
}
