# RFID & QR Code Integration - Implementation Summary

## Overview

This document summarizes the implementation of lab number format updates, CAS number support, and QR code scanning integration for the SAPS RFID Evidence Tracking Platform.

## What Was Implemented

### 1. Updated Data Model (Backend)

#### **Lab Number Format Change**
- **Old Format:** `FSL-YYYY-NNNNNN` (e.g., `FSL-2025-000123`)
- **New Format:** `NNNNNN/YY` (e.g., `12345/25`)
- **Location:** `saps-rfid-platform/src/domain/value-objects/LabNumber.ts`

**Features:**
- Validates format: 1-6 digits, slash, 2-digit year
- Extracts year (returns 4-digit: 2025)
- Extracts sequence number (12345)
- Immutable value object with validation

#### **New CAS Number Support**
- **Format:** `DD/NN/YY` (e.g., `25/34/25`)
  - `DD` = Day of month (1-31)
  - `NN` = Case sequence number (1-999)
  - `YY` = 2-digit year (20-99)
- **Location:** `saps-rfid-platform/src/domain/value-objects/CaseNumber.ts`

**Features:**
- Validates all components
- Extracts day, case sequence, and year
- Provides both 2-digit and 4-digit year accessors

#### **Updated Docket Entity**
- **Location:** `saps-rfid-platform/src/domain/entities/Docket.ts`
- Changed `caseNumber` from `string` to `CaseNumber` value object
- All business logic updated to handle new types

#### **Updated Infrastructure Layer**
- **DTOs:** Updated validation schemas in `src/presentation/http/schemas/docket.schema.ts`
- **Mappers:** Updated `DocketMapper.ts` to convert between domain and DTO
- **Repository:** Updated `PostgresDocketRepository.ts` to persist value objects

### 2. QR Code Scanning (Frontend)

#### **QRScanner Component**
- **Location:** `src/components/QRScanner.tsx`
- **Library:** `html5-qrcode` (installed via npm)

**Features:**
- Uses device camera to scan QR codes
- Extracts lab number and CAS number from QR code
- Supports multiple QR code formats:
  - JSON: `{"labNumber": "12345/25", "caseNumber": "25/34/25"}`
  - Pipe-separated: `12345/25|25/34/25`
  - Comma-separated: `12345/25,25/34/25`
- Error handling for camera access issues
- Visual feedback during scanning

#### **DocketRegistration Component**
- **Location:** `src/components/DocketRegistration.tsx`
- Single docket registration form with QR code scanning

**Features:**
- Scan QR code button to extract lab + CAS numbers
- Manual entry fallback for all fields
- Form validation
- RFID tag EPC input (24 hex characters)
- Description and category selection
- Optional exhibit number and received by fields
- Success/error messaging
- Automatic form reset on successful registration

### 3. Bulk Import Feature (Frontend)

#### **BulkDocketImport Component**
- **Location:** `src/components/BulkDocketImport.tsx`
- Batch registration of multiple dockets

**Features:**
- Two-panel interface:
  - **Left Panel:** Add new entries (QR scan + manual fields)
  - **Right Panel:** Batch queue with status tracking
- QR code scanning for each docket
- Add multiple dockets to queue before processing
- Batch processing with status tracking:
  - Pending (waiting to process)
  - Processing (currently being registered)
  - Success (registered successfully)
  - Error (failed with error message)
- Remove items from queue before processing
- Clear completed items after batch processing
- Real-time progress updates
- Success/failure statistics

### 4. Database Migration

#### **Schema Update**
- **Location:** `saps-rfid-platform/src/infrastructure/database/migrations/007_update_docket_schema_for_new_formats.sql`

**Changes:**
- Updated `lab_number` constraint to accept `NNNNNN/YY` format
- Added `case_number` column with `DD/NN/YY` validation
- Created indexes for faster lookups
- Full-text search on case_number
- Combined search index on lab_number + case_number

#### **Migration Guide**
- **Location:** `saps-rfid-platform/DATABASE_MIGRATION_GUIDE.md`
- Step-by-step instructions for migrating existing data
- Rollback procedures
- Data conversion scripts
- Verification queries

## Usage Guide

### Workflow: Scanning QR Codes to Register RFID Tags

1. **Physical Docket Arrives:**
   - Docket has existing sticker with QR code
   - QR code contains: Lab Number (`12345/25`) + CAS Number (`25/34/25`)

2. **Register in System:**
   - Open Registration Form or Bulk Import
   - Click "Scan QR Code" button
   - Point camera at QR code sticker
   - Lab Number and CAS Number auto-populate

3. **Add RFID Tag:**
   - Manually enter or scan RFID Tag EPC (24 hex characters)
   - Fill in description, category, and optional fields
   - Click "Register Docket" (single) or "Add to Batch" (bulk)

4. **Track with RFID:**
   - RFID tag is now associated with lab number and CAS number
   - RFID readers detect tag movement
   - System tracks docket location in real-time

### QR Code Format Recommendations

**For Physical Stickers:**
Generate QR codes using JSON format for best compatibility:

```json
{
  "labNumber": "12345/25",
  "caseNumber": "25/34/25"
}
```

**Alternative Formats:**
- Pipe: `12345/25|25/34/25`
- Comma: `12345/25,25/34/25`

### API Endpoints

**Register Single Docket:**
```http
POST /api/dockets
Content-Type: application/json

{
  "labNumber": "12345/25",
  "caseNumber": "25/34/25",
  "rfidEpc": "E280116060000020961A6B7C",
  "description": "9mm Pistol",
  "category": "firearm",
  "exhibitNumber": "EX-001",
  "receivedBy": "Officer Smith"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "docket-uuid-here",
    "labNumber": "12345/25",
    "caseNumber": "25/34/25",
    "rfidEpc": "E280116060000020961A6B7C",
    "status": "registered",
    "createdAt": "2025-10-06T12:00:00Z"
  }
}
```

## File Structure

```
saps-rfid-platform/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   └── Docket.ts                    # Updated: CaseNumber integration
│   │   ├── value-objects/
│   │   │   ├── LabNumber.ts                 # Updated: New format
│   │   │   └── CaseNumber.ts                # New: CAS number value object
│   │   └── errors/
│   │       └── InvalidCaseNumberError.ts    # New: CAS validation errors
│   ├── application/
│   │   └── mappers/
│   │       └── DocketMapper.ts              # Updated: CaseNumber mapping
│   ├── infrastructure/
│   │   └── database/
│   │       ├── repositories/
│   │       │   └── PostgresDocketRepository.ts  # Updated: Persistence
│   │       └── migrations/
│   │           └── 007_update_docket_schema_for_new_formats.sql  # New migration
│   └── presentation/
│       └── http/
│           └── schemas/
│               └── docket.schema.ts         # Updated: Validation schemas
│
├── src/  (Frontend)
│   └── components/
│       ├── QRScanner.tsx                    # New: QR code scanning
│       ├── DocketRegistration.tsx           # New: Single registration
│       └── BulkDocketImport.tsx             # New: Bulk import
│
├── DATABASE_MIGRATION_GUIDE.md              # New: Migration instructions
└── RFID_QR_INTEGRATION_README.md            # This file
```

## Installation

### Backend Dependencies
All backend dependencies are already included in the project.

### Frontend Dependencies
```bash
npm install html5-qrcode
```

## Testing

### 1. Test Value Objects
```bash
# Run unit tests
npm test

# Test specific file
npm test LabNumber.test.ts
```

### 2. Test QR Scanning
1. Generate a test QR code with: `{"labNumber": "12345/25", "caseNumber": "25/34/25"}`
2. Open the registration form
3. Click "Scan QR Code"
4. Scan the test QR code
5. Verify fields auto-populate

### 3. Test Database Migration
```bash
# Run migration in test database
psql -U test_user -d test_db -f saps-rfid-platform/src/infrastructure/database/migrations/007_update_docket_schema_for_new_formats.sql

# Verify constraints
psql -U test_user -d test_db -c "SELECT * FROM dockets LIMIT 5;"
```

### 4. Test API Endpoint
```bash
curl -X POST http://localhost:3000/api/dockets \
  -H "Content-Type: application/json" \
  -d '{
    "labNumber": "12345/25",
    "caseNumber": "25/34/25",
    "rfidEpc": "E280116060000020961A6B7C",
    "description": "Test Evidence",
    "category": "other"
  }'
```

## Validation Rules

### Lab Number (`NNNNNN/YY`)
- Sequence: 1-6 digits (1-999999)
- Year: 2 digits (20-99 = 2020-2099)
- Regex: `^\d{1,6}/\d{2}$`
- Examples: `1/25`, `12345/25`, `999999/99`

### CAS Number (`DD/NN/YY`)
- Day: 1-2 digits (1-31)
- Case: 1-3 digits (1-999)
- Year: 2 digits (20-99 = 2020-2099)
- Regex: `^\d{1,2}/\d{1,3}/\d{2}$`
- Examples: `1/1/25`, `25/34/25`, `31/999/99`

### RFID EPC
- Exactly 24 hexadecimal characters
- Regex: `^[0-9A-Fa-f]{24}$`
- Example: `E280116060000020961A6B7C`

## Benefits

### 1. **Accuracy**
- QR code scanning eliminates manual typing errors
- Value objects ensure format validation at all layers

### 2. **Efficiency**
- Bulk import processes multiple dockets quickly
- One QR scan captures both lab and CAS numbers

### 3. **Traceability**
- Lab number links to original case
- CAS number provides day/case tracking
- RFID EPC enables real-time location tracking

### 4. **Integration**
- Seamless link between physical (QR sticker) and digital (RFID tag)
- Existing docket stickers can be scanned to register RFID tags

## Future Enhancements

### Potential Improvements
1. **Mobile App:** Native mobile app for easier QR scanning
2. **Barcode Support:** Support for 1D barcodes in addition to QR codes
3. **Auto-RFID Scan:** Automatically detect RFID tag when placed on reader
4. **Export Templates:** Generate QR code stickers for printing
5. **Analytics:** Track scanning success rates and common errors
6. **Offline Mode:** Queue dockets when offline, sync when online

## Troubleshooting

### Camera Access Denied
**Problem:** Browser doesn't allow camera access
**Solution:**
1. Check browser permissions (Settings → Privacy → Camera)
2. Use HTTPS (required for camera access)
3. Try different browser (Chrome/Firefox recommended)

### Invalid QR Code Format
**Problem:** QR code doesn't parse correctly
**Solution:**
1. Verify QR code contains lab number and case number
2. Check format: JSON, pipe-separated, or comma-separated
3. Generate new QR code using recommended format

### Database Constraint Violation
**Problem:** Cannot insert docket with new format
**Solution:**
1. Ensure migration 007 was run successfully
2. Verify lab number matches `^\d{1,6}/\d{2}$`
3. Verify case number matches `^\d{1,2}/\d{1,3}/\d{2}$`

### RFID Tag Duplicate
**Problem:** RFID EPC already exists
**Solution:**
1. Verify tag hasn't been registered before
2. Check for typos in EPC
3. Use different RFID tag

## Support

For issues or questions:
- Check application logs
- Review DATABASE_MIGRATION_GUIDE.md
- Contact development team

## Summary

✅ **Implemented:**
- ✅ Lab number format updated: `12345/25`
- ✅ CAS number support: `25/34/25`
- ✅ QR code scanning component
- ✅ Single docket registration with QR scan
- ✅ Bulk docket import feature
- ✅ Database migration script
- ✅ Value object validation
- ✅ API endpoint validation
- ✅ Repository persistence updates

**The system now supports:**
- Scanning existing QR codes on dockets
- Extracting lab and CAS numbers automatically
- Assigning RFID tags to dockets
- Tracking dockets via RFID in real-time
- Bulk import for efficient registration
