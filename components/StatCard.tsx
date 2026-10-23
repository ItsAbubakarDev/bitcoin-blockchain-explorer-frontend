import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "ok" | "warn" | "bad";
  loading?: boolean;
}

const toneClass = { default: "text-fg", ok: "text-ok", warn: "text-warn", bad: "text-bad" } as const;

export function StatCard({ label, value, sub, tone = "default", loading }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-line bg-surface px-4 py-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</div>
      {loading ? (
        <>
          <div className="skeleton mt-2 h-6 w-28" />
          <div className="skeleton mt-2 h-3 w-20" />
        </>
      ) : (
        <>
          <div className={`mt-1 truncate font-mono text-xl font-semibold tabular-nums ${toneClass[tone]}`}>{value}</div>
          {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
        </>
      )}
    </div>
  );
}
