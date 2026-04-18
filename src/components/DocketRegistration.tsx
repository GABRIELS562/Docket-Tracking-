import { QRScanner } from './QRScanner';
import {
  BasicInfoSection,
  TagAssignmentSection,
  LocationSection,
  useRegistrationForm,
} from './registration';

const QRIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
    />
  </svg>
);

export function DocketRegistration() {
  const {
    formData,
    updateField,
    showScanner,
    scanMode,
    message,
    isSubmitting,
    handleQRScan,
    handleScanError,
    openScanner,
    closeScanner,
    handleSubmit,
  } = useRegistrationForm();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Register New Docket</h2>

      {message && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700'
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {showScanner && scanMode === 'qr' ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Scan QR Code</h3>
            <button
              onClick={closeScanner}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
          <QRScanner onScan={handleQRScan} onError={handleScanError} isActive={showScanner} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* QR Code Scan Button */}
          <div className="mb-4">
            <button
              type="button"
              onClick={openScanner}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <QRIcon />
              Scan QR Code (Lab + CAS Number)
            </button>
          </div>

          <BasicInfoSection formData={formData} onFieldChange={updateField} />
          <TagAssignmentSection formData={formData} onFieldChange={updateField} />
          <LocationSection formData={formData} onFieldChange={updateField} />

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-lg text-white font-semibold ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isSubmitting ? 'Registering...' : 'Register Docket'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
