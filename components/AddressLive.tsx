"use client";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { useBlockbookSocket } from "@/lib/blockbookSocket";
import { LiveBadge } from "./LiveBadge";

/** Watches one address via subscribeAddresses; refreshes server data on activity. */
export function AddressLive({ address }: { address: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [hits, setHits] = useState(0);

  const onAddressTx = useCallback(async () => {
    setHits((n) => n + 1);
    await fetch(`/api/invalidate?address=${encodeURIComponent(address)}`, { method: "POST" }).catch(() => {});
    start(() => router.refresh());
  }, [address, router]);

  const live = useBlockbookSocket({ addresses: [address], onAddressTx });
  const watching = live.connection === "open";
  return (
    <LiveBadge
      tone={watching ? "live" : "offline"}
      title={watching ? "Watching this address via websocket" : "Live updates unavailable (websocket not connected)"}
    >
      {hits ? `${hits} new tx${hits > 1 ? "s" : ""}` : watching ? "Watching" : "Not live"}
    </LiveBadge>
  );
}
