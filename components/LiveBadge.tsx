import type { ReactNode } from "react";

export type LiveTone = "live" | "polling" | "offline";

const dot: Record<LiveTone, string> = { live: "bg-accent", polling: "bg-warn", offline: "bg-faint" };

/** Pulsing dot + text: accent = websocket live, amber = polling fallback, gray = offline. */
export function LiveBadge({ tone = "live", children, title }: { tone?: LiveTone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-muted"
    >
      <span className="relative flex h-2 w-2">
        {tone !== "offline" && <span className={`absolute inline-flex h-full w-full animate-live-ping rounded-full ${dot[tone]}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot[tone]}`} />
      </span>
      {children}
    </span>
  );
}
