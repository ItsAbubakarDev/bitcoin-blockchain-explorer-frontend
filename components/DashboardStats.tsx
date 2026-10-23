"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { blockbook, describeError } from "@/lib/blockbook";
import { useBlockbookSocket } from "@/lib/blockbookSocket";
import { formatInt, formatUtc, truncateMiddle } from "@/lib/format";
import { StatCard } from "./StatCard";
import { TimeAgo } from "./TimeAgo";

export interface StatusSummary {
  bestHeight: number;
  bestHash: string;
  lastBlockTime: number;
  inSync: boolean;
  inSyncMempool?: boolean;
  mempoolSize?: number;
  backendBlocks: number;
  backendHeaders?: number;
  version: string;
}

const REFRESH_MS = 30_000;

export function DashboardStats({ initial }: { initial: StatusSummary }) {
  const [s, setS] = useState(initial);
  const [stale, setStale] = useState<string | null>(null);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const st = await blockbook.getStatus();
      setS({
        bestHeight: st.blockbook.bestHeight,
        bestHash: st.backend.bestBlockHash,
        lastBlockTime: Math.floor(Date.parse(st.blockbook.lastBlockTime) / 1000),
        inSync: st.blockbook.inSync,
        inSyncMempool: st.blockbook.inSyncMempool,
        mempoolSize: st.blockbook.mempoolSize,
        backendBlocks: st.backend.blocks,
        backendHeaders: st.backend.headers,
        version: st.blockbook.version,
      });
      setStale(null);
    } catch (e) {
      setStale(describeError(e));
    } finally {
      inflight.current = false;
    }
  }, []);

  const { lastBlock } = useBlockbookSocket({ onNewBlock: () => void refresh() });

  useEffect(() => {
    const t = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(t);
  }, [refresh]);

  // The socket may know about a newer tip than our last status fetch.
  const height = lastBlock && lastBlock.height > s.bestHeight ? lastBlock.height : s.bestHeight;
  const hash = lastBlock && lastBlock.height > s.bestHeight ? lastBlock.hash : s.bestHash;
  const time = lastBlock && lastBlock.height > s.bestHeight ? lastBlock.seenAt : s.lastBlockTime;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Block Height" value={`#${formatInt(height)}`} sub={<span className="font-mono">{truncateMiddle(hash)}</span>} />
        <StatCard label="Latest Block" value={<TimeAgo unix={time} />} sub={formatUtc(time)} />
        {s.mempoolSize !== undefined && (
          <StatCard
            label="Mempool"
            value={`${formatInt(s.mempoolSize)} tx`}
            sub={s.inSyncMempool === false ? "mempool syncing…" : "unconfirmed transactions"}
          />
        )}
        <StatCard
          label="Sync Status"
          value={s.inSync ? "Synced" : "Syncing"}
          tone={s.inSync ? "ok" : "warn"}
          sub={`node ${formatInt(s.backendBlocks)}${s.backendHeaders ? ` / ${formatInt(s.backendHeaders)} headers` : ""} · Blockbook ${s.version}`}
        />
      </div>
      {stale && <p className="mt-2 text-xs text-warn">Stats may be out of date: {stale}</p>}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCard key={i} label=" " value="" loading />
      ))}
    </div>
  );
}
