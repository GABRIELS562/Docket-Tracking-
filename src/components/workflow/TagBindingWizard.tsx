import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Barcode,
  Printer,
  Link2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { WizardStep, WIZARD_STEPS, DocketBindingData } from './types';
import { useTagBindingWizard } from './useWorkflowState';

// ============================================================================
// Step Icons
// ============================================================================

function StepIcon({
  icon,
  isActive,
  isComplete,
}: {
  icon: string;
  isActive: boolean;
  isComplete: boolean;
}) {
  const iconClass = cn(
    'w-6 h-6 transition-colors',
    isComplete ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-gray-500'
  );

  switch (icon) {
    case 'barcode':
      return <Barcode className={iconClass} />;
    case 'printer':
      return <Printer className={iconClass} />;
    case 'link':
      return <Link2 className={iconClass} />;
    case 'check':
      return <CheckCircle2 className={iconClass} />;
    default:
      return <Tag className={iconClass} />;
  }
}

// ============================================================================
// Progress Indicator
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: WizardStep;
}

function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const stepOrder: WizardStep[] = ['scan-barcode', 'print-tag', 'bind-tag', 'complete'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between mb-8">
      {WIZARD_STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isComplete = index < currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all',
                  isComplete
                    ? 'bg-green-500/20 border-green-500'
                    : isActive
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-gray-800 border-gray-700'
                )}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                ) : (
                  <StepIcon icon={step.icon} isActive={isActive} isComplete={isComplete} />
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  isComplete ? 'text-green-400' : isActive ? 'text-blue-400' : 'text-gray-500'
                )}
              >
                {step.title}
              </span>
            </div>
            {index < WIZARD_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 transition-colors',
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Step Content Components
// ============================================================================

interface StepContentProps {
  bindingData: DocketBindingData;
  isProcessing: boolean;
  onAction: () => void;
  onUpdateField: <K extends keyof DocketBindingData>(field: K, value: DocketBindingData[K]) => void;
}

function ScanBarcodeStep({ bindingData, isProcessing, onAction, onUpdateField }: StepContentProps) {
  const [manualInput, setManualInput] = useState('');

  const handleScan = () => {
    onAction();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onUpdateField('docketNumber', manualInput.trim());
      onAction();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30"
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Barcode className="w-16 h-16 text-blue-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Scan Evidence Barcode</h3>
        <p className="text-gray-400">
          Position the barcode in front of the scanner or enter the docket number manually
        </p>
      </div>

      {/* Manual Input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="docketNumber" className="block text-sm font-medium text-gray-300 mb-2">
            Docket Number
          </label>
          <input
            id="docketNumber"
            type="text"
            value={manualInput || bindingData.docketNumber}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="e.g., DOC-2025-00123"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleScan}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Barcode className="w-5 h-5" />
                Simulate Scan
              </>
            )}
          </button>
          <button
            onClick={handleManualSubmit}
            disabled={isProcessing || !manualInput.trim()}
            className="px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Enter
          </button>
        </div>
      </div>

      {/* Scanned Data Preview */}
      {bindingData.docketNumber && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
        >
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Barcode Scanned</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Docket:</span>
              <span className="ml-2 text-white font-mono">{bindingData.docketNumber}</span>
            </div>
            <div>
              <span className="text-gray-400">Case:</span>
              <span className="ml-2 text-white font-mono">{bindingData.caseReference || '-'}</span>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function PrintTagStep({ bindingData, isProcessing, onAction }: StepContentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30"
          animate={isProcessing ? { y: [0, -5, 0] } : {}}
          transition={{ duration: 0.5, repeat: isProcessing ? Infinity : 0 }}
        >
          <Printer className="w-16 h-16 text-purple-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Print RFID Tag</h3>
        <p className="text-gray-400">Generate and print an RFID label for this docket</p>
      </div>

      {/* Docket Info Card */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Docket Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Docket Number:</span>
            <span className="text-white font-mono">{bindingData.docketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Case Reference:</span>
            <span className="text-white font-mono">{bindingData.caseReference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Category:</span>
            <span className="text-white capitalize">{bindingData.category}</span>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <button
        onClick={onAction}
        disabled={isProcessing}
        className="w-full px-4 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-colors"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Printing Tag...
          </>
        ) : (
          <>
            <Printer className="w-6 h-6" />
            Print RFID Tag
          </>
        )}
      </button>

      {/* Generated EPC Preview */}
      {bindingData.rfidEpc && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
        >
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">Tag Printed</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">RFID EPC:</span>
            <code className="ml-2 text-blue-400 font-mono text-xs">{bindingData.rfidEpc}</code>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BindTagStep({ bindingData, isProcessing, onAction }: StepContentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-green-500/30"
          animate={isProcessing ? { rotate: [0, 360] } : { scale: [1, 1.05, 1] }}
          transition={
            isProcessing
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : { duration: 2, repeat: Infinity }
          }
        >
          <Link2 className="w-16 h-16 text-green-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-white mb-2">Bind Tag to Docket</h3>
        <p className="text-gray-400">
          Place the printed RFID tag on the RFID reader to complete binding
        </p>
      </div>

      {/* Binding Info Card */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Binding Details</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Docket:</span>
            <span className="text-white font-mono">{bindingData.docketNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">RFID EPC:</span>
            <code className="text-blue-400 font-mono text-xs">{bindingData.rfidEpc}</code>
          </div>
        </div>
      </div>

      {/* Bind Button */}
      <button
        onClick={onAction}
        disabled={isProcessing}
        className="w-full px-4 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center justify-center gap-3 transition-colors"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Binding Tag...
          </>
        ) : (
          <>
            <Link2 className="w-6 h-6" />
            Simulate Tag Scan
          </>
        )}
      </button>

      {/* Hint */}
      <p className="text-center text-xs text-gray-500">
        In production, place the RFID tag on the reader antenna
      </p>
    </div>
  );
}

function CompleteStep({ bindingData, onAction }: StepContentProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <motion.div
          className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-green-500/30"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: 'spring', damping: 10 }}
          >
            <CheckCircle2 className="w-20 h-20 text-green-400" />
          </motion.div>
        </motion.div>
        <motion.h3
          className="text-2xl font-bold text-white mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Tag Bound Successfully!
        </motion.h3>
        <motion.p
          className="text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          The RFID tag is now linked to this docket
        </motion.p>
      </div>

      {/* Success Summary Card */}
      <motion.div
        className="p-5 bg-green-500/10 border border-green-500/30 rounded-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h4 className="text-sm font-medium text-green-400 mb-4">Binding Complete</h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Docket Number:</span>
            <span className="text-white font-semibold">{bindingData.docketNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Case Reference:</span>
            <span className="text-white font-mono">{bindingData.caseReference}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">RFID EPC:</span>
            <code className="text-blue-400 font-mono text-xs">{bindingData.rfidEpc}</code>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Bound At:</span>
            <span className="text-white">
              {bindingData.boundAt ? new Date(bindingData.boundAt).toLocaleString() : '-'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.button
        onClick={onAction}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <RefreshCw className="w-5 h-5" />
        Bind Another Tag
      </motion.button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TagBindingWizard() {
  const {
    currentStep,
    bindingData,
    isProcessing,
    updateBindingData,
    nextStep,
    prevStep,
    simulateBarcodeScanning,
    simulateTagPrinting,
    simulateTagBinding,
    reset,
  } = useTagBindingWizard();

  const handleStepAction = async () => {
    switch (currentStep) {
      case 'scan-barcode':
        await simulateBarcodeScanning(bindingData.docketNumber);
        nextStep();
        break;
      case 'print-tag':
        await simulateTagPrinting();
        nextStep();
        break;
      case 'bind-tag':
        await simulateTagBinding();
        nextStep();
        break;
      case 'complete':
        reset();
        break;
    }
  };

  const canGoBack = currentStep !== 'scan-barcode' && currentStep !== 'complete';
  const canGoNext =
    (currentStep === 'scan-barcode' && bindingData.docketNumber) ||
    (currentStep === 'print-tag' && bindingData.rfidEpc) ||
    (currentStep === 'bind-tag' && bindingData.boundAt);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Tag className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Tag Binding Wizard</h2>
          <p className="text-sm text-gray-400">Bind an RFID tag to a docket in 3 easy steps</p>
        </div>
      </div>

      {/* Progress Indicator */}
      <ProgressIndicator currentStep={currentStep} />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 'scan-barcode' && (
            <ScanBarcodeStep
              bindingData={bindingData}
              isProcessing={isProcessing}
              onAction={handleStepAction}
              onUpdateField={updateBindingData}
            />
          )}
          {currentStep === 'print-tag' && (
            <PrintTagStep
              bindingData={bindingData}
              isProcessing={isProcessing}
              onAction={handleStepAction}
              onUpdateField={updateBindingData}
            />
          )}
          {currentStep === 'bind-tag' && (
            <BindTagStep
              bindingData={bindingData}
              isProcessing={isProcessing}
              onAction={handleStepAction}
              onUpdateField={updateBindingData}
            />
          )}
          {currentStep === 'complete' && (
            <CompleteStep
              bindingData={bindingData}
              isProcessing={isProcessing}
              onAction={handleStepAction}
              onUpdateField={updateBindingData}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Footer */}
      {currentStep !== 'complete' && (
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
          <button
            onClick={prevStep}
            disabled={!canGoBack || isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={handleStepAction}
            disabled={!canGoNext || isProcessing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
