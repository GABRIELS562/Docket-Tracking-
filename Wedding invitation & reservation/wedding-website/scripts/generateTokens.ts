#!/usr/bin/env tsx

/**
 * Token Generation Script for Wedding Guest Authentication
 * 
 * Usage:
 * npm install -g tsx
 * tsx scripts/generateTokens.ts
 * 
 * Or with Node.js:
 * npx tsx scripts/generateTokens.ts
 */

import type { IndividualGuest } from '../src/types';
import { generateGuestToken, isTokenInUse } from '../src/utils/guestSecurity';

interface GuestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  plusOneEligible: boolean;
  plusOneName?: string;
  plusOneEmail?: string;
  invitationGroup?: string;
  dietaryRestrictions?: string[];
  specialNotes?: string;
}

// Sample guest data for generation - replace with your actual guest list
const guestInputs: GuestInput[] = [
  {
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1-555-0201',
    plusOneEligible: true,
    invitationGroup: 'family-groom'
  },
  {
    firstName: 'Mary',
    lastName: 'Johnson',
    email: 'mary.johnson@email.com',
    phone: '+1-555-0202',
    plusOneEligible: false,
    invitationGroup: 'work-colleagues',
    dietaryRestrictions: ['vegetarian']
  },
  {
    firstName: 'Robert',
    lastName: 'Williams',
    email: 'robert.williams@email.com',
    plusOneEligible: true,
    plusOneName: 'Susan Williams',
    plusOneEmail: 'susan.williams@email.com',
    invitationGroup: 'family-bride',
    specialNotes: 'Married couple, both attending'
  },
  // Add more guests as needed
];

/**
 * Generates secure tokens for wedding guests
 * @param guests - Array of guest input data
 * @returns Array of complete IndividualGuest objects with tokens
 */
function generateGuestTokens(guests: GuestInput[]): IndividualGuest[] {
  const generatedGuests: IndividualGuest[] = [];
  const usedTokens = new Set<string>();
  
  console.log('🎫 Generating secure tokens for wedding guests...\n');

  guests.forEach((guest, index) => {
    let token = generateGuestToken(guest.firstName, guest.lastName);
    let attempts = 0;
    
    // Ensure token uniqueness
    while (usedTokens.has(token) || isTokenInUse(token)) {
      attempts++;
      if (attempts > 10) {
        console.error(`❌ Failed to generate unique token for ${guest.firstName} ${guest.lastName} after 10 attempts`);
        return;
      }
      // Regenerate with slight variation
      token = generateGuestToken(guest.firstName, guest.lastName);
    }
    
    usedTokens.add(token);
    
    const individualGuest: IndividualGuest = {
      id: `guest-${String(index + 1).padStart(3, '0')}`,
      firstName: guest.firstName,
      lastName: guest.lastName,
      fullName: `${guest.firstName} ${guest.lastName}`,
      email: guest.email,
      phone: guest.phone,
      token: token,
      hasUsedToken: false,
      plusOneEligible: guest.plusOneEligible,
      plusOneName: guest.plusOneName,
      plusOneEmail: guest.plusOneEmail,
      invitationGroup: guest.invitationGroup || 'other',
      dietaryRestrictions: guest.dietaryRestrictions || [],
      specialNotes: guest.specialNotes,
      createdAt: new Date(),
    };
    
    generatedGuests.push(individualGuest);
    
    console.log(`✅ ${guest.firstName} ${guest.lastName}`);
    console.log(`   Token: ${token}`);
    console.log(`   URL: https://yourwedding.com/${token}`);
    console.log(`   Plus-one: ${guest.plusOneEligible ? 'Yes' : 'No'}`);
    console.log('');
  });

  return generatedGuests;
}

/**
 * Validates generated tokens for security compliance
 * @param guests - Array of guests with tokens
 * @returns Validation report
 */
function validateGeneratedTokens(guests: IndividualGuest[]): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check for duplicates
  const tokens = guests.map(g => g.token);
  const uniqueTokens = new Set(tokens);
  
  if (tokens.length !== uniqueTokens.size) {
    warnings.push('Duplicate tokens detected');
    recommendations.push('Regenerate tokens to ensure uniqueness');
  }
  
  // Check token format consistency
  const tokenRegex = /^[a-z]+-[a-z]+-[a-z0-9]{8}$/;
  const invalidTokens = guests.filter(g => !tokenRegex.test(g.token));
  
  if (invalidTokens.length > 0) {
    warnings.push(`${invalidTokens.length} tokens have invalid format`);
    recommendations.push('Ensure all tokens follow firstname-lastname-8chars format');
  }
  
  // Check for weak random parts
  const weakTokens = guests.filter(g => {
    const parts = g.token.split('-');
    if (parts.length !== 3) return true;
    
    const randomPart = parts[2];
    return /^(.)\1+$/.test(randomPart) || // All same character
           /^(012|123|234|345|456|567|678|789|abc|bcd)/.test(randomPart); // Sequential
  });
  
  if (weakTokens.length > 0) {
    warnings.push(`${weakTokens.length} tokens may be weak (predictable patterns)`);
    recommendations.push('Review and regenerate weak tokens for better security');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    recommendations
  };
}

/**
 * Generates TypeScript code for the guest database
 * @param guests - Array of guests with tokens
 * @returns TypeScript code string
 */
function generateTypeScriptCode(guests: IndividualGuest[]): string {
  const guestsCode = guests.map(guest => `  {
    id: '${guest.id}',
    firstName: '${guest.firstName}',
    lastName: '${guest.lastName}',
    fullName: '${guest.fullName}',
    email: '${guest.email}',${guest.phone ? `\n    phone: '${guest.phone}',` : ''}
    token: '${guest.token}',
    hasUsedToken: false,
    plusOneEligible: ${guest.plusOneEligible},${guest.plusOneName ? `\n    plusOneName: '${guest.plusOneName}',` : ''}${guest.plusOneEmail ? `\n    plusOneEmail: '${guest.plusOneEmail}',` : ''}
    invitationGroup: '${guest.invitationGroup}',${guest.dietaryRestrictions && guest.dietaryRestrictions.length > 0 ? `\n    dietaryRestrictions: [${guest.dietaryRestrictions.map(d => `'${d}'`).join(', ')}],` : ''}${guest.specialNotes ? `\n    specialNotes: '${guest.specialNotes}',` : ''}
    createdAt: new Date('${guest.createdAt.toISOString()}')
  }`).join(',\n');

  return `import type { IndividualGuest } from '../types';

// Generated guest list with secure tokens
// Generated on: ${new Date().toISOString()}
// Total guests: ${guests.length}
export const individualGuests: IndividualGuest[] = [
${guestsCode}
];

// Guest lookup by token for quick authentication
export const guestTokenMap = new Map<string, IndividualGuest>();
individualGuests.forEach(guest => {
  guestTokenMap.set(guest.token, guest);
});

// Group guests by invitation category
export const guestsByGroup = individualGuests.reduce((groups, guest) => {
  const group = guest.invitationGroup || 'other';
  if (!groups[group]) {
    groups[group] = [];
  }
  groups[group].push(guest);
  return groups;
}, {} as Record<string, IndividualGuest[]>);

// Statistics
export const guestStats = {
  total: individualGuests.length,
  withPlusOne: individualGuests.filter(g => g.plusOneEligible).length,
  withoutPlusOne: individualGuests.filter(g => !g.plusOneEligible).length,
  maxPossibleAttendees: individualGuests.reduce((total, guest) => {
    return total + (guest.plusOneEligible ? 2 : 1);
  }, 0),
  byGroup: Object.keys(guestsByGroup).reduce((stats, group) => {
    stats[group] = guestsByGroup[group].length;
    return stats;
  }, {} as Record<string, number>)
};`;
}

/**
 * Generates CSV file for guest management
 * @param guests - Array of guests with tokens
 * @returns CSV content string
 */
function generateCSV(guests: IndividualGuest[]): string {
  const headers = [
    'ID',
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Token',
    'Personal URL',
    'Plus One Eligible',
    'Plus One Name',
    'Plus One Email',
    'Invitation Group',
    'Dietary Restrictions',
    'Special Notes'
  ];

  const rows = guests.map(guest => [
    guest.id,
    guest.firstName,
    guest.lastName,
    guest.email,
    guest.phone || '',
    guest.token,
    `https://yourwedding.com/${guest.token}`,
    guest.plusOneEligible ? 'Yes' : 'No',
    guest.plusOneName || '',
    guest.plusOneEmail || '',
    guest.invitationGroup || '',
    guest.dietaryRestrictions?.join('; ') || '',
    guest.specialNotes || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
}

// Main execution
async function main() {
  console.log('🎉 Wedding Guest Token Generator\n');

  try {
    // Generate tokens
    const guests = generateGuestTokens(guestInputs);
    
    if (guests.length === 0) {
      console.error('❌ No guests were generated successfully');
      process.exit(1);
    }

    // Validate tokens
    console.log('🔒 Validating generated tokens...\n');
    const validation = validateGeneratedTokens(guests);
    
    if (validation.warnings.length > 0) {
      console.log('⚠️  Security Warnings:');
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
      console.log('');
    }
    
    if (validation.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      validation.recommendations.forEach(rec => console.log(`   - ${rec}`));
      console.log('');
    }

    // Generate output files
    const tsCode = generateTypeScriptCode(guests);
    const csvContent = generateCSV(guests);
    
    // In a real environment, you would write these to files
    console.log('📄 Generated TypeScript code (save as src/data/individualGuests.ts):');
    console.log('=' .repeat(60));
    console.log(tsCode);
    console.log('=' .repeat(60));
    console.log('');
    
    console.log('📊 Generated CSV (save as guest-list.csv):');
    console.log('=' .repeat(60));
    console.log(csvContent);
    console.log('=' .repeat(60));
    console.log('');

    // Summary
    console.log('📈 Generation Summary:');
    console.log(`   Total guests: ${guests.length}`);
    console.log(`   With plus-one: ${guests.filter(g => g.plusOneEligible).length}`);
    console.log(`   Without plus-one: ${guests.filter(g => !g.plusOneEligible).length}`);
    console.log(`   Max attendees: ${guests.reduce((total, guest) => total + (guest.plusOneEligible ? 2 : 1), 0)}`);
    console.log(`   Security status: ${validation.isValid ? '✅ Secure' : '⚠️  Needs attention'}`);
    
  } catch (error) {
    console.error('❌ Error generating tokens:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { generateGuestTokens, validateGeneratedTokens, generateTypeScriptCode, generateCSV };