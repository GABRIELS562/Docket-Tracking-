import { QRScanner } from '../QRScanner';
import type { DocketEntry } from './types';
import { CATEGORY_OPTIONS } from './types';

interface DocketEntryFormProps {
  showScanner: boolean;
  setShowScanner: (show: boolean) => void;
  currentEntry: Partial<DocketEntry> | null;
  setCurrentEntry: (entry: Partial<DocketEntry> | null) => void;
  onQRScan: (data: string) => void;
  onAddDocket: () => void;
}

export function DocketEntryForm({
  showScanner,
  setShowScanner,
  currentEntry,
  setCurrentEntry,
  onQRScan,
  onAddDocket,
}: DocketEntryFormProps) {
  const updateField = (field: keyof DocketEntry, value: string) => {
    setCurrentEntry({ ...currentEntry, [field]: value });
  };

  if (showScanner) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium">Scan QR Code</h4>
          <button
            onClick={() => setShowScanner(false)}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
          >
            Cancel
          </button>
        </div>
        <QRScanner onScan={onQRScan} isActive={showScanner} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowScanner(true)}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
          />
        </svg>
        Scan QR Code
      </button>

      <input
        type="text"
        placeholder="Lab Number (e.g., 12345/25)"
        value={currentEntry?.labNumber || ''}
        onChange={(e) => updateField('labNumber', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />

      <input
        type="text"
        placeholder="CAS Number (e.g., 25/34/25)"
        value={currentEntry?.caseNumber || ''}
        onChange={(e) => updateField('caseNumber', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />

      <input
        type="text"
        placeholder="RFID Tag EPC (24 hex characters)"
        value={currentEntry?.rfidEpc || ''}
        onChange={(e) => updateField('rfidEpc', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        maxLength={24}
      />

      <textarea
        placeholder="Description"
        value={currentEntry?.description || ''}
        onChange={(e) => updateField('description', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        rows={2}
      />

      <select
        value={currentEntry?.category || 'other'}
        onChange={(e) => updateField('category', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder="Exhibit Number (optional)"
        value={currentEntry?.exhibitNumber || ''}
        onChange={(e) => updateField('exhibitNumber', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />

      <button
        onClick={onAddDocket}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        Add to Batch
      </button>
    </div>
  );
}
