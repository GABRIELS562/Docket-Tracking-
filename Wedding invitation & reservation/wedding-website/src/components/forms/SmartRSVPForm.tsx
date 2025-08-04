import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HeartIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EnvelopeIcon,
  UserPlusIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useGuestAuth } from '../../hooks/useGuestAuth';
import { submitRSVP, updateRSVP, getRSVPByToken } from '../../utils/rsvpService';
import MealSelection from './MealSelection';
import type { RSVPSubmission } from '../../types';

interface FormData {
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

interface FormErrors {
  attendance?: string;
  mealChoice?: string;
  plusOneMealChoice?: string;
  email?: string;
  general?: string;
}

const SmartRSVPForm = () => {
  const { guest, isAuthenticated } = useGuestAuth();
  const [formData, setFormData] = useState<FormData>({
    isAttending: null,
    guestName: guest?.fullName || '',
    email: guest?.email || '',
    mealChoice: '',
    dietaryRestrictions: '',
    plusOneName: guest?.plusOneName || '',
    plusOneMealChoice: '',
    plusOneDietaryRestrictions: '',
    wantsEmailConfirmation: true,
    specialRequests: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [existingRSVP, setExistingRSVP] = useState<RSVPSubmission | null>(null);
  const [isDuplicateAttempt, setIsDuplicateAttempt] = useState(false);


  // Load existing RSVP data
  useEffect(() => {
    const loadExistingRSVP = async () => {
      if (!guest?.token) return;

      try {
        const rsvp = await getRSVPByToken(guest.token);
        if (rsvp) {
          setExistingRSVP(rsvp);
          // Pre-populate form with existing data
          setFormData({
            isAttending: rsvp.isAttending,
            guestName: rsvp.guestName,
            email: rsvp.email || guest.email || '',
            mealChoice: rsvp.mealChoice || '',
            dietaryRestrictions: rsvp.dietaryRestrictions || '',
            plusOneName: rsvp.plusOneName || guest.plusOneName || '',
            plusOneMealChoice: rsvp.plusOneMealChoice || '',
            plusOneDietaryRestrictions: rsvp.plusOneDietaryRestrictions || '',
            wantsEmailConfirmation: rsvp.wantsEmailConfirmation ?? true,
            specialRequests: rsvp.specialRequests || ''
          });
          
          // Check if this is within the rate limit window for duplicate attempts
          const lastSubmission = new Date(rsvp.submittedAt);
          const timeDiff = Date.now() - lastSubmission.getTime();
          const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
          
          if (timeDiff < cooldownPeriod) {
            setIsDuplicateAttempt(true);
          }
        }
      } catch (error) {
        console.error('Error loading existing RSVP:', error);
      }
    };

    if (isAuthenticated && guest) {
      setFormData(prev => ({
        ...prev,
        guestName: guest.fullName,
        email: guest.email || prev.email,
        plusOneName: guest.plusOneName || prev.plusOneName
      }));
      loadExistingRSVP();
    }
  }, [guest, isAuthenticated]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Attendance is required
    if (formData.isAttending === null) {
      newErrors.attendance = 'Please let us know if you\'ll be attending';
    }

    // If attending, meal choice is required
    if (formData.isAttending === true) {
      if (!formData.mealChoice) {
        newErrors.mealChoice = 'Please select your meal preference';
      }

      // If plus-one is named and guest is eligible, plus-one meal is required
      if (guest?.plusOneEligible && formData.plusOneName.trim()) {
        if (!formData.plusOneMealChoice) {
          newErrors.plusOneMealChoice = 'Please select a meal preference for your plus-one';
        }
      }
    }

    // Email validation if confirmation is requested
    if (formData.wantsEmailConfirmation && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sanitizeInput = (input: string): string => {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guest || !validateForm()) return;
    
    if (isDuplicateAttempt) {
      setErrors({ general: 'Please wait a few minutes before submitting another RSVP' });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Sanitize all inputs
      const sanitizedData: RSVPSubmission = {
        token: guest.token,
        guestName: sanitizeInput(formData.guestName),
        email: formData.wantsEmailConfirmation ? sanitizeInput(formData.email) : undefined,
        isAttending: formData.isAttending!,
        mealChoice: formData.isAttending ? sanitizeInput(formData.mealChoice) : undefined,
        dietaryRestrictions: formData.isAttending && formData.dietaryRestrictions ? 
          sanitizeInput(formData.dietaryRestrictions) : undefined,
        plusOneName: guest.plusOneEligible && formData.isAttending && formData.plusOneName ? 
          sanitizeInput(formData.plusOneName) : undefined,
        plusOneMealChoice: guest.plusOneEligible && formData.isAttending && formData.plusOneName ? 
          sanitizeInput(formData.plusOneMealChoice) : undefined,
        plusOneDietaryRestrictions: guest.plusOneEligible && formData.isAttending && 
          formData.plusOneName && formData.plusOneDietaryRestrictions ? 
          sanitizeInput(formData.plusOneDietaryRestrictions) : undefined,
        wantsEmailConfirmation: formData.wantsEmailConfirmation,
        specialRequests: formData.specialRequests ? sanitizeInput(formData.specialRequests) : undefined,
        submittedAt: new Date().toISOString()
      };

      // Submit or update RSVP
      const result = existingRSVP 
        ? await updateRSVP(sanitizedData)
        : await submitRSVP(sanitizedData);

      if (result.success) {
        setIsSubmitted(true);
        // Set cooldown for duplicate attempts
        setIsDuplicateAttempt(true);
        setTimeout(() => setIsDuplicateAttempt(false), 5 * 60 * 1000); // 5 minute cooldown
      } else {
        setErrors({ general: result.error || 'Failed to submit RSVP. Please try again.' });
      }
    } catch (error) {
      console.error('RSVP submission error:', error);
      setErrors({ general: 'An unexpected error occurred. Please try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAttendanceChange = (attending: boolean) => {
    setFormData(prev => ({
      ...prev,
      isAttending: attending,
      // Clear conditional fields if not attending
      mealChoice: attending ? prev.mealChoice : '',
      dietaryRestrictions: attending ? prev.dietaryRestrictions : '',
      plusOneMealChoice: attending ? prev.plusOneMealChoice : '',
      plusOneDietaryRestrictions: attending ? prev.plusOneDietaryRestrictions : ''
    }));
    
    // Clear related errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.attendance;
      if (!attending) {
        delete newErrors.mealChoice;
        delete newErrors.plusOneMealChoice;
      }
      return newErrors;
    });
  };

  const handleEmailToggle = (wantsEmail: boolean) => {
    setFormData(prev => ({
      ...prev,
      wantsEmailConfirmation: wantsEmail,
      email: wantsEmail ? prev.email : ''
    }));
    
    if (!wantsEmail) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.email;
        return newErrors;
      });
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const conditionalVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { 
      opacity: 1, 
      height: 'auto', 
      marginTop: '1.5rem',
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0, 
      height: 0, 
      marginTop: 0,
      transition: { duration: 0.3 }
    }
  };

  if (!isAuthenticated || !guest) {
    return (
      <div className="text-center py-16">
        <ExclamationCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h3>
        <p className="text-gray-600">
          Please use your personalized invitation link to access the RSVP form.
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16"
      >
        <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-6" />
        <h3 className="text-2xl font-serif text-gray-800 mb-4">
          {existingRSVP ? 'RSVP Updated!' : 'Thank You!'}
        </h3>
        <p className="text-lg text-gray-600 mb-4">
          {formData.isAttending 
            ? "We're so excited to celebrate with you!" 
            : "We'll miss you, but we understand. Thank you for letting us know."}
        </p>
        {formData.wantsEmailConfirmation && formData.email && (
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {formData.email}
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-2xl mx-auto"
    >
      {/* Personal Greeting */}
      <motion.div variants={itemVariants} className="text-center mb-8">
        <HeartIcon className="h-12 w-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-2xl font-serif text-gray-800 mb-2">
          Hi {guest.firstName}! 
        </h3>
        <p className="text-gray-600">
          {existingRSVP ? 'You can update your RSVP below.' : 'Please let us know if you\'ll be joining us for our special day.'}
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Error */}
        {errors.general && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center"
          >
            <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0" />
            <span className="text-red-700">{errors.general}</span>
          </motion.div>
        )}

        {/* Duplicate Attempt Warning */}
        {isDuplicateAttempt && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center"
          >
            <ClockIcon className="h-5 w-5 text-yellow-500 mr-3 flex-shrink-0" />
            <span className="text-yellow-700">
              You recently submitted an RSVP. Please wait a few minutes before making changes.
            </span>
          </motion.div>
        )}

        {/* Attendance Selection */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Will you be attending our wedding?
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="radio"
                name="attendance"
                checked={formData.isAttending === true}
                onChange={() => handleAttendanceChange(true)}
                className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
              />
              <span className="ml-3 text-gray-800 font-medium">
                Yes, I'll be there! 🎉
              </span>
            </label>
            
            <label className="flex items-center p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="radio"
                name="attendance"
                checked={formData.isAttending === false}
                onChange={() => handleAttendanceChange(false)}
                className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300"
              />
              <span className="ml-3 text-gray-800 font-medium">
                Sorry, I can't make it 😔
              </span>
            </label>
          </div>
          
          {errors.attendance && (
            <p className="mt-2 text-sm text-red-600 flex items-center">
              <ExclamationCircleIcon className="h-4 w-4 mr-1" />
              {errors.attendance}
            </p>
          )}
        </motion.div>

        {/* Conditional: Meal Selection (only if attending) */}
        <AnimatePresence>
          {formData.isAttending === true && (
            <motion.div
              variants={conditionalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <MealSelection
                guestName={formData.guestName}
                selectedMeal={formData.mealChoice}
                onMealSelect={(mealId) => setFormData(prev => ({ ...prev, mealChoice: mealId }))}
                dietaryRestrictions={formData.dietaryRestrictions}
                onDietaryChange={(restrictions) => setFormData(prev => ({ ...prev, dietaryRestrictions: restrictions }))}
                isPlusOne={false}
              />
              
              {errors.mealChoice && (
                <p className="mt-4 text-sm text-red-600 flex items-center">
                  <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                  {errors.mealChoice}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conditional: Plus-One Section (only if eligible and attending) */}
        <AnimatePresence>
          {formData.isAttending === true && guest.plusOneEligible && (
            <motion.div
              variants={conditionalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-white rounded-xl shadow-lg p-6"
            >
              <div className="flex items-center mb-4">
                <UserPlusIcon className="h-5 w-5 text-rose-500 mr-2" />
                <h4 className="text-lg font-semibold text-gray-800">
                  Plus-One Information
                </h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plus-One Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.plusOneName}
                    onChange={(e) => setFormData(prev => ({ ...prev, plusOneName: e.target.value }))}
                    placeholder="Enter your plus-one's name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  />
                </div>

                {/* Plus-One Meal Selection (only if plus-one name is provided) */}
                {formData.plusOneName.trim() && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <MealSelection
                      guestName={formData.plusOneName}
                      selectedMeal={formData.plusOneMealChoice}
                      onMealSelect={(mealId) => setFormData(prev => ({ ...prev, plusOneMealChoice: mealId }))}
                      dietaryRestrictions={formData.plusOneDietaryRestrictions}
                      onDietaryChange={(restrictions) => setFormData(prev => ({ ...prev, plusOneDietaryRestrictions: restrictions }))}
                      isPlusOne={true}
                    />
                    
                    {errors.plusOneMealChoice && (
                      <p className="mt-4 text-sm text-red-600 flex items-center">
                        <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                        {errors.plusOneMealChoice}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Email Confirmation Toggle */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 text-rose-500 mr-2" />
              <h4 className="text-lg font-semibold text-gray-800">
                Email Confirmation
              </h4>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.wantsEmailConfirmation}
                onChange={(e) => handleEmailToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          <p className="text-gray-600 text-sm mb-4">
            Receive an email confirmation of your RSVP
          </p>

          {/* Conditional: Email Input */}
          <AnimatePresence>
            {formData.wantsEmailConfirmation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                    {errors.email}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Special Requests */}
        <motion.div variants={itemVariants} className="bg-white rounded-xl shadow-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">
            Special Requests (Optional)
          </h4>
          <textarea
            value={formData.specialRequests}
            onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
            placeholder="Any special requests, song requests, or additional information you'd like to share..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
        </motion.div>

        {/* Submit Button */}
        <motion.button
          variants={itemVariants}
          type="submit"
          disabled={isSubmitting || isDuplicateAttempt}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              {existingRSVP ? 'Updating RSVP...' : 'Submitting RSVP...'}
            </>
          ) : (
            existingRSVP ? 'Update RSVP' : 'Submit RSVP'
          )}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default SmartRSVPForm;