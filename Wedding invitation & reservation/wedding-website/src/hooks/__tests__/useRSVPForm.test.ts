import { renderHook, act } from '@testing-library/react';
import { useRSVPForm } from '../useRSVPForm';
import type { IndividualGuest } from '../../types';

// Mock the external services
jest.mock('../../services/GoogleSheetsService', () => ({
  googleSheetsService: {
    getGuestRSVPByToken: jest.fn(),
    submitGuestRSVP: jest.fn(),
    updateGuestRSVP: jest.fn(),
    updateEmailStatus: jest.fn()
  }
}));

jest.mock('../../utils/emailService', () => ({
  emailService: {
    sendConfirmationEmail: jest.fn()
  }
}));

jest.mock('../../utils/guestSecurity', () => ({
  validateToken: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test data
const mockGuest: IndividualGuest = {
  id: 'guest-1',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  email: 'john@example.com',
  token: 'GUEST123',
  hasUsedToken: false,
  plusOneEligible: true,
  invitationGroup: 'family',
  createdAt: new Date()
};

describe('useRSVPForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with default form data', () => {
      const { result } = renderHook(() => useRSVPForm());

      expect(result.current.formData).toEqual({
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

      expect(result.current.errors).toEqual({});
      expect(result.current.hasExistingSubmission).toBe(false);
      expect(result.current.canSubmit).toBe(false);
      expect(result.current.isFormValid).toBe(false);
    });

    it('should calculate initial form progress correctly', () => {
      const { result } = renderHook(() => useRSVPForm());
      
      expect(result.current.getFormProgress()).toBe(0);
    });
  });

  describe('Form State Management', () => {
    it('should update form fields correctly', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.updateField('guestName', 'John Doe');
        result.current.updateField('isAttending', true);
        result.current.updateField('email', 'john@example.com');
      });

      expect(result.current.formData.guestName).toBe('John Doe');
      expect(result.current.formData.isAttending).toBe(true);
      expect(result.current.formData.email).toBe('john@example.com');
    });

    it('should clear field errors when updating fields', () => {
      const { result } = renderHook(() => useRSVPForm());

      // First validate to generate errors
      act(() => {
        result.current.validateForm();
      });

      expect(result.current.errors.attendance).toBeTruthy();

      // Update field should clear the error
      act(() => {
        result.current.updateField('isAttending', true);
      });

      expect(result.current.errors.attendance).toBeUndefined();
    });

    it('should calculate form progress correctly as fields are filled', () => {
      const { result } = renderHook(() => useRSVPForm());

      // Initially 0%
      expect(result.current.getFormProgress()).toBe(0);

      // Fill attendance (20%)
      act(() => {
        result.current.updateField('isAttending', true);
      });
      expect(result.current.getFormProgress()).toBe(20);

      // Fill guest name (40%)
      act(() => {
        result.current.updateField('guestName', 'John Doe');
      });
      expect(result.current.getFormProgress()).toBe(40);

      // Fill email (60%)
      act(() => {
        result.current.updateField('email', 'john@example.com');
      });
      expect(result.current.getFormProgress()).toBe(60);

      // Fill meal choice (80%)
      act(() => {
        result.current.updateField('mealChoice', 'grilled-salmon');
      });
      expect(result.current.getFormProgress()).toBe(100);
    });
  });

  describe('Validation', () => {
    it('should validate required fields correctly', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        const isValid = result.current.validateForm();
        expect(isValid).toBe(false);
      });

      expect(result.current.errors.attendance).toBeTruthy();
      expect(result.current.errors.guestName).toBeTruthy();
    });

    it('should validate email when confirmation is requested', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.updateField('wantsEmailConfirmation', true);
        result.current.validateForm();
      });

      expect(result.current.errors.email).toBeTruthy();

      act(() => {
        result.current.updateField('email', 'invalid-email');
        result.current.validateForm();
      });

      expect(result.current.errors.email).toBeTruthy();

      act(() => {
        result.current.updateField('email', 'valid@example.com');
        result.current.validateForm();
      });

      expect(result.current.errors.email).toBeUndefined();
    });

    it('should validate meal choice for attending guests', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.updateField('isAttending', true);
        result.current.updateField('guestName', 'John Doe');
        result.current.validateForm();
      });

      expect(result.current.errors.mealChoice).toBeTruthy();

      act(() => {
        result.current.updateField('mealChoice', 'grilled-salmon');
        result.current.validateForm();
      });

      expect(result.current.errors.mealChoice).toBeUndefined();
    });

    it('should validate plus-one meal choice when plus-one is added', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.updateField('isAttending', true);
        result.current.updateField('guestName', 'John Doe');
        result.current.updateField('mealChoice', 'grilled-salmon');
        result.current.updateField('plusOneName', 'Jane Doe');
        result.current.validateForm();
      });

      expect(result.current.errors.plusOneMealChoice).toBeTruthy();

      act(() => {
        result.current.updateField('plusOneMealChoice', 'beef-tenderloin');
        result.current.validateForm();
      });

      expect(result.current.errors.plusOneMealChoice).toBeUndefined();
    });

    it('should not require meal choice for non-attending guests', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.updateField('isAttending', false);
        result.current.updateField('guestName', 'John Doe');
        result.current.updateField('wantsEmailConfirmation', false);
        result.current.validateForm();
      });

      expect(result.current.errors.mealChoice).toBeUndefined();
      expect(result.current.isFormValid).toBe(true);
    });
  });

  describe('Form Reset', () => {
    it('should reset form to default state', () => {
      const { result } = renderHook(() => useRSVPForm());

      // Fill some data
      act(() => {
        result.current.updateField('guestName', 'John Doe');
        result.current.updateField('isAttending', true);
        result.current.updateField('email', 'john@example.com');
      });

      // Reset
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
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

      expect(result.current.errors).toEqual({});
      expect(result.current.hasExistingSubmission).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors correctly', () => {
      const { result } = renderHook(() => useRSVPForm());

      act(() => {
        result.current.validateForm();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
    });
  });

  describe('State Persistence', () => {
    it('should persist form data to localStorage', async () => {
      const { result } = renderHook(() => useRSVPForm());

      // Load existing RSVP (which sets up the token)
      const { validateToken } = require('../../utils/guestSecurity');
      validateToken.mockReturnValue({ isValid: true });

      const { googleSheetsService } = require('../../services/GoogleSheetsService');
      googleSheetsService.getGuestRSVPByToken.mockResolvedValue({
        success: true,
        data: null
      });

      await act(async () => {
        await result.current.loadExistingRSVP('GUEST123');
      });

      // Update form data
      act(() => {
        result.current.updateField('guestName', 'John Doe');
      });

      // Wait for debounced save
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 1100));
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'rsvp_form_GUEST123',
        expect.stringContaining('John Doe')
      );
    });
  });

  describe('Utility Functions', () => {
    it('should determine canSubmit correctly', () => {
      const { result } = renderHook(() => useRSVPForm());

      // Initially cannot submit
      expect(result.current.canSubmit).toBe(false);

      // Fill required fields
      act(() => {
        result.current.updateField('isAttending', true);
        result.current.updateField('guestName', 'John Doe');
        result.current.updateField('mealChoice', 'grilled-salmon');
        result.current.updateField('wantsEmailConfirmation', false);
      });

      expect(result.current.canSubmit).toBe(true);
    });
  });
});

// Integration test utilities
export const createMockFormData = (overrides = {}) => ({
  isAttending: true,
  guestName: 'John Doe',
  email: 'john@example.com',
  mealChoice: 'grilled-salmon',
  dietaryRestrictions: '',
  plusOneName: '',
  plusOneMealChoice: '',
  plusOneDietaryRestrictions: '',
  wantsEmailConfirmation: true,
  specialRequests: '',
  ...overrides
});

export const createMockGuest = (overrides = {}): IndividualGuest => ({
  id: 'guest-1',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  email: 'john@example.com',
  token: 'GUEST123',
  hasUsedToken: false,
  plusOneEligible: true,
  invitationGroup: 'family',
  createdAt: new Date(),
  ...overrides
});

export const setupMockServices = () => {
  const { validateToken } = require('../../utils/guestSecurity');
  const { googleSheetsService } = require('../../services/GoogleSheetsService');
  const { emailService } = require('../../utils/emailService');

  validateToken.mockReturnValue({ isValid: true });
  
  googleSheetsService.getGuestRSVPByToken.mockResolvedValue({
    success: true,
    data: null
  });
  
  googleSheetsService.submitGuestRSVP.mockResolvedValue({
    success: true,
    data: 'SUBMISSION_123'
  });
  
  googleSheetsService.updateGuestRSVP.mockResolvedValue({
    success: true,
    data: 'SUBMISSION_123'
  });
  
  googleSheetsService.updateEmailStatus.mockResolvedValue({
    success: true
  });
  
  emailService.sendConfirmationEmail.mockResolvedValue({
    success: true
  });

  return {
    validateToken,
    googleSheetsService,
    emailService
  };
};