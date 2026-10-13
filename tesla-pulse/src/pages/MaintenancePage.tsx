import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useMaintenanceLogs } from '@/hooks/useMaintenanceLogs';
import { useAuthStore } from '@/store/authStore';
import { firestore, isFirebaseConfigured } from '@/lib/firebase';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatTs, timeAgo, cn } from '@/lib/utils';
import type { MaintenanceRecord } from '@/types';
import {
  AlertTriangle, Clock, CalendarCheck, CheckCircle,
  User, MapPin, Wrench, Search, X, ChevronDown, Loader2,
} from 'lucide-react';

// ─── Status + priority config ─────────────────────────────────────────────────
// Token pattern matches every other badge in the app:
//   bg-{token}/20  text-{token}  border border-{token}/30  rounded-full
const STATUS_CONFIG: Record<
  MaintenanceRecord['status'],
  { label: string; classes: string; pulse?: boolean }
> = {
  overdue:    { label: 'Overdue',   classes: 'bg-fault/20   text-fault    border-fault/30',    pulse: true },
  'due-soon': { label: 'Due Soon',  classes: 'bg-warning/20 text-warning  border-warning/30'              },
  scheduled:  { label: 'Scheduled', classes: 'bg-gray-700   text-gray-400 border-gray-600/30'             },
  completed:  { label: 'Completed', classes: 'bg-safe/20    text-safe     border-safe/30'                  },
};

const PRIORITY_CONFIG: Record<
  MaintenanceRecord['priority'],
  { label: string; classes: string }
> = {
  high:   { label: 'High',   classes: 'bg-fault/10   text-fault    border-fault/20'    },
  medium: { label: 'Medium', classes: 'bg-warning/10 text-warning  border-warning/20'  },
  low:    { label: 'Low',    classes: 'bg-gray-700   text-gray-400 border-gray-600/20' },
};

const KNOWN_AREAS = ['Rajwada', 'Vijaynagar', 'Airport'] as const;
type Area = typeof KNOWN_AREAS[number] | 'all';

// ─── Permission check ─────────────────────────────────────────────────────────
function useCanComplete(poleId: string): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'technician') return (user.assignedPoles ?? []).includes(poleId);
  return false;
}

// ─── Firestore write ──────────────────────────────────────────────────────────
async function completeMaintenanceRecord(
  recordId:    string,
  completedBy: string,
  notes:       string,
): Promise<void> {
  if (!isFirebaseConfigured || !firestore) {
    throw new Error('Firebase not configured — cannot save in simulator mode.');
  }
  await updateDoc(doc(firestore, 'maintenance_logs', recordId), {
    status:      'completed',
    completedBy,
    completedAt: Date.now(),
    notes:       notes.trim(),
  });
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
// Matches SkeletonCard's shimmer style; extended for a table-row shape.
function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.05] animate-pulse">
      <td className="p-0 w-1"><div className="w-1 h-[52px] bg-white/10" /></td>
      {[140, 60, 100, 100, 80, 100, 60, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-white/10" style={{ width: w }} />
          {i === 0 && <div className="h-2 rounded bg-white/[0.06] mt-1.5" style={{ width: 80 }} />}
        </td>
      ))}
    </tr>
  );
}

function SkeletonMobileCard() {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 animate-pulse space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-36 rounded bg-white/10" />
          <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-4 w-12 rounded-full bg-white/10" />
          <div className="h-4 w-16 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 rounded-lg bg-white/[0.05]" />
        <div className="h-14 rounded-lg bg-white/[0.05]" />
      </div>
      <div className="h-px bg-white/[0.06]" />
      <div className="h-3 w-28 rounded bg-white/[0.06]" />
    </div>
  );
}

function StatStripSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-4 animate-pulse">
          <div className="w-10 h-10 rounded-lg bg-white/10 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-6 w-6 rounded bg-white/10" />
            <div className="h-2.5 w-20 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Complete modal ───────────────────────────────────────────────────────────
interface CompleteModalProps {
  record:  MaintenanceRecord;
  onClose: () => void;
  onSaved: () => void;
}

function CompleteModal({ record, onClose, onSaved }: CompleteModalProps) {
  const user                      = useAuthStore((s) => s.user);
  const [notes,  setNotes]        = useState('');
  const [saving, setSaving]       = useState(false);
  const textareaRef               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { textareaRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const by = user?.displayName ?? user?.email ?? 'Unknown';
      await completeMaintenanceRecord(record.id, by, notes);
      toast.success(`${record.poleName} marked as completed`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`, { duration: 5000 });
    } finally {
      setSaving(false);
    }
  }, [saving, user, record, notes, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-modal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop — same translucency as app's other overlays */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel — matches GlassCard token: border-white/10, bg-white/5, rounded-xl */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10
        bg-navy-900 backdrop-blur-sm shadow-2xl p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="complete-modal-title" className="text-sm font-semibold text-white">
              Mark as Completed
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">{record.poleName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Record summary — same inner card pattern as GlassCard details */}
        <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] p-3 space-y-2">
          {[
            ['Pole ID',       record.poleId],
            ['Priority',      record.priority],
            ['Assigned to',   record.assignedTechnician],
            ['Completing as', user?.displayName ?? user?.email ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between text-xs">
              <span className="text-gray-600">{label}</span>
              <span className={cn('capitalize', label === 'Completing as' ? 'text-white font-medium' : 'text-gray-400')}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="completion-notes" className="text-xs font-medium text-gray-400">
            Notes <span className="text-gray-600 font-normal">(optional)</span>
          </label>
          <textarea
            ref={textareaRef}
            id="completion-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Work done, parts replaced, observations…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2
              text-xs text-white placeholder-gray-600 resize-none
              focus:outline-none focus:border-electric-500/50 focus:bg-white/[0.06] transition-all"
          />
        </div>

        {/* Actions — mirror FaultsPage button style */}
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-xs
              text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
              bg-safe/20 border border-safe/30 text-safe text-xs font-semibold
              hover:bg-safe/30 transition-all disabled:opacity-40"
            aria-label="Confirm and mark this record as completed"
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
              : <><CheckCircle className="w-3.5 h-3.5" />Confirm Complete</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Complete button — permission-gated, hidden when already completed ─────────
interface CompleteButtonProps { record: MaintenanceRecord; onRequest: (r: MaintenanceRecord) => void }
function CompleteButton({ record, onRequest }: CompleteButtonProps) {
  const canComplete = useCanComplete(record.poleId);
  if (!canComplete || record.status === 'completed') return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onRequest(record); }}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold
        bg-safe/10 border border-safe/25 text-safe hover:bg-safe/20 transition-all whitespace-nowrap"
      aria-label={`Mark ${record.poleName} as completed`}
    >
      <CheckCircle className="w-3 h-3" aria-hidden="true" />
      Complete
    </button>
  );
}

// ─── Shared badge ─────────────────────────────────────────────────────────────
function Badge({ classes, label, pulse }: { classes: string; label: string; pulse?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
      classes,
      pulse && 'animate-pulse',
    )}>
      {label}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function areaFromPoleId(poleId: string): string {
  const match = poleId.match(/^pole_([a-z]+)_/);
  if (!match) return '—';
  return match[1].charAt(0).toUpperCase() + match[1].slice(1);
}

// ─── Filter select ─────────────────────────────────────────────────────────────
interface SelectProps {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}
function FilterSelect({ value, onChange, options, ariaLabel }: SelectProps) {
  const active = value !== 'all';
  return (
    <div className="relative inline-flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={cn(
          'appearance-none pl-2.5 pr-7 py-1 text-[10px] rounded-lg border transition-all',
          'bg-white/[0.04] focus:outline-none focus:bg-white/[0.06] cursor-pointer',
          active
            ? 'border-electric-500/40 text-electric-400 bg-electric-500/10'
            : 'border-white/10 text-gray-500 hover:text-white hover:bg-white/[0.06]',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-navy-800 text-white">{o.label}</option>
        ))}
      </select>
      <ChevronDown className={cn('pointer-events-none absolute right-1.5 w-3 h-3',
        active ? 'text-electric-400' : 'text-gray-600')} />
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────
interface FilterBarProps {
  search: string;       onSearch:   (v: string) => void;
  filterStatus: string; onStatus:   (v: string) => void;
  filterArea: string;   onArea:     (v: string) => void;
  filterTech: string;   onTech:     (v: string) => void;
  technicians: string[];
  hasFilters: boolean;  onClear:    () => void;
  resultCount: number;  totalCount: number;
}
function FilterBar({
  search, onSearch, filterStatus, onStatus,
  filterArea, onArea, filterTech, onTech,
  technicians, hasFilters, onClear, resultCount, totalCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
      {/* Search — identical to FaultsPage search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search by pole name…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Search by pole name"
          className="pl-8 pr-7 py-1 text-[10px] rounded-lg border border-white/10
            bg-white/[0.04] text-white placeholder-gray-600
            focus:outline-none focus:border-electric-500/50 focus:bg-white/[0.06]
            transition-all w-44"
        />
        {search && (
          <button onClick={() => onSearch('')} aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

      <FilterSelect value={filterStatus} onChange={onStatus} ariaLabel="Filter by status" options={[
        { value: 'all',       label: 'All Statuses' },
        { value: 'overdue',   label: 'Overdue'      },
        { value: 'due-soon',  label: 'Due Soon'     },
        { value: 'scheduled', label: 'Scheduled'    },
        { value: 'completed', label: 'Completed'    },
      ]} />
      <FilterSelect value={filterArea} onChange={onArea} ariaLabel="Filter by area" options={[
        { value: 'all', label: 'All Areas' },
        ...KNOWN_AREAS.map((a) => ({ value: a, label: a })),
      ]} />
      <FilterSelect value={filterTech} onChange={onTech} ariaLabel="Filter by technician" options={[
        { value: 'all', label: 'All Technicians' },
        ...technicians.map((t) => ({ value: t, label: t })),
      ]} />

      <div className="flex items-center gap-2 sm:ml-auto">
        <span className="text-[10px] text-gray-600">
          {resultCount === totalCount
            ? `${totalCount} record${totalCount !== 1 ? 's' : ''}`
            : `${resultCount} of ${totalCount}`}
        </span>
        {hasFilters && (
          <button onClick={onClear} aria-label="Clear all filters"
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Desktop table row ─────────────────────────────────────────────────────────
interface RowProps { r: MaintenanceRecord; onComplete: (r: MaintenanceRecord) => void }

function TableRow({ r, onComplete }: RowProps) {
  const status   = STATUS_CONFIG[r.status];
  const priority = PRIORITY_CONFIG[r.priority];
  return (
    <tr className={cn(
      'border-b border-white/[0.05] transition-colors',
      r.status === 'overdue' ? 'hover:bg-fault/5' : 'hover:bg-white/[0.03]',
    )}>
      {/* Left accent — inline style avoids Tailwind purge on dynamic color classes */}
      <td className="p-0 w-1" aria-hidden="true">
        <div className="w-1 min-h-[52px]" style={{
          backgroundColor:
            r.status === 'overdue'   ? '#ef4444' :
            r.status === 'due-soon'  ? '#f59e0b' :
            r.status === 'completed' ? '#22c55e' : '#4b5563',
        }} />
      </td>
      <td className="px-4 py-3">
        <p className="text-sm font-medium text-white leading-tight">{r.poleName}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{r.poleId}</p>
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{areaFromPoleId(r.poleId)}</td>
      <td className="px-4 py-3">
        <p className="text-xs text-gray-300">{formatTs(r.lastMaintenanceDate)}</p>
        <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(r.lastMaintenanceDate)}</p>
      </td>
      <td className="px-4 py-3">
        <p className={cn('text-xs font-medium',
          r.status === 'overdue'  ? 'text-fault' :
          r.status === 'due-soon' ? 'text-warning' : 'text-gray-300',
        )}>
          {formatTs(r.nextDueDate)}
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(r.nextDueDate)}</p>
      </td>
      <td className="px-4 py-3">
        <Badge classes={status.classes} label={status.label} pulse={status.pulse} />
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{r.assignedTechnician}</td>
      <td className="px-4 py-3">
        <Badge classes={priority.classes} label={priority.label} />
      </td>
      <td className="px-4 py-3">
        <CompleteButton record={r} onRequest={onComplete} />
      </td>
    </tr>
  );
}

// ─── Mobile card ───────────────────────────────────────────────────────────────
function MobileCard({ r, onComplete }: RowProps) {
  const status   = STATUS_CONFIG[r.status];
  const priority = PRIORITY_CONFIG[r.priority];

  // Use a plain div wrapper with inline borderLeftColor — GlassCard doesn't accept style prop
  const borderColor =
    r.status === 'overdue'   ? '#ef4444' :
    r.status === 'due-soon'  ? '#f59e0b' :
    r.status === 'completed' ? '#22c55e' : '#4b5563';

  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm border-l-[3px] p-4"
      style={{ borderLeftColor: borderColor }}
      role="listitem"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate">{r.poleName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3 h-3 text-gray-600" aria-hidden="true" />
            <span className="text-[10px] text-gray-500">{areaFromPoleId(r.poleId)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
          <Badge classes={priority.classes} label={priority.label} />
          <Badge classes={status.classes}   label={status.label}   pulse={status.pulse} />
        </div>
      </div>

      {/* Date detail grid — same 2-col pill style as PoleCard sensor grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
            <Wrench className="w-3 h-3" aria-hidden="true" /> Last Done
          </p>
          <p className="text-xs text-white font-medium leading-tight">{formatTs(r.lastMaintenanceDate)}</p>
          <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(r.lastMaintenanceDate)}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-2.5">
          <p className="text-[10px] text-gray-500 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" /> Next Due
          </p>
          <p className={cn('text-xs font-medium leading-tight',
            r.status === 'overdue'  ? 'text-fault' :
            r.status === 'due-soon' ? 'text-warning' : 'text-white',
          )}>
            {formatTs(r.nextDueDate)}
          </p>
          <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(r.nextDueDate)}</p>
        </div>
      </div>

      {/* Footer: technician + action */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.06]">
        <User className="w-3 h-3 text-gray-600 shrink-0" aria-hidden="true" />
        <p className="text-[10px] text-gray-400 flex-1 truncate">{r.assignedTechnician}</p>
        {r.status === 'completed' && r.completedBy
          ? <p className="text-[10px] text-gray-600">by {r.completedBy}</p>
          : <CompleteButton record={r} onRequest={onComplete} />
        }
      </div>
    </div>
  );
}

// ─── Stat strip ───────────────────────────────────────────────────────────────
function MaintenanceStatStrip({ records }: { records: MaintenanceRecord[] }) {
  const stats = useMemo(() => {
    const now        = Date.now();
    const sevenDays  = 7 * 24 * 60 * 60 * 1000;
    const d          = new Date();
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();

    const overdue  = records.filter((r) => r.status === 'overdue').length;
    const dueSoon  = records.filter(
      (r) => r.status !== 'completed' && r.nextDueDate > now && r.nextDueDate - now <= sevenDays,
    ).length;
    const scheduled          = records.filter((r) => r.status === 'scheduled').length;
    const completedThisMonth = records.filter(
      (r) => r.status === 'completed' && r.completedAt !== undefined && r.completedAt >= monthStart,
    ).length;

    return [
      { label: 'Overdue',              value: overdue,            icon: AlertTriangle, color: overdue > 0 ? 'text-fault'         : 'text-gray-400', glow: overdue > 0 ? 'fault'   as const : null },
      { label: 'Due Within 7 Days',    value: dueSoon,            icon: Clock,         color: dueSoon > 0 ? 'text-warning'       : 'text-gray-400', glow: dueSoon > 0 ? 'warning' as const : null },
      { label: 'Scheduled',            value: scheduled,          icon: CalendarCheck, color: 'text-electric-400',                                   glow: null },
      { label: 'Completed This Month', value: completedThisMonth, icon: CheckCircle,   color: completedThisMonth > 0 ? 'text-safe' : 'text-gray-400', glow: null },
    ];
  }, [records]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(({ label, value, icon: Icon, color, glow }) => (
        <GlassCard key={label} className="p-4 flex items-center gap-4" glow={glow}>
          <div className={cn('p-2.5 rounded-lg bg-white/5', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────
// Matches FaultsPage EmptyState — centered icon, copy, optional clear button
function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center"
      role="status" aria-live="polite">
      <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08]
        flex items-center justify-center">
        <Wrench className="w-6 h-6 text-gray-600" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No records found</p>
        <p className="text-xs text-gray-600 mt-1">
          {hasFilters
            ? 'No maintenance records match the current filters.'
            : 'No records yet — connect Firebase or seed firebase-initial-data.json.'}
        </p>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-electric-400 hover:text-electric-300
            transition-colors px-3 py-1.5 rounded-lg border border-electric-500/20
            hover:border-electric-500/40"
        >
          <X className="w-3 h-3" aria-hidden="true" /> Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────────────────
// Uses text-fault (design token) + AlertTriangle icon, matching app-wide error style
function ErrorState({ message }: { message: string }) {
  return (
    <GlassCard className="p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-fault/10 border border-fault/20
          flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-fault" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-fault">Failed to load maintenance logs</p>
          <p className="text-xs text-gray-500 mt-1 max-w-sm">{message}</p>
        </div>
      </div>
    </GlassCard>
  );
}

// ─── Table column headers ──────────────────────────────────────────────────────
const TABLE_HEADERS = ['Pole', 'Area', 'Last Maintenance', 'Next Due', 'Status', 'Technician', 'Priority', ''];

// ─── Main page ─────────────────────────────────────────────────────────────────
export function MaintenancePage() {
  const { records, loading, error } = useMaintenanceLogs();

  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<MaintenanceRecord['status'] | 'all'>('all');
  const [filterArea,   setFilterArea]   = useState<Area>('all');
  const [filterTech,   setFilterTech]   = useState('all');
  const [activeRecord, setActiveRecord] = useState<MaintenanceRecord | null>(null);

  const hasFilters = search !== '' || filterStatus !== 'all' || filterArea !== 'all' || filterTech !== 'all';

  const clearFilters = useCallback(() => {
    setSearch(''); setFilterStatus('all'); setFilterArea('all'); setFilterTech('all');
  }, []);

  const technicians = useMemo(() =>
    [...new Set(records.map((r) => r.assignedTechnician))].sort(),
  [records]);

  const filtered = useMemo(() => records.filter((r) => {
    if (search       && !r.poleName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus)                       return false;
    if (filterArea   !== 'all' && areaFromPoleId(r.poleId) !== filterArea)         return false;
    if (filterTech   !== 'all' && r.assignedTechnician !== filterTech)             return false;
    return true;
  }), [records, search, filterStatus, filterArea, filterTech]);

  // ── Loading — shimmer skeletons, not pulsing text ──────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Maintenance" subtitle="Loading records…" />
        <StatStripSkeleton />
        {/* Desktop skeleton table */}
        <GlassCard className="overflow-hidden hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="w-1 p-0" />
                  {TABLE_HEADERS.map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        </GlassCard>
        {/* Mobile skeleton cards */}
        <div className="md:hidden space-y-3">
          {[...Array(4)].map((_, i) => <SkeletonMobileCard key={i} />)}
        </div>
      </div>
    );
  }

  // ── Error — design-token color + icon, matches app-wide error style ────────
  if (error) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Maintenance" subtitle="Error loading records" />
        <ErrorState message={error} />
      </div>
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6">
        <SectionHeader
          title="Maintenance"
          subtitle="Sorted by next due date · soonest first"
        />

        {/* Stat strip counts from all records — not filtered, same as StatStrip on Overview */}
        <MaintenanceStatStrip records={records} />

        <FilterBar
          search={search}           onSearch={setSearch}
          filterStatus={filterStatus} onStatus={(v) => setFilterStatus(v as MaintenanceRecord['status'] | 'all')}
          filterArea={filterArea}   onArea={(v) => setFilterArea(v as Area)}
          filterTech={filterTech}   onTech={setFilterTech}
          technicians={technicians}
          hasFilters={hasFilters}   onClear={clearFilters}
          resultCount={filtered.length}
          totalCount={records.length}
        />

        {filtered.length === 0 ? (
          <GlassCard>
            <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
          </GlassCard>
        ) : (
          <>
            {/* Desktop table — hidden below md breakpoint */}
            <GlassCard className="overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" aria-label="Maintenance records">
                  <thead>
                    <tr className="border-b border-white/[0.08]">
                      <th className="w-1 p-0" aria-hidden="true" />
                      {TABLE_HEADERS.map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} r={r} onComplete={setActiveRecord} />
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Mobile cards — shown below md breakpoint */}
            <div className="md:hidden space-y-3" role="list" aria-label="Maintenance records">
              {filtered.map((r) => (
                <MobileCard key={r.id} r={r} onComplete={setActiveRecord} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal rendered in a fragment so it escapes the scroll container */}
      {activeRecord && (
        <CompleteModal
          record={activeRecord}
          onClose={() => setActiveRecord(null)}
          onSaved={() => setActiveRecord(null)}
        />
      )}
    </>
  );
}
