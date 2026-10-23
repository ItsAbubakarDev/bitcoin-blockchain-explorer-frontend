"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { EmptyState } from "./States";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  /** Extra classes for th/td (e.g. width, `hidden lg:table-cell`). */
  className?: string;
  /** Label in the stacked mobile card; defaults to header. Set false to hide on mobile. */
  mobileLabel?: ReactNode | false;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  /** Keys of rows to flash with the slide-in highlight (new live rows). */
  highlight?: ReadonlySet<string>;
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  emptyTitle?: string;
  emptyText?: ReactNode;
  /** Shown above the rows (e.g. inline error for a live refresh). */
  notice?: ReactNode;
}

/**
 * Dense, zebra-striped table; entire row clickable. Collapses to stacked cards below md.
 * Clicks on inner links/buttons (Hash links, copy buttons) are left to those elements.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  highlight,
  title,
  actions,
  footer,
  emptyTitle = "Nothing here yet",
  emptyText,
  notice,
}: DataTableProps<T>) {
  const router = useRouter();

  const go = (row: T) => (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!rowHref) return;
    if ((e.target as HTMLElement).closest("a,button,input,[role=tooltip]")) return;
    if ("key" in e && e.key !== "Enter") return;
    const href = rowHref(row);
    if ("metaKey" in e && (e.metaKey || e.ctrlKey)) window.open(href, "_blank");
    else router.push(href);
  };

  const rowProps = (row: T) =>
    rowHref
      ? { onClick: go(row), onKeyDown: go(row), tabIndex: 0, role: "link" as const, "aria-label": `Open ${rowKey(row)}` }
      : {};
  const isNew = (row: T) => highlight?.has(rowKey(row));

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface">
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {actions}
        </header>
      )}
      {notice}

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle}>{emptyText}</EmptyState>
      ) : (
        <>
          {/* md+: table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-muted">
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      scope="col"
                      className={`whitespace-nowrap px-3 py-2 font-medium first:pl-4 last:pr-4 ${c.align === "right" ? "text-right" : "text-left"} ${c.className ?? ""}`}
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    {...rowProps(row)}
                    className={`border-b border-line/50 last:border-0 even:bg-surface-2/60 ${rowHref ? "cursor-pointer hover:bg-surface-3 focus-visible:bg-surface-3 focus-visible:outline-none" : ""} ${isNew(row) ? "animate-row-in" : ""}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`whitespace-nowrap px-3 py-1.5 first:pl-4 last:pr-4 ${c.align === "right" ? "text-right" : ""} ${c.mono ? "font-mono tabular-nums" : ""} ${c.className ?? ""}`}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* < md: stacked cards */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((row) => (
              <li
                key={rowKey(row)}
                {...rowProps(row)}
                className={`px-4 py-2.5 even:bg-surface-2/60 ${rowHref ? "cursor-pointer active:bg-surface-3" : ""} ${isNew(row) ? "animate-row-in" : ""}`}
              >
                <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-[13px]">
                  {columns
                    .filter((c) => c.mobileLabel !== false)
                    .map((c) => (
                      <div key={c.key} className="contents">
                        <dt className="text-xs text-muted">{c.mobileLabel ?? c.header}</dt>
                        <dd className={`min-w-0 justify-self-end text-right ${c.mono ? "font-mono tabular-nums" : ""}`}>{c.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
      {footer && <footer className="border-t border-line">{footer}</footer>}
    </section>
  );
}
