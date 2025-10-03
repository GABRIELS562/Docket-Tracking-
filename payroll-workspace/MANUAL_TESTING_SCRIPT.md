# Electronic Signature System - Manual Testing Script
## Quick Reference for Testing Phase 7

**Version:** 1.0
**Tester:** _______________
**Date:** _______________
**Environment:** Test / Staging / Production

---

## Pre-Testing Setup

### Backend Setup
```bash
# Start Strapi API
cd /Users/user/payroll-workspace/payroll_api
npm run develop

# Verify running on http://localhost:1337
```

### Frontend Setup
```bash
# Start React app
cd /Users/user/payroll-workspace/payroll_web
npm start

# Verify running on http://localhost:3000
```

### Database Check
```sql
-- Verify signature fields exist
DESCRIBE contracts;
-- Look for: personal_initial, vehicles_initial, computers_initial,
--           cellphones_initial, tools_initial, declaration_signature,
--           final_signature, all_signatures_complete

-- Verify audit table exists
DESCRIBE signature_audits;
```

### Test Data Setup
- [ ] Create test production
- [ ] Create test crew member
- [ ] Generate contract with UUID link
- [ ] Have UUID link ready for testing

---

## Test Session 1: Backend API Endpoints

### API Test 1: Capture Personal Initial

**Endpoint:** `POST http://localhost:1337/api/contracts/:id/initial/personal`

**Request Body:**
```json
{
  "initial_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
  "acknowledgment_text": "I confirm all personal information provided is accurate"
}
```

**Using curl:**
```bash
curl -X POST http://localhost:1337/api/contracts/1/initial/personal \
  -H "Content-Type: application/json" \
  -d '{
    "initial_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
    "acknowledgment_text": "I confirm all personal information provided is accurate"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "initial": {
    "initial_image": "data:image/png;base64,...",
    "timestamp": "2025-10-03T14:30:00.000Z",
    "ip_address": "127.0.0.1",
    "user_agent": "curl/7.88.1",
    "section_name": "personal",
    "acknowledgment_text": "I confirm...",
    "email_verified": true
  },
  "message": "Initial captured successfully for personal section"
}
```

**Verification:**
- [ ] Status code: 200
- [ ] Response contains `success: true`
- [ ] `timestamp` is recent (within last minute)
- [ ] `ip_address` is present
- [ ] `user_agent` is present

**Database Check:**
```sql
SELECT personal_initial FROM contracts WHERE id = 1;
-- Should return JSON with initial data
```

**Audit Trail Check:**
```sql
SELECT * FROM signature_audits
WHERE contract_id = 1 AND action_type = 'initial_captured'
ORDER BY timestamp DESC LIMIT 1;
```

### API Test 2: Capture Declaration Signature

**Endpoint:** `POST http://localhost:1337/api/contracts/:id/signature/declaration`

**Request Body:**
```json
{
  "signature_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
  "consent_text": "I, Mr John Doe, hereby confirm that I understand the purpose of this declaration of interest.",
  "device_fingerprint": "a3c5e8d9f2b1c4d6e7f8a9b0c1d2e3f4",
  "time_spent_seconds": 45,
  "stroke_count": 12
}
```

**Expected Response:**
```json
{
  "success": true,
  "signature": {
    "signature_image": "data:image/png;base64,...",
    "timestamp": "2025-10-03T14:35:00.000Z",
    "ip_address": "127.0.0.1",
    "user_agent": "curl/7.88.1",
    "consent_text": "I, Mr John Doe...",
    "consent_version": "1.0",
    "document_hash": "abc123def456...",
    "signature_hash": "789ghi012jkl...",
    "device_fingerprint": "a3c5e8d9f2b1c4d6e7f8a9b0c1d2e3f4",
    "time_spent_seconds": 45,
    "stroke_count": 12,
    "email_verified": true,
    "email_sent": false
  },
  "message": "Declaration signature captured successfully",
  "next_step": "Complete final sections and provide final signature"
}
```

**Verification:**
- [ ] Status code: 200
- [ ] `document_hash` is 64-character hex string
- [ ] `signature_hash` is 64-character hex string
- [ ] `stroke_count` matches request (12)

### API Test 3: Verify Signature

**Endpoint:** `GET http://localhost:1337/api/contracts/:id/signature/declaration/verify`

```bash
curl http://localhost:1337/api/contracts/1/signature/declaration/verify
```

**Expected Response:**
```json
{
  "valid": true,
  "signature_date": "2025-10-03T14:35:00.000Z",
  "ip_address": "127.0.0.1",
  "document_hash": "abc123def456...",
  "email_sent": false,
  "verification_timestamp": "2025-10-03T14:40:00.000Z"
}
```

**Verification:**
- [ ] `valid: true`
- [ ] No `reason` field (only present if invalid)
- [ ] Audit log created with action_type='integrity_check_passed'

### API Test 4: Verify All Signatures

**Endpoint:** `GET http://localhost:1337/api/contracts/:id/verify-all-signatures`

```bash
curl http://localhost:1337/api/contracts/1/verify-all-signatures
```

**Expected Response:**
```json
{
  "valid": true,
  "signatures_verified": [
    {
      "type": "initial",
      "section": "personal",
      "exists": true,
      "timestamp": "2025-10-03T14:30:00.000Z",
      "ip_address": "127.0.0.1"
    },
    {
      "type": "signature",
      "section": "declaration",
      "exists": true,
      "valid": true,
      "timestamp": "2025-10-03T14:35:00.000Z",
      "ip_address": "127.0.0.1"
    }
  ],
  "tamper_detected": [],
  "verification_timestamp": "2025-10-03T14:40:00.000Z"
}
```

**Verification:**
- [ ] `valid: true`
- [ ] `tamper_detected` array is empty
- [ ] All captured signatures present in `signatures_verified`

---

## Test Session 2: Frontend Crew Onboarding

### Test 2.1: Personal Initial Capture

**Steps:**
1. Navigate to: `http://localhost:3000/form/:production_id/:uuid/personal`
2. Fill in personal details form (all required fields)
3. Scroll down to "Personal Information Acknowledgment" section
4. Observe initial pad:
   - [ ] Canvas is visible (200px wide, 60px tall)
   - [ ] "Clear" button is disabled
   - [ ] "Confirm Initial" button is disabled

5. Click and drag on canvas to draw initials (e.g., "JD")
6. Observe:
   - [ ] Canvas border changes from grey to blue
   - [ ] "Clear" button enables
   - [ ] "Confirm Initial" button enables

7. Click "Clear" button
8. Observe:
   - [ ] Canvas clears completely
   - [ ] Buttons disable again

9. Draw initials again
10. Click "Confirm Initial"
11. Observe:
    - [ ] Component switches to display mode
    - [ ] Shows captured initial image
    - [ ] Shows green checkmark "✓ Initial Captured"
    - [ ] Shows "Edit" button

12. Click "Next Page" button
13. Verify:
    - [ ] Page navigates to vehicles page
    - [ ] No error messages
    - [ ] Form submitted successfully

**Database Verification:**
```sql
SELECT personal_initial FROM contracts
WHERE crew_id = (SELECT id FROM crews WHERE ... LIMIT 1);
-- Should contain JSON with initial_image, timestamp, ip_address
```

### Test 2.2: Conditional Initial (Vehicles)

**Steps:**
1. On vehicles page, click "Add Vehicle"
2. Fill vehicle details (type, registration number)
3. Scroll down - observe:
   - [ ] "Vehicles Acknowledgment" initial pad appears
   - [ ] Message: "I acknowledge responsibility for all listed vehicles"

4. Draw vehicles initial
5. Click "Confirm Initial"
6. Click "Next Page"
7. Verify:
   - [ ] Vehicles initial saved
   - [ ] Navigates to computers page

**Test 2.3: Skip Conditional Initial (No Items)**

**Steps:**
1. On computers page, do NOT add any computers
2. Scroll down - observe:
   - [ ] No initial pad appears (conditional)
   - [ ] Message: "Please add a computer if you will be renting it to the production."

3. Click "Next Page"
4. Verify:
   - [ ] No validation error
   - [ ] Navigates to cellphones page successfully

### Test 2.4: Declaration Signature

**Steps:**
1. Navigate to declaration page
2. Add a declaration entry (if required)
3. Scroll down to signature section
4. Observe:
   - [ ] "Declaration of Interest Signature" card
   - [ ] "Click to Sign" button

5. Click "Click to Sign"
6. Observe modal opens:
   - [ ] Title: "Declaration of Interest Signature"
   - [ ] Subtitle: "Electronic Signature - Legally Binding"
   - [ ] Consent text in grey scrollable box
   - [ ] 2 checkboxes (both unchecked)
   - [ ] Signature canvas (600px x 150px)
   - [ ] "Cancel", "Clear Signature", "Confirm & Sign" buttons

7. Try to click "Confirm & Sign" without checking boxes
8. Observe:
   - [ ] Button is disabled
   - [ ] Cannot click

9. Check first checkbox only
10. Observe:
    - [ ] Button still disabled

11. Check both checkboxes
12. Draw signature (make at least 6 strokes)
13. Observe:
    - [ ] Stroke counter shows: "Strokes: 6"
    - [ ] "Confirm & Sign" button enables

14. Click "Clear Signature"
15. Observe:
    - [ ] Canvas clears
    - [ ] Stroke count resets to 0
    - [ ] Button disables

16. Draw signature again (6+ strokes)
17. Click "Confirm & Sign"
18. Observe:
    - [ ] Modal closes
    - [ ] Signature card shows captured signature
    - [ ] Shows "✓ Signature Captured" badge
    - [ ] Shows timestamp, IP address
    - [ ] Shows hash (truncated format: abc123...xyz789)

19. Click "Next" button
20. Verify:
    - [ ] Navigates to confirmation page

### Test 2.5: Final Signature

**Steps:**
1. On confirmation page, upload required documents
2. Scroll down to final signature section
3. Click "Click to Sign"
4. Read consent text:
   - [ ] Shows 6-point agreement
   - [ ] Includes crew member name
   - [ ] Mentions all sections (personal, vehicles, etc.)

5. Check both consent boxes
6. Draw signature (6+ strokes)
7. Click "Confirm & Sign"
8. Observe:
   - [ ] Modal closes
   - [ ] Final signature displayed

9. Click "Submit" button
10. Verify:
    - [ ] Form submits successfully
    - [ ] Navigates to thank you page
    - [ ] Contract status updated

**Database Verification:**
```sql
SELECT
  declaration_signature,
  final_signature,
  all_signatures_complete,
  signature_completion_date
FROM contracts WHERE id = 1;

-- Should show:
-- declaration_signature: {...}
-- final_signature: {...}
-- all_signatures_complete: true
-- signature_completion_date: [recent timestamp]
```

---

## Test Session 3: Admin Verification Interface

### Test 3.1: Navigate to Signatures Page

**Steps:**
1. Log in as admin user
2. Navigate to: `Productions → Contract List`
3. Find completed contract (with all_signatures_complete = true)
4. Observe on contract details page:
   - [ ] Green bordered card appears
   - [ ] Text: "View Signature Verification"
   - [ ] Shield icon

5. Click shield icon
6. Verify:
   - [ ] Navigates to `/production/:id/contract/:id/signatures`
   - [ ] Signatures tab is active in stepper

### Test 3.2: Verify All Signatures

**Steps:**
1. On signatures page, observe auto-verification
   - [ ] "Verify All" button shows loading state briefly
   - [ ] Success alert appears: "✓ All signatures verified successfully"
   - [ ] Shows verification timestamp

2. Scroll through signatures:
   - [ ] Personal Initial card (green border)
   - [ ] Vehicles Initial card (green border or grey if not provided)
   - [ ] Computers Initial card
   - [ ] Cellphones Initial card
   - [ ] Tools Initial card
   - [ ] Declaration Signature card (green border, verified badge)
   - [ ] Final Signature card (green border, verified badge)

3. Check declaration signature card:
   - [ ] Shows signature image
   - [ ] Shows timestamp (SA locale format)
   - [ ] Shows IP address
   - [ ] Shows stroke count
   - [ ] Shows time spent
   - [ ] Shows truncated hashes

4. Click expand chevron on declaration signature
5. Observe:
   - [ ] Section expands
   - [ ] Shows consent version: 1.0
   - [ ] Shows device fingerprint
   - [ ] Shows full user agent (or truncated with tooltip)
   - [ ] Shows consent text in scrollable area

6. Click "Verify All" button again manually
7. Verify:
   - [ ] Loading state shows
   - [ ] Success alert appears again
   - [ ] Verification timestamp updates

### Test 3.3: View Partial Signatures

**Test Data:** Contract with only some signatures

**Steps:**
1. Navigate to contract with partial completion
2. Observe:
   - [ ] Provided signatures: green cards with images
   - [ ] Missing signatures: grey cards with "Not Provided" text

---

## Test Session 4: Security & Tamper Detection

### Test 4.1: Tamper Detection Simulation

**CAUTION:** Only perform on test database

**Steps:**
1. Capture a valid declaration signature
2. Note the signature_hash from database
3. Manually modify signature_image in database:
   ```sql
   UPDATE contracts
   SET declaration_signature = JSON_SET(
     declaration_signature,
     '$.signature_image',
     'data:image/png;base64,MODIFIED_DATA_HERE'
   )
   WHERE id = 1;
   ```

4. Navigate to signatures verification page
5. Click "Verify All"
6. Observe:
   - [ ] RED error alert appears
   - [ ] Text: "TAMPERING DETECTED: 1 signature(s) failed verification"
   - [ ] Declaration signature card has RED border
   - [ ] Red warning triangle icon
   - [ ] Error badge: "Invalid"

7. Expand declaration signature
8. Verify:
   - [ ] Shows original_hash
   - [ ] Shows calculated_hash (different from original)
   - [ ] Alert text: "TAMPERING DETECTED: Signature hash mismatch"

**Audit Log Check:**
```sql
SELECT * FROM signature_audits
WHERE action_type IN ('integrity_check_failed', 'tamper_detected')
ORDER BY timestamp DESC;

-- Should show 2 entries:
-- 1. integrity_check_failed (severity: info)
-- 2. tamper_detected (severity: critical)
```

**Cleanup:**
```sql
-- Restore original data after test
UPDATE contracts SET declaration_signature = [BACKUP_JSON] WHERE id = 1;
```

### Test 4.2: Server-side Timestamp Verification

**Steps:**
1. Open browser DevTools → Network tab
2. Capture a signature
3. View request payload
4. Note: Frontend does NOT send timestamp
5. View response
6. Verify:
   - [ ] Response contains server-generated timestamp
   - [ ] Timestamp accuracy: within 5 seconds of current time

### Test 4.3: IP Address Capture

**Steps:**
1. Capture signature from different device/network
2. Check database:
   ```sql
   SELECT
     JSON_EXTRACT(personal_initial, '$.ip_address') as ip
   FROM contracts WHERE id = 1;
   ```
3. Verify:
   - [ ] IP address matches actual client IP
   - [ ] Not localhost (unless testing locally)

---

## Test Session 5: Error Handling & Edge Cases

### Test 5.1: Missing Required Signature

**Steps:**
1. On personal page, fill form but DON'T draw initial
2. Click "Next Page"
3. Verify:
   - [ ] Red error alert appears
   - [ ] Text: "Please provide your initials..."
   - [ ] Page does NOT navigate
   - [ ] Form does NOT submit

### Test 5.2: Minimum Stroke Validation

**Steps:**
1. On declaration page, open signature modal
2. Check both consent boxes
3. Draw only 2 strokes
4. Observe:
   - [ ] Stroke counter shows: "Strokes: 2 (minimum 5 required)"
   - [ ] "Confirm & Sign" button disabled

5. Draw 3 more strokes (total 5)
6. Verify:
   - [ ] Button enables
   - [ ] Can confirm signature

### Test 5.3: Network Error Handling

**Steps:**
1. Open DevTools → Network tab
2. Enable "Offline" mode
3. Try to capture initial
4. Verify:
   - [ ] Error message displays
   - [ ] Signature NOT saved
   - [ ] Can retry after reconnecting

### Test 5.4: Browser Back Button

**Steps:**
1. Open signature modal
2. Draw signature (don't confirm)
3. Click browser back button
4. Verify:
   - [ ] Modal closes OR page navigates back
   - [ ] No orphaned data in database

### Test 5.5: Very Long Acknowledgment Text

**Test:** Use 500+ character acknowledgment text

**Verification:**
- [ ] Text stores completely
- [ ] Displays correctly in UI (may wrap or scroll)
- [ ] No truncation or errors

---

## Test Session 6: Performance Testing

### Test 6.1: Signature Capture Speed

**Steps:**
1. Open DevTools → Network tab
2. Draw and confirm initial
3. Check network request timing
4. Verify:
   - [ ] Request completes in < 500ms
   - [ ] No timeout errors

### Test 6.2: Verification Speed

**Steps:**
1. Navigate to signatures page (triggers auto-verify)
2. Check network request timing
3. Verify:
   - [ ] verifyAllSignatures completes in < 2000ms
   - [ ] UI updates smoothly

### Test 6.3: Image Size Check

**Steps:**
1. Capture signature
2. Open DevTools → Network tab
3. Find POST request
4. Check request payload size
5. Verify:
   - [ ] Initial image: < 50KB
   - [ ] Signature image: < 100KB
   - [ ] Images not corrupted or pixelated

---

## Test Session 7: Mobile Testing

### Test 7.1: Mobile Signature Capture

**Device:** iPhone or Android phone

**Steps:**
1. Navigate to onboarding on mobile browser
2. On personal page, draw initial with finger
3. Verify:
   - [ ] Canvas responsive (fits screen width)
   - [ ] Touch drawing smooth
   - [ ] No accidental taps
   - [ ] Buttons easily tappable (not too small)

4. Open signature modal
5. Verify:
   - [ ] Modal takes full screen or most of screen
   - [ ] Canvas large enough for signature
   - [ ] Can scroll consent text
   - [ ] Checkboxes easily tappable

6. Draw signature with finger
7. Verify:
   - [ ] Stroke tracking works
   - [ ] Lines are smooth (not jagged)
   - [ ] Can complete entire flow

### Test 7.2: Mobile Admin View

**Steps:**
1. Log in as admin on mobile
2. Navigate to signatures page
3. Verify:
   - [ ] Cards stack vertically
   - [ ] Images display correctly
   - [ ] Text readable (not too small)
   - [ ] Can expand/collapse sections
   - [ ] Can scroll smoothly

---

## Test Results Summary

### Completion Checklist

#### Backend Tests
- [ ] API Test 1: Capture Personal Initial
- [ ] API Test 2: Capture Declaration Signature
- [ ] API Test 3: Verify Signature
- [ ] API Test 4: Verify All Signatures

#### Frontend Tests
- [ ] Test 2.1: Personal Initial Capture
- [ ] Test 2.2: Conditional Initial (Vehicles)
- [ ] Test 2.3: Skip Conditional Initial
- [ ] Test 2.4: Declaration Signature
- [ ] Test 2.5: Final Signature

#### Admin Tests
- [ ] Test 3.1: Navigate to Signatures Page
- [ ] Test 3.2: Verify All Signatures
- [ ] Test 3.3: View Partial Signatures

#### Security Tests
- [ ] Test 4.1: Tamper Detection
- [ ] Test 4.2: Server-side Timestamp
- [ ] Test 4.3: IP Address Capture

#### Error Handling Tests
- [ ] Test 5.1: Missing Required Signature
- [ ] Test 5.2: Minimum Stroke Validation
- [ ] Test 5.3: Network Error Handling
- [ ] Test 5.4: Browser Back Button
- [ ] Test 5.5: Very Long Text

#### Performance Tests
- [ ] Test 6.1: Signature Capture Speed
- [ ] Test 6.2: Verification Speed
- [ ] Test 6.3: Image Size Check

#### Mobile Tests
- [ ] Test 7.1: Mobile Signature Capture
- [ ] Test 7.2: Mobile Admin View

### Bugs Found

| ID | Severity | Description | Steps to Reproduce | Status |
|----|----------|-------------|-------------------|--------|
| 1  |          |             |                   |        |
| 2  |          |             |                   |        |
| 3  |          |             |                   |        |

### Test Environment Details

- Backend Version: __________
- Frontend Version: __________
- Node Version: __________
- MySQL Version: __________
- Browser: __________
- OS: __________

### Sign-off

**Tested By:** _______________
**Date:** _______________
**Overall Result:** PASS / FAIL / PASS WITH ISSUES

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Quick Reference Commands

### Check Audit Logs
```sql
SELECT
  id,
  action_type,
  section,
  timestamp,
  severity,
  JSON_EXTRACT(metadata, '$.acknowledgment_text') as ack_text
FROM signature_audits
WHERE contract_id = 1
ORDER BY timestamp DESC;
```

### Check All Signatures for Contract
```sql
SELECT
  id,
  JSON_EXTRACT(personal_initial, '$.timestamp') as personal_ts,
  JSON_EXTRACT(vehicles_initial, '$.timestamp') as vehicles_ts,
  JSON_EXTRACT(declaration_signature, '$.timestamp') as declaration_ts,
  JSON_EXTRACT(final_signature, '$.timestamp') as final_ts,
  all_signatures_complete,
  signature_completion_date
FROM contracts
WHERE id = 1;
```

### Verify Hash Integrity
```sql
SELECT
  JSON_EXTRACT(declaration_signature, '$.signature_hash') as stored_hash,
  SHA2(JSON_EXTRACT(declaration_signature, '$.signature_image'), 256) as calculated_hash
FROM contracts
WHERE id = 1;
-- Hashes should match
```
