import type { RSVPSubmission } from '../types';
import { sendConfirmationEmail } from './emailService';
import { saveRSVPToSheets, updateRSVPInSheets, getRSVPFromSheets } from './googleSheetsAPI';

// In-memory storage for demo (replace with actual database in production)
const rsvpStorage = new Map<string, RSVPSubmission>();

// Rate limiting storage
const rateLimitStorage = new Map<string, { count: number; lastAttempt: number }>();

interface RSVPResult {
  success: boolean;
  error?: string;
  data?: RSVPSubmission;
}

/**
 * Submit a new RSVP
 */
export async function submitRSVP(rsvpData: RSVPSubmission): Promise<RSVPResult> {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(rsvpData.token);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Too many RSVP attempts. Please wait before trying again.'
      };
    }

    // Check for existing RSVP
    const existingRSVP = rsvpStorage.get(rsvpData.token);
    if (existingRSVP) {
      return {
        success: false,
        error: 'An RSVP has already been submitted for this invitation. Use update instead.'
      };
    }

    // Validate required fields
    const validation = validateRSVPData(rsvpData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Store RSVP (in production, this would be a database operation)
    rsvpStorage.set(rsvpData.token, rsvpData);

    // Save to Google Sheets (if configured)
    try {
      await saveRSVPToSheets(rsvpData);
    } catch (error) {
      console.warn('Failed to save to Google Sheets:', error);
      // Don't fail the submission if Google Sheets fails
    }

    // Send confirmation email if requested
    if (rsvpData.wantsEmailConfirmation && rsvpData.email) {
      try {
        await sendConfirmationEmail(rsvpData);
      } catch (error) {
        console.warn('Failed to send confirmation email:', error);
        // Don't fail the submission if email fails
      }
    }

    // Clear failed attempts on successful submission
    rateLimitStorage.delete(rsvpData.token);

    return {
      success: true,
      data: rsvpData
    };

  } catch (error) {
    console.error('RSVP submission error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    };
  }
}

/**
 * Update an existing RSVP
 */
export async function updateRSVP(rsvpData: RSVPSubmission): Promise<RSVPResult> {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(rsvpData.token);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Too many RSVP attempts. Please wait before trying again.'
      };
    }

    // Validate required fields
    const validation = validateRSVPData(rsvpData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Update RSVP (in production, this would be a database operation)
    rsvpStorage.set(rsvpData.token, rsvpData);

    // Update in Google Sheets (if configured)
    try {
      await updateRSVPInSheets(rsvpData);
    } catch (error) {
      console.warn('Failed to update in Google Sheets:', error);
      // Don't fail the update if Google Sheets fails
    }

    // Send confirmation email if requested
    if (rsvpData.wantsEmailConfirmation && rsvpData.email) {
      try {
        await sendConfirmationEmail(rsvpData);
      } catch (error) {
        console.warn('Failed to send confirmation email:', error);
        // Don't fail the update if email fails
      }
    }

    // Clear failed attempts on successful update
    rateLimitStorage.delete(rsvpData.token);

    return {
      success: true,
      data: rsvpData
    };

  } catch (error) {
    console.error('RSVP update error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again later.'
    };
  }
}

/**
 * Get RSVP by token
 */
export async function getRSVPByToken(token: string): Promise<RSVPSubmission | null> {
  try {
    // Check in-memory storage first
    const localRSVP = rsvpStorage.get(token);
    if (localRSVP) {
      return localRSVP;
    }

    // Try to get from Google Sheets (if configured)
    try {
      const sheetsRSVP = await getRSVPFromSheets(token);
      if (sheetsRSVP) {
        // Cache in memory for future requests
        rsvpStorage.set(token, sheetsRSVP);
        return sheetsRSVP;
      }
    } catch (error) {
      console.warn('Failed to get RSVP from Google Sheets:', error);
    }

    return null;

  } catch (error) {
    console.error('Error getting RSVP:', error);
    return null;
  }
}

/**
 * Check if a guest has already submitted an RSVP
 */
export async function hasSubmittedRSVP(token: string): Promise<boolean> {
  const rsvp = await getRSVPByToken(token);
  return rsvp !== null;
}

/**
 * Get all RSVPs (admin function)
 */
export async function getAllRSVPs(): Promise<RSVPSubmission[]> {
  return Array.from(rsvpStorage.values());
}

/**
 * Validate RSVP data
 */
function validateRSVPData(rsvpData: RSVPSubmission): { isValid: boolean; error?: string } {
  // Required fields
  if (!rsvpData.token) {
    return { isValid: false, error: 'Guest token is required' };
  }

  if (!rsvpData.guestName || rsvpData.guestName.trim().length === 0) {
    return { isValid: false, error: 'Guest name is required' };
  }

  if (typeof rsvpData.isAttending !== 'boolean') {
    return { isValid: false, error: 'Attendance selection is required' };
  }

  // If attending, meal choice is required
  if (rsvpData.isAttending && !rsvpData.mealChoice) {
    return { isValid: false, error: 'Meal selection is required for attending guests' };
  }

  // If plus-one is named, plus-one meal choice is required
  if (rsvpData.isAttending && rsvpData.plusOneName && rsvpData.plusOneName.trim() && !rsvpData.plusOneMealChoice) {
    return { isValid: false, error: 'Plus-one meal selection is required' };
  }

  // Email validation if confirmation is requested
  if (rsvpData.wantsEmailConfirmation && rsvpData.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(rsvpData.email)) {
      return { isValid: false, error: 'Invalid email address format' };
    }
  }

  // Input length limits
  if (rsvpData.guestName.length > 100) {
    return { isValid: false, error: 'Guest name is too long' };
  }

  if (rsvpData.dietaryRestrictions && rsvpData.dietaryRestrictions.length > 500) {
    return { isValid: false, error: 'Dietary restrictions field is too long' };
  }

  if (rsvpData.specialRequests && rsvpData.specialRequests.length > 1000) {
    return { isValid: false, error: 'Special requests field is too long' };
  }

  return { isValid: true };
}

/**
 * Rate limiting for RSVP submissions
 */
function checkRateLimit(token: string): { allowed: boolean; attemptsLeft: number } {
  const now = Date.now();
  const maxAttempts = 5; // Maximum attempts per time window
  const timeWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

  const record = rateLimitStorage.get(token);

  if (!record) {
    // First attempt
    rateLimitStorage.set(token, { count: 1, lastAttempt: now });
    return { allowed: true, attemptsLeft: maxAttempts - 1 };
  }

  // Check if time window has passed
  if (now - record.lastAttempt > timeWindow) {
    // Reset the counter
    rateLimitStorage.set(token, { count: 1, lastAttempt: now });
    return { allowed: true, attemptsLeft: maxAttempts - 1 };
  }

  // Check if under the limit
  if (record.count < maxAttempts) {
    record.count++;
    record.lastAttempt = now;
    rateLimitStorage.set(token, record);
    return { allowed: true, attemptsLeft: maxAttempts - record.count };
  }

  // Over the limit
  return { allowed: false, attemptsLeft: 0 };
}

/**
 * Clear rate limit for a token (admin function)
 */
export function clearRateLimit(token: string): void {
  rateLimitStorage.delete(token);
}

/**
 * Get RSVP statistics (admin function)
 */
export async function getRSVPStats(): Promise<{
  total: number;
  attending: number;
  notAttending: number;
  withPlusOne: number;
  awaitingResponse: number;
}> {
  const rsvps = await getAllRSVPs();
  
  const attending = rsvps.filter(r => r.isAttending).length;
  const notAttending = rsvps.filter(r => !r.isAttending).length;
  const withPlusOne = rsvps.filter(r => r.isAttending && r.plusOneName && r.plusOneName.trim()).length;

  return {
    total: rsvps.length,
    attending,
    notAttending,
    withPlusOne,
    awaitingResponse: 0 // This would require knowing total invited guests
  };
}