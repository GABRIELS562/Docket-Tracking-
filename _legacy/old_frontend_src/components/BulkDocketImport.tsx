import { useState } from 'react';
import { QRScanner } from './QRScanner';

interface DocketEntry {
  id: string;
  labNumber: string;
  caseNumber: string;
  rfidEpc: string;
  description: string;
  category: string;
  exhibitNumber?: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

interface QRCodeData {
  labNumber: string;
  caseNumber: string;
}

/**
 * Parse QR code data to extract lab number and case number
 */
function parseQRCode(qrData: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.labNumber && parsed.caseNumber) {
      return {
        labNumber: parsed.labNumber,
        caseNumber: parsed.caseNumber,
      };
    }
  } catch {
    // Not JSON
  }

  if (qrData.includes('|')) {
    const [labNumber, caseNumber] = qrData.split('|');
    if (labNumber && caseNumber) {
      return { labNumber: labNumber.trim(), caseNumber: caseNumber.trim() };
    }
  }

  if (qrData.includes(',')) {
    const [labNumber, caseNumber] = qrData.split(',');
    if (labNumber && caseNumber) {
      return { labNumber: labNumber.trim(), caseNumber: caseNumber.trim() };
    }
  }

  return null;
}

/**
 * Bulk Docket Import Component
 *
 * Allows scanning multiple QR codes and assigning RFID tags in batch.
 */
export function BulkDocketImport() {
  const [dockets, setDockets] = useState<DocketEntry[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<DocketEntry> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleQRScan = (qrData: string) => {
    const parsed = parseQRCode(qrData);
    if (parsed) {
      setCurrentEntry({
        id: crypto.randomUUID(),
        labNumber: parsed.labNumber,
        caseNumber: parsed.caseNumber,
        status: 'pending',
      });
      setShowScanner(false);
      setMessage({ type: 'success', text: 'QR code scanned! Now enter RFID tag and details.' });
    } else {
      setMessage({
        type: 'error',
        text: 'Invalid QR code format',
      });
    }
  };

  const addDocket = () => {
    if (
      currentEntry &&
      currentEntry.labNumber &&
      currentEntry.caseNumber &&
      currentEntry.rfidEpc &&
      currentEntry.description &&
      currentEntry.category
    ) {
      setDockets([...dockets, currentEntry as DocketEntry]);
      setCurrentEntry(null);
      setMessage({ type: 'success', text: 'Docket added to batch!' });
    } else {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
    }
  };

  const removeDocket = (id: string) => {
    setDockets(dockets.filter((d) => d.id !== id));
  };

  const processAll = async () => {
    setIsProcessing(true);
    setMessage(null);

    let successCount = 0;
    let errorCount = 0;

    for (const docket of dockets) {
      if (docket.status === 'success') {
        successCount++;
        continue;
      }

      // Update status to processing
      setDockets((prev) =>
        prev.map((d) => (d.id === docket.id ? { ...d, status: 'processing' as const } : d))
      );

      try {
        const response = await fetch('/api/dockets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            labNumber: docket.labNumber,
            caseNumber: docket.caseNumber,
            rfidEpc: docket.rfidEpc,
            description: docket.description,
            category: docket.category,
            exhibitNumber: docket.exhibitNumber,
          }),
        });

        if (response.ok) {
          // Success
          setDockets((prev) =>
            prev.map((d) => (d.id === docket.id ? { ...d, status: 'success' as const } : d))
          );
          successCount++;
        } else {
          const error = await response.json();
          setDockets((prev) =>
            prev.map((d) =>
              d.id === docket.id
                ? {
                    ...d,
                    status: 'error' as const,
                    errorMessage: error.message || 'Failed to register',
                  }
                : d
            )
          );
          errorCount++;
        }
      } catch (error) {
        setDockets((prev) =>
          prev.map((d) =>
            d.id === docket.id
              ? {
                  ...d,
                  status: 'error' as const,
                  errorMessage: error instanceof Error ? error.message : 'Network error',
                }
              : d
          )
        );
        errorCount++;
      }

      // Small delay between requests to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setIsProcessing(false);
    setMessage({
      type: successCount > 0 ? 'success' : 'error',
      text: `Processed ${successCount + errorCount} dockets: ${successCount} successful, ${errorCount} failed`,
    });
  };

  const clearCompleted = () => {
    setDockets(dockets.filter((d) => d.status !== 'success'));
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Bulk Docket Import</h2>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Add New Entry */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Add Docket</h3>

          {showScanner ? (
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
              <QRScanner onScan={handleQRScan} isActive={showScanner} />
            </div>
          ) : (
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
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, labNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <input
                type="text"
                placeholder="CAS Number (e.g., 25/34/25)"
                value={currentEntry?.caseNumber || ''}
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, caseNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <input
                type="text"
                placeholder="RFID Tag EPC (24 hex characters)"
                value={currentEntry?.rfidEpc || ''}
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, rfidEpc: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                maxLength={24}
              />

              <textarea
                placeholder="Description"
                value={currentEntry?.description || ''}
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={2}
              />

              <select
                value={currentEntry?.category || 'other'}
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, category: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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

              <input
                type="text"
                placeholder="Exhibit Number (optional)"
                value={currentEntry?.exhibitNumber || ''}
                onChange={(e) =>
                  setCurrentEntry({ ...currentEntry, exhibitNumber: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <button
                onClick={addDocket}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Add to Batch
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Batch List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              Batch Queue ({dockets.length} {dockets.length === 1 ? 'docket' : 'dockets'})
            </h3>
            <div className="space-x-2">
              <button
                onClick={clearCompleted}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
                disabled={dockets.filter((d) => d.status === 'success').length === 0}
              >
                Clear Completed
              </button>
              <button
                onClick={processAll}
                disabled={isProcessing || dockets.length === 0}
                className={`px-4 py-2 rounded text-white font-medium ${
                  isProcessing || dockets.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isProcessing ? 'Processing...' : 'Process All'}
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {dockets.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No dockets in queue</p>
            ) : (
              dockets.map((docket) => (
                <div
                  key={docket.id}
                  className={`p-3 border rounded ${
                    docket.status === 'success'
                      ? 'bg-green-50 border-green-300'
                      : docket.status === 'error'
                        ? 'bg-red-50 border-red-300'
                        : docket.status === 'processing'
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {docket.labNumber} | {docket.caseNumber}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        RFID: {docket.rfidEpc}
                      </div>
                      <div className="text-xs text-gray-600">
                        {docket.description}
                      </div>
                      {docket.status === 'error' && docket.errorMessage && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {docket.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-medium">
                        {docket.status === 'success' && (
                          <span className="text-green-600">✓ Success</span>
                        )}
                        {docket.status === 'error' && (
                          <span className="text-red-600">✗ Failed</span>
                        )}
                        {docket.status === 'processing' && (
                          <span className="text-blue-600">Processing...</span>
                        )}
                        {docket.status === 'pending' && (
                          <span className="text-gray-600">Pending</span>
                        )}
                      </div>
                      {docket.status === 'pending' && (
                        <button
                          onClick={() => removeDocket(docket.id)}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
