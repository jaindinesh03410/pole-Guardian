import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit, getDocs, Timestamp
} from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '@/lib/firebase';
import type { HistoryLog } from '@/types';
import { subHours, subDays } from 'date-fns';

export type HistoryRange = '1h' | '24h' | '7d' | '30d';

export function usePoleHistory(poleId: string, range: HistoryRange) {
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!poleId || !isFirebaseConfigured || !firestore) return;
    setLoading(true);

    const now = new Date();
    const from = range === '1h'
      ? subHours(now, 1)
      : range === '24h'
      ? subHours(now, 24)
      : range === '7d'
      ? subDays(now, 7)
      : subDays(now, 30);

    const q = query(
      collection(firestore, 'history_logs'),
      where('poleId', '==', poleId),
      where('timestamp', '>=', Timestamp.fromDate(from)),
      orderBy('timestamp', 'asc'),
      limit(500)
    );

    getDocs(q).then((snap) => {
      const data: HistoryLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<HistoryLog, 'id'>),
        timestamp: (d.data().timestamp as Timestamp).toMillis(),
      }));
      setLogs(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [poleId, range]);

  return { logs, loading };
}
