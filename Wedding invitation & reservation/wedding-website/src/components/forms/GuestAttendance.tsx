import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, Button } from '../ui';

interface GuestAttendanceProps {
  guestNames: string[];
  maxGuests: number;
  onChange: (guestNames: string[]) => void;
  errors?: { [key: string]: string };
}

export const GuestAttendance: React.FC<GuestAttendanceProps> = ({
  guestNames,
  maxGuests,
  onChange,
  errors = {}
}) => {
  const addGuest = () => {
    if (guestNames.length < maxGuests) {
      onChange([...guestNames, '']);
    }
  };

  const removeGuest = (index: number) => {
    const newGuestNames = guestNames.filter((_, i) => i !== index);
    onChange(newGuestNames);
  };

  const updateGuestName = (index: number, name: string) => {
    const newGuestNames = [...guestNames];
    newGuestNames[index] = name;
    onChange(newGuestNames);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Guest Names</h3>
        <div className="text-sm text-gray-600">
          {guestNames.length} of {maxGuests} guests
        </div>
      </div>

      <AnimatePresence>
        {guestNames.map((name, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-start space-x-3"
          >
            <div className="flex-1">
              <Input
                value={name}
                onChange={(e) => updateGuestName(index, e.target.value)}
                placeholder={`Guest ${index + 1} full name`}
                error={errors[`guestName_${index}`]}
              />
            </div>
            {guestNames.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeGuest(index)}
                className="mt-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </Button>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {guestNames.length < maxGuests && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={addGuest}
            leftIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            }
          >
            Add Guest ({guestNames.length}/{maxGuests})
          </Button>
        </motion.div>
      )}

      {errors.guestNames && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-sm text-red-600"
        >
          {errors.guestNames}
        </motion.p>
      )}

      {guestNames.length === maxGuests && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg"
        >
          You've reached the maximum number of guests ({maxGuests}) for your invitation.
        </motion.p>
      )}
    </div>
  );
};