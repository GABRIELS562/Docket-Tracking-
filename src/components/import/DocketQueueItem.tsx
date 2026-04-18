import type { DocketEntry } from './types';

interface DocketQueueItemProps {
  docket: DocketEntry;
  onRemove: (id: string) => void;
}

const statusStyles = {
  success: 'bg-green-50 border-green-300',
  error: 'bg-red-50 border-red-300',
  processing: 'bg-blue-50 border-blue-300',
  pending: 'bg-white border-gray-300',
} as const;

const statusLabels = {
  success: <span className="text-green-600">&#x2713; Success</span>,
  error: <span className="text-red-600">&#x2717; Failed</span>,
  processing: <span className="text-blue-600">Processing...</span>,
  pending: <span className="text-gray-600">Pending</span>,
} as const;

export function DocketQueueItem({ docket, onRemove }: DocketQueueItemProps) {
  return (
    <div className={`p-3 border rounded ${statusStyles[docket.status]}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-medium text-sm">
            {docket.labNumber} | {docket.caseNumber}
          </div>
          <div className="text-xs text-gray-600 mt-1">RFID: {docket.rfidEpc}</div>
          <div className="text-xs text-gray-600">{docket.description}</div>
          {docket.status === 'error' && docket.errorMessage && (
            <div className="text-xs text-red-600 mt-1">Error: {docket.errorMessage}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-medium">{statusLabels[docket.status]}</div>
          {docket.status === 'pending' && (
            <button
              onClick={() => onRemove(docket.id)}
              className="text-red-600 hover:text-red-800 text-xs"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
