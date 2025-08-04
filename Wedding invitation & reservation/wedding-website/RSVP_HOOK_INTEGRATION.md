# useRSVPForm Hook - Integration Guide

## Quick Integration Example

Here's how to integrate the `useRSVPForm` hook into your wedding RSVP components:

### 1. Basic Form Component

```typescript
import React, { useEffect } from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';
import { useGuestAuth } from '../hooks/useGuestAuth';

const SimpleRSVPForm = () => {
  const { guest, isAuthenticated } = useGuestAuth();
  const {
    formData,
    updateField,
    errors,
    submissionState,
    submitRSVP,
    loadExistingRSVP,
    canSubmit,
    hasExistingSubmission
  } = useRSVPForm();

  // Load existing RSVP on mount
  useEffect(() => {
    if (isAuthenticated && guest?.token) {
      loadExistingRSVP(guest.token);
    }
  }, [isAuthenticated, guest?.token, loadExistingRSVP]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guest && canSubmit) {
      const success = await submitRSVP(guest.token, guest);
      if (success) {
        console.log('RSVP submitted successfully!');
      }
    }
  };

  // Success state
  if (submissionState.isSubmitSuccess) {
    return (
      <div className="success-message">
        <h2>RSVP {hasExistingSubmission ? 'Updated' : 'Submitted'} Successfully!</h2>
        <p>Confirmation ID: {submissionState.submissionId}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Attendance Selection */}
      <div>
        <h3>Will you be attending?</h3>
        <button 
          type="button"
          onClick={() => updateField('isAttending', true)}
          className={formData.isAttending === true ? 'selected' : ''}
        >
          Yes, I'll be there!
        </button>
        <button 
          type="button"
          onClick={() => updateField('isAttending', false)}
          className={formData.isAttending === false ? 'selected' : ''}
        >
          Sorry, can't make it
        </button>
        {errors.attendance && <p className="error">{errors.attendance}</p>}
      </div>

      {/* Guest Information */}
      <div>
        <label>Your Name *</label>
        <input
          type="text"
          value={formData.guestName}
          onChange={(e) => updateField('guestName', e.target.value)}
          placeholder="Enter your full name"
        />
        {errors.guestName && <p className="error">{errors.guestName}</p>}
      </div>

      {/* Email Confirmation */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.wantsEmailConfirmation}
            onChange={(e) => updateField('wantsEmailConfirmation', e.target.checked)}
          />
          Send me email confirmation
        </label>
      </div>

      {formData.wantsEmailConfirmation && (
        <div>
          <label>Email Address *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="your.email@example.com"
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>
      )}

      {/* Meal Selection - Only if attending */}
      {formData.isAttending && (
        <div>
          <label>Your Meal Choice *</label>
          <select
            value={formData.mealChoice}
            onChange={(e) => updateField('mealChoice', e.target.value)}
          >
            <option value="">Select your meal</option>
            <option value="grilled-salmon">Grilled Salmon</option>
            <option value="beef-tenderloin">Beef Tenderloin</option>
            <option value="chicken-breast">Chicken Breast</option>
            <option value="vegetarian">Vegetarian Pasta</option>
          </select>
          {errors.mealChoice && <p className="error">{errors.mealChoice}</p>}
        </div>
      )}

      {/* Submit Button */}
      <button type="submit" disabled={!canSubmit}>
        {submissionState.isSubmitting 
          ? (hasExistingSubmission ? 'Updating...' : 'Submitting...')
          : (hasExistingSubmission ? 'Update RSVP' : 'Submit RSVP')
        }
      </button>

      {submissionState.isSubmitError && (
        <p className="error">{submissionState.submitError}</p>
      )}
    </form>
  );
};

export default SimpleRSVPForm;
```

### 2. Progress Indicator Component

```typescript
import React from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';

const RSVPProgress = () => {
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
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
```

### 3. Email Status Component

```typescript
import React from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';

const EmailStatus = () => {
  const { emailState, formData } = useRSVPForm();

  if (!formData.wantsEmailConfirmation) {
    return null;
  }

  return (
    <div className="email-status">
      {emailState.isSendingEmail && (
        <p className="status-sending">📧 Sending confirmation email...</p>
      )}
      
      {emailState.isEmailSent && (
        <p className="status-success">✅ Confirmation email sent to {formData.email}</p>
      )}
      
      {emailState.isEmailError && (
        <p className="status-error">
          ⚠️ RSVP saved successfully, but email failed to send
          <br />
          <small>{emailState.emailError}</small>
        </p>
      )}
    </div>
  );
};
```

### 4. Conditional Sections

```typescript
import React from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';

const ConditionalSections = () => {
  const { formData, updateField, errors } = useRSVPForm();

  return (
    <div>
      {/* Plus-One Section - Only if attending */}
      {formData.isAttending && (
        <div className="plus-one-section">
          <h3>Plus-One Information</h3>
          
          <div>
            <label>Plus-One Name</label>
            <input
              type="text"
              value={formData.plusOneName}
              onChange={(e) => updateField('plusOneName', e.target.value)}
              placeholder="Guest's full name (optional)"
            />
          </div>

          {/* Plus-One Meal - Only if plus-one name is provided */}
          {formData.plusOneName.trim() && (
            <div>
              <label>Plus-One Meal Choice *</label>
              <select
                value={formData.plusOneMealChoice}
                onChange={(e) => updateField('plusOneMealChoice', e.target.value)}
              >
                <option value="">Select meal for {formData.plusOneName}</option>
                <option value="grilled-salmon">Grilled Salmon</option>
                <option value="beef-tenderloin">Beef Tenderloin</option>
                <option value="chicken-breast">Chicken Breast</option>
                <option value="vegetarian">Vegetarian Pasta</option>
              </select>
              {errors.plusOneMealChoice && (
                <p className="error">{errors.plusOneMealChoice}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Special Requests */}
      <div>
        <label>Special Requests</label>
        <textarea
          value={formData.specialRequests}
          onChange={(e) => updateField('specialRequests', e.target.value)}
          placeholder="Any special requests or messages?"
          rows={3}
        />
      </div>
    </div>
  );
};
```

### 5. Loading States

```typescript
import React from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';

const LoadingWrapper = ({ children }: { children: React.ReactNode }) => {
  const { loadingState } = useRSVPForm();

  if (loadingState.isLoadingExisting) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Loading your RSVP...</p>
      </div>
    );
  }

  if (loadingState.isValidatingToken) {
    return (
      <div className="loading-container">
        <div className="spinner" />
        <p>Validating guest token...</p>
      </div>
    );
  }

  return <>{children}</>;
};
```

### 6. Error Handling

```typescript
import React from 'react';
import { useRSVPForm } from '../hooks/useRSVPForm';

const ErrorHandler = () => {
  const { errors, submissionState, clearErrors } = useRSVPForm();

  return (
    <div>
      {/* General Error */}
      {errors.general && (
        <div className="alert alert-error">
          <p>{errors.general}</p>
          <button onClick={clearErrors}>Dismiss</button>
        </div>
      )}

      {/* Token Error */}
      {errors.token && (
        <div className="alert alert-error">
          <p>Invalid guest token: {errors.token}</p>
          <p>Please check your invitation link.</p>
        </div>
      )}

      {/* Submission Error */}
      {submissionState.isSubmitError && (
        <div className="alert alert-error">
          <p>Submission failed: {submissionState.submitError}</p>
          <button onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
```

## Integration Checklist

### Required Dependencies
- [ ] `useGuestAuth` hook for guest authentication
- [ ] Google Sheets service for data storage
- [ ] Email service for confirmations
- [ ] Guest security utilities for token validation

### Component Setup
- [ ] Import `useRSVPForm` hook
- [ ] Set up form state with `formData` and `updateField`
- [ ] Handle form submission with `submitRSVP`
- [ ] Load existing RSVP with `loadExistingRSVP`
- [ ] Display validation errors from `errors`

### User Experience
- [ ] Show loading states during operations
- [ ] Display progress indicator
- [ ] Handle success and error states
- [ ] Provide clear feedback for all actions
- [ ] Support form reset functionality

### Validation
- [ ] Real-time field validation
- [ ] Required field enforcement
- [ ] Conditional validation (meal choice, plus-one, email)
- [ ] User-friendly error messages

### Data Flow
- [ ] Load existing RSVP on component mount
- [ ] Auto-save form data to localStorage
- [ ] Submit to Google Sheets
- [ ] Send email confirmations
- [ ] Update email status tracking

## CSS Classes for Styling

```css
/* Progress Bar */
.progress-container {
  margin: 1rem 0;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #059669;
  transition: width 0.3s ease;
}

/* Form States */
.error {
  color: #dc2626;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.success-message {
  background-color: #d1fae5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 1rem;
  border-radius: 0.5rem;
}

.alert {
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.alert-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

/* Loading Spinner */
.spinner {
  border: 2px solid #f3f4f6;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Form Elements */
.selected {
  background-color: #3b82f6;
  color: white;
}

input, select, textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  margin-top: 0.25rem;
}

input:focus, select:focus, textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

button {
  background-color: #3b82f6;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

button:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}
```

## TypeScript Types

Make sure these types are available in your project:

```typescript
// In src/types/index.ts
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

export interface RSVPValidationErrors {
  attendance?: string;
  guestName?: string;
  email?: string;
  mealChoice?: string;
  plusOneMealChoice?: string;
  token?: string;
  general?: string;
}

export interface RSVPSubmissionState {
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  isSubmitError: boolean;
  submitError: string | null;
  submissionId: string | null;
}

export interface RSVPEmailState {
  isSendingEmail: boolean;
  isEmailSent: boolean;
  isEmailError: boolean;
  emailError: string | null;
}
```

This integration guide provides everything needed to implement the `useRSVPForm` hook in your wedding RSVP components with proper error handling, loading states, and user experience! 🎉