import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WizardStep,
  DocketBindingData,
  INITIAL_BINDING_DATA,
  ProximityState,
  getProximityLevel,
  JourneyData,
  JourneyEvent,
} from './types';

// ============================================================================
// Tag Binding Wizard Hook
// ============================================================================

export function useTagBindingWizard() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('scan-barcode');
  const [bindingData, setBindingData] = useState<DocketBindingData>(INITIAL_BINDING_DATA);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateBindingData = useCallback(
    <K extends keyof DocketBindingData>(field: K, value: DocketBindingData[K]) => {
      setBindingData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
    setError(null);
  }, []);

  const nextStep = useCallback(() => {
    const steps: WizardStep[] = ['scan-barcode', 'print-tag', 'bind-tag', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
      setError(null);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    const steps: WizardStep[] = ['scan-barcode', 'print-tag', 'bind-tag', 'complete'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError(null);
    }
  }, [currentStep]);

  const simulateBarcodeScanning = useCallback(async (barcode: string) => {
    setIsProcessing(true);
    setError(null);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate mock data based on barcode
    const mockData: Partial<DocketBindingData> = {
      docketNumber: barcode || `DOC-${Date.now().toString(36).toUpperCase()}`,
      caseReference: `CAS/${new Date().getFullYear()}/${Math.floor(Math.random() * 9999)
        .toString()
        .padStart(4, '0')}`,
      description: 'Evidence item pending tag binding',
      category: 'evidence',
    };

    setBindingData((prev) => ({ ...prev, ...mockData }));
    setIsProcessing(false);
  }, []);

  const simulateTagPrinting = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    // Simulate printing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Generate RFID EPC
    const epc = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16))
      .join('')
      .toUpperCase();

    setBindingData((prev) => ({ ...prev, rfidEpc: epc }));
    setIsProcessing(false);
  }, []);

  const simulateTagBinding = useCallback(async () => {
    setIsProcessing(true);
    setError(null);

    // Simulate binding delay
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setBindingData((prev) => ({
      ...prev,
      boundAt: new Date().toISOString(),
    }));
    setIsProcessing(false);
  }, []);

  const reset = useCallback(() => {
    setCurrentStep('scan-barcode');
    setBindingData(INITIAL_BINDING_DATA);
    setIsProcessing(false);
    setError(null);
  }, []);

  return {
    currentStep,
    bindingData,
    isProcessing,
    error,
    updateBindingData,
    goToStep,
    nextStep,
    prevStep,
    simulateBarcodeScanning,
    simulateTagPrinting,
    simulateTagBinding,
    reset,
  };
}

// ============================================================================
// Proximity Find Hook
// ============================================================================

export function useProximityFind() {
  const [state, setState] = useState<ProximityState>({
    isSearching: false,
    targetItemNumber: '',
    targetRfidEpc: '',
    rssi: -100,
    level: 'cold',
    lastUpdate: null,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetRssiRef = useRef(-100);

  const startSearch = useCallback((itemNumber: string, rfidEpc: string) => {
    setState({
      isSearching: true,
      targetItemNumber: itemNumber,
      targetRfidEpc: rfidEpc,
      rssi: -100,
      level: 'cold',
      lastUpdate: new Date().toISOString(),
    });

    // Start simulating RSSI changes
    targetRssiRef.current = -100;
  }, []);

  const stopSearch = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSearching: false,
    }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Simulate moving toward the item (user interaction)
  const simulateMovement = useCallback((direction: 'closer' | 'farther') => {
    const delta = direction === 'closer' ? 8 : -6;
    targetRssiRef.current = Math.max(-100, Math.min(-15, targetRssiRef.current + delta));
  }, []);

  // Simulate finding the item
  const simulateFound = useCallback(() => {
    targetRssiRef.current = -10;
  }, []);

  // Update RSSI with some noise for realism
  useEffect(() => {
    if (state.isSearching) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          // Add noise to target RSSI
          const noise = (Math.random() - 0.5) * 6;
          const newRssi = Math.max(-100, Math.min(-10, targetRssiRef.current + noise));
          const newLevel = getProximityLevel(newRssi);

          return {
            ...prev,
            rssi: newRssi,
            level: newLevel,
            lastUpdate: new Date().toISOString(),
          };
        });
      }, 200);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isSearching]);

  return {
    state,
    startSearch,
    stopSearch,
    simulateMovement,
    simulateFound,
  };
}

// ============================================================================
// Journey Timeline Hook
// ============================================================================

export function useJourneyTimeline(itemNumber?: string) {
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadJourney = useCallback(async (targetItemNumber: string) => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Generate mock journey data
    const now = new Date();
    const events: JourneyEvent[] = [
      {
        id: '1',
        type: 'intake',
        zoneName: 'Evidence Reception',
        zoneType: 'entrance',
        timestamp: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(),
        readerId: 'RDR-ENT-001',
        readerName: 'Entrance Reader',
        notes: 'Item received and logged',
      },
      {
        id: '2',
        type: 'movement',
        zoneName: 'Corridor A',
        zoneType: 'corridor',
        timestamp: new Date(now.getTime() - 71.5 * 60 * 60 * 1000).toISOString(),
        duration: 5 * 60 * 1000,
        readerId: 'RDR-COR-001',
        readerName: 'Corridor A Reader',
      },
      {
        id: '3',
        type: 'processing',
        zoneName: 'Forensic Lab A',
        zoneType: 'processing',
        timestamp: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
        duration: 24 * 60 * 60 * 1000,
        readerId: 'RDR-LAB-001',
        readerName: 'Lab A Reader',
        notes: 'DNA analysis in progress',
      },
      {
        id: '4',
        type: 'movement',
        zoneName: 'Corridor B',
        zoneType: 'corridor',
        timestamp: new Date(now.getTime() - 24.5 * 60 * 60 * 1000).toISOString(),
        duration: 3 * 60 * 1000,
        readerId: 'RDR-COR-002',
        readerName: 'Corridor B Reader',
      },
      {
        id: '5',
        type: 'storage',
        zoneName: 'Secure Storage Bay 3',
        zoneType: 'storage',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        readerId: 'RDR-STR-003',
        readerName: 'Storage Bay 3 Reader',
        notes: 'Awaiting court request',
      },
    ];

    setJourneyData({
      itemNumber: targetItemNumber,
      itemDescription: 'Forensic Evidence Sample',
      rfidEpc: 'E200001234567890ABCD1234',
      events,
      currentZone: 'Secure Storage Bay 3',
      totalZonesVisited: events.length,
    });

    setIsLoading(false);
  }, []);

  // Auto-load if itemNumber provided
  useEffect(() => {
    if (itemNumber) {
      loadJourney(itemNumber);
    }
  }, [itemNumber, loadJourney]);

  return {
    journeyData,
    isLoading,
    loadJourney,
  };
}
