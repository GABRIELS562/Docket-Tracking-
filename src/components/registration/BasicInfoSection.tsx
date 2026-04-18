import { DocketRegistrationFormData, CATEGORY_OPTIONS } from './types';

interface BasicInfoSectionProps {
  formData: DocketRegistrationFormData;
  onFieldChange: <K extends keyof DocketRegistrationFormData>(
    field: K,
    value: DocketRegistrationFormData[K]
  ) => void;
}

export function BasicInfoSection({ formData, onFieldChange }: BasicInfoSectionProps) {
  return (
    <>
      {/* Lab Number */}
      <div>
        <label htmlFor="labNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Lab Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="labNumber"
          value={formData.labNumber}
          onChange={(e) => onFieldChange('labNumber', e.target.value)}
          placeholder="e.g., 12345/25"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Format: NNNNNN/YY (e.g., 12345/25)</p>
      </div>

      {/* Case Number */}
      <div>
        <label htmlFor="caseNumber" className="block text-sm font-medium text-gray-700 mb-1">
          CAS Number <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="caseNumber"
          value={formData.caseNumber}
          onChange={(e) => onFieldChange('caseNumber', e.target.value)}
          placeholder="e.g., 25/34/25"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Format: DD/NN/YY (e.g., 25/34/25)</p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => onFieldChange('description', e.target.value)}
          placeholder="Describe the evidence"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          value={formData.category}
          onChange={(e) => onFieldChange('category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
