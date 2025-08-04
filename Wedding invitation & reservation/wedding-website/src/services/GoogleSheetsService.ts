import axios, { type AxiosResponse, type AxiosError } from 'axios';
import type { RSVPSubmission, IndividualGuest } from '../types';
import { validateToken } from '../utils/guestSecurity';

// Google Sheets API configuration interface
interface GoogleSheetsConfig {
  spreadsheetId: string;
  apiKey: string;
  range: string;
  retryAttempts: number;
  retryDelay: number;
}

// Service response interface
interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Individual guest RSVP data structure for Google Sheets
interface GuestRSVPRow {
  timestamp: string;
  guest_token: string;
  guest_name: string;
  attending: string;
  meal_choice: string;
  dietary_restrictions: string;
  plus_one_name: string;
  plus_one_meal: string;
  plus_one_dietary: string;
  email_address: string;
  email_confirmation_sent: string;
  submission_id: string;
}

// Rate limiting storage
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  lockedUntil?: number;
}

// RSVP Statistics interface
interface RSVPStatistics {
  totalSubmissions: number;
  attendingGuests: number;
  notAttendingGuests: number;
  guestsWithPlusOne: number;
  mealChoiceBreakdown: { [key: string]: number };
  submissionsByDate: { [key: string]: number };
  emailConfirmationsSent: number;
  lastUpdated: string;
}

class GoogleSheetsService {
  private config: GoogleSheetsConfig;
  private baseUrl: string;
  private rateLimitStore = new Map<string, RateLimitRecord>();
  private readonly MAX_ATTEMPTS = 3;
  private readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

  constructor(config: GoogleSheetsConfig) {
    this.config = {
      ...config,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000
    };
    this.baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}`;
  }

  /**
   * Submit individual guest RSVP to Google Sheets
   */
  async submitGuestRSVP(rsvpData: RSVPSubmission, guestInfo: IndividualGuest): Promise<ServiceResponse<string>> {
    try {
      // Validate token and rate limiting
      const validationResult = await this.validateSubmission(rsvpData.token);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Check for existing submission
      const existingCheck = await this.checkExistingSubmission(rsvpData.token);
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Failed to check existing submission'
        };
      }

      if (existingCheck.data?.exists) {
        return {
          success: false,
          error: 'An RSVP has already been submitted for this guest. Use update method instead.',
          code: 'DUPLICATE_SUBMISSION'
        };
      }

      // Sanitize and prepare data
      const sanitizedData = this.sanitizeRSVPData(rsvpData);
      const rowData = this.prepareRowData(sanitizedData, guestInfo);

      // Generate unique submission ID
      const submissionId = this.generateSubmissionId(rsvpData.token);
      rowData.submission_id = submissionId;

      // Submit to Google Sheets with retry logic
      const result = await this.executeWithRetry(() => 
        this.appendRowToSheet(rowData)
      );

      if (!result.success) {
        return result;
      }

      // Update rate limiting on successful submission
      this.recordSuccessfulSubmission(rsvpData.token);

      return {
        success: true,
        data: submissionId,
      };

    } catch (error) {
      console.error('Error submitting guest RSVP:', error);
      return this.handleError(error, 'Failed to submit RSVP');
    }
  }

  /**
   * Update existing guest RSVP
   */
  async updateGuestRSVP(rsvpData: RSVPSubmission, guestInfo: IndividualGuest): Promise<ServiceResponse<string>> {
    try {
      // Validate token and rate limiting
      const validationResult = await this.validateSubmission(rsvpData.token);
      if (!validationResult.success) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Find existing submission
      const existingCheck = await this.checkExistingSubmission(rsvpData.token);
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Failed to check existing submission'
        };
      }

      if (!existingCheck.data?.exists || !existingCheck.data?.data) {
        // No existing submission, create new one
        return this.submitGuestRSVP(rsvpData, guestInfo);
      }

      // Sanitize and prepare updated data
      const sanitizedData = this.sanitizeRSVPData(rsvpData);
      const rowData = this.prepareRowData(sanitizedData, guestInfo);
      rowData.submission_id = existingCheck.data.data.submission_id;

      // Update existing row
      const result = await this.executeWithRetry(() => 
        this.updateRowInSheet(existingCheck.data!.rowIndex!, rowData)
      );

      if (!result.success) {
        return result;
      }

      // Update rate limiting on successful update
      this.recordSuccessfulSubmission(rsvpData.token);

      return {
        success: true,
        data: rowData.submission_id,
      };

    } catch (error) {
      console.error('Error updating guest RSVP:', error);
      return this.handleError(error, 'Failed to update RSVP');
    }
  }

  /**
   * Check if guest has already submitted RSVP
   */
  async checkExistingSubmission(token: string): Promise<ServiceResponse<{ exists: boolean; data?: GuestRSVPRow; rowIndex?: number }>> {
    try {
      const result = await this.executeWithRetry(() => 
        this.getSheetData()
      );

      if (!result.success || !result.data) {
        return result;
      }

      const rows = result.data.values || [];
      
      // Find row with matching token (column B, index 1)
      for (let i = 1; i < rows.length; i++) { // Skip header row
        const row = rows[i];
        if (row[1] === token) { // guest_token column
          const rowData = this.parseRowData(row);
          return {
            success: true,
            data: {
              exists: true,
              data: rowData,
              rowIndex: i + 1 // 1-based index for Google Sheets
            }
          };
        }
      }

      return {
        success: true,
        data: { exists: false }
      };

    } catch (error) {
      console.error('Error checking existing submission:', error);
      return this.handleError(error, 'Failed to check existing submission');
    }
  }

  /**
   * Get guest RSVP by token
   */
  async getGuestRSVPByToken(token: string): Promise<ServiceResponse<RSVPSubmission | null>> {
    try {
      const existingCheck = await this.checkExistingSubmission(token);
      
      if (!existingCheck.success) {
        return {
          success: false,
          error: existingCheck.error || 'Failed to check existing submission'
        };
      }

      if (!existingCheck.data?.exists || !existingCheck.data.data) {
        return {
          success: true,
          data: null
        };
      }

      const rowData = existingCheck.data.data;
      const rsvpData = this.convertRowToRSVP(rowData);

      return {
        success: true,
        data: rsvpData
      };

    } catch (error) {
      console.error('Error getting guest RSVP:', error);
      return this.handleError(error, 'Failed to get RSVP data');
    }
  }

  /**
   * Update email confirmation status
   */
  async updateEmailStatus(token: string, sent: boolean): Promise<ServiceResponse<boolean>> {
    try {
      const existingCheck = await this.checkExistingSubmission(token);
      
      if (!existingCheck.success || !existingCheck.data?.exists) {
        return {
          success: false,
          error: 'No existing submission found for this guest',
          code: 'NOT_FOUND'
        };
      }

      const rowIndex = existingCheck.data.rowIndex!;
      const columnIndex = 11; // email_confirmation_sent column (K)

      const result = await this.executeWithRetry(() => 
        this.updateCellInSheet(rowIndex, columnIndex, sent ? 'YES' : 'NO')
      );

      return {
        success: result.success,
        data: result.success,
        error: result.error
      };

    } catch (error) {
      console.error('Error updating email status:', error);
      return this.handleError(error, 'Failed to update email status');
    }
  }

  /**
   * Get RSVP statistics for admin view
   */
  async getRSVPStatistics(): Promise<ServiceResponse<RSVPStatistics>> {
    try {
      const result = await this.executeWithRetry(() => 
        this.getSheetData()
      );

      if (!result.success || !result.data) {
        return result;
      }

      const rows = result.data.values || [];
      const statistics = this.calculateStatistics(rows);

      return {
        success: true,
        data: statistics
      };

    } catch (error) {
      console.error('Error getting RSVP statistics:', error);
      return this.handleError(error, 'Failed to get statistics');
    }
  }

  /**
   * Validate submission before processing
   */
  private async validateSubmission(token: string): Promise<ServiceResponse<boolean>> {
    // Rate limiting check
    const rateLimitResult = this.checkRateLimit(token);
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: 'Too many submission attempts. Please wait before trying again.',
        code: 'RATE_LIMITED'
      };
    }

    // Token validation
    const tokenValidation = validateToken(token);
    if (!tokenValidation.isValid) {
      this.recordFailedAttempt(token);
      return {
        success: false,
        error: 'Invalid guest token',
        code: 'INVALID_TOKEN'
      };
    }

    return { success: true, data: true };
  }

  /**
   * Sanitize RSVP data to prevent injection attacks
   */
  private sanitizeRSVPData(data: RSVPSubmission): RSVPSubmission {
    const sanitizeString = (str: string | undefined): string => {
      if (!str) return '';
      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/[<>]/g, '')
        .trim()
        .substring(0, 1000); // Limit length
    };

    return {
      ...data,
      guestName: sanitizeString(data.guestName),
      email: data.email ? sanitizeString(data.email) : undefined,
      mealChoice: data.mealChoice ? sanitizeString(data.mealChoice) : undefined,
      dietaryRestrictions: data.dietaryRestrictions ? sanitizeString(data.dietaryRestrictions) : undefined,
      plusOneName: data.plusOneName ? sanitizeString(data.plusOneName) : undefined,
      plusOneMealChoice: data.plusOneMealChoice ? sanitizeString(data.plusOneMealChoice) : undefined,
      plusOneDietaryRestrictions: data.plusOneDietaryRestrictions ? sanitizeString(data.plusOneDietaryRestrictions) : undefined,
      specialRequests: data.specialRequests ? sanitizeString(data.specialRequests) : undefined
    };
  }

  /**
   * Prepare row data for Google Sheets
   */
  private prepareRowData(rsvpData: RSVPSubmission, _guestInfo: IndividualGuest): GuestRSVPRow {
    return {
      timestamp: new Date().toISOString(),
      guest_token: rsvpData.token,
      guest_name: rsvpData.guestName,
      attending: rsvpData.isAttending ? 'YES' : 'NO',
      meal_choice: rsvpData.mealChoice || '',
      dietary_restrictions: rsvpData.dietaryRestrictions || '',
      plus_one_name: rsvpData.plusOneName || '',
      plus_one_meal: rsvpData.plusOneMealChoice || '',
      plus_one_dietary: rsvpData.plusOneDietaryRestrictions || '',
      email_address: rsvpData.email || '',
      email_confirmation_sent: rsvpData.wantsEmailConfirmation ? 'PENDING' : 'NO',
      submission_id: '' // Will be set by calling method
    };
  }

  /**
   * Parse row data from Google Sheets
   */
  private parseRowData(row: string[]): GuestRSVPRow {
    return {
      timestamp: row[0] || '',
      guest_token: row[1] || '',
      guest_name: row[2] || '',
      attending: row[3] || '',
      meal_choice: row[4] || '',
      dietary_restrictions: row[5] || '',
      plus_one_name: row[6] || '',
      plus_one_meal: row[7] || '',
      plus_one_dietary: row[8] || '',
      email_address: row[9] || '',
      email_confirmation_sent: row[10] || '',
      submission_id: row[11] || ''
    };
  }

  /**
   * Convert row data back to RSVPSubmission
   */
  private convertRowToRSVP(rowData: GuestRSVPRow): RSVPSubmission {
    return {
      token: rowData.guest_token,
      guestName: rowData.guest_name,
      email: rowData.email_address || undefined,
      isAttending: rowData.attending === 'YES',
      mealChoice: rowData.meal_choice || undefined,
      dietaryRestrictions: rowData.dietary_restrictions || undefined,
      plusOneName: rowData.plus_one_name || undefined,
      plusOneMealChoice: rowData.plus_one_meal || undefined,
      plusOneDietaryRestrictions: rowData.plus_one_dietary || undefined,
      wantsEmailConfirmation: rowData.email_confirmation_sent !== 'NO',
      submittedAt: rowData.timestamp
    };
  }

  /**
   * Generate unique submission ID
   */
  private generateSubmissionId(token: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${token.substring(0, 8)}-${timestamp}-${random}`;
  }

  /**
   * Execute operation with retry logic
   */
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<ServiceResponse<T>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        lastError = error;
        
        if (this.isRetryableError(error)) {
          if (attempt < this.config.retryAttempts) {
            await this.delay(this.config.retryDelay * attempt);
            continue;
          }
        } else {
          // Non-retryable error, fail immediately
          break;
        }
      }
    }

    return this.handleError(lastError, 'Operation failed after retries');
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      // Retry on network errors and server errors, but not client errors
      return !status || status >= 500 || status === 429; // Rate limit
    }
    return true; // Retry unknown errors
  }

  /**
   * Append row to Google Sheets
   */
  private async appendRowToSheet(rowData: GuestRSVPRow): Promise<any> {
    const values = [Object.values(rowData)];
    
    const response: AxiosResponse = await axios.post(
      `${this.baseUrl}/values/${this.config.range}:append`,
      {
        values,
        majorDimension: 'ROWS'
      },
      {
        params: {
          key: this.config.apiKey,
          valueInputOption: 'USER_ENTERED'
        },
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * Update existing row in Google Sheets
   */
  private async updateRowInSheet(rowIndex: number, rowData: GuestRSVPRow): Promise<any> {
    const values = [Object.values(rowData)];
    const range = `${this.config.range.split('!')[0]}!A${rowIndex}:L${rowIndex}`;
    
    const response: AxiosResponse = await axios.put(
      `${this.baseUrl}/values/${range}`,
      {
        values,
        majorDimension: 'ROWS'
      },
      {
        params: {
          key: this.config.apiKey,
          valueInputOption: 'USER_ENTERED'
        },
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * Update single cell in Google Sheets
   */
  private async updateCellInSheet(rowIndex: number, columnIndex: number, value: string): Promise<any> {
    const columnLetter = String.fromCharCode(65 + columnIndex); // A=0, B=1, etc.
    const range = `${this.config.range.split('!')[0]}!${columnLetter}${rowIndex}`;
    
    const response: AxiosResponse = await axios.put(
      `${this.baseUrl}/values/${range}`,
      {
        values: [[value]],
        majorDimension: 'ROWS'
      },
      {
        params: {
          key: this.config.apiKey,
          valueInputOption: 'USER_ENTERED'
        },
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * Get all sheet data
   */
  private async getSheetData(): Promise<any> {
    const response: AxiosResponse = await axios.get(
      `${this.baseUrl}/values/${this.config.range}`,
      {
        params: {
          key: this.config.apiKey
        },
        timeout: 10000
      }
    );

    return response.data;
  }

  /**
   * Calculate statistics from sheet data
   */
  private calculateStatistics(rows: string[][]): RSVPStatistics {
    if (rows.length <= 1) { // Only header or empty
      return {
        totalSubmissions: 0,
        attendingGuests: 0,
        notAttendingGuests: 0,
        guestsWithPlusOne: 0,
        mealChoiceBreakdown: {},
        submissionsByDate: {},
        emailConfirmationsSent: 0,
        lastUpdated: new Date().toISOString()
      };
    }

    const dataRows = rows.slice(1); // Skip header
    const mealChoiceBreakdown: { [key: string]: number } = {};
    const submissionsByDate: { [key: string]: number } = {};

    let attendingGuests = 0;
    let notAttendingGuests = 0;
    let guestsWithPlusOne = 0;
    let emailConfirmationsSent = 0;

    dataRows.forEach(row => {
      const rowData = this.parseRowData(row);
      
      // Attendance count
      if (rowData.attending === 'YES') {
        attendingGuests++;
        
        // Meal choice breakdown
        if (rowData.meal_choice) {
          mealChoiceBreakdown[rowData.meal_choice] = (mealChoiceBreakdown[rowData.meal_choice] || 0) + 1;
        }
        
        // Plus-one count
        if (rowData.plus_one_name) {
          guestsWithPlusOne++;
          
          // Plus-one meal count
          if (rowData.plus_one_meal) {
            mealChoiceBreakdown[rowData.plus_one_meal] = (mealChoiceBreakdown[rowData.plus_one_meal] || 0) + 1;
          }
        }
      } else {
        notAttendingGuests++;
      }

      // Email confirmation count
      if (rowData.email_confirmation_sent === 'YES') {
        emailConfirmationsSent++;
      }

      // Submissions by date
      if (rowData.timestamp) {
        const date = new Date(rowData.timestamp).toDateString();
        submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
      }
    });

    return {
      totalSubmissions: dataRows.length,
      attendingGuests,
      notAttendingGuests,
      guestsWithPlusOne,
      mealChoiceBreakdown,
      submissionsByDate,
      emailConfirmationsSent,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(token: string): { allowed: boolean; attemptsLeft: number } {
    const now = Date.now();
    const record = this.rateLimitStore.get(token);

    if (!record) {
      this.rateLimitStore.set(token, { attempts: 1, lastAttempt: now });
      return { allowed: true, attemptsLeft: this.MAX_ATTEMPTS - 1 };
    }

    // Check if locked out
    if (record.lockedUntil && now < record.lockedUntil) {
      return { allowed: false, attemptsLeft: 0 };
    }

    // Reset if outside time window
    if (now - record.lastAttempt > this.RATE_LIMIT_WINDOW) {
      this.rateLimitStore.set(token, { attempts: 1, lastAttempt: now });
      return { allowed: true, attemptsLeft: this.MAX_ATTEMPTS - 1 };
    }

    // Check if under limit
    if (record.attempts < this.MAX_ATTEMPTS) {
      record.attempts++;
      record.lastAttempt = now;
      return { allowed: true, attemptsLeft: this.MAX_ATTEMPTS - record.attempts };
    }

    // Over limit, apply lockout
    record.lockedUntil = now + this.LOCKOUT_DURATION;
    return { allowed: false, attemptsLeft: 0 };
  }

  /**
   * Record failed attempt for rate limiting
   */
  private recordFailedAttempt(token: string): void {
    const now = Date.now();
    const record = this.rateLimitStore.get(token) || { attempts: 0, lastAttempt: now };
    
    record.attempts++;
    record.lastAttempt = now;
    
    if (record.attempts >= this.MAX_ATTEMPTS) {
      record.lockedUntil = now + this.LOCKOUT_DURATION;
    }
    
    this.rateLimitStore.set(token, record);
  }

  /**
   * Record successful submission (clears rate limiting)
   */
  private recordSuccessfulSubmission(token: string): void {
    this.rateLimitStore.delete(token);
  }

  /**
   * Handle errors with user-friendly messages
   */
  private handleError(error: any, defaultMessage: string): ServiceResponse<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      
      if (axiosError.code === 'ECONNABORTED' || axiosError.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Request timed out. Please check your internet connection and try again.',
          code: 'TIMEOUT'
        };
      }
      
      if (axiosError.response?.status === 403) {
        return {
          success: false,
          error: 'Access denied. Please contact support if this problem persists.',
          code: 'FORBIDDEN'
        };
      }
      
      if (axiosError.response?.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMITED'
        };
      }
      
      if (axiosError.response?.status === 404) {
        return {
          success: false,
          error: 'Spreadsheet not found. Please contact support.',
          code: 'NOT_FOUND'
        };
      }
      
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return {
          success: false,
          error: 'Server error. Please try again in a few minutes.',
          code: 'SERVER_ERROR'
        };
      }
    }

    return {
      success: false,
      error: defaultMessage,
      code: 'UNKNOWN_ERROR'
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export configured service instance
const defaultConfig: GoogleSheetsConfig = {
  spreadsheetId: process.env.REACT_APP_GOOGLE_SPREADSHEET_ID || '',
  apiKey: process.env.REACT_APP_GOOGLE_SHEETS_API_KEY || '',
  range: 'RSVP_Individual!A1:L',
  retryAttempts: 3,
  retryDelay: 1000
};

export const googleSheetsService = new GoogleSheetsService(defaultConfig);
export default GoogleSheetsService;
export type { RSVPStatistics, ServiceResponse };