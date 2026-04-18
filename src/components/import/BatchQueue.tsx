import type { DocketEntry } from './types';
import { DocketQueueItem } from './DocketQueueItem';

interface BatchQueueProps {
  dockets: DocketEntry[];
  isProcessing: boolean;
  onRemove: (id: string) => void;
  onClearCompleted: () => void;
  onProcessAll: () => void;
}

export function BatchQueue({
  dockets,
  isProcessing,
  onRemove,
  onClearCompleted,
  onProcessAll,
}: BatchQueueProps) {
  const completedCount = dockets.filter((d) => d.status === 'success').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Batch Queue ({dockets.length} {dockets.length === 1 ? 'docket' : 'dockets'})
        </h3>
        <div className="space-x-2">
          <button
            onClick={onClearCompleted}
            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm"
            disabled={completedCount === 0}
          >
            Clear Completed
          </button>
          <button
            onClick={onProcessAll}
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
            <DocketQueueItem key={docket.id} docket={docket} onRemove={onRemove} />
          ))
        )}
      </div>
    </div>
  );
}
