export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function TableSkeleton({ rows = 10, cols = 4, title }: { rows?: number; cols?: number; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface" aria-busy="true" aria-label="Loading">
      {title && (
        <div className="border-b border-line px-4 py-2.5">
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="divide-y divide-line/60">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className={`flex items-center gap-4 px-4 py-2.5 ${r % 2 ? "bg-surface-2/50" : ""}`}>
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? "w-16" : c === 1 ? "flex-1" : "w-20"}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-6 py-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3.5 flex-1 max-w-md" />
        </div>
      ))}
    </div>
  );
}
