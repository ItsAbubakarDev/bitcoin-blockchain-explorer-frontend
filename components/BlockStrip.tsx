"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { formatBytes, formatInt, truncateMiddle } from "@/lib/format";
import { useLiveBlocks } from "./LiveBlocksProvider";
import { TimeAgo } from "./TimeAgo";

/** Latest blocks as a chain of cards, oldest → newest (left → right), newest tagged "Latest". */
export function BlockStrip() {
  const { blocks, newBlockKeys } = useLiveBlocks();
  const ordered = [...blocks].reverse();
  const scroller = useRef<HTMLDivElement>(null);
  const tip = blocks[0]?.height;

  // Keep the newest block in view when the strip overflows (mobile).
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
  }, [tip]);

  if (!ordered.length) return null;

  return (
    <div ref={scroller} className="-mx-3 overflow-x-auto px-3 pb-2 pt-4 [scrollbar-width:thin] sm:mx-0 sm:px-0">
      <ol className="relative flex min-w-max gap-3 xl:min-w-0">
        {/* chain line behind the cards */}
        <span aria-hidden className="absolute left-4 right-4 top-1/2 h-px bg-gradient-to-r from-line via-accent/40 to-accent/70" />
        {ordered.map((b, i) => {
          const latest = i === ordered.length - 1;
          return (
            <li key={b.hash} className="relative w-36 shrink-0 xl:w-auto xl:flex-1">
              {latest && (
                <span className="absolute -top-2.5 right-3 z-10 rounded bg-accent px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-bg">
                  Latest
                </span>
              )}
              <Link
                href={`/block/${b.height}`}
                className={`relative block rounded-lg border px-3 py-2.5 transition-colors hover:border-accent/60 hover:bg-surface-3 ${
                  latest ? "border-accent/70 bg-surface-2 shadow-[0_0_24px_-6px_rgba(34,211,238,0.45)]" : "border-line bg-surface"
                } ${newBlockKeys.has(b.hash) ? "animate-row-in" : ""}`}
              >
                <div className="font-mono text-[15px] font-semibold text-accent">#{formatInt(b.height)}</div>
                <div className="mt-0.5 truncate font-mono text-[12px] text-fg" title={b.minedTo ?? undefined}>
                  {b.minedTo ? truncateMiddle(b.minedTo, 6, 4) : "—"}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span className="font-mono">{formatBytes(b.size)}</span>
                  <span>
                    {formatInt(b.txCount)} tx{b.txCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-0.5 text-[11px] text-faint">
                  <TimeAgo unix={b.time} />
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function BlockStripSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden pb-2 pt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="w-36 shrink-0 rounded-lg border border-line bg-surface px-3 py-2.5 xl:w-auto xl:flex-1">
          <div className="skeleton h-4 w-20" />
          <div className="skeleton mt-2 h-3 w-24" />
          <div className="skeleton mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
