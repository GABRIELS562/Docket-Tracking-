import { useEffect, useRef, useState } from 'react';
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
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Stop scanning when not active
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            setIsScanning(false);
          })
          .catch((err) => {
            console.error('Error stopping scanner:', err);
          });
      }
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
          scanner.stop().then(() => setIsScanning(false));
        },
        (errorMessage) => {
          // QR code scan error (usually just "no code detected")
          // We don't want to show these continuous errors
          if (!errorMessage.includes('NotFoundException')) {
            console.warn('QR scan error:', errorMessage);
          }
        }
      )
      .then(() => {
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
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .catch((err) => console.error('Error stopping scanner on cleanup:', err));
      }
    };
  }, [isActive, onScan, onError]);

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
