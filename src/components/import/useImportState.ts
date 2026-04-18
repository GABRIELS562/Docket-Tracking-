import { useState, useCallback } from 'react';
import type { DocketEntry, ImportMessage, QRCodeData } from './types';

/**
 * Parse QR code data to extract lab number and case number
 */
function parseQRCode(qrData: string): QRCodeData | null {
  try {
    const parsed = JSON.parse(qrData);
    if (parsed.labNumber && parsed.caseNumber) {
      return { labNumber: parsed.labNumber, caseNumber: parsed.caseNumber };
    }
  } catch {
    // Not JSON, try other formats
  }

  const separators = ['|', ','];
  for (const sep of separators) {
    if (qrData.includes(sep)) {
      const [labNumber, caseNumber] = qrData.split(sep);
      if (labNumber && caseNumber) {
        return { labNumber: labNumber.trim(), caseNumber: caseNumber.trim() };
      }
    }
  }

  return null;
}

export function useImportState() {
  const [dockets, setDockets] = useState<DocketEntry[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<Partial<DocketEntry> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<ImportMessage | null>(null);

  const handleQRScan = useCallback((qrData: string) => {
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
      setMessage({ type: 'error', text: 'Invalid QR code format' });
    }
  }, []);

  const addDocket = useCallback(() => {
    if (
      currentEntry?.labNumber &&
      currentEntry?.caseNumber &&
      currentEntry?.rfidEpc &&
      currentEntry?.description &&
      currentEntry?.category
    ) {
      setDockets((prev) => [...prev, currentEntry as DocketEntry]);
      setCurrentEntry(null);
      setMessage({ type: 'success', text: 'Docket added to batch!' });
    } else {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
    }
  }, [currentEntry]);

  const removeDocket = useCallback((id: string) => {
    setDockets((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setDockets((prev) => prev.filter((d) => d.status !== 'success'));
  }, []);

  const processAll = useCallback(async () => {
    setIsProcessing(true);
    setMessage(null);

    let successCount = 0;
    let errorCount = 0;

    for (const docket of dockets) {
      if (docket.status === 'success') {
        successCount++;
        continue;
      }

      setDockets((prev) =>
        prev.map((d) => (d.id === docket.id ? { ...d, status: 'processing' as const } : d))
      );

      try {
        const response = await fetch('/api/dockets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setIsProcessing(false);
    setMessage({
      type: successCount > 0 ? 'success' : 'error',
      text: `Processed ${successCount + errorCount} dockets: ${successCount} successful, ${errorCount} failed`,
    });
  }, [dockets]);

  return {
    dockets,
    showScanner,
    setShowScanner,
    currentEntry,
    setCurrentEntry,
    isProcessing,
    message,
    handleQRScan,
    addDocket,
    removeDocket,
    clearCompleted,
    processAll,
  };
}
