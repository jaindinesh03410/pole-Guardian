import { usePoleStore } from '@/store/poleStore';
import { StatStrip } from '@/components/dashboard/StatStrip';
import { PoleCard } from '@/components/dashboard/PoleCard';
import { AlertFeed } from '@/components/dashboard/AlertFeed';
import { PoleMap } from '@/components/dashboard/PoleMap';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function OverviewPage() {
  const poles = Object.values(usePoleStore((s) => s.poles));
  const simulatorActive = usePoleStore((s) => s.simulatorActive);
  const loading = poles.length === 0 && !simulatorActive;

  const [areaFilter, setAreaFilter] = useState<string>('All');
  const areas = ['All', 'Rajwada', 'Vijaynagar', 'Airport'];

  const filteredPoles = areaFilter === 'All'
    ? poles
    : poles.filter((p) => p.meta.area === areaFilter);

  return (
    <div className="space-y-6">
      <StatStrip />

      {/* Area Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Filter by Area:</span>
        {areas.map((area) => (
          <button
            key={area}
            onClick={() => setAreaFilter(area)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-lg border transition-all',
              areaFilter === area
                ? 'bg-electric-500/20 border-electric-500/40 text-electric-400'
                : 'border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
            )}
          >
            {area}
          </button>
        ))}
      </div>

      {/* Map + Alert Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <SectionHeader title="Pole Locations" subtitle="Click any marker to open detail view" />
          <PoleMap />
        </div>
        <div className="flex flex-col min-h-0" style={{ maxHeight: 400 }}>
          <AlertFeed />
        </div>
      </div>

      {/* Pole cards grid */}
      <div>
        <SectionHeader
          title="Live Pole Status"
          subtitle={`${filteredPoles.length} poles in ${areaFilter}`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
            : filteredPoles.map((pole) => <PoleCard key={pole.id} pole={pole} />)
          }
          {!loading && filteredPoles.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-500 text-sm">
              No poles in {areaFilter} area. Click "Simulate Live" in the header.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
