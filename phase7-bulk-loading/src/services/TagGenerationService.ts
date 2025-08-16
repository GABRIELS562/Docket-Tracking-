import { v4 as uuidv4 } from 'uuid';
import { 
  TagMapping, 
  TagGenerationResult, 
  GeneratedTag, 
  DocketRecord 
} from '@/types';
import { Logger } from '@/utils/Logger';
import { DatabaseService } from '@/services/DatabaseService';

export class TagGenerationService {
  private logger: Logger;
  private dbService: DatabaseService;

  constructor() {
    this.logger = new Logger('TagGenerationService');
    this.dbService = new DatabaseService();
  }

  async generateTagsForDockets(
    dockets: DocketRecord[],
    tagPrefix: string = 'EVID',
    tagType: string = 'UHF'
  ): Promise<TagGenerationResult> {
    const startTime = Date.now();
    this.logger.info(`Generating ${dockets.length} RFID tags with prefix ${tagPrefix}`);

    try {
      const batchId = uuidv4();
      const tags: GeneratedTag[] = [];
      const existingTags = await this.getExistingTags();
      
      let tagCounter = await this.getNextTagCounter(tagPrefix);
      
      for (const docket of dockets) {
        let tagId: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          tagId = this.generateTagId(tagPrefix, tagCounter++);
          attempts++;
          
          if (attempts > maxAttempts) {
            throw new Error(`Failed to generate unique tag for docket ${docket.docket_number} after ${maxAttempts} attempts`);
          }
        } while (existingTags.has(tagId));

        const tag: GeneratedTag = {
          tag_id: tagId,
          tag_type: tagType,
          docket_number: docket.docket_number,
          status: 'reserved',
          generated_at: new Date(),
          batch_id: batchId
        };

        tags.push(tag);
        existingTags.add(tagId);
      }

      await this.saveGeneratedTags(tags);
      await this.updateTagCounter(tagPrefix, tagCounter);

      const processingTime = Date.now() - startTime;

      const result: TagGenerationResult = {
        generated_count: tags.length,
        tag_prefix: tagPrefix,
        tag_range_start: tags[0]?.tag_id || '',
        tag_range_end: tags[tags.length - 1]?.tag_id || '',
        generation_time_ms: processingTime,
        tags
      };

      this.logger.info(`Generated ${tags.length} tags in ${processingTime}ms`);
      return result;

    } catch (error) {
      this.logger.error('Error generating RFID tags:', error);
      throw error;
    }
  }

  async generateBulkTags(
    count: number,
    tagPrefix: string = 'BULK',
    tagType: string = 'UHF'
  ): Promise<TagGenerationResult> {
    const startTime = Date.now();
    this.logger.info(`Generating ${count} bulk RFID tags with prefix ${tagPrefix}`);

    try {
      const batchId = uuidv4();
      const tags: GeneratedTag[] = [];
      const existingTags = await this.getExistingTags();
      
      let tagCounter = await this.getNextTagCounter(tagPrefix);
      
      for (let i = 0; i < count; i++) {
        let tagId: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          tagId = this.generateTagId(tagPrefix, tagCounter++);
          attempts++;
          
          if (attempts > maxAttempts) {
            throw new Error(`Failed to generate unique tag ${i + 1} after ${maxAttempts} attempts`);
          }
        } while (existingTags.has(tagId));

        const tag: GeneratedTag = {
          tag_id: tagId,
          tag_type: tagType,
          status: 'available',
          generated_at: new Date(),
          batch_id: batchId
        };

        tags.push(tag);
        existingTags.add(tagId);

        if ((i + 1) % 10000 === 0) {
          this.logger.info(`Generated ${i + 1}/${count} tags...`);
        }
      }

      await this.saveGeneratedTags(tags);
      await this.updateTagCounter(tagPrefix, tagCounter);

      const processingTime = Date.now() - startTime;

      const result: TagGenerationResult = {
        generated_count: tags.length,
        tag_prefix: tagPrefix,
        tag_range_start: tags[0]?.tag_id || '',
        tag_range_end: tags[tags.length - 1]?.tag_id || '',
        generation_time_ms: processingTime,
        tags
      };

      this.logger.info(`Generated ${tags.length} bulk tags in ${processingTime}ms`);
      return result;

    } catch (error) {
      this.logger.error('Error generating bulk RFID tags:', error);
      throw error;
    }
  }

  private generateTagId(prefix: string, counter: number): string {
    const paddedCounter = counter.toString().padStart(8, '0');
    const checksum = this.calculateChecksum(`${prefix}${paddedCounter}`);
    return `${prefix}${paddedCounter}${checksum}`;
  }

  private calculateChecksum(input: string): string {
    let sum = 0;
    for (let i = 0; i < input.length; i++) {
      sum += input.charCodeAt(i);
    }
    return (sum % 100).toString().padStart(2, '0');
  }

  async createTagMappings(
    dockets: DocketRecord[],
    tags: GeneratedTag[]
  ): Promise<TagMapping[]> {
    if (dockets.length !== tags.length) {
      throw new Error(`Mismatch: ${dockets.length} dockets but ${tags.length} tags`);
    }

    const mappings: TagMapping[] = [];

    for (let i = 0; i < dockets.length; i++) {
      const mapping: TagMapping = {
        docket_number: dockets[i].docket_number,
        rfid_tag_id: tags[i].tag_id,
        tag_type: tags[i].tag_type,
        assigned_date: new Date(),
        status: 'assigned'
      };

      mappings.push(mapping);
    }

    await this.saveTagMappings(mappings);
    this.logger.info(`Created ${mappings.length} tag mappings`);

    return mappings;
  }

  async assignTagToDocket(docketNumber: string, tagId?: string): Promise<TagMapping> {
    try {
      let selectedTag: GeneratedTag;

      if (tagId) {
        selectedTag = await this.getTagById(tagId);
        if (!selectedTag) {
          throw new Error(`Tag ${tagId} not found`);
        }
        if (selectedTag.status !== 'available') {
          throw new Error(`Tag ${tagId} is not available (status: ${selectedTag.status})`);
        }
      } else {
        selectedTag = await this.getNextAvailableTag();
        if (!selectedTag) {
          throw new Error('No available tags found');
        }
      }

      const mapping: TagMapping = {
        docket_number: docketNumber,
        rfid_tag_id: selectedTag.tag_id,
        tag_type: selectedTag.tag_type,
        assigned_date: new Date(),
        status: 'assigned'
      };

      await this.updateTagStatus(selectedTag.tag_id, 'assigned', docketNumber);
      await this.saveTagMapping(mapping);

      this.logger.info(`Assigned tag ${selectedTag.tag_id} to docket ${docketNumber}`);
      return mapping;

    } catch (error) {
      this.logger.error(`Error assigning tag to docket ${docketNumber}:`, error);
      throw error;
    }
  }

  async releaseTagFromDocket(docketNumber: string): Promise<void> {
    try {
      const mapping = await this.getTagMappingByDocket(docketNumber);
      if (!mapping) {
        throw new Error(`No tag mapping found for docket ${docketNumber}`);
      }

      await this.updateTagStatus(mapping.rfid_tag_id, 'available');
      await this.updateTagMappingStatus(mapping.rfid_tag_id, 'available');

      this.logger.info(`Released tag ${mapping.rfid_tag_id} from docket ${docketNumber}`);

    } catch (error) {
      this.logger.error(`Error releasing tag from docket ${docketNumber}:`, error);
      throw error;
    }
  }

  async getTagStatistics(): Promise<{
    total_tags: number;
    available_tags: number;
    assigned_tags: number;
    damaged_tags: number;
    lost_tags: number;
    utilization_percentage: number;
  }> {
    try {
      const stats = await this.dbService.query(`
        SELECT 
          COUNT(*) as total_tags,
          COUNT(CASE WHEN status = 'available' THEN 1 END) as available_tags,
          COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned_tags,
          COUNT(CASE WHEN status = 'damaged' THEN 1 END) as damaged_tags,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_tags
        FROM generated_tags
      `);

      const row = stats.rows[0];
      const total = parseInt(row.total_tags);
      const assigned = parseInt(row.assigned_tags);

      return {
        total_tags: total,
        available_tags: parseInt(row.available_tags),
        assigned_tags: assigned,
        damaged_tags: parseInt(row.damaged_tags),
        lost_tags: parseInt(row.lost_tags),
        utilization_percentage: total > 0 ? Math.round((assigned / total) * 100) : 0
      };

    } catch (error) {
      this.logger.error('Error getting tag statistics:', error);
      throw error;
    }
  }

  async validateTagFormat(tagId: string): Promise<boolean> {
    const tagPattern = /^[A-Z]{3,6}\d{8}\d{2}$/;
    return tagPattern.test(tagId);
  }

  async checkTagAvailability(tagId: string): Promise<boolean> {
    try {
      const result = await this.dbService.query(
        'SELECT status FROM generated_tags WHERE tag_id = $1',
        [tagId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].status === 'available';

    } catch (error) {
      this.logger.error(`Error checking tag availability for ${tagId}:`, error);
      return false;
    }
  }

  private async getExistingTags(): Promise<Set<string>> {
    try {
      const result = await this.dbService.query('SELECT tag_id FROM generated_tags');
      return new Set(result.rows.map(row => row.tag_id));
    } catch (error) {
      this.logger.error('Error fetching existing tags:', error);
      return new Set();
    }
  }

  private async getNextTagCounter(prefix: string): Promise<number> {
    try {
      const result = await this.dbService.query(
        'SELECT next_counter FROM tag_counters WHERE prefix = $1',
        [prefix]
      );

      if (result.rows.length === 0) {
        await this.dbService.query(
          'INSERT INTO tag_counters (prefix, next_counter) VALUES ($1, $2)',
          [prefix, 1]
        );
        return 1;
      }

      return result.rows[0].next_counter;

    } catch (error) {
      this.logger.error(`Error getting tag counter for prefix ${prefix}:`, error);
      return 1;
    }
  }

  private async updateTagCounter(prefix: string, counter: number): Promise<void> {
    try {
      await this.dbService.query(
        'UPDATE tag_counters SET next_counter = $1 WHERE prefix = $2',
        [counter, prefix]
      );
    } catch (error) {
      this.logger.error(`Error updating tag counter for prefix ${prefix}:`, error);
    }
  }

  private async saveGeneratedTags(tags: GeneratedTag[]): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < tags.length; i += batchSize) {
      const batch = tags.slice(i, i + batchSize);
      
      const values: any[] = [];
      const placeholders: string[] = [];
      
      batch.forEach((tag, index) => {
        const baseIndex = index * 6;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6})`);
        values.push(
          tag.tag_id,
          tag.tag_type,
          tag.docket_number || null,
          tag.status,
          tag.generated_at,
          tag.batch_id
        );
      });

      const query = `
        INSERT INTO generated_tags (tag_id, tag_type, docket_number, status, generated_at, batch_id)
        VALUES ${placeholders.join(', ')}
      `;

      await this.dbService.query(query, values);
    }
  }

  private async saveTagMappings(mappings: TagMapping[]): Promise<void> {
    const batchSize = 1000;
    
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      
      const values: any[] = [];
      const placeholders: string[] = [];
      
      batch.forEach((mapping, index) => {
        const baseIndex = index * 5;
        placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`);
        values.push(
          mapping.docket_number,
          mapping.rfid_tag_id,
          mapping.tag_type,
          mapping.assigned_date,
          mapping.status
        );
      });

      const query = `
        INSERT INTO tag_mappings (docket_number, rfid_tag_id, tag_type, assigned_date, status)
        VALUES ${placeholders.join(', ')}
      `;

      await this.dbService.query(query, values);
    }
  }

  private async saveTagMapping(mapping: TagMapping): Promise<void> {
    await this.dbService.query(
      `INSERT INTO tag_mappings (docket_number, rfid_tag_id, tag_type, assigned_date, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [mapping.docket_number, mapping.rfid_tag_id, mapping.tag_type, mapping.assigned_date, mapping.status]
    );
  }

  private async getTagById(tagId: string): Promise<GeneratedTag | null> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM generated_tags WHERE tag_id = $1',
        [tagId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as GeneratedTag;

    } catch (error) {
      this.logger.error(`Error fetching tag ${tagId}:`, error);
      return null;
    }
  }

  private async getNextAvailableTag(): Promise<GeneratedTag | null> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM generated_tags WHERE status = $1 ORDER BY generated_at LIMIT 1',
        ['available']
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as GeneratedTag;

    } catch (error) {
      this.logger.error('Error fetching next available tag:', error);
      return null;
    }
  }

  private async updateTagStatus(tagId: string, status: string, docketNumber?: string): Promise<void> {
    await this.dbService.query(
      'UPDATE generated_tags SET status = $1, docket_number = $2 WHERE tag_id = $3',
      [status, docketNumber || null, tagId]
    );
  }

  private async getTagMappingByDocket(docketNumber: string): Promise<TagMapping | null> {
    try {
      const result = await this.dbService.query(
        'SELECT * FROM tag_mappings WHERE docket_number = $1 AND status = $2',
        [docketNumber, 'assigned']
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as TagMapping;

    } catch (error) {
      this.logger.error(`Error fetching tag mapping for docket ${docketNumber}:`, error);
      return null;
    }
  }

  private async updateTagMappingStatus(tagId: string, status: string): Promise<void> {
    await this.dbService.query(
      'UPDATE tag_mappings SET status = $1 WHERE rfid_tag_id = $2',
      [status, tagId]
    );
  }
}