# useRSVPForm Hook Documentation

A comprehensive React hook for managing wedding RSVP form state, validation, submission, and email confirmations.

## Overview

The `useRSVPForm` hook provides complete state management for wedding RSVP forms with:
- ✅ Real-time form validation
- ✅ Submission state tracking
- ✅ Email confirmation management
- ✅ Duplicate prevention
- ✅ Error handling and recovery
- ✅ Form data persistence
- ✅ Progress tracking

## Installation & Import

```typescript
import { useRSVPForm } from './hooks/useRSVPForm';
import type { UseRSVPFormReturn, RSVPFormData } from './hooks/useRSVPForm';
```

## Basic Usage

```typescript
const RSVPForm = () => {
  const {
    // Form state
    formData,
    updateField,
    
    // Validation
    errors,
    isFormValid,
    validateForm,
    
    // Submission
    submitRSVP,
    submissionState,
    emailState,
    
    // Utilities
    canSubmit,
    getFormProgress
  } = useRSVPForm();

  const handleSubmit = async () => {
    if (guest && canSubmit) {
      const success = await submitRSVP(guest.token, guest);
      if (success) {
        console.log('RSVP submitted successfully!');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Your form JSX */}
    </form>
  );
};
```

## Hook Interface

### Form State

#### `formData: RSVPFormData`
Current form data object containing all form fields.

```typescript
interface RSVPFormData {
  isAttending: boolean | null;     // null = not selected
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
```

#### `updateField: (field: keyof RSVPFormData, value: any) => void`
Update individual form fields with automatic error clearing.

```typescript
// Update attendance
updateField('isAttending', true);

// Update guest name
updateField('guestName', 'John Doe');

// Update email
updateField('email', 'john@example.com');
```

### Validation

#### `errors: RSVPValidationErrors`
Current validation errors for each field.

```typescript
interface RSVPValidationErrors {
  attendance?: string;
  guestName?: string;
  email?: string;
  mealChoice?: string;
  plusOneMealChoice?: string;
  token?: string;
  general?: string;
}
```

#### `isFormValid: boolean`
Whether the form is currently valid (no errors).

#### `validateForm: () => boolean`
Manually trigger form validation. Returns `true` if valid.

```typescript
const handleSubmit = () => {
  if (validateForm()) {
    // Form is valid, proceed with submission
    submitRSVP(token, guestInfo);
  }
};
```

#### `clearErrors: () => void`
Clear all validation errors.

### Submission State

#### `submissionState: RSVPSubmissionState`
Current submission state and results.

```typescript
interface RSVPSubmissionState {
  isSubmitting: boolean;        // Currently submitting
  isSubmitSuccess: boolean;     // Successfully submitted
  isSubmitError: boolean;       // Submission failed
  submitError: string | null;   // Error message
  submissionId: string | null;  // Confirmation ID
}
```

#### `emailState: RSVPEmailState`
Email sending state and results.

```typescript
interface RSVPEmailState {
  isSendingEmail: boolean;      // Currently sending email
  isEmailSent: boolean;         // Email sent successfully
  isEmailError: boolean;        // Email failed
  emailError: string | null;    // Email error message
}
```

#### `loadingState: RSVPLoadingState`
Various loading states.

```typescript
interface RSVPLoadingState {
  isLoading: boolean;           // Any loading operation
  isLoadingExisting: boolean;   // Loading existing RSVP
  isValidatingToken: boolean;   // Validating guest token
}
```

### Actions

#### `submitRSVP: (token: string, guestInfo: IndividualGuest) => Promise<boolean>`
Submit or update the RSVP with complete workflow.

```typescript
const handleSubmit = async () => {
  const success = await submitRSVP(guest.token, guest);
  
  if (success) {
    console.log('RSVP submitted successfully!');
    // Check submissionState for confirmation ID
    // Check emailState for email status
  } else {
    console.error('Submission failed:', submissionState.submitError);
  }
};
```

**Submission Workflow:**
1. Validates form data
2. Checks for existing submission
3. Submits to Google Sheets
4. Sends email if requested
5. Updates submission status
6. Provides user feedback

#### `loadExistingRSVP: (token: string) => Promise<boolean>`
Load existing RSVP data for updates.

```typescript
useEffect(() => {
  if (guest?.token) {
    loadExistingRSVP(guest.token);
  }
}, [guest?.token]);
```

#### `resetForm: () => void`
Reset form to default state and clear persistence.

### Utilities

#### `hasExistingSubmission: boolean`
Whether the guest has already submitted an RSVP.

#### `canSubmit: boolean`
Whether the form can be submitted (valid + not submitting).

```typescript
<Button 
  disabled={!canSubmit}
  onClick={handleSubmit}
>
  {hasExistingSubmission ? 'Update RSVP' : 'Submit RSVP'}
</Button>
```

#### `getFormProgress: () => number`
Get form completion percentage (0-100).

```typescript
const progress = getFormProgress();

<div className="progress-bar">
  <div 
    className="progress-fill" 
    style={{ width: `${progress}%` }}
  />
</div>
```

## Validation Rules

### Required Fields

#### Always Required
- **Attendance**: Must select attending or not attending
- **Guest Name**: Minimum 2 characters, maximum 100 characters

#### Conditionally Required
- **Email**: Required if `wantsEmailConfirmation` is true
- **Meal Choice**: Required if `isAttending` is true
- **Plus-One Meal**: Required if `isAttending` is true AND `plusOneName` is provided

### Validation Logic

```typescript
// Attendance validation
if (formData.isAttending === null) {
  errors.attendance = 'Please select whether you will be attending';
}

// Email validation (if confirmation requested)
if (formData.wantsEmailConfirmation && !emailRegex.test(formData.email)) {
  errors.email = 'Please enter a valid email address';
}

// Meal choice validation (for attending guests)
if (formData.isAttending && !formData.mealChoice) {
  errors.mealChoice = 'Meal selection is required for attending guests';
}

// Plus-one meal validation
if (formData.isAttending && formData.plusOneName && !formData.plusOneMealChoice) {
  errors.plusOneMealChoice = 'Plus-one meal selection is required';
}
```

### Real-time Validation

The hook provides real-time validation feedback:
- Errors appear when fields lose focus or form is submitted
- Errors clear automatically when field is corrected
- Form validity updates in real-time

## State Persistence

### Local Storage
Form data is automatically persisted to localStorage:
- Saves after 1-second debounce
- Unique key per guest token: `rsvp_form_${token}`
- Restored when loading existing RSVP
- Cleared on form reset

```typescript
// Storage key format
const storageKey = `rsvp_form_${guestToken}`;

// Auto-save implementation
useEffect(() => {
  const timeoutId = setTimeout(() => {
    localStorage.setItem(storageKey, JSON.stringify(formData));
  }, 1000);
  
  return () => clearTimeout(timeoutId);
}, [formData]);
```

## Error Handling

### Error Categories

#### Validation Errors
- Field-specific validation failures
- Real-time feedback
- Auto-clearing when corrected

#### Submission Errors
- Network failures
- API errors
- Invalid tokens
- Duplicate submissions

#### Email Errors
- Email service failures
- Invalid email addresses
- Network timeouts

### Error Recovery

```typescript
// Handle submission errors
if (submissionState.isSubmitError) {
  return (
    <div className="error-message">
      <p>{submissionState.submitError}</p>
      <Button onClick={() => submitRSVP(token, guest)}>
        Try Again
      </Button>
    </div>
  );
}

// Handle email errors (non-blocking)
if (emailState.isEmailError) {
  return (
    <div className="warning-message">
      <p>RSVP saved successfully, but email confirmation failed.</p>
      <p>Error: {emailState.emailError}</p>
    </div>
  );
}
```

### Graceful Degradation

The hook ensures RSVP submission succeeds even if email fails:
- RSVP is saved to Google Sheets first
- Email failure doesn't block submission
- Email errors are reported separately
- User gets success confirmation for RSVP even if email fails

## Advanced Usage

### Custom Validation

```typescript
const MyRSVPForm = () => {
  const rsvpForm = useRSVPForm();
  
  // Add custom validation
  const customValidate = () => {
    const baseValid = rsvpForm.validateForm();
    
    // Add custom rules
    if (rsvpForm.formData.specialRequests.length > 500) {
      rsvpForm.setErrors(prev => ({
        ...prev,
        specialRequests: 'Special requests too long'
      }));
      return false;
    }
    
    return baseValid;
  };
  
  const handleSubmit = async () => {
    if (customValidate()) {
      await rsvpForm.submitRSVP(token, guest);
    }
  };
};
```

### Conditional Form Sections

```typescript
const ConditionalForm = () => {
  const { formData, updateField } = useRSVPForm();
  
  return (
    <div>
      {/* Attendance selection */}
      <AttendanceSelector 
        value={formData.isAttending}
        onChange={(value) => updateField('isAttending', value)}
      />
      
      {/* Meal section - only if attending */}
      {formData.isAttending && (
        <MealSelection
          mealChoice={formData.mealChoice}
          onMealChange={(meal) => updateField('mealChoice', meal)}
          dietaryRestrictions={formData.dietaryRestrictions}
          onDietaryChange={(diet) => updateField('dietaryRestrictions', diet)}
        />
      )}
      
      {/* Plus-one section - only if attending and eligible */}
      {formData.isAttending && guest.plusOneEligible && (
        <PlusOneSection
          plusOneName={formData.plusOneName}
          onNameChange={(name) => updateField('plusOneName', name)}
          plusOneMeal={formData.plusOneMealChoice}
          onMealChange={(meal) => updateField('plusOneMealChoice', meal)}
        />
      )}
    </div>
  );
};
```

### Progress Tracking

```typescript
const ProgressTracker = () => {
  const { getFormProgress } = useRSVPForm();
  const progress = getFormProgress();
  
  return (
    <div className="progress-container">
      <div className="progress-label">
        Form Progress: {progress}%
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ 
            width: `${progress}%`,
            transition: 'width 0.3s ease'
          }}
        />
      </div>
    </div>
  );
};
```

### Loading States

```typescript
const LoadingHandler = () => {
  const { loadingState, submissionState, emailState } = useRSVPForm();
  
  if (loadingState.isLoadingExisting) {
    return <LoadingSpinner>Loading your RSVP...</LoadingSpinner>;
  }
  
  if (submissionState.isSubmitting) {
    return <LoadingSpinner>Submitting RSVP...</LoadingSpinner>;
  }
  
  if (emailState.isSendingEmail) {
    return <LoadingSpinner>Sending confirmation email...</LoadingSpinner>;
  }
  
  return <RSVPForm />;
};
```

## Testing

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react';
import { useRSVPForm } from '../useRSVPForm';
import { setupMockServices, createMockGuest } from './__tests__/useRSVPForm.test';

describe('RSVP Form Integration', () => {
  it('should handle complete submission workflow', async () => {
    const mocks = setupMockServices();
    const { result } = renderHook(() => useRSVPForm());
    const mockGuest = createMockGuest();

    // Fill form
    act(() => {
      result.current.updateField('isAttending', true);
      result.current.updateField('guestName', 'John Doe');
      result.current.updateField('mealChoice', 'grilled-salmon');
      result.current.updateField('wantsEmailConfirmation', false);
    });

    // Submit
    await act(async () => {
      const success = await result.current.submitRSVP('GUEST123', mockGuest);
      expect(success).toBe(true);
    });

    expect(result.current.submissionState.isSubmitSuccess).toBe(true);
    expect(mocks.googleSheetsService.submitGuestRSVP).toHaveBeenCalled();
  });
});
```

### Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RSVPFormExample from '../RSVPFormExample';

test('should submit RSVP successfully', async () => {
  render(<RSVPFormExample />);
  
  // Fill form
  fireEvent.click(screen.getByText("Yes, I'll be there!"));
  fireEvent.change(screen.getByPlaceholderText('Enter your full name'), {
    target: { value: 'John Doe' }
  });
  
  // Submit
  fireEvent.click(screen.getByText('Submit RSVP'));
  
  // Verify success
  await waitFor(() => {
    expect(screen.getByText('RSVP Submitted Successfully!')).toBeInTheDocument();
  });
});
```

## Best Practices

### Form Organization
- Use conditional rendering for sections
- Group related fields together
- Provide clear visual feedback for each state

### Error Handling
- Show field-specific errors inline
- Provide helpful error messages
- Allow easy error recovery

### User Experience
- Auto-save form data locally
- Show progress indicators
- Provide loading states for all operations
- Handle network failures gracefully

### Performance
- Debounce auto-save operations
- Minimize re-renders with useCallback
- Lazy load validation rules

## Integration Examples

See the complete implementation examples:
- `RSVPFormExample.tsx` - Full form component
- `useRSVPForm.test.ts` - Comprehensive test suite
- Integration with Google Sheets and EmailJS services

---

**The useRSVPForm hook provides everything needed for a professional wedding RSVP experience! 💍**