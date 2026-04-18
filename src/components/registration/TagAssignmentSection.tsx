import { DocketRegistrationFormData } from './types';

interface TagAssignmentSectionProps {
  formData: DocketRegistrationFormData;
  onFieldChange: <K extends keyof DocketRegistrationFormData>(
    field: K,
    value: DocketRegistrationFormData[K]
  ) => void;
}

export function TagAssignmentSection({ formData, onFieldChange }: TagAssignmentSectionProps) {
  return (
    <div>
      <label htmlFor="rfidEpc" className="block text-sm font-medium text-gray-700 mb-1">
        RFID Tag EPC <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        id="rfidEpc"
        value={formData.rfidEpc}
        onChange={(e) => onFieldChange('rfidEpc', e.target.value)}
        placeholder="24-character hexadecimal"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        maxLength={24}
        pattern="[0-9A-Fa-f]{24}"
      />
      <p className="text-xs text-gray-500 mt-1">24 hexadecimal characters</p>
    </div>
  );
}
