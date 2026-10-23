"use client";
import { formatUtc, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";

/** Relative time that ticks every second; absolute UTC time in the tooltip. */
export function TimeAgo({ unix, className = "" }: { unix: number; className?: string }) {
  const now = useNow();
  return (
    <time dateTime={new Date(unix * 1000).toISOString()} title={formatUtc(unix)} className={`whitespace-nowrap ${className}`}>
      {now === null ? formatUtc(unix).slice(5, 16) : timeAgo(unix, now)}
    </time>
  );
}
