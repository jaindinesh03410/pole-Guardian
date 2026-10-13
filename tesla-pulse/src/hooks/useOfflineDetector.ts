/**
 * Client-side interval that checks lastUpdated timestamps every 5s.
 * If a pole hasn't sent data for >30s, it's marked offline in the UI.
 */
import { useEffect } from 'react';
import { usePoleStore } from '@/store/poleStore';
import { getPoleStatus } from '@/lib/utils';

export function useOfflineDetector() {
  const poles = usePoleStore((s) => s.poles);

  useEffect(() => {
    const interval = setInterval(() => {
      Object.values(poles).forEach((pole) => {
        const computed = getPoleStatus(pole.live);
        if (computed !== pole.uiStatus) {
          // Force a re-upsert with same data to recompute status
          usePoleStore.getState().upsertPole(pole.id, pole.meta, pole.live);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [poles]);
}
