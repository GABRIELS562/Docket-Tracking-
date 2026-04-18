import { useImportState, DocketEntryForm, BatchQueue, MessageBanner } from './import';

/**
 * Bulk Docket Import Component
 *
 * Allows scanning multiple QR codes and assigning RFID tags in batch.
 * This is the main orchestrator that composes sub-components.
 */
export function BulkDocketImport() {
  const {
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
  } = useImportState();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Bulk Docket Import</h2>

      <MessageBanner message={message} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Add New Entry */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Add Docket</h3>
          <DocketEntryForm
            showScanner={showScanner}
            setShowScanner={setShowScanner}
            currentEntry={currentEntry}
            setCurrentEntry={setCurrentEntry}
            onQRScan={handleQRScan}
            onAddDocket={addDocket}
          />
        </div>

        {/* Right Panel: Batch List */}
        <BatchQueue
          dockets={dockets}
          isProcessing={isProcessing}
          onRemove={removeDocket}
          onClearCompleted={clearCompleted}
          onProcessAll={processAll}
        />
      </div>
    </div>
  );
}
