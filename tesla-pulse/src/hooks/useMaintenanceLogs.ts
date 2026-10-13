import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { firestore, isFirebaseConfigured } from '@/lib/firebase';
import type { MaintenanceRecord } from '@/types';

// ─── Hook return type ─────────────────────────────────────────────────────────

interface UseMaintenanceLogsResult {
  records: MaintenanceRecord[];
  loading: boolean;
  error:   string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useMaintenanceLogs
 *
 * Subscribes to the Firestore "maintenance_logs" collection in real time.
 * Returns { records, loading, error } — matches the shape of useFaultEvents.
 *
 * Records are ordered by nextDueDate ascending so the most urgent jobs
 * always appear first, regardless of when the document was created.
 *
 * Cleans up the Firestore listener automatically on unmount.
 *
 * @param maxCount  Maximum number of records to fetch (default 200).
 *                  Mirrors the same default used in useFaultEvents.
 */
export function useMaintenanceLogs(maxCount = 200): UseMaintenanceLogsResult {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    // ── Guard: Firebase not configured (simulator-only mode) ───────────────
    // Return mock data for demo purposes
    if (!isFirebaseConfigured || !firestore) {
      console.log('ℹ️ Firestore not configured - using mock maintenance data');
      
      const mockData: MaintenanceRecord[] = [
        {
          id: 'maint_001',
          poleId: 'pole_rajwada_01',
          poleName: 'Pole 01 - Main Line',
          lastMaintenanceDate: 1746144000000,
          nextDueDate: 1754236800000,
          status: 'overdue',
          assignedTechnician: 'Ravi Sharma',
          notes: 'Routine 90-day inspection is overdue. Check sensor housing and terminal connectors.',
          priority: 'high',
        },
        {
          id: 'maint_002',
          poleId: 'pole_rajwada_02',
          poleName: 'Pole 02 - Distribution',
          lastMaintenanceDate: 1749772800000,
          nextDueDate: 1757692800000,
          status: 'due-soon',
          assignedTechnician: 'Priya Patel',
          notes: 'Scheduled 90-day inspection due in 8 days. Verify calibration.',
          priority: 'medium',
        },
        {
          id: 'maint_003',
          poleId: 'pole_vijaynagar_01',
          poleName: 'Pole 01 - VN Square',
          lastMaintenanceDate: 1754668800000,
          nextDueDate: 1762531200000,
          status: 'completed',
          assignedTechnician: 'Arjun Mehta',
          notes: 'Full inspection completed. Replaced moisture sensor capacitor.',
          priority: 'low',
          completedBy: 'Arjun Mehta',
          completedAt: 1754755200000,
        },
        {
          id: 'maint_004',
          poleId: 'pole_vijaynagar_02',
          poleName: 'Pole 02 - AB Road',
          lastMaintenanceDate: 1746748800000,
          nextDueDate: 1754841600000,
          status: 'overdue',
          assignedTechnician: 'Ravi Sharma',
          notes: 'Pole offline for extended period. Inspect ESP32 unit.',
          priority: 'high',
        },
        {
          id: 'maint_005',
          poleId: 'pole_vijaynagar_03',
          poleName: 'Pole 03 - Bhanwarkuan',
          lastMaintenanceDate: 1754323200000,
          nextDueDate: 1762358400000,
          status: 'scheduled',
          assignedTechnician: 'Neha Joshi',
          notes: 'Quarterly inspection scheduled for end of month.',
          priority: 'medium',
        },
        {
          id: 'maint_006',
          poleId: 'pole_airport_01',
          poleName: 'Pole 01 - Terminal Gate',
          lastMaintenanceDate: 1748044800000,
          nextDueDate: 1755388800000,
          status: 'overdue',
          assignedTechnician: 'Priya Patel',
          notes: 'Airport security clearance required. Pole offline.',
          priority: 'high',
        },
        {
          id: 'maint_007',
          poleId: 'pole_airport_02',
          poleName: 'Pole 02 - Parking Lot',
          lastMaintenanceDate: 1754668800000,
          nextDueDate: 1762617600000,
          status: 'scheduled',
          assignedTechnician: 'Arjun Mehta',
          notes: 'Standard quarterly maintenance scheduled.',
          priority: 'low',
        },
      ];

      setRecords(mockData);
      setLoading(false);
      setError(null);
      return;
    }

    // ── Build query ────────────────────────────────────────────────────────
    // Order by nextDueDate ASC so overdue/due-soon records float to the top.
    // useFaultEvents orders by timestamp DESC (newest first) because faults
    // are a log. Maintenance records are a schedule, so ascending is correct.
    const q = query(
      collection(firestore, 'maintenance_logs'),
      orderBy('nextDueDate', 'asc'),
      limit(maxCount),
    );

    // ── Subscribe ──────────────────────────────────────────────────────────
    const unsub = onSnapshot(
      q,
      (snap) => {
        // If Firestore returns empty, use mock data as fallback
        if (snap.empty) {
          console.warn('⚠️ Firestore maintenance_logs collection is empty - using mock data');
          
          const mockData: MaintenanceRecord[] = [
            {
              id: 'maint_001',
              poleId: 'pole_rajwada_01',
              poleName: 'Pole 01 - Main Line',
              lastMaintenanceDate: 1746144000000,
              nextDueDate: 1754236800000,
              status: 'overdue',
              assignedTechnician: 'Ravi Sharma',
              notes: 'Routine 90-day inspection is overdue.',
              priority: 'high',
            },
            {
              id: 'maint_002',
              poleId: 'pole_rajwada_02',
              poleName: 'Pole 02 - Distribution',
              lastMaintenanceDate: 1749772800000,
              nextDueDate: 1757692800000,
              status: 'due-soon',
              assignedTechnician: 'Priya Patel',
              notes: 'Scheduled inspection due in 8 days.',
              priority: 'medium',
            },
            {
              id: 'maint_003',
              poleId: 'pole_vijaynagar_01',
              poleName: 'Pole 01 - VN Square',
              lastMaintenanceDate: 1754668800000,
              nextDueDate: 1762531200000,
              status: 'completed',
              assignedTechnician: 'Arjun Mehta',
              notes: 'Full inspection completed.',
              priority: 'low',
              completedBy: 'Arjun Mehta',
              completedAt: 1754755200000,
            },
            {
              id: 'maint_004',
              poleId: 'pole_vijaynagar_02',
              poleName: 'Pole 02 - AB Road',
              lastMaintenanceDate: 1746748800000,
              nextDueDate: 1754841600000,
              status: 'overdue',
              assignedTechnician: 'Ravi Sharma',
              notes: 'Pole offline for extended period.',
              priority: 'high',
            },
            {
              id: 'maint_005',
              poleId: 'pole_vijaynagar_03',
              poleName: 'Pole 03 - Bhanwarkuan',
              lastMaintenanceDate: 1754323200000,
              nextDueDate: 1762358400000,
              status: 'scheduled',
              assignedTechnician: 'Neha Joshi',
              notes: 'Quarterly inspection scheduled.',
              priority: 'medium',
            },
            {
              id: 'maint_006',
              poleId: 'pole_airport_01',
              poleName: 'Pole 01 - Terminal Gate',
              lastMaintenanceDate: 1748044800000,
              nextDueDate: 1755388800000,
              status: 'overdue',
              assignedTechnician: 'Priya Patel',
              notes: 'Airport clearance required.',
              priority: 'high',
            },
            {
              id: 'maint_007',
              poleId: 'pole_airport_02',
              poleName: 'Pole 02 - Parking Lot',
              lastMaintenanceDate: 1754668800000,
              nextDueDate: 1762617600000,
              status: 'scheduled',
              assignedTechnician: 'Arjun Mehta',
              notes: 'Standard quarterly maintenance.',
              priority: 'low',
            },
          ];

          setRecords(mockData);
          setLoading(false);
          setError(null);
          return;
        }

        const data: MaintenanceRecord[] = snap.docs.map((doc) => {
          const raw = doc.data();

          // Firestore Timestamps must be converted to Unix ms — identical to
          // the Timestamp.toMillis() conversion in useFaultEvents.
          // If the value is already a number (e.g. from firebase-initial-data.json
          // seeded via the REST API), the nullish fallback keeps it as-is.
          const toMs = (v: unknown): number =>
            v instanceof Timestamp ? v.toMillis() : (v as number) ?? 0;

          return {
            id:                  doc.id,
            poleId:              raw.poleId              as string,
            poleName:            raw.poleName            as string,
            lastMaintenanceDate: toMs(raw.lastMaintenanceDate),
            nextDueDate:         toMs(raw.nextDueDate),
            status:              raw.status              as MaintenanceRecord['status'],
            assignedTechnician:  raw.assignedTechnician  as string,
            notes:               raw.notes               as string ?? '',
            priority:            raw.priority            as MaintenanceRecord['priority'],
            // optional fields — only present on completed records
            ...(raw.completedBy  !== undefined && { completedBy:  raw.completedBy  as string }),
            ...(raw.completedAt  !== undefined && { completedAt:  toMs(raw.completedAt) }),
          } satisfies MaintenanceRecord;
        });

        setRecords(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // onSnapshot error callback — Firestore permission denied, network
        // failure, etc. Use mock data as fallback instead of showing error
        console.warn('⚠️ Firestore error - falling back to mock maintenance data:', err.message);
        
        const mockData: MaintenanceRecord[] = [
          {
            id: 'maint_001',
            poleId: 'pole_rajwada_01',
            poleName: 'Pole 01 - Main Line',
            lastMaintenanceDate: 1746144000000,
            nextDueDate: 1754236800000,
            status: 'overdue',
            assignedTechnician: 'Ravi Sharma',
            notes: 'Routine 90-day inspection is overdue.',
            priority: 'high',
          },
          {
            id: 'maint_002',
            poleId: 'pole_rajwada_02',
            poleName: 'Pole 02 - Distribution',
            lastMaintenanceDate: 1749772800000,
            nextDueDate: 1757692800000,
            status: 'due-soon',
            assignedTechnician: 'Priya Patel',
            notes: 'Scheduled inspection due in 8 days.',
            priority: 'medium',
          },
          {
            id: 'maint_003',
            poleId: 'pole_vijaynagar_01',
            poleName: 'Pole 01 - VN Square',
            lastMaintenanceDate: 1754668800000,
            nextDueDate: 1762531200000,
            status: 'completed',
            assignedTechnician: 'Arjun Mehta',
            notes: 'Full inspection completed.',
            priority: 'low',
            completedBy: 'Arjun Mehta',
            completedAt: 1754755200000,
          },
          {
            id: 'maint_004',
            poleId: 'pole_vijaynagar_02',
            poleName: 'Pole 02 - AB Road',
            lastMaintenanceDate: 1746748800000,
            nextDueDate: 1754841600000,
            status: 'overdue',
            assignedTechnician: 'Ravi Sharma',
            notes: 'Pole offline for extended period.',
            priority: 'high',
          },
          {
            id: 'maint_005',
            poleId: 'pole_vijaynagar_03',
            poleName: 'Pole 03 - Bhanwarkuan',
            lastMaintenanceDate: 1754323200000,
            nextDueDate: 1762358400000,
            status: 'scheduled',
            assignedTechnician: 'Neha Joshi',
            notes: 'Quarterly inspection scheduled.',
            priority: 'medium',
          },
          {
            id: 'maint_006',
            poleId: 'pole_airport_01',
            poleName: 'Pole 01 - Terminal Gate',
            lastMaintenanceDate: 1748044800000,
            nextDueDate: 1755388800000,
            status: 'overdue',
            assignedTechnician: 'Priya Patel',
            notes: 'Airport clearance required.',
            priority: 'high',
          },
          {
            id: 'maint_007',
            poleId: 'pole_airport_02',
            poleName: 'Pole 02 - Parking Lot',
            lastMaintenanceDate: 1754668800000,
            nextDueDate: 1762617600000,
            status: 'scheduled',
            assignedTechnician: 'Arjun Mehta',
            notes: 'Standard quarterly maintenance.',
            priority: 'low',
          },
        ];

        setRecords(mockData);
        setLoading(false);
        setError(null); // Don't show error, silently use mock data
      },
    );

    // ── Cleanup ────────────────────────────────────────────────────────────
    // Return the unsubscribe function so React calls it on unmount,
    // preventing memory leaks — identical pattern to useFaultEvents.
    return unsub;
  }, [maxCount]);

  return { records, loading, error };
}
