import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

/**
 * QR Code Scanner Component
 *
 * Uses html5-qrcode library to scan QR codes from the device camera.
 * Extracts lab number and CAS number from the QR code data.
 */
export function QRScanner({ onScan, onError, isActive }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
        isScanningRef.current = false;
        setIsScanning(false);
      } catch {
        // Scanner may already be stopped
      }
    }
  }, []);

  useEffect(() => {
    if (!isActive) {
      // Stop scanning when not active
      stopScanner();
      return;
    }

    // Initialize scanner
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    // Start scanning
    scanner
      .start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10, // Frames per second for scanning
          qrbox: { width: 250, height: 250 }, // Scanning box size
        },
        (decodedText) => {
          // QR code successfully scanned
          onScan(decodedText);
          // Optionally stop after successful scan
          scanner.stop().then(() => {
            isScanningRef.current = false;
            setIsScanning(false);
          });
        },
        () => {
          // QR code scan error (usually just "no code detected")
          // Silently ignore - continuous scanning produces many of these
        }
      )
      .then(() => {
        isScanningRef.current = true;
        setIsScanning(true);
        setError(null);
      })
      .catch((err) => {
        const errorMsg = `Unable to start camera: ${err}`;
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
      });

    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [isActive, onScan, onError, stopScanner]);

  return (
    <div className="qr-scanner-container">
      <div
        id="qr-reader"
        className="w-full max-w-md mx-auto rounded-lg overflow-hidden shadow-lg"
      />
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      {isScanning && !error && (
        <div className="mt-4 text-center text-gray-600">
          <p className="text-sm">Position the QR code within the frame</p>
        </div>
      )}
    </div>
  );
}
