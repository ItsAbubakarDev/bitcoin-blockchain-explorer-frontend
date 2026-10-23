import type { ReactNode } from "react";

export interface DetailRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** Label/value grid for detail pages. Rows with value === undefined are skipped (field absent in API). */
export function DetailList({ rows, title, actions }: { rows: Array<DetailRow | false | "" | undefined>; title?: ReactNode; actions?: ReactNode }) {
  const visible = rows.filter((r): r is DetailRow => !!r && r.value !== undefined && r.value !== null);
  return (
    <section className="rounded-lg border border-line bg-surface">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <dl className="divide-y divide-line/60">
        {visible.map((r) => (
          <div key={r.label} className="grid grid-cols-1 gap-0.5 px-4 py-2 even:bg-surface-2/40 sm:grid-cols-[11rem,1fr] sm:gap-4">
            <dt className="text-xs text-muted sm:text-[13px]">{r.label}</dt>
            <dd className={`min-w-0 break-words text-[13px] ${r.mono ? "font-mono tabular-nums" : ""}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function PageTitle({ kicker, children, right }: { kicker: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">{kicker}</div>
        <h1 className="mt-0.5 min-w-0 text-xl font-semibold text-fg">{children}</h1>
      </div>
      {right}
    </div>
  );
}
