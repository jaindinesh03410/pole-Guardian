import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, limit, onSnapshot, Timestamp
} from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '@/lib/firebase';
import type { FaultEvent } from '@/types';

export function useFaultEvents(maxCount = 200) {
  const [events, setEvents] = useState<FaultEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured || !firestore) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(firestore, 'fault_events'),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: FaultEvent[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<FaultEvent, 'id'>),
        timestamp: (d.data().timestamp as Timestamp)?.toMillis?.() ?? d.data().timestamp,
      }));
      setEvents(data);
      setLoading(false);
    });

    return unsub;
  }, [maxCount]);

  return { events, loading };
}
