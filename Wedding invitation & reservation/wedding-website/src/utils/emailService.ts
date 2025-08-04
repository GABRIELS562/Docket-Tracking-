import emailjs from '@emailjs/browser';
import type { EmailJSConfig, RSVPFormData, RSVPSubmission, APIResponse } from '../types';
import { weddingInfo } from '../data/weddingInfo';

interface EmailTemplateData extends Record<string, unknown> {
  // Header Information
  bride_name: string;
  groom_name: string;
  couple_names: string;
  wedding_date: string;
  wedding_time: string;
  
  // Guest Information
  to_name: string;
  to_email: string;
  
  // RSVP Details
  attendance_status: string;
  attendance_message: string;
  
  // Meal Information (conditional)
  show_meal_info: string;
  meal_choice: string;
  dietary_restrictions: string;
  
  // Plus-One Information (conditional)
  show_plus_one: string;
  plus_one_name: string;
  plus_one_meal: string;
  plus_one_dietary: string;
  
  // Special Requests
  special_requests: string;
  
  // Venue Information
  ceremony_venue: string;
  ceremony_address: string;
  reception_venue: string;
  reception_address: string;
  
  // Contact Information
  contact_phone: string;
  contact_email: string;
  
  // Additional Info
  dress_code: string;
  parking_info: string;
  website_url: string;
  hashtag: string;
  
  // Submission Details
  submission_id: string;
  submission_type: string;
}

class EmailService {
  private config: EmailJSConfig;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(config: EmailJSConfig) {
    this.config = config;
    emailjs.init(this.config.publicKey);
  }

  /**
   * Validate EmailJS configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.config.serviceId) {
      errors.push('EmailJS Service ID is required');
    }
    
    if (!this.config.templateId) {
      errors.push('EmailJS Template ID is required');
    }
    
    if (!this.config.publicKey) {
      errors.push('EmailJS Public Key is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Send professional RSVP confirmation email with retry logic
   */
  async sendConfirmationEmail(rsvpData: RSVPSubmission): Promise<APIResponse<boolean>> {
    try {
      // Validate configuration first
      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        return {
          success: false,
          error: `Email configuration invalid: ${configValidation.errors.join(', ')}`
        };
      }

      // Validate email address
      if (!rsvpData.email || !this.isValidEmail(rsvpData.email)) {
        return {
          success: false,
          error: 'Invalid email address provided'
        };
      }

      // Prepare template data with conditional content
      const templateData = this.prepareTemplateData(rsvpData);
      
      // Send email with retry logic
      const result = await this.sendEmailWithRetry(templateData);
      
      if (result.success) {
        console.log(`Confirmation email sent successfully to ${rsvpData.email}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error in sendConfirmationEmail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error sending email'
      };
    }
  }

  /**
   * Send RSVP update notification email
   */
  async sendUpdateNotification(rsvpData: RSVPSubmission): Promise<APIResponse<boolean>> {
    try {
      // Prepare template data for update
      const templateData = this.prepareTemplateData(rsvpData, 'update');
      
      // Send email with retry logic
      const result = await this.sendEmailWithRetry(templateData);
      
      if (result.success) {
        console.log(`Update notification sent successfully to ${rsvpData.email}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error in sendUpdateNotification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error sending update email'
      };
    }
  }

  /**
   * Prepare comprehensive template data with conditional content
   */
  private prepareTemplateData(rsvpData: RSVPSubmission, submissionType: 'new' | 'update' = 'new'): EmailTemplateData {
    const isAttending = rsvpData.isAttending;
    const hasPlusOne = isAttending && rsvpData.plusOneName && rsvpData.plusOneName.trim() !== '';
    
    return {
      // Header Information
      bride_name: weddingInfo.bride.name,
      groom_name: weddingInfo.groom.name,
      couple_names: `${weddingInfo.bride.name} & ${weddingInfo.groom.name}`,
      wedding_date: this.formatWeddingDate(),
      wedding_time: this.formatWeddingTime(),
      
      // Guest Information
      to_name: rsvpData.guestName,
      to_email: rsvpData.email || '',
      
      // RSVP Details
      attendance_status: isAttending ? 'attending' : 'not attending',
      attendance_message: this.getAttendanceMessage(isAttending, submissionType),
      
      // Meal Information (conditional)
      show_meal_info: isAttending ? 'yes' : 'no',
      meal_choice: isAttending ? (rsvpData.mealChoice || 'Not yet selected') : '',
      dietary_restrictions: isAttending ? (rsvpData.dietaryRestrictions || 'None specified') : '',
      
      // Plus-One Information (conditional)
      show_plus_one: hasPlusOne ? 'yes' : 'no',
      plus_one_name: hasPlusOne ? rsvpData.plusOneName || '' : '',
      plus_one_meal: hasPlusOne ? (rsvpData.plusOneMealChoice || 'Not yet selected') : '',
      plus_one_dietary: hasPlusOne ? (rsvpData.plusOneDietaryRestrictions || 'None specified') : '',
      
      // Special Requests
      special_requests: rsvpData.specialRequests || 'None',
      
      // Venue Information
      ceremony_venue: weddingInfo.venue.ceremony.name,
      ceremony_address: this.formatAddress(weddingInfo.venue.ceremony),
      reception_venue: weddingInfo.venue.reception.name,
      reception_address: this.formatAddress(weddingInfo.venue.reception),
      
      // Contact Information
      contact_phone: weddingInfo.bride.phone || weddingInfo.groom.phone || '',
      contact_email: weddingInfo.bride.email || weddingInfo.groom.email || '',
      
      // Additional Info
      dress_code: weddingInfo.importantInfo?.dressCode || 'Cocktail Attire',
      parking_info: weddingInfo.venue.ceremony.parkingInfo || 'Parking information will be provided closer to the wedding date.',
      website_url: weddingInfo.website || '',
      hashtag: weddingInfo.hashtag || `#${weddingInfo.bride.name}${weddingInfo.groom.name}Wedding`,
      
      // Submission Details
      submission_id: this.generateSubmissionId(rsvpData.token),
      submission_type: submissionType
    };
  }

  /**
   * Send email with retry logic
   */
  private async sendEmailWithRetry(templateData: EmailTemplateData): Promise<APIResponse<boolean>> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await emailjs.send(
          this.config.serviceId,
          this.config.templateId,
          templateData
        );

        if (response.status === 200) {
          return { success: true, data: true };
        } else {
          throw new Error(`EmailJS returned status ${response.status}`);
        }
        
      } catch (error) {
        lastError = error;
        console.warn(`Email send attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY * attempt);
        }
      }
    }
    
    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : 'Failed to send email after retries'
    };
  }

  /**
   * Test EmailJS connection
   */
  async testConnection(): Promise<APIResponse<boolean>> {
    try {
      // Validate configuration first
      const configValidation = this.validateConfiguration();
      if (!configValidation.isValid) {
        return {
          success: false,
          error: `Configuration invalid: ${configValidation.errors.join(', ')}`
        };
      }

      // Send a simple test email
      const testData = {
        to_name: 'Test User',
        to_email: 'test@example.com',
        test_message: 'EmailJS connection test',
        bride_name: weddingInfo.bride.name,
        groom_name: weddingInfo.groom.name,
        wedding_date: this.formatWeddingDate()
      };

      const response = await emailjs.send(
        this.config.serviceId,
        this.config.templateId,
        testData
      );

      return { 
        success: response.status === 200, 
        data: response.status === 200 
      };
      
    } catch (error) {
      console.error('EmailJS connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Legacy methods for backward compatibility
   */
  async sendRSVPSubmissionConfirmation(rsvpData: RSVPSubmission): Promise<APIResponse<boolean>> {
    return this.sendConfirmationEmail(rsvpData);
  }

  async sendRSVPConfirmation(rsvpData: RSVPFormData, guestName: string): Promise<APIResponse<boolean>> {
    // Convert RSVPFormData to RSVPSubmission for compatibility
    const rsvpSubmission: RSVPSubmission = {
      token: rsvpData.guestToken,
      guestName: guestName,
      email: rsvpData.email,
      isAttending: rsvpData.isAttending,
      mealChoice: rsvpData.mealChoices?.[0]?.mainCourse || undefined,
      dietaryRestrictions: rsvpData.dietaryRestrictions?.join(', ') || undefined,
      plusOneName: rsvpData.guestNames?.[1] || undefined,
      plusOneMealChoice: rsvpData.mealChoices?.[1]?.mainCourse || undefined,
      plusOneDietaryRestrictions: undefined,
      wantsEmailConfirmation: true,
      specialRequests: rsvpData.specialRequests || undefined,
      submittedAt: new Date().toISOString()
    };
    
    return this.sendConfirmationEmail(rsvpSubmission);
  }

  async sendRSVPUpdateNotification(rsvpData: RSVPFormData, guestName: string): Promise<APIResponse<boolean>> {
    // Convert and call update notification
    const rsvpSubmission: RSVPSubmission = {
      token: rsvpData.guestToken,
      guestName: guestName,
      email: rsvpData.email,
      isAttending: rsvpData.isAttending,
      mealChoice: rsvpData.mealChoices?.[0]?.mainCourse || undefined,
      dietaryRestrictions: rsvpData.dietaryRestrictions?.join(', ') || undefined,
      plusOneName: rsvpData.guestNames?.[1] || undefined,
      plusOneMealChoice: rsvpData.mealChoices?.[1]?.mainCourse || undefined,
      plusOneDietaryRestrictions: undefined,
      wantsEmailConfirmation: true,
      specialRequests: rsvpData.specialRequests || undefined,
      submittedAt: new Date().toISOString()
    };
    
    return this.sendUpdateNotification(rsvpSubmission);
  }

  /**
   * Helper methods for email formatting
   */
  private formatWeddingDate(): string {
    return weddingInfo.date.ceremony.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatWeddingTime(): string {
    return weddingInfo.date.ceremony.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  private formatAddress(venue: any): string {
    return `${venue.address}, ${venue.city}, ${venue.state} ${venue.zipCode}`;
  }

  private getAttendanceMessage(isAttending: boolean, submissionType: 'new' | 'update'): string {
    if (submissionType === 'update') {
      return isAttending 
        ? "Thank you for updating your RSVP! We're thrilled you'll be celebrating with us."
        : "Thank you for updating your RSVP. We're sorry you can't make it, but we appreciate you letting us know.";
    } else {
      return isAttending 
        ? "Thank you for your RSVP! We're so excited to celebrate with you."
        : "Thank you for your RSVP. We're sorry you can't make it, but we appreciate you letting us know.";
    }
  }

  private generateSubmissionId(token: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${token.substring(0, 6)}-${timestamp}-${random}`.toUpperCase();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default EmailService;

// Default email service configuration
const defaultEmailConfig: EmailJSConfig = {
  serviceId: import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  templateId: import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
  publicKey: import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
};

// Export configured service instance
export const emailService = new EmailService(defaultEmailConfig);

/**
 * Convenience functions for easy integration
 */
export async function sendConfirmationEmail(rsvpData: RSVPSubmission): Promise<void> {
  const result = await emailService.sendConfirmationEmail(rsvpData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to send confirmation email');
  }
}

export async function sendUpdateEmail(rsvpData: RSVPSubmission): Promise<void> {
  const result = await emailService.sendUpdateNotification(rsvpData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to send update email');
  }
}

export async function testEmailConnection(): Promise<{ success: boolean; error?: string }> {
  const result = await emailService.testConnection();
  return {
    success: result.success,
    error: result.error
  };
}

export async function validateEmailConfig(): Promise<{ isValid: boolean; errors: string[] }> {
  return emailService.validateConfiguration();
}