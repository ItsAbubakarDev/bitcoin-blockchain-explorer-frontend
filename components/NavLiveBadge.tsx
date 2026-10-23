"use client";
import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";
import { useBlockbookSocket } from "@/lib/blockbookSocket";
import { LiveBadge } from "./LiveBadge";

export function NavLiveBadge() {
  const { lastBlock, source, connection, reconnectAttempt } = useBlockbookSocket();
  const now = useNow();

  const tone = source === "websocket" ? "live" : source === "polling" ? "polling" : "offline";
  const title =
    source === "websocket"
      ? "Live via websocket"
      : source === "polling"
        ? `Websocket unavailable (attempt ${reconnectAttempt}); polling every 15s`
        : connection === "connecting"
          ? "Connecting…"
          : "Offline";

  if (!lastBlock) {
    return (
      <LiveBadge tone="offline" title={title}>
        <span className="skeleton inline-block h-3 w-28" />
      </LiveBadge>
    );
  }
  return (
    <Link href={`/block/${lastBlock.height}`} className="hover:opacity-90">
      <LiveBadge tone={tone} title={title}>
        <span>
          last block{" "}
          <span className="font-mono text-fg">#{lastBlock.height.toLocaleString("en-US")}</span>
          {now !== null && <span className="text-faint"> ({timeAgo(lastBlock.seenAt, now)})</span>}
        </span>
      </LiveBadge>
    </Link>
  );
}
