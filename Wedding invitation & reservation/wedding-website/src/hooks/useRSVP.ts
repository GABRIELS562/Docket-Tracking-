import { useState, useCallback } from 'react';
import type { APIResponse, FormErrors, RSVPSubmission, IndividualGuest } from '../types';
import { googleSheetsService } from '../services/GoogleSheetsService';
import EmailService from '../utils/emailService';
import { validateToken } from '../utils/guestSecurity';

interface UseRSVPReturn {
  isLoading: boolean;
  errors: FormErrors;
  submitRSVP: (rsvpData: RSVPSubmission, guestInfo: IndividualGuest) => Promise<APIResponse<boolean>>;
  updateRSVP: (rsvpData: RSVPSubmission, guestInfo: IndividualGuest) => Promise<APIResponse<boolean>>;
  loadExistingRSVP: (guestToken: string) => Promise<APIResponse<RSVPSubmission | null>>;
  clearErrors: () => void;
  setErrors: (errors: FormErrors) => void;
}

export const useRSVP = (): UseRSVPReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const emailService = new EmailService({
    serviceId: import.meta.env.REACT_APP_EMAILJS_SERVICE_ID || import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
    templateId: import.meta.env.REACT_APP_EMAILJS_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    publicKey: import.meta.env.REACT_APP_EMAILJS_PUBLIC_KEY || import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''
  });

  const submitRSVP = useCallback(async (
    rsvpData: RSVPSubmission,
    guestInfo: IndividualGuest
  ): Promise<APIResponse<boolean>> => {
    setIsLoading(true);
    setErrors({});

    try {
      // Token validation
      const tokenValidation = validateToken(rsvpData.token);
      if (!tokenValidation.isValid) {
        setErrors({ token: tokenValidation.error || 'Invalid guest token' });
        return { success: false, error: 'Invalid guest token' };
      }

      // Submit to Google Sheets using the robust service
      const rsvpResponse = await googleSheetsService.submitGuestRSVP(rsvpData, guestInfo);
      
      if (!rsvpResponse.success) {
        setErrors({ submit: rsvpResponse.error || 'Failed to submit RSVP' });
        return { 
          success: false, 
          error: rsvpResponse.error || 'Failed to submit RSVP'
        };
      }

      // Send email confirmation if requested and attending
      if (rsvpData.wantsEmailConfirmation && rsvpData.email && rsvpData.isAttending) {
        try {
          const emailResponse = await emailService.sendConfirmationEmail(rsvpData);
          if (emailResponse.success) {
            // Update email status in sheets
            await googleSheetsService.updateEmailStatus(rsvpData.token, true);
          }
        } catch (error) {
          console.warn('RSVP submitted but confirmation email failed:', error);
        }
      }

      return { success: true, data: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors({ submit: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateRSVP = useCallback(async (
    rsvpData: RSVPSubmission,
    guestInfo: IndividualGuest
  ): Promise<APIResponse<boolean>> => {
    setIsLoading(true);
    setErrors({});

    try {
      // Token validation
      const tokenValidation = validateToken(rsvpData.token);
      if (!tokenValidation.isValid) {
        setErrors({ token: tokenValidation.error || 'Invalid guest token' });
        return { success: false, error: 'Invalid guest token' };
      }

      // Update in Google Sheets using the robust service
      const updateResponse = await googleSheetsService.updateGuestRSVP(rsvpData, guestInfo);
      
      if (!updateResponse.success) {
        setErrors({ submit: updateResponse.error || 'Failed to update RSVP' });
        return { 
          success: false, 
          error: updateResponse.error || 'Failed to update RSVP'
        };
      }

      // Send email notification if requested and attending
      if (rsvpData.wantsEmailConfirmation && rsvpData.email && rsvpData.isAttending) {
        try {
          const emailResponse = await emailService.sendConfirmationEmail(rsvpData);
          if (emailResponse.success) {
            // Update email status in sheets
            await googleSheetsService.updateEmailStatus(rsvpData.token, true);
          }
        } catch (error) {
          console.warn('RSVP updated but notification email failed:', error);
        }
      }

      return { success: true, data: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setErrors({ submit: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadExistingRSVP = useCallback(async (
    guestToken: string
  ): Promise<APIResponse<RSVPSubmission | null>> => {
    setIsLoading(true);
    setErrors({});

    try {
      const response = await googleSheetsService.getGuestRSVPByToken(guestToken);
      
      if (!response.success) {
        setErrors({ load: response.error || 'Failed to load existing RSVP' });
        return { 
          success: false, 
          error: response.error || 'Failed to load existing RSVP'
        };
      }

      return { success: true, data: response.data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load existing RSVP';
      setErrors({ load: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setErrorsCallback = useCallback((newErrors: FormErrors) => {
    setErrors(newErrors);
  }, []);

  return {
    isLoading,
    errors,
    submitRSVP,
    updateRSVP,
    loadExistingRSVP,
    clearErrors,
    setErrors: setErrorsCallback
  };
};