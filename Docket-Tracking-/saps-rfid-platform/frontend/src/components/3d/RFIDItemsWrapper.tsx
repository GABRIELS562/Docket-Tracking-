import { Suspense } from 'react';
import { useSceneStore } from '../../stores/sceneStore';
import { useTotalItemCount } from '../../stores/virtualizedAppStore';
import RFIDItems from './RFIDItems';
import InstancedRFIDSystem from './InstancedRFIDSystem';

/**
 * Smart RFID Items Wrapper
 *
 * Automatically switches between rendering modes based on item count:
 * - < 100 items: Use individual RFIDItems (better visuals, interactive)
 * - >= 100 items: Use InstancedRFIDSystem (better performance)
 *
 * This prevents the 1000+ draw call issue when tracking many items.
 */
const INSTANCED_THRESHOLD = 100;

const RFIDItemsWrapper = () => {
  const sceneItems = useSceneStore((s) => s.items);
  // Use dedicated hook that returns a stable primitive
  const virtualizedItemCount = useTotalItemCount();

  // Use the higher of scene items or virtualized items
  const itemCount = Math.max(sceneItems.length, virtualizedItemCount);
  const useInstanced = itemCount >= INSTANCED_THRESHOLD;

  return (
    <Suspense fallback={null}>
      {useInstanced ? (
        <InstancedRFIDSystem />
      ) : (
        <RFIDItems />
      )}
    </Suspense>
  );
};

export default RFIDItemsWrapper;
