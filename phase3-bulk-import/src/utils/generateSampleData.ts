import fs from 'fs';
import path from 'path';

interface GeneratorOptions {
  count: number;
  outputFile: string;
  includeErrors?: boolean;
  errorRate?: number;
}

class SampleDataGenerator {
  private objectTypes = ['docket', 'evidence', 'equipment', 'file', 'document'];
  private categories = ['legal', 'forensic', 'technical', 'administrative', 'classified'];
  private priorities = ['low', 'normal', 'high', 'critical'];
  private statuses = ['active', 'inactive', 'archived'];
  private locations = ['STOR-001', 'STOR-002', 'LAB-001', 'LAB-002', 'ARCH-001'];
  private employees = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005'];

  generateCSV(options: GeneratorOptions): void {
    const { count, outputFile, includeErrors = false, errorRate = 0.01 } = options;
    
    console.log(`Generating ${count} records...`);
    
    const headers = [
      'object_code',
      'name',
      'description',
      'object_type',
      'category',
      'priority_level',
      'status',
      'rfid_tag_id',
      'location',
      'assigned_to'
    ];
    
    const outputPath = path.join(__dirname, '../../test-data', outputFile);
    const dir = path.dirname(outputPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const writeStream = fs.createWriteStream(outputPath);
    writeStream.write(headers.join(',') + '\n');
    
    const batchSize = 10000;
    let written = 0;
    
    while (written < count) {
      const batchCount = Math.min(batchSize, count - written);
      const batch: string[] = [];
      
      for (let i = 0; i < batchCount; i++) {
        const recordNum = written + i + 1;
        const record = this.generateRecord(recordNum, includeErrors, errorRate);
        batch.push(record);
      }
      
      writeStream.write(batch.join('\n') + '\n');
      written += batchCount;
      
      if (written % 10000 === 0) {
        console.log(`Generated ${written} / ${count} records`);
      }
    }
    
    writeStream.end();
    console.log(`✅ Generated ${count} records to ${outputFile}`);
  }

  private generateRecord(index: number, includeErrors: boolean, errorRate: number): string {
    const shouldIncludeError = includeErrors && Math.random() < errorRate;
    
    let objectCode = `DOC-2025-${String(index).padStart(6, '0')}`;
    let name = `Document ${index}`;
    let rfidTag = `RFID-${String(index).padStart(8, '0')}`;
    
    if (shouldIncludeError) {
      const errorType = Math.floor(Math.random() * 4);
      switch (errorType) {
        case 0:
          objectCode = '';
          break;
        case 1:
          name = '';
          break;
        case 2:
          rfidTag = '';
          break;
        case 3:
          rfidTag = `RFID-${String(Math.floor(index / 2)).padStart(8, '0')}`;
          break;
      }
    }
    
    const description = `Description for ${name}`;
    const objectType = this.randomChoice(this.objectTypes);
    const category = this.randomChoice(this.categories);
    const priority = this.randomChoice(this.priorities);
    const status = this.randomChoice(this.statuses);
    const location = this.randomChoice(this.locations);
    const assignedTo = Math.random() > 0.3 ? this.randomChoice(this.employees) : '';
    
    const fields = [
      this.escapeCSV(objectCode),
      this.escapeCSV(name),
      this.escapeCSV(description),
      objectType,
      category,
      priority,
      status,
      rfidTag,
      location,
      assignedTo
    ];
    
    return fields.join(',');
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  generateExcel(_options: GeneratorOptions): void {
    console.log('Excel generation not implemented in this version');
    console.log('Use CSV format for testing');
  }
}

if (require.main === module) {
  const generator = new SampleDataGenerator();
  
  generator.generateCSV({
    count: 1000,
    outputFile: 'sample-1k.csv',
    includeErrors: false
  });
  
  generator.generateCSV({
    count: 10000,
    outputFile: 'sample-10k.csv',
    includeErrors: true,
    errorRate: 0.005
  });
  
  generator.generateCSV({
    count: 100000,
    outputFile: 'sample-100k.csv',
    includeErrors: true,
    errorRate: 0.001
  });
  
  console.log('\n📊 Sample files generated in test-data directory:');
  console.log('  - sample-1k.csv (1,000 clean records)');
  console.log('  - sample-10k.csv (10,000 records with 0.5% errors)');
  console.log('  - sample-100k.csv (100,000 records with 0.1% errors)');
}

export default SampleDataGenerator;