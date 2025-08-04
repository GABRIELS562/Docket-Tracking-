import { useState, useCallback, useEffect, useRef } from 'react';
import type { RSVPSubmission, IndividualGuest } from '../types';
import { googleSheetsService } from '../services/GoogleSheetsService';
import { emailService } from '../utils/emailService';
import { validateToken } from '../utils/guestSecurity';

// Form data interface for the hook
export interface RSVPFormData {
  isAttending: boolean | null;
  guestName: string;
  email: string;
  mealChoice: string;
  dietaryRestrictions: string;
  plusOneName: string;
  plusOneMealChoice: string;
  plusOneDietaryRestrictions: string;
  wantsEmailConfirmation: boolean;
  specialRequests: string;
}

// Validation errors interface
export interface RSVPValidationErrors {
  attendance?: string;
  guestName?: string;
  email?: string;
  mealChoice?: string;
  plusOneMealChoice?: string;
  token?: string;
  general?: string;
}

// Submission states
export interface RSVPSubmissionState {
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  isSubmitError: boolean;
  submitError: string | null;
  submissionId: string | null;
}

// Email states
export interface RSVPEmailState {
  isSendingEmail: boolean;
  isEmailSent: boolean;
  isEmailError: boolean;
  emailError: string | null;
}

// Loading states
export interface RSVPLoadingState {
  isLoading: boolean;
  isLoadingExisting: boolean;
  isValidatingToken: boolean;
}

// Hook return interface
export interface UseRSVPFormReturn {
  // Form state
  formData: RSVPFormData;
  setFormData: React.Dispatch<React.SetStateAction<RSVPFormData>>;
  updateField: (field: keyof RSVPFormData, value: any) => void;
  
  // Validation
  errors: RSVPValidationErrors;
  isFormValid: boolean;
  validateForm: () => boolean;
  clearErrors: () => void;
  
  // Submission state
  submissionState: RSVPSubmissionState;
  emailState: RSVPEmailState;
  loadingState: RSVPLoadingState;
  
  // Actions
  submitRSVP: (token: string, guestInfo: IndividualGuest) => Promise<boolean>;
  loadExistingRSVP: (token: string) => Promise<boolean>;
  resetForm: () => void;
  
  // Utilities
  hasExistingSubmission: boolean;
  canSubmit: boolean;
  getFormProgress: () => number;
}

// Default form data
const getDefaultFormData = (): RSVPFormData => ({
  isAttending: null,
  guestName: '',
  email: '',
  mealChoice: '',
  dietaryRestrictions: '',
  plusOneName: '',
  plusOneMealChoice: '',
  plusOneDietaryRestrictions: '',
  wantsEmailConfirmation: true,
  specialRequests: ''
});

// Validation rules
const validateFormData = (data: RSVPFormData): RSVPValidationErrors => {
  const errors: RSVPValidationErrors = {};

  // Attendance is required
  if (data.isAttending === null) {
    errors.attendance = 'Please select whether you will be attending';
  }

  // Guest name validation
  if (!data.guestName.trim()) {
    errors.guestName = 'Guest name is required';
  } else if (data.guestName.trim().length < 2) {
    errors.guestName = 'Guest name must be at least 2 characters';
  } else if (data.guestName.trim().length > 100) {
    errors.guestName = 'Guest name is too long';
  }

  // Email validation if confirmation is requested
  if (data.wantsEmailConfirmation) {
    if (!data.email.trim()) {
      errors.email = 'Email is required for confirmation';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }
  }

  // Meal choice validation for attending guests
  if (data.isAttending) {
    if (!data.mealChoice.trim()) {
      errors.mealChoice = 'Meal selection is required for attending guests';
    }

    // Plus-one meal validation
    if (data.plusOneName.trim() && !data.plusOneMealChoice.trim()) {
      errors.plusOneMealChoice = 'Plus-one meal selection is required';
    }
  }

  return errors;
};

// Local storage key for form persistence
const getStorageKey = (token: string) => `rsvp_form_${token}`;

export const useRSVPForm = (): UseRSVPFormReturn => {
  // Form state
  const [formData, setFormData] = useState<RSVPFormData>(getDefaultFormData);
  const [errors, setErrors] = useState<RSVPValidationErrors>({});
  
  // Submission state
  const [submissionState, setSubmissionState] = useState<RSVPSubmissionState>({
    isSubmitting: false,
    isSubmitSuccess: false,
    isSubmitError: false,
    submitError: null,
    submissionId: null
  });
  
  // Email state
  const [emailState, setEmailState] = useState<RSVPEmailState>({
    isSendingEmail: false,
    isEmailSent: false,
    isEmailError: false,
    emailError: null
  });
  
  // Loading state
  const [loadingState, setLoadingState] = useState<RSVPLoadingState>({
    isLoading: false,
    isLoadingExisting: false,
    isValidatingToken: false
  });
  
  // Additional state
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const currentTokenRef = useRef<string | null>(null);

  // Update individual form field
  const updateField = useCallback((field: keyof RSVPFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof RSVPValidationErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Validate form and return boolean
  const validateForm = useCallback(() => {
    const validationErrors = validateFormData(formData);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [formData]);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Reset form to default state
  const resetForm = useCallback(() => {
    setFormData(getDefaultFormData());
    setErrors({});
    setSubmissionState({
      isSubmitting: false,
      isSubmitSuccess: false,
      isSubmitError: false,
      submitError: null,
      submissionId: null
    });
    setEmailState({
      isSendingEmail: false,
      isEmailSent: false,
      isEmailError: false,
      emailError: null
    });
    setHasExistingSubmission(false);
    
    // Clear persisted data
    if (currentTokenRef.current) {
      localStorage.removeItem(getStorageKey(currentTokenRef.current));
    }
  }, []);

  // Load existing RSVP
  const loadExistingRSVP = useCallback(async (token: string): Promise<boolean> => {
    setLoadingState(prev => ({ ...prev, isLoadingExisting: true }));
    currentTokenRef.current = token;
    
    try {
      // Validate token first
      const tokenValidation = validateToken(token);
      if (!tokenValidation.isValid) {
        setErrors({ token: tokenValidation.error || 'Invalid guest token' });
        return false;
      }

      // Try to load from Google Sheets
      const result = await googleSheetsService.getGuestRSVPByToken(token);
      
      if (result.success && result.data) {
        // Convert RSVPSubmission to form data
        const rsvpData = result.data;
        setFormData({
          isAttending: rsvpData.isAttending,
          guestName: rsvpData.guestName,
          email: rsvpData.email || '',
          mealChoice: rsvpData.mealChoice || '',
          dietaryRestrictions: rsvpData.dietaryRestrictions || '',
          plusOneName: rsvpData.plusOneName || '',
          plusOneMealChoice: rsvpData.plusOneMealChoice || '',
          plusOneDietaryRestrictions: rsvpData.plusOneDietaryRestrictions || '',
          wantsEmailConfirmation: rsvpData.wantsEmailConfirmation,
          specialRequests: rsvpData.specialRequests || ''
        });
        
        setHasExistingSubmission(true);
        
        // Persist to local storage
        localStorage.setItem(getStorageKey(token), JSON.stringify(formData));
        
        return true;
      } else {
        // Try to load from local storage
        const stored = localStorage.getItem(getStorageKey(token));
        if (stored) {
          try {
            const parsedData = JSON.parse(stored);
            setFormData(parsedData);
          } catch (error) {
            console.warn('Failed to parse stored form data:', error);
          }
        }
        
        setHasExistingSubmission(false);
        return true;
      }
      
    } catch (error) {
      console.error('Error loading existing RSVP:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to load existing RSVP' 
      });
      return false;
    } finally {
      setLoadingState(prev => ({ ...prev, isLoadingExisting: false }));
    }
  }, [formData]);

  // Submit RSVP with comprehensive workflow
  const submitRSVP = useCallback(async (token: string, guestInfo: IndividualGuest): Promise<boolean> => {
    // Reset states
    setSubmissionState({
      isSubmitting: true,
      isSubmitSuccess: false,
      isSubmitError: false,
      submitError: null,
      submissionId: null
    });
    
    setEmailState({
      isSendingEmail: false,
      isEmailSent: false,
      isEmailError: false,
      emailError: null
    });

    try {
      // Step 1: Validate form
      const isValid = validateForm();
      if (!isValid) {
        setSubmissionState(prev => ({
          ...prev,
          isSubmitting: false,
          isSubmitError: true,
          submitError: 'Please fix the form errors before submitting'
        }));
        return false;
      }

      // Step 2: Validate token
      const tokenValidation = validateToken(token);
      if (!tokenValidation.isValid) {
        setErrors({ token: tokenValidation.error || 'Invalid guest token' });
        setSubmissionState(prev => ({
          ...prev,
          isSubmitting: false,
          isSubmitError: true,
          submitError: 'Invalid guest token'
        }));
        return false;
      }

      // Step 3: Prepare RSVP data
      const rsvpData: RSVPSubmission = {
        token,
        guestName: formData.guestName,
        email: formData.email || undefined,
        isAttending: formData.isAttending!,
        mealChoice: formData.isAttending ? formData.mealChoice || undefined : undefined,
        dietaryRestrictions: formData.isAttending ? formData.dietaryRestrictions || undefined : undefined,
        plusOneName: formData.isAttending && formData.plusOneName ? formData.plusOneName : undefined,
        plusOneMealChoice: formData.isAttending && formData.plusOneName && formData.plusOneMealChoice ? formData.plusOneMealChoice : undefined,
        plusOneDietaryRestrictions: formData.isAttending && formData.plusOneName && formData.plusOneDietaryRestrictions ? formData.plusOneDietaryRestrictions : undefined,
        wantsEmailConfirmation: formData.wantsEmailConfirmation,
        specialRequests: formData.specialRequests || undefined,
        submittedAt: new Date().toISOString()
      };

      // Step 4: Submit to Google Sheets
      let sheetsResult: any;
      if (hasExistingSubmission) {
        sheetsResult = await googleSheetsService.updateGuestRSVP(rsvpData, guestInfo);
      } else {
        sheetsResult = await googleSheetsService.submitGuestRSVP(rsvpData, guestInfo);
      }

      if (!sheetsResult.success) {
        setSubmissionState(prev => ({
          ...prev,
          isSubmitting: false,
          isSubmitError: true,
          submitError: sheetsResult.error || 'Failed to submit RSVP'
        }));
        return false;
      }

      // Step 5: Send email if requested
      if (formData.wantsEmailConfirmation && formData.email) {
        setEmailState(prev => ({ ...prev, isSendingEmail: true }));
        
        try {
          const emailResult = await emailService.sendConfirmationEmail(rsvpData);
          
          if (emailResult.success) {
            // Update email status in sheets
            await googleSheetsService.updateEmailStatus(token, true);
            
            setEmailState(prev => ({
              ...prev,
              isSendingEmail: false,
              isEmailSent: true,
              isEmailError: false,
              emailError: null
            }));
          } else {
            setEmailState(prev => ({
              ...prev,
              isSendingEmail: false,
              isEmailSent: false,
              isEmailError: true,
              emailError: emailResult.error || 'Failed to send confirmation email'
            }));
          }
        } catch (emailError) {
          console.warn('Email sending failed:', emailError);
          setEmailState(prev => ({
            ...prev,
            isSendingEmail: false,
            isEmailSent: false,
            isEmailError: true,
            emailError: emailError instanceof Error ? emailError.message : 'Failed to send email'
          }));
        }
      }

      // Step 6: Update submission state
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: false,
        isSubmitSuccess: true,
        isSubmitError: false,
        submitError: null,
        submissionId: sheetsResult.data || `RSVP_${Date.now()}`
      }));

      // Step 7: Update local state
      setHasExistingSubmission(true);
      
      // Persist form data
      localStorage.setItem(getStorageKey(token), JSON.stringify(formData));

      return true;

    } catch (error) {
      console.error('RSVP submission error:', error);
      setSubmissionState(prev => ({
        ...prev,
        isSubmitting: false,
        isSubmitError: true,
        submitError: error instanceof Error ? error.message : 'An unexpected error occurred'
      }));
      return false;
    }
  }, [formData, hasExistingSubmission, validateForm]);

  // Calculate form progress
  const getFormProgress = useCallback((): number => {
    const fields = [
      formData.isAttending !== null,
      formData.guestName.trim() !== '',
      !formData.wantsEmailConfirmation || formData.email.trim() !== '',
      !formData.isAttending || formData.mealChoice.trim() !== '',
      !formData.isAttending || !formData.plusOneName.trim() || formData.plusOneMealChoice.trim() !== ''
    ];
    
    const completedFields = fields.filter(Boolean).length;
    return Math.round((completedFields / fields.length) * 100);
  }, [formData]);

  // Auto-save form data to localStorage
  useEffect(() => {
    if (currentTokenRef.current) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(getStorageKey(currentTokenRef.current!), JSON.stringify(formData));
      }, 1000); // Debounce saves

      return () => clearTimeout(timeoutId);
    }
  }, [formData]);

  // Derived state
  const isFormValid = Object.keys(errors).length === 0 && formData.isAttending !== null;
  const canSubmit = isFormValid && !submissionState.isSubmitting && !loadingState.isLoading;
  const isLoading = loadingState.isLoading || loadingState.isLoadingExisting || loadingState.isValidatingToken;

  return {
    // Form state
    formData,
    setFormData,
    updateField,
    
    // Validation
    errors,
    isFormValid,
    validateForm,
    clearErrors,
    
    // Submission state
    submissionState,
    emailState,
    loadingState: {
      ...loadingState,
      isLoading
    },
    
    // Actions
    submitRSVP,
    loadExistingRSVP,
    resetForm,
    
    // Utilities
    hasExistingSubmission,
    canSubmit,
    getFormProgress
  };
};