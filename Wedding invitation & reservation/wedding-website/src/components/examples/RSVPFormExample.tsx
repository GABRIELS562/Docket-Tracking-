import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserIcon,
  CakeIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useRSVPForm } from '../../hooks/useRSVPForm';
import { useGuestAuth } from '../../hooks/useGuestAuth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { LoadingSpinner } from '../ui/LoadingSpinner';

const RSVPFormExample: React.FC = () => {
  const { guest, isAuthenticated } = useGuestAuth();
  const {
    // Form state
    formData,
    updateField,
    
    // Validation
    errors,
    isFormValid,
    
    // Submission state
    submissionState,
    emailState,
    loadingState,
    
    // Actions
    submitRSVP,
    loadExistingRSVP,
    resetForm,
    
    // Utilities
    hasExistingSubmission,
    canSubmit,
    getFormProgress
  } = useRSVPForm();

  // Load existing RSVP when component mounts
  useEffect(() => {
    if (isAuthenticated && guest?.token) {
      loadExistingRSVP(guest.token);
    }
  }, [isAuthenticated, guest?.token, loadExistingRSVP]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest || !canSubmit) return;
    
    const success = await submitRSVP(guest.token, guest);
    
    if (success) {
      console.log('RSVP submitted successfully!');
    }
  };

  // Loading state
  if (loadingState.isLoadingExisting) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading your RSVP...</p>
      </Card>
    );
  }

  // Success state
  if (submissionState.isSubmitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl mx-auto"
      >
        <Card className="p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            RSVP {hasExistingSubmission ? 'Updated' : 'Submitted'} Successfully!
          </h2>
          
          {submissionState.submissionId && (
            <p className="text-gray-600 mb-4">
              Confirmation ID: <span className="font-mono font-medium">{submissionState.submissionId}</span>
            </p>
          )}
          
          {/* Email status */}
          {formData.wantsEmailConfirmation && (
            <div className="mb-6">
              {emailState.isSendingEmail && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <LoadingSpinner size="sm" />
                  <span>Sending confirmation email...</span>
                </div>
              )}
              
              {emailState.isEmailSent && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircleIcon className="w-5 h-5" />
                  <span>Confirmation email sent to {formData.email}</span>
                </div>
              )}
              
              {emailState.isEmailError && (
                <div className="flex items-center justify-center gap-2 text-amber-600">
                  <ExclamationCircleIcon className="w-5 h-5" />
                  <span>RSVP saved, but email failed to send</span>
                </div>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            <Button onClick={resetForm} variant="outline">
              Submit Another RSVP
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Progress indicator */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Form Progress</span>
          <span className="text-sm text-gray-500">{getFormProgress()}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-rose-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${getFormProgress()}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </Card>

      {/* Existing submission notice */}
      {hasExistingSubmission && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">
              You have already submitted an RSVP. You can update it below.
            </span>
          </div>
        </motion.div>
      )}

      {/* General error */}
      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{errors.general}</span>
          </div>
        </motion.div>
      )}

      {/* Attendance Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Will you be attending?</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateField('isAttending', true)}
            className={`p-4 rounded-lg border-2 transition-all ${
              formData.isAttending === true
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <CheckCircleIcon className="w-8 h-8 mx-auto mb-2" />
            <div className="font-medium">Yes, I'll be there!</div>
          </motion.button>
          
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => updateField('isAttending', false)}
            className={`p-4 rounded-lg border-2 transition-all ${
              formData.isAttending === false
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 hover:border-red-300'
            }`}
          >
            <ExclamationCircleIcon className="w-8 h-8 mx-auto mb-2" />
            <div className="font-medium">Sorry, can't make it</div>
          </motion.button>
        </div>
        
        {errors.attendance && (
          <p className="mt-2 text-sm text-red-600">{errors.attendance}</p>
        )}
      </Card>

      {/* Guest Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Guest Information
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name *
            </label>
            <Input
              type="text"
              value={formData.guestName}
              onChange={(e) => updateField('guestName', e.target.value)}
              placeholder="Enter your full name"
              error={errors.guestName}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.wantsEmailConfirmation}
                onChange={(e) => updateField('wantsEmailConfirmation', e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              Send me email confirmation
            </label>
          </div>

          <AnimatePresence>
            {formData.wantsEmailConfirmation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your.email@example.com"
                  error={errors.email}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>

      {/* Meal Selection - Only show if attending */}
      <AnimatePresence>
        {formData.isAttending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CakeIcon className="w-5 h-5" />
                Meal Selection
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Meal Choice *
                  </label>
                  <select
                    value={formData.mealChoice}
                    onChange={(e) => updateField('mealChoice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  >
                    <option value="">Select your meal</option>
                    <option value="grilled-salmon">Grilled Salmon with Herb Butter</option>
                    <option value="beef-tenderloin">Beef Tenderloin with Red Wine Reduction</option>
                    <option value="chicken-breast">Herb-Crusted Chicken Breast</option>
                    <option value="vegetarian">Vegetarian Pasta Primavera</option>
                  </select>
                  {errors.mealChoice && (
                    <p className="mt-1 text-sm text-red-600">{errors.mealChoice}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dietary Restrictions
                  </label>
                  <Input
                    type="text"
                    value={formData.dietaryRestrictions}
                    onChange={(e) => updateField('dietaryRestrictions', e.target.value)}
                    placeholder="Any allergies or dietary restrictions?"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plus-One Section - Only show if attending */}
      <AnimatePresence>
        {formData.isAttending && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserPlusIcon className="w-5 h-5" />
                Plus-One Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plus-One Name
                  </label>
                  <Input
                    type="text"
                    value={formData.plusOneName}
                    onChange={(e) => updateField('plusOneName', e.target.value)}
                    placeholder="Guest's full name (optional)"
                  />
                </div>

                <AnimatePresence>
                  {formData.plusOneName.trim() && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plus-One Meal Choice *
                        </label>
                        <select
                          value={formData.plusOneMealChoice}
                          onChange={(e) => updateField('plusOneMealChoice', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        >
                          <option value="">Select meal for {formData.plusOneName}</option>
                          <option value="grilled-salmon">Grilled Salmon with Herb Butter</option>
                          <option value="beef-tenderloin">Beef Tenderloin with Red Wine Reduction</option>
                          <option value="chicken-breast">Herb-Crusted Chicken Breast</option>
                          <option value="vegetarian">Vegetarian Pasta Primavera</option>
                        </select>
                        {errors.plusOneMealChoice && (
                          <p className="mt-1 text-sm text-red-600">{errors.plusOneMealChoice}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Plus-One Dietary Restrictions
                        </label>
                        <Input
                          type="text"
                          value={formData.plusOneDietaryRestrictions}
                          onChange={(e) => updateField('plusOneDietaryRestrictions', e.target.value)}
                          placeholder="Any allergies or dietary restrictions?"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Requests */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Special Requests</h3>
        <textarea
          value={formData.specialRequests}
          onChange={(e) => updateField('specialRequests', e.target.value)}
          placeholder="Any special requests or messages for the happy couple?"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
        />
      </Card>

      {/* Submit Button */}
      <Card className="p-6">
        <Button
          type="submit"
          disabled={!canSubmit}
          className="w-full"
        >
          {submissionState.isSubmitting ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingSpinner size="sm" />
              <span>{hasExistingSubmission ? 'Updating RSVP...' : 'Submitting RSVP...'}</span>
            </div>
          ) : (
            <span>{hasExistingSubmission ? 'Update RSVP' : 'Submit RSVP'}</span>
          )}
        </Button>

        {submissionState.isSubmitError && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-sm text-red-600 text-center"
          >
            {submissionState.submitError}
          </motion.p>
        )}

        {!isFormValid && formData.isAttending !== null && (
          <p className="mt-2 text-sm text-gray-600 text-center">
            Please fill in all required fields to submit your RSVP
          </p>
        )}
      </Card>
    </form>
  );
};

export default RSVPFormExample;