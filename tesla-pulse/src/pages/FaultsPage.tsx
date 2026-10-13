import { useState, useMemo, useCallback } from 'react';
import { usePoleStore } from '@/store/poleStore';
import { useFaultEvents } from '@/hooks/useFaultEvents';
import { GlassCard } from '@/components/ui/GlassCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatTs, timeAgo, cn } from '@/lib/utils';
import type { FaultEvent, FaultType } from '@/types';
import {
  AlertTriangle, CheckCircle, Download, ChevronDown, ChevronRight,
  Search, X, MapPin, Cpu, Clock, ShieldCheck,
  ShieldAlert, Info, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';

// ─── Static metadata ──────────────────────────────────────────────────────────

const TYPE_LABELS: Record<FaultType, string> = {
  leakage:     'Leakage Current',
  overvoltage: 'Over Voltage',
  moisture:    'High Moisture',
  offline:     'Device Offline',
  overcurrent: 'Over Current',
  livewire:    'Live Wire Fault',
  undervoltage:'Under Voltage',
};

// Severity per fault type — used for dot colour + row accent
const TYPE_SEVERITY: Record<FaultType, 'critical' | 'high' | 'medium' | 'low'> = {
  livewire:    'critical',
  leakage:     'critical',
  overcurrent: 'critical',
  overvoltage: 'high',
  undervoltage:'high',
  moisture:    'medium',
  offline:     'medium',
};

// Expected "normal" value per fault type — shown in value column
const TYPE_EXPECTED: Record<FaultType, string> = {
  livewire:    '0 mA expected',
  leakage:     'max 15 mA',
  overcurrent: 'max 10 A',
  overvoltage: 'max 250 V',
  undervoltage:'min 200 V',
  moisture:    'max 70%',
  offline:     'should be online',
};

const TYPE_CONTEXT: Record<FaultType, string> = {
  livewire:    'live wire detected',
  leakage:     'above safe threshold',
  overcurrent: 'above safe threshold',
  overvoltage: 'above normal range',
  undervoltage:'below normal range',
  moisture:    'high water content',
  offline:     'no heartbeat received',
};

// ─── Severity helpers ─────────────────────────────────────────────────────────

function getSeverity(e: FaultEvent): 'critical' | 'high' | 'medium' | 'low' {
  if (e.severity) return e.severity as 'critical' | 'high' | 'medium' | 'low';
  return TYPE_SEVERITY[e.type] ?? 'low';
}

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-blue-400',
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Warning',
  low:      'Info',
};

const SEVERITY_TEXT: Record<string, string> = {
  critical: 'text-red-400',
  high:     'text-orange-400',
  medium:   'text-amber-400',
  low:      'text-blue-400',
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: 'border-l-red-500',
  high:     'border-l-orange-400',
  medium:   'border-l-amber-400',
  low:      'border-l-blue-400',
};

// ─── Summary stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;   // tailwind bg class for icon bg
  valueColor: string; // tailwind text class
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, icon, accent, valueColor, active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border bg-[#0a1020] px-4 py-3 text-left',
        'transition-all duration-150 w-full',
        active
          ? 'border-electric-500/50 bg-electric-500/5'
          : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]',
      )}
    >
      <div className={cn('p-2 rounded-lg shrink-0', accent)}>
        {icon}
      </div>
      <div>
        <p className={cn('text-xl font-bold leading-none', valueColor)}>{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">{label}</p>
      </div>
    </button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold
      bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
      aria-label="Status: Resolved">
      <CheckCircle className="w-3 h-3" aria-hidden="true" />
      Resolved
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold
      bg-red-500/15 text-red-400 border border-red-500/25"
      aria-label="Status: Open">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
      Open
    </span>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────

function SeverityBadge({ sev }: { sev: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium', SEVERITY_TEXT[sev])}
      aria-label={`Severity: ${SEVERITY_LABEL[sev]}`}>
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', SEVERITY_DOT[sev])} aria-hidden="true" />
      {SEVERITY_LABEL[sev]}
    </span>
  );
}

// ─── Sort header cell ─────────────────────────────────────────────────────────

type SortKey = 'poleName' | 'type' | 'value' | 'timestamp' | 'resolved';

interface SortHeaderProps {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
}

function SortHeader({ label, sortKey, current, dir, onSort }: SortHeaderProps) {
  const active = current === sortKey;
  return (
    <th className="text-left p-4 font-medium">
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'flex items-center gap-1 group transition-colors uppercase tracking-wider text-[10px]',
          active ? 'text-white' : 'text-gray-500 hover:text-gray-300',
        )}
        aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        {label}
        {active
          ? dir === 'asc'
            ? <ArrowUp className="w-3 h-3" />
            : <ArrowDown className="w-3 h-3" />
          : <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />}
      </button>
    </th>
  );
}

// ─── Inline expanded row drawer ────────────────────────────────────────────────

interface DrawerProps {
  event: FaultEvent;
  allEvents: FaultEvent[];
  onResolve: (id: string) => void;
  onClose: () => void;
}

function ExpandedDrawer({ event, allEvents, onResolve, onClose }: DrawerProps) {
  const sev = getSeverity(event);

  // last 3 readings from same pole + type for context
  const recentSame = allEvents
    .filter((e) => e.poleId === event.poleId && e.type === event.type && e.id !== event.id)
    .slice(0, 3);

  return (
    <tr role="region" aria-label={`Details for ${event.poleName} ${TYPE_LABELS[event.type]}`}>
      <td colSpan={7} className="p-0">
        <div className={cn(
          'border-l-4 bg-[#080e1c] px-6 py-5',
          SEVERITY_BORDER[sev],
        )}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Col 1 — event details */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Event Details</p>
              <Detail icon={<Cpu className="w-3.5 h-3.5" />}    label="Pole ID"     value={event.poleId} />
              <Detail icon={<MapPin className="w-3.5 h-3.5" />} label="Fault Type"  value={TYPE_LABELS[event.type]} />
              <Detail icon={<Info className="w-3.5 h-3.5" />}   label="Severity"
                value={<SeverityBadge sev={sev} />} />
              <Detail icon={<Clock className="w-3.5 h-3.5" />}  label="Detected"
                value={<span>{formatTs(event.timestamp)} <span className="text-gray-600">({timeAgo(event.timestamp)})</span></span>} />
              {event.resolvedAt && (
                <Detail icon={<CheckCircle className="w-3.5 h-3.5" />} label="Resolved"
                  value={`${formatTs(event.resolvedAt)} (${timeAgo(event.resolvedAt)})`} />
              )}
              {event.resolvedBy && (
                <Detail icon={<ShieldCheck className="w-3.5 h-3.5" />} label="Resolved By" value={event.resolvedBy} />
              )}
              {event.notes && (
                <Detail icon={<Info className="w-3.5 h-3.5" />} label="Notes" value={event.notes} />
              )}
            </div>

            {/* Col 2 — reading breakdown */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Sensor Reading</p>
              <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Measured</span>
                  <span className={cn('font-semibold', SEVERITY_TEXT[sev])}>
                    {event.value.toFixed(2)} {event.unit}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Expected</span>
                  <span className="text-gray-300">{TYPE_EXPECTED[event.type]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Context</span>
                  <span className="text-gray-400 italic">{TYPE_CONTEXT[event.type]}</span>
                </div>
              </div>

              {/* Last 3 readings of same type on same pole */}
              {recentSame.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-600 mb-1.5">Previous readings (same type)</p>
                  {recentSame.map((r) => (
                    <div key={r.id} className="flex justify-between text-[10px] text-gray-500 py-0.5 border-b border-white/[0.04] last:border-0">
                      <span>{timeAgo(r.timestamp)}</span>
                      <span>{r.value.toFixed(2)} {r.unit}</span>
                      <StatusBadge resolved={r.resolved} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Col 3 — actions */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold">Actions</p>
              {!event.resolved ? (
                <div className="space-y-2">
                  <button
                    onClick={() => onResolve(event.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                      bg-emerald-500/15 border border-emerald-500/30 text-emerald-400
                      hover:bg-emerald-500/25 transition-all text-xs font-semibold"
                    aria-label="Mark this fault as resolved"
                  >
                    <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    Mark as Resolved
                  </button>
                  <button
                    onClick={onClose}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                      bg-white/[0.04] border border-white/10 text-gray-400
                      hover:bg-white/[0.08] transition-all text-xs"
                    aria-label="Acknowledge and close details"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
                    Acknowledge
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-400 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>This fault has been resolved.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-gray-600 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-gray-600">{label}</p>
        <div className="text-xs text-gray-300 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// ─── Mobile stacked card ──────────────────────────────────────────────────────

function MobileCard({ event, expanded, onToggle, onResolve }: {
  event: FaultEvent;
  expanded: boolean;
  onToggle: () => void;
  onResolve: (id: string) => void;
}) {
  const sev = getSeverity(event);
  return (
    <div className={cn(
      'rounded-xl border bg-[#0a1020] overflow-hidden transition-all duration-200',
      event.resolved ? 'border-white/[0.07]' : SEVERITY_BORDER[sev].replace('border-l-', 'border-l-2 border-l-'),
      !event.resolved && 'border-l-2',
    )}>
      {/* Card header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/[0.02] transition-colors"
        aria-expanded={expanded}
        aria-label={`${event.poleName} — ${TYPE_LABELS[event.type]}`}
      >
        {/* Severity dot */}
        <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', SEVERITY_DOT[sev])} aria-hidden="true" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white truncate">{event.poleName}</span>
            <StatusBadge resolved={event.resolved} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-400 bg-white/[0.05] px-2 py-0.5 rounded">
              {TYPE_LABELS[event.type]}
            </span>
            <SeverityBadge sev={sev} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            <span>
              {event.value.toFixed(2)} {event.unit}
              <span className="text-gray-600 ml-1">/ {TYPE_EXPECTED[event.type]}</span>
            </span>
            <span>{timeAgo(event.timestamp)}</span>
          </div>
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-1" />
          : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0 mt-1" />}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className={cn('px-4 pb-4 pt-0 border-t border-white/[0.06] space-y-3')}>
          <div className="mt-3 text-xs space-y-1.5 text-gray-400">
            <p><span className="text-gray-600">Pole ID:</span> {event.poleId}</p>
            <p><span className="text-gray-600">Detected:</span> {formatTs(event.timestamp)}</p>
            {event.resolvedAt && (
              <p><span className="text-gray-600">Resolved:</span> {formatTs(event.resolvedAt)}</p>
            )}
          </div>
          {!event.resolved && (
            <button
              onClick={() => onResolve(event.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                bg-emerald-500/15 border border-emerald-500/30 text-emerald-400
                hover:bg-emerald-500/25 transition-all text-xs font-semibold mt-2"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark as Resolved
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center"
      role="status" aria-live="polite">
      <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08]
        flex items-center justify-center">
        <ShieldCheck className="w-6 h-6 text-gray-600" aria-hidden="true" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-400">No alerts found</p>
        <p className="text-xs text-gray-600 mt-1">
          {hasFilters ? 'No events match the current filters.' : 'System is operating normally.'}
        </p>
      </div>
      {hasFilters && (
        <button
          onClick={onClear}
          className="text-xs text-electric-400 hover:text-electric-300 transition-colors
            flex items-center gap-1 px-3 py-1.5 rounded-lg border border-electric-500/20
            hover:border-electric-500/40"
        >
          <X className="w-3 h-3" />
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function FaultsPage() {
  const { events: firestoreEvents, loading } = useFaultEvents();
  const storeEvents   = usePoleStore((s) => s.activeFaults);
  const resolveFault  = usePoleStore((s) => s.resolveFault);

  // Merge + deduplicate
  const allEvents: FaultEvent[] = useMemo(() => (
    [...storeEvents, ...firestoreEvents]
      .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id) === i)
      .sort((a, b) => b.timestamp - a.timestamp)
  ), [storeEvents, firestoreEvents]);

  // ── filter state ──────────────────────────────────────────────────────────
  const [filterType,     setFilterType]     = useState<FaultType | 'all'>('all');
  const [filterResolved, setFilterResolved] = useState<'all' | 'open' | 'resolved'>('all');
  const [filterSev,      setFilterSev]      = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [search,         setSearch]         = useState('');
  const [sortKey,        setSortKey]        = useState<SortKey>('timestamp');
  const [sortDir,        setSortDir]        = useState<'asc' | 'desc'>('desc');
  const [expanded,       setExpanded]       = useState<string | null>(null);

  const hasFilters = filterType !== 'all' || filterResolved !== 'all' || filterSev !== 'all' || search !== '';

  const clearFilters = useCallback(() => {
    setFilterType('all'); setFilterResolved('all'); setFilterSev('all'); setSearch('');
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortDir((d) => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'desc'));
    setSortKey(key);
  }, [sortKey]);

  const handleResolve = useCallback((id: string) => {
    resolveFault(id);
    setExpanded(null);
  }, [resolveFault]);

  // ── counts for summary cards ───────────────────────────────────────────────
  const totalCount    = allEvents.length;
  const openCount     = allEvents.filter((e) => !e.resolved).length;
  const resolvedCount = allEvents.filter((e) =>  e.resolved).length;
  const critCount     = allEvents.filter((e) => getSeverity(e) === 'critical' && !e.resolved).length;

  // ── filter + sort pipeline ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = allEvents.filter((e) => {
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (filterResolved === 'open'     &&  e.resolved)  return false;
      if (filterResolved === 'resolved' && !e.resolved)  return false;
      if (filterSev !== 'all' && getSeverity(e) !== filterSev) return false;
      if (search && !e.poleName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

    result = [...result].sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortKey) {
        case 'poleName':  va = a.poleName;  vb = b.poleName; break;
        case 'type':      va = a.type;      vb = b.type;     break;
        case 'value':     va = a.value;     vb = b.value;    break;
        case 'resolved':  va = a.resolved ? 1 : 0; vb = b.resolved ? 1 : 0; break;
        default:          va = a.timestamp; vb = b.timestamp;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return result;
  }, [allEvents, filterType, filterResolved, filterSev, search, sortKey, sortDir]);

  // ── CSV export ─────────────────────────────────────────────────────────────
  const exportCSV = useCallback(() => {
    const header = 'Pole,Timestamp,Type,Severity,Value,Expected,Resolved\n';
    const rows = filtered.map((e) =>
      `${e.poleName},${formatTs(e.timestamp)},${TYPE_LABELS[e.type]},${getSeverity(e)},${e.value}${e.unit},${TYPE_EXPECTED[e.type]},${e.resolved ? 'Yes' : 'No'}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `fault-events-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Fault & Alert Center"
        subtitle={`${filtered.length} of ${totalCount} events`}
        action={
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
              bg-electric-500/20 border border-electric-500/30 text-electric-400
              hover:bg-electric-500/30 transition-all"
            aria-label="Export filtered events as CSV"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export CSV
          </button>
        }
      />

      {/* ── 1. Summary cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" role="region" aria-label="Summary statistics">
        <StatCard
          label="Total Events"
          value={totalCount}
          icon={<Info className="w-4 h-4 text-blue-400" aria-hidden="true" />}
          accent="bg-blue-500/15"
          valueColor="text-white"
        />
        <StatCard
          label="Open"
          value={openCount}
          icon={<AlertTriangle className="w-4 h-4 text-red-400" aria-hidden="true" />}
          accent="bg-red-500/15"
          valueColor={openCount > 0 ? 'text-red-400' : 'text-white'}
          active={filterResolved === 'open'}
          onClick={() => setFilterResolved((v) => v === 'open' ? 'all' : 'open')}
        />
        <StatCard
          label="Resolved"
          value={resolvedCount}
          icon={<CheckCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />}
          accent="bg-emerald-500/15"
          valueColor="text-emerald-400"
          active={filterResolved === 'resolved'}
          onClick={() => setFilterResolved((v) => v === 'resolved' ? 'all' : 'resolved')}
        />
        <StatCard
          label="Critical Open"
          value={critCount}
          icon={<ShieldAlert className="w-4 h-4 text-orange-400" aria-hidden="true" />}
          accent="bg-orange-500/15"
          valueColor={critCount > 0 ? 'text-orange-400' : 'text-white'}
          active={filterSev === 'critical'}
          onClick={() => setFilterSev((v) => v === 'critical' ? 'all' : 'critical')}
        />
      </div>

      {/* ── Filters + search row ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500"
            aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by pole name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-white/10 bg-white/[0.04]
              text-white placeholder-gray-600 focus:outline-none focus:border-electric-500/50
              focus:bg-white/[0.06] transition-all w-48"
            aria-label="Search by pole name"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              aria-label="Clear search">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />

        {/* Type filters */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by fault type">
          {(['all', 'livewire', 'leakage', 'overcurrent', 'overvoltage', 'undervoltage', 'moisture', 'offline'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn('px-2.5 py-1 text-[10px] rounded-lg border transition-all capitalize',
                filterType === t
                  ? 'bg-electric-500/20 border-electric-500/40 text-electric-400'
                  : 'border-white/10 text-gray-500 hover:text-white hover:bg-white/[0.06]',
              )}
              aria-pressed={filterType === t}
            >
              {t === 'all' ? 'All Types' : TYPE_LABELS[t as FaultType]}
            </button>
          ))}
        </div>

        {/* Severity quick filter */}
        <div className="hidden sm:block w-px h-5 bg-white/10" aria-hidden="true" />
        <div className="flex gap-1.5" role="group" aria-label="Filter by severity">
          {(['all', 'critical', 'high', 'medium'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSev(s)}
              className={cn('px-2.5 py-1 text-[10px] rounded-lg border transition-all capitalize',
                filterSev === s
                  ? 'bg-electric-500/20 border-electric-500/40 text-electric-400'
                  : 'border-white/10 text-gray-500 hover:text-white hover:bg-white/[0.06]',
              )}
              aria-pressed={filterSev === s}
            >
              {s === 'all' ? 'All Severity' : s}
            </button>
          ))}
        </div>

        {/* Clear all */}
        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors ml-auto"
            aria-label="Clear all filters">
            <X className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* ── Table (md+) / Cards (sm) ──────────────────────────────────────── */}
      {loading ? (
        <div role="status" aria-live="polite">
          <GlassCard className="p-8 text-center text-gray-500 text-sm animate-pulse">
            Loading fault events…
          </GlassCard>
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <EmptyState hasFilters={hasFilters} onClear={clearFilters} />
        </GlassCard>
      ) : (
        <>
          {/* ── Desktop table (hidden on small screens) ── */}
          <GlassCard className="overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table" aria-label="Fault events">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    {/* Severity column — no sort, purely visual */}
                    <th className="w-1 p-0" aria-label="Severity indicator" />
                    <SortHeader label="Pole"   sortKey="poleName"  current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortHeader label="Type"   sortKey="type"      current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="text-left p-4 font-medium text-[10px] uppercase tracking-wider text-gray-500">
                      Severity
                    </th>
                    <SortHeader label="Value"  sortKey="value"     current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortHeader label="Time"   sortKey="timestamp" current={sortKey} dir={sortDir} onSort={handleSort} />
                    <SortHeader label="Status" sortKey="resolved"  current={sortKey} dir={sortDir} onSort={handleSort} />
                    <th className="p-4 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event) => {
                    const sev      = getSeverity(event);
                    const isOpen   = expanded === event.id;

                    return [
                      <tr
                        key={event.id}
                        className={cn(
                          'border-b border-white/[0.05] hover:bg-white/[0.03] cursor-pointer transition-colors',
                          isOpen && 'bg-white/[0.03]',
                        )}
                        onClick={() => setExpanded(isOpen ? null : event.id)}
                        aria-expanded={isOpen}
                        role="row"
                      >
                        {/* Left-border severity accent */}
                        <td className="p-0 w-1" aria-hidden="true">
                          <div className={cn('w-1 h-full min-h-[52px]', SEVERITY_DOT[sev]
                            .replace('bg-', 'bg-'))} />
                        </td>

                        {/* Pole */}
                        <td className="p-4">
                          <span className="text-white font-medium text-sm">{event.poleName}</span>
                        </td>

                        {/* Type */}
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.06] text-gray-300 whitespace-nowrap">
                            {TYPE_LABELS[event.type] ?? event.type}
                          </span>
                        </td>

                        {/* Severity */}
                        <td className="p-4">
                          <SeverityBadge sev={sev} />
                        </td>

                        {/* Value — measured + expected */}
                        <td className="p-4">
                          <span className={cn('font-mono text-sm font-semibold', SEVERITY_TEXT[sev])}>
                            {event.value.toFixed(2)} {event.unit}
                          </span>
                          <p className="text-[10px] text-gray-600 mt-0.5">{TYPE_EXPECTED[event.type]}</p>
                        </td>

                        {/* Time — absolute + relative */}
                        <td className="p-4">
                          <span className="text-gray-300 text-xs">{formatTs(event.timestamp)}</span>
                          <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(event.timestamp)}</p>
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <StatusBadge resolved={event.resolved} />
                        </td>

                        {/* Expand chevron */}
                        <td className="p-4 text-gray-500" aria-hidden="true">
                          {isOpen
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                        </td>
                      </tr>,

                      isOpen && (
                        <ExpandedDrawer
                          key={`${event.id}-drawer`}
                          event={event}
                          allEvents={allEvents}
                          onResolve={handleResolve}
                          onClose={() => setExpanded(null)}
                        />
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* ── Mobile card list (visible on small screens only) ── */}
          <div className="md:hidden space-y-2" role="list" aria-label="Fault events">
            {filtered.map((event) => (
              <MobileCard
                key={event.id}
                event={event}
                expanded={expanded === event.id}
                onToggle={() => setExpanded(expanded === event.id ? null : event.id)}
                onResolve={handleResolve}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
