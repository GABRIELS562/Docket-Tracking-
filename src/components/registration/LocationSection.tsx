import { DocketRegistrationFormData } from './types';

interface LocationSectionProps {
  formData: DocketRegistrationFormData;
  onFieldChange: <K extends keyof DocketRegistrationFormData>(
    field: K,
    value: DocketRegistrationFormData[K]
  ) => void;
}

export function LocationSection({ formData, onFieldChange }: LocationSectionProps) {
  return (
    <>
      {/* Exhibit Number (Optional) */}
      <div>
        <label htmlFor="exhibitNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Exhibit Number (Optional)
        </label>
        <input
          type="text"
          id="exhibitNumber"
          value={formData.exhibitNumber || ''}
          onChange={(e) => onFieldChange('exhibitNumber', e.target.value)}
          placeholder="e.g., EX-001"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Received By (Optional) */}
      <div>
        <label htmlFor="receivedBy" className="block text-sm font-medium text-gray-700 mb-1">
          Received By (Optional)
        </label>
        <input
          type="text"
          id="receivedBy"
          value={formData.receivedBy || ''}
          onChange={(e) => onFieldChange('receivedBy', e.target.value)}
          placeholder="Officer name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </>
  );
}
