"use client";
import Link from "next/link";
import { truncateMiddle } from "@/lib/format";
import { CopyButton } from "./CopyButton";

export type HashKind = "block" | "tx" | "address";

const hrefFor = (kind: HashKind, value: string) =>
  kind === "block" ? `/block/${value}` : kind === "tx" ? `/tx/${value}` : `/address/${value}`;

interface HashProps {
  value: string;
  kind?: HashKind;
  /** Override the link target (e.g. /tx/{txid}#out-1). Pass null for no link. */
  href?: string | null;
  /** Show the full value instead of first8…last8 (wraps on small screens). */
  full?: boolean;
  head?: number;
  tail?: number;
  copy?: boolean;
  className?: string;
}

/** Truncated hash/txid/address: full value in tooltip, copy icon, links to its detail page. */
export function Hash({ value, kind, href, full = false, head = 8, tail = 8, copy = true, className = "" }: HashProps) {
  const target = href === null ? null : href ?? (kind ? hrefFor(kind, value) : null);
  const text = full ? value : truncateMiddle(value, head, tail);
  const truncated = text !== value;

  const label = target ? (
    <Link
      href={target}
      className="text-accent hover:text-accent-strong hover:underline underline-offset-2 focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent rounded-sm"
    >
      {text}
    </Link>
  ) : (
    <span className="text-fg">{text}</span>
  );

  return (
    <span className={`group/hash relative inline-flex min-w-0 max-w-full items-center gap-0.5 font-mono ${className}`}>
      <span className={full ? "break-all" : "whitespace-nowrap"}>{label}</span>
      {truncated && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 hidden w-max max-w-[min(90vw,42rem)] break-all rounded-md border border-line bg-surface-3 px-2 py-1 text-xs text-fg shadow-xl group-hover/hash:block"
        >
          {value}
        </span>
      )}
      {copy && <CopyButton value={value} label={kind === "address" ? "Copy address" : "Copy"} />}
    </span>
  );
}
