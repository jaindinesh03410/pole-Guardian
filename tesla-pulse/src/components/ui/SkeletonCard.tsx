export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <div className="h-3 w-32 rounded bg-white/20" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 rounded bg-white/10" />
        ))}
      </div>
    </div>
  );
}
