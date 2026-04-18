import { useState } from 'react';
import {
  DocketRegistrationFormData,
  QRCodeData,
  FormMessage,
  ScanMode,
  INITIAL_FORM_DATA,
} from './types';

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

export function useRegistrationForm() {
  const [formData, setFormData] = useState<DocketRegistrationFormData>(INITIAL_FORM_DATA);
  const [showScanner, setShowScanner] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof DocketRegistrationFormData>(
    field: K,
    value: DocketRegistrationFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const openScanner = () => {
    setShowScanner(true);
    setScanMode('qr');
  };

  const closeScanner = () => {
    setShowScanner(false);
    setScanMode(null);
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/dockets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to register docket');
      }

      setMessage({ type: 'success', text: 'Docket registered successfully!' });
      resetForm();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to register docket',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
}
