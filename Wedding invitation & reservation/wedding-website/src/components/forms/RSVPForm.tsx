import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RSVPFormData, MealChoice } from '../../types';
import { useRSVP } from '../../hooks/useRSVP';
import { useGuestAuth } from '../../hooks/useGuestAuth';
import { Input, Button, Card, CardHeader, CardTitle, CardContent } from '../ui';
import { GuestAttendance } from './GuestAttendance';
import { MealSelector } from './MealSelector';

interface RSVPFormProps {
  existingRSVP?: RSVPFormData | null;
  onSubmitSuccess?: () => void;
}

export const RSVPForm: React.FC<RSVPFormProps> = ({
  existingRSVP,
  onSubmitSuccess
}) => {
  const { guestToken } = useGuestAuth();
  const { submitRSVP, updateRSVP, isLoading, errors, clearErrors } = useRSVP();

  const [formData, setFormData] = useState<RSVPFormData>({
    guestToken: guestToken?.token || '',
    isAttending: false,
    guestCount: 1,
    guestNames: [''],
    dietaryRestrictions: [],
    mealChoices: [],
    songRequest: '',
    specialRequests: '',
    email: guestToken?.email || '',
    phone: ''
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (existingRSVP) {
      setFormData(existingRSVP);
      if (existingRSVP.isAttending && existingRSVP.guestCount > 0) {
        setCurrentStep(2);
      }
    }
  }, [existingRSVP]);

  useEffect(() => {
    if (guestToken) {
      setFormData(prev => ({
        ...prev,
        guestToken: guestToken.token,
        email: guestToken.email
      }));
    }
  }, [guestToken]);

  const handleAttendanceChange = (attending: boolean) => {
    clearErrors();
    setFormData(prev => ({
      ...prev,
      isAttending: attending,
      guestCount: attending ? Math.max(prev.guestCount, 1) : 0,
      guestNames: attending ? (prev.guestNames.length > 0 ? prev.guestNames : [guestToken?.fullName || '']) : [],
      mealChoices: attending ? [] : []
    }));

    if (attending) {
      setCurrentStep(2);
    } else {
      setCurrentStep(4);
    }
  };

  const handleGuestCountChange = (count: number) => {
    const newGuestNames = Array(count).fill('').map((_, index) => 
      formData.guestNames[index] || (index === 0 ? guestToken?.fullName || '' : '')
    );
    
    const newMealChoices = Array(count).fill(null).map((_, index) => 
      formData.mealChoices[index] || {
        guestName: newGuestNames[index],
        appetizer: '',
        mainCourse: '',
        dessert: ''
      }
    );

    setFormData(prev => ({
      ...prev,
      guestCount: count,
      guestNames: newGuestNames,
      mealChoices: newMealChoices
    }));
  };

  const handleGuestNamesChange = (guestNames: string[]) => {
    const updatedMealChoices = guestNames.map((name, index) => ({
      ...formData.mealChoices[index],
      guestName: name,
      appetizer: formData.mealChoices[index]?.appetizer || '',
      mainCourse: formData.mealChoices[index]?.mainCourse || '',
      dessert: formData.mealChoices[index]?.dessert || ''
    }));

    setFormData(prev => ({
      ...prev,
      guestNames,
      mealChoices: updatedMealChoices
    }));
  };

  const handleMealChoiceChange = (index: number, mealChoice: MealChoice) => {
    const newMealChoices = [...formData.mealChoices];
    newMealChoices[index] = mealChoice;
    setFormData(prev => ({
      ...prev,
      mealChoices: newMealChoices
    }));
  };

  const handleDietaryRestrictionsChange = (restrictions: string[]) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: restrictions
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (!guestToken) return;

    const submitFunction = existingRSVP ? updateRSVP : submitRSVP;
    const result = await submitFunction(formData, guestToken.fullName);

    if (result.success) {
      setSubmitSuccess(true);
      onSubmitSuccess?.();
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 
    'nut-free', 'shellfish-free', 'kosher', 'halal', 'other'
  ];

  if (submitSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {existingRSVP ? 'RSVP Updated!' : 'Thank You for Your RSVP!'}
        </h2>
        <p className="text-gray-600 mb-6">
          {formData.isAttending 
            ? "We're so excited to celebrate with you!" 
            : "We're sorry you can't make it, but we understand."}
        </p>
        {formData.isAttending && (
          <p className="text-sm text-gray-500">
            A confirmation email has been sent to {formData.email}
          </p>
        )}
      </motion.div>
    );
  }

  if (!guestToken) {
    return (
      <Card variant="elevated" padding="lg">
        <CardContent>
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Invalid Invitation
            </h3>
            <p className="text-gray-600">
              Please check your invitation link and try again.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" padding="lg">
      <CardHeader>
        <CardTitle>RSVP for {guestToken.fullName}</CardTitle>
        <div className="flex items-center mt-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-rose-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`h-1 w-12 mx-2 ${
                  step < currentStep ? 'bg-rose-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Will you be attending our wedding?
                  </h3>
                  <div className="space-y-3">
                    <motion.label
                      className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                        formData.isAttending === true 
                          ? 'border-rose-500 bg-rose-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <input
                        type="radio"
                        name="attendance"
                        checked={formData.isAttending === true}
                        onChange={() => handleAttendanceChange(true)}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="ml-3 text-lg">✅ Yes, I'll be there!</span>
                    </motion.label>

                    <motion.label
                      className={`flex items-center p-4 border rounded-lg cursor-pointer ${
                        formData.isAttending === false 
                          ? 'border-rose-500 bg-rose-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <input
                        type="radio"
                        name="attendance"
                        checked={formData.isAttending === false}
                        onChange={() => handleAttendanceChange(false)}
                        className="h-4 w-4 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="ml-3 text-lg">❌ Sorry, I can't make it</span>
                    </motion.label>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && formData.isAttending && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How many guests will be attending?
                  </label>
                  <select
                    value={formData.guestCount}
                    onChange={(e) => handleGuestCountChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {Array.from({ length: guestToken.plusOneEligible ? 2 : 1 }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <GuestAttendance
                  guestNames={formData.guestNames}
                  maxGuests={guestToken.plusOneEligible ? 2 : 1}
                  onChange={handleGuestNamesChange}
                  errors={errors}
                />

                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && formData.isAttending && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Meal Selections
                  </h3>
                  <div className="space-y-6">
                    {formData.guestNames.map((guestName, index) => (
                      <MealSelector
                        key={index}
                        guestName={guestName || `Guest ${index + 1}`}
                        mealChoice={formData.mealChoices[index] || {
                          guestName: guestName || `Guest ${index + 1}`,
                          appetizer: '',
                          mainCourse: '',
                          dessert: ''
                        }}
                        onChange={(mealChoice) => handleMealChoiceChange(index, mealChoice)}
                        errors={errors}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Restrictions
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {dietaryOptions.map((restriction) => (
                      <label key={restriction} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.dietaryRestrictions.includes(restriction)}
                          onChange={(e) => {
                            const restrictions = e.target.checked
                              ? [...formData.dietaryRestrictions, restriction]
                              : formData.dietaryRestrictions.filter(r => r !== restriction);
                            handleDietaryRestrictionsChange(restrictions);
                          }}
                          className="h-4 w-4 text-rose-600 focus:ring-rose-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">
                          {restriction.replace('-', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    error={errors.email}
                    required
                  />
                  <Input
                    label="Phone Number (Optional)"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    error={errors.phone}
                  />
                </div>

                {formData.isAttending && (
                  <>
                    <Input
                      label="Song Request (Optional)"
                      value={formData.songRequest}
                      onChange={(e) => setFormData(prev => ({ ...prev, songRequest: e.target.value }))}
                      placeholder="Any special song you'd like us to play?"
                      error={errors.songRequest}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Requests (Optional)
                      </label>
                      <textarea
                        value={formData.specialRequests}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                        placeholder="Any special accommodations or requests?"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      {errors.specialRequests && (
                        <p className="mt-1 text-sm text-red-600">{errors.specialRequests}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="flex space-x-3">
                  {formData.isAttending && (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="flex-1"
                  >
                    {existingRSVP ? 'Update RSVP' : 'Submit RSVP'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </CardContent>
    </Card>
  );
};