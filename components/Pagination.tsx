import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Path without query, e.g. "/blocks". */
  basePath: string;
  param?: string;
  /** Extra query params to preserve. */
  query?: Record<string, string>;
}

function pageWindow(page: number, total: number): Array<number | "…"> {
  const set = new Set([1, total, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach((p) => set.add(p));
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1]! > 1) out.push("…");
    out.push(p);
  });
  return out;
}

/** Link-based pagination (works in Server Components, no JS required). */
export function Pagination({ page, totalPages, basePath, param = "page", query = {} }: PaginationProps) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(query);
    if (p > 1) q.set(param, String(p));
    else q.delete(param);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-surface px-2 font-mono text-xs tabular-nums text-muted transition-colors hover:border-accent/50 hover:text-fg";
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-1.5 py-3">
      <Link href={href(page - 1)} aria-label="Previous page" className={`${btn} ${page <= 1 ? disabled : ""}`} aria-disabled={page <= 1}>
        <ChevronLeftIcon />
      </Link>
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-faint">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={`${btn} ${p === page ? "border-accent/60 bg-accent/10 text-accent" : ""}`}
          >
            {p.toLocaleString("en-US")}
          </Link>
        ),
      )}
      <Link
        href={href(page + 1)}
        aria-label="Next page"
        className={`${btn} ${page >= totalPages ? disabled : ""}`}
        aria-disabled={page >= totalPages}
      >
        <ChevronRightIcon />
      </Link>
    </nav>
  );
}
