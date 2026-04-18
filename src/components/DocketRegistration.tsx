import { useState } from 'react';
import { QRScanner } from './QRScanner';

interface DocketRegistrationFormData {
  labNumber: string;
  caseNumber: string;
  rfidEpc: string;
  description: string;
  category: string;
  exhibitNumber?: string;
  receivedBy?: string;
}

interface QRCodeData {
  labNumber: string;
  caseNumber: string;
}

/**
 * Parse QR code data to extract lab number and case number
 *
 * Expected QR code formats:
 * - JSON: {"labNumber": "12345/25", "caseNumber": "25/34/25"}
 * - Pipe-separated: 12345/25|25/34/25
 * - Comma-separated: 12345/25,25/34/25
 */
function parseQRCode(qrData: string): QRCodeData | null {
  try {
    // Try parsing as JSON first
    const parsed = JSON.parse(qrData);
    if (parsed.labNumber && parsed.caseNumber) {
      return {
        labNumber: parsed.labNumber,
        caseNumber: parsed.caseNumber,
      };
    }
  } catch {
    // Not JSON, try other formats
  }

  // Try pipe-separated format
  if (qrData.includes('|')) {
    const [labNumber, caseNumber] = qrData.split('|');
    if (labNumber && caseNumber) {
      return { labNumber: labNumber.trim(), caseNumber: caseNumber.trim() };
    }
  }

  // Try comma-separated format
  if (qrData.includes(',')) {
    const [labNumber, caseNumber] = qrData.split(',');
    if (labNumber && caseNumber) {
      return { labNumber: labNumber.trim(), caseNumber: caseNumber.trim() };
    }
  }

  return null;
}

export function DocketRegistration() {
  const [formData, setFormData] = useState<DocketRegistrationFormData>({
    labNumber: '',
    caseNumber: '',
    rfidEpc: '',
    description: '',
    category: 'other',
  });

  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<'qr' | 'rfid' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQRScan = (qrData: string) => {
    const parsed = parseQRCode(qrData);
    if (parsed) {
      setFormData((prev) => ({
        ...prev,
        labNumber: parsed.labNumber,
        caseNumber: parsed.caseNumber,
      }));
      setMessage({ type: 'success', text: 'QR code scanned successfully!' });
      setShowScanner(false);
      setScanMode(null);
    } else {
      setMessage({
        type: 'error',
        text: 'Invalid QR code format. Expected format: labNumber|caseNumber',
      });
    }
  };

  const handleScanError = (error: string) => {
    setMessage({ type: 'error', text: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/dockets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register docket');
      }

      setMessage({ type: 'success', text: 'Docket registered successfully!' });
      // Reset form
      setFormData({
        labNumber: '',
        caseNumber: '',
        rfidEpc: '',
        description: '',
        category: 'other',
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to register docket',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => {
                setShowScanner(false);
                setScanMode(null);
              }}
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
              onClick={() => {
                setShowScanner(true);
                setScanMode('qr');
              }}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Scan QR Code (Lab + CAS Number)
            </button>
          </div>

          {/* Lab Number */}
          <div>
            <label htmlFor="labNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Lab Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="labNumber"
              value={formData.labNumber}
              onChange={(e) => setFormData({ ...formData, labNumber: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
              placeholder="e.g., 25/34/25"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Format: DD/NN/YY (e.g., 25/34/25)</p>
          </div>

          {/* RFID EPC */}
          <div>
            <label htmlFor="rfidEpc" className="block text-sm font-medium text-gray-700 mb-1">
              RFID Tag EPC <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="rfidEpc"
              value={formData.rfidEpc}
              onChange={(e) => setFormData({ ...formData, rfidEpc: e.target.value })}
              placeholder="24-character hexadecimal"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              maxLength={24}
              pattern="[0-9A-Fa-f]{24}"
            />
            <p className="text-xs text-gray-500 mt-1">24 hexadecimal characters</p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="firearm">Firearm</option>
              <option value="drug">Drug</option>
              <option value="digital">Digital</option>
              <option value="biological">Biological</option>
              <option value="document">Document</option>
              <option value="weapon">Weapon</option>
              <option value="clothing">Clothing</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Exhibit Number (Optional) */}
          <div>
            <label htmlFor="exhibitNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Exhibit Number (Optional)
            </label>
            <input
              type="text"
              id="exhibitNumber"
              value={formData.exhibitNumber || ''}
              onChange={(e) => setFormData({ ...formData, exhibitNumber: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
              placeholder="Officer name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
