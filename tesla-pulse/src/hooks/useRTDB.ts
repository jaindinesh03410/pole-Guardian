/**
 * Subscribes to /poles in Firebase Realtime Database.
 * Uses onValue() — stays live for the entire session.
 * Also monitors .info/connected for disconnect detection.
 */
import { useEffect, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { rtdb, isFirebaseConfigured } from '@/lib/firebase';
import { usePoleStore } from '@/store/poleStore';
import type { PoleLive, PoleMeta } from '@/types';

export function useRTDB() {
  const { upsertPole, setConnected, simulatorActive } = usePoleStore();
  const listenersSetup = useRef(false);

  useEffect(() => {
    // Prevent duplicate listener setup
    if (listenersSetup.current) {
      console.log('⏭️ Listeners already active, skipping setup');
      return;
    }

    console.log('🔥 useRTDB effect running:', {
      simulatorActive,
      isFirebaseConfigured,
      hasRTDB: !!rtdb
    });

    if (simulatorActive) {
      console.log('⏸️ Firebase listener disabled - simulator is active');
      return;
    }

    if (!isFirebaseConfigured || !rtdb) {
      console.log('⚠️ Firebase not configured or RTDB not initialized');
      return;
    }

    console.log('✅ Setting up Firebase listeners...');
    listenersSetup.current = true;

    // ── Connection state ────────────────────────────────────────────────────
    const connRef = ref(rtdb, '.info/connected');
    const connUnsubscribe = onValue(connRef, (snap) => {
      const connected = snap.val() === true;
      console.log('🌐 Firebase connection status:', connected);
      setConnected(connected);
    }, (error) => {
      console.error('❌ Connection listener error:', error);
    });

    // ── Live poles data ─────────────────────────────────────────────────────
    const polesRef = ref(rtdb, 'poles');
    const polesUnsubscribe = onValue(polesRef, (snap) => {
      console.log('📡 Firebase data update received at', new Date().toLocaleTimeString());
      const data = snap.val();
      if (!data) {
        console.log('⚠️ No data in /poles');
        return;
      }

      const poleIds = Object.keys(data);
      console.log('📊 Processing', poleIds.length, 'poles:', poleIds.join(', '));
      
      Object.entries(data).forEach(([poleId, poleData]) => {
        const pd = poleData as { meta?: PoleMeta; live?: PoleLive };
        if (pd.meta && pd.live) {
          console.log(`✅ ${poleId}: leakage=${pd.live.leakageCurrent_mA}mA, voltage=${pd.live.voltage_V}V`);
          upsertPole(poleId, pd.meta, pd.live);
        } else {
          console.warn(`⚠️ Incomplete data for ${poleId}:`, { hasMeta: !!pd.meta, hasLive: !!pd.live });
        }
      });
    }, (error) => {
      console.error('❌ Poles listener error:', error);
    });

    return () => {
      console.log('🧹 Cleaning up Firebase listeners');
      listenersSetup.current = false;
      connUnsubscribe();
      polesUnsubscribe();
    };
  }, [simulatorActive, upsertPole, setConnected]);
}
