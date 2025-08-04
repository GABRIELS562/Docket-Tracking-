# Individual Guest Authentication System

## Overview

This wedding website implements a secure individual guest authentication system where each guest receives a unique token for accessing their personalized RSVP experience. Unlike traditional family-based invitations, this system treats each guest as an individual with their own token and plus-one eligibility.

## Token Format

Each guest token follows the format: `firstname-lastname-8randomchars`

**Examples:**
- `sarah-johnson-a7k9m2x4`
- `michael-rodriguez-b8j4n1v9`
- `emma-thompson-c9l5p3w8`

## URL Structure

- **Main website**: `https://yourwedding.com/`
- **Individual guest**: `https://yourwedding.com/sarah-johnson-a7k9m2x4`

## Security Features

### 1. Secure Token Generation
- 8-character random suffix using cryptographically secure randomization
- Collision detection and prevention
- Format validation and compliance checking

### 2. Rate Limiting
- Maximum 3 authentication attempts per IP address
- 15-minute lockout after failed attempts
- Automatic reset after time window

### 3. Input Sanitization
- Token format validation using regex patterns
- SQL injection prevention
- XSS protection through input sanitization

### 4. IP Security
- Optional IP whitelist/blacklist support
- Suspicious activity detection
- Rate limiting per IP address

### 5. Audit Trail
- Guest access tracking
- Last accessed timestamps
- Security event logging

## Guest Database Structure

### IndividualGuest Interface
```typescript
interface IndividualGuest {
  id: string;                    // Unique guest ID
  firstName: string;             // Guest's first name
  lastName: string;              // Guest's last name
  fullName: string;              // Full display name
  email: string;                 // Primary email
  phone?: string;                // Optional phone number
  token: string;                 // Unique authentication token
  hasUsedToken: boolean;         // Token usage tracking
  plusOneEligible: boolean;      // Plus-one eligibility
  plusOneName?: string;          // Pre-assigned plus-one name
  plusOneEmail?: string;         // Plus-one email
  invitationGroup?: string;      // Grouping for organization
  dietaryRestrictions?: string[]; // Special dietary needs
  specialNotes?: string;         // Additional information
  createdAt: Date;               // Creation timestamp
  lastAccessed?: Date;           // Last access timestamp
}
```

## Security Utilities

### Core Functions

#### `validateToken(token: string, clientIp?: string): TokenValidationResult`
- Validates guest token with security checks
- Returns detailed validation result with security flags
- Implements rate limiting and IP blocking

#### `getGuestInfo(token: string): IndividualGuest | null`
- Quick guest lookup without security overhead
- Used for internal operations

#### `isEligibleForPlusOne(token: string): boolean`
- Checks plus-one eligibility for a guest
- Returns boolean result

#### `generateGuestToken(firstName: string, lastName: string): string`
- Generates secure token for new guests
- Ensures uniqueness and format compliance

### Validation Functions

#### `validateGuestData(guestData: Partial<IndividualGuest>)`
- Validates guest information against security rules
- Returns validation errors and recommendations

#### `performSecurityAudit(): string[]`
- Audits entire guest database for security issues
- Returns array of warnings and recommendations

## Guest Statistics

The system automatically generates comprehensive statistics:

```typescript
export const guestStats = {
  total: 25,                    // Total individual guests
  withPlusOne: 15,             // Guests eligible for plus-one
  withoutPlusOne: 10,          // Individual-only guests
  maxPossibleAttendees: 40,    // Maximum possible attendance
  byGroup: {                   // Breakdown by invitation group
    'family-bride': 8,
    'family-groom': 6,
    'friends-college': 4,
    'work-colleagues': 7
  }
}
```

## Guest Groups

Guests are organized into logical groups for better management:

- **family-bride**: Bride's family members
- **family-groom**: Groom's family members
- **friends-bride**: Bride's friends
- **friends-groom**: Groom's friends
- **friends-college**: College friends
- **work-colleagues**: Work colleagues
- **other**: Miscellaneous guests

## Plus-One System

### Individual Plus-One Eligibility
Each guest has individual plus-one status:
- `plusOneEligible: true` - Guest may bring a plus-one
- `plusOneEligible: false` - Guest invited individually only

### Pre-Assigned Plus-Ones
For married couples or established relationships:
```typescript
{
  firstName: 'Samantha',
  lastName: 'Lewis',
  plusOneEligible: true,
  plusOneName: 'Marcus Lewis',     // Pre-assigned
  plusOneEmail: 'marcus@email.com' // Plus-one contact
}
```

## Token Generation Script

Use the provided script to generate tokens for your guest list:

```bash
# Install tsx for TypeScript execution
npm install -g tsx

# Run the token generation script
tsx scripts/generateTokens.ts
```

### Script Features
- Secure token generation with collision detection
- Security validation and audit
- TypeScript code generation
- CSV export for guest management
- Comprehensive reporting

### Script Output
1. **TypeScript Code**: Ready-to-use guest database
2. **CSV File**: Spreadsheet for guest management
3. **Security Report**: Validation warnings and recommendations
4. **Statistics**: Guest count and distribution analysis

## Implementation Guide

### 1. Set Up Guest Database
```typescript
// Import the generated guest data
import { individualGuests, guestTokenMap } from './data/individualGuests';
```

### 2. Configure Security
```typescript
// Adjust security settings in guestSecurity.ts
export const securityConfig: SecurityConfig = {
  tokenLength: 8,              // Random character length
  allowedAttempts: 3,          // Max attempts before lockout
  lockoutDuration: 15 * 60000, // Lockout duration (15 min)
  requireHttps: true,          // HTTPS requirement
  ipBlacklist: [],             // Blocked IP addresses
  ipWhitelist: []              // Allowed IP addresses (optional)
};
```

### 3. Use Authentication Hook
```typescript
import { useGuestAuth } from './hooks/useGuestAuth';

function MyComponent() {
  const { 
    guest,           // Current authenticated guest
    isAuthenticated, // Authentication status
    isLoading,       // Loading state
    error,          // Error message
    securityFlags,  // Security warnings
    authenticate,   // Login function
    logout         // Logout function
  } = useGuestAuth();

  if (!isAuthenticated) {
    return <div>Please check your invitation link</div>;
  }

  return (
    <div>
      <h1>Welcome, {guest.firstName}!</h1>
      {guest.plusOneEligible && <p>You may bring a plus-one</p>}
    </div>
  );
}
```

## Security Best Practices

### 1. Token Management
- Never expose tokens in client-side logs
- Regenerate tokens if compromised
- Use HTTPS for all token transmission
- Implement proper token storage (HTTP-only cookies in production)

### 2. Rate Limiting
- Monitor authentication attempts
- Implement progressive delays for repeated failures
- Use CAPTCHA for suspicious activity

### 3. Data Protection
- Encrypt sensitive guest information
- Implement proper access controls
- Regular security audits
- Secure backup procedures

### 4. Monitoring
- Log authentication events
- Monitor for suspicious patterns
- Set up alerts for security violations
- Regular security assessments

## Guest Management Workflow

### 1. Initial Setup
1. Collect guest information (names, emails, plus-one status)
2. Run token generation script
3. Review security audit results
4. Deploy guest database

### 2. Invitation Distribution
1. Generate personalized URLs for each guest
2. Send invitations via email with unique links
3. Provide backup token information
4. Monitor token usage

### 3. RSVP Management
1. Track guest responses in real-time
2. Monitor authentication errors
3. Handle guest inquiries about access
4. Update guest information as needed

### 4. Security Monitoring
1. Regular security audits
2. Monitor failed authentication attempts
3. Review suspicious activity
4. Update security configurations

## Troubleshooting

### Common Issues

#### "Invalid invitation token"
- Check token format and spelling
- Verify guest exists in database
- Check for typos in URL

#### "Too many attempts"
- Rate limiting triggered
- Wait 15 minutes before retry
- Check IP address restrictions

#### "Access denied from this location"
- IP address is blacklisted
- VPN or proxy may be blocked
- Contact system administrator

### Security Warnings
- Duplicate tokens detected
- Weak token patterns
- Invalid token formats
- Suspicious authentication patterns

## Production Considerations

### Database Integration
- Replace in-memory storage with database
- Implement proper indexing for performance
- Add database-level security constraints
- Regular backup procedures

### Scalability
- Implement caching for guest lookups
- Use CDN for static assets
- Load balancing for high traffic
- Database connection pooling

### Monitoring
- Application performance monitoring
- Security event logging
- Real-time alerting
- Analytics and reporting

### Compliance
- GDPR compliance for EU guests
- Data retention policies
- Privacy policy updates
- Consent management

---

This individual guest authentication system provides enterprise-level security while maintaining a smooth user experience for wedding guests. The system is designed to scale and can be easily customized for different wedding requirements.