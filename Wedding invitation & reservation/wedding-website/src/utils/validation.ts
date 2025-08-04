import type { RSVPFormData, FormErrors, MealChoice } from '../types';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phone === '' || phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const validateGuestToken = (token: string): boolean => {
  return token.length > 0 && /^[a-zA-Z0-9\-]+$/.test(token);
};

export const validateGuestName = (name: string): boolean => {
  return name.trim().length >= 2 && /^[a-zA-Z\s\-'\.]+$/.test(name.trim());
};

export const validateRSVPForm = (formData: RSVPFormData): FormErrors => {
  const errors: FormErrors = {};

  if (!validateGuestToken(formData.guestToken)) {
    errors.guestToken = 'Invalid guest token format';
  }

  if (!validateEmail(formData.email)) {
    errors.email = 'Please enter a valid email address';
  }

  if (formData.phone && !validatePhone(formData.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (formData.isAttending) {
    if (formData.guestCount < 1) {
      errors.guestCount = 'Please specify number of guests attending';
    }

    if (formData.guestCount > 10) {
      errors.guestCount = 'Maximum 10 guests allowed';
    }

    if (formData.guestNames.length !== formData.guestCount) {
      errors.guestNames = `Please provide exactly ${formData.guestCount} guest name(s)`;
    }

    formData.guestNames.forEach((name, index) => {
      if (!validateGuestName(name)) {
        errors[`guestName_${index}`] = `Guest name ${index + 1} is invalid`;
      }
    });

    if (formData.mealChoices.length !== formData.guestCount) {
      errors.mealChoices = `Please provide meal choices for all ${formData.guestCount} guest(s)`;
    }

    formData.mealChoices.forEach((mealChoice, index) => {
      const mealErrors = validateMealChoice(mealChoice);
      if (Object.keys(mealErrors).length > 0) {
        Object.keys(mealErrors).forEach(key => {
          errors[`meal_${index}_${key}`] = mealErrors[key];
        });
      }
    });
  }

  if (formData.songRequest && formData.songRequest.length > 200) {
    errors.songRequest = 'Song request must be 200 characters or less';
  }

  if (formData.specialRequests && formData.specialRequests.length > 500) {
    errors.specialRequests = 'Special requests must be 500 characters or less';
  }

  return errors;
};

export const validateMealChoice = (mealChoice: MealChoice): FormErrors => {
  const errors: FormErrors = {};

  if (!validateGuestName(mealChoice.guestName)) {
    errors.guestName = 'Invalid guest name';
  }

  if (!mealChoice.appetizer || mealChoice.appetizer.trim().length === 0) {
    errors.appetizer = 'Please select an appetizer';
  }

  if (!mealChoice.mainCourse || mealChoice.mainCourse.trim().length === 0) {
    errors.mainCourse = 'Please select a main course';
  }

  if (!mealChoice.dessert || mealChoice.dessert.trim().length === 0) {
    errors.dessert = 'Please select a dessert';
  }

  return errors;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
};

export const validateDietaryRestriction = (restriction: string): boolean => {
  const validRestrictions = [
    'vegetarian',
    'vegan', 
    'gluten-free',
    'dairy-free',
    'nut-free',
    'shellfish-free',
    'kosher',
    'halal',
    'no-spicy-food',
    'other'
  ];
  
  return validRestrictions.includes(restriction.toLowerCase()) || 
         (restriction.toLowerCase() === 'other' && restriction.length <= 100);
};

export const isFormValid = (errors: FormErrors): boolean => {
  return Object.keys(errors).length === 0;
};

export const getErrorMessage = (errors: FormErrors, field: string): string | undefined => {
  return errors[field];
};

export const hasErrors = (errors: FormErrors, fields: string[]): boolean => {
  return fields.some(field => errors[field]);
};