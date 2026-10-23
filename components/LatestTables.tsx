"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { blockbook, describeError, type TxLight } from "@/lib/blockbook";
import { useBlockbookSocket } from "@/lib/blockbookSocket";
import { PAGE_SIZE } from "@/lib/config";
import { toBlockRow, toTxRow, type BlockRow, type TxRow } from "@/lib/summaries";
import { BlocksTable } from "./BlocksTable";
import { LiveBadge } from "./LiveBadge";
import { TxTable } from "./TxTable";

const N = PAGE_SIZE.dashboard;
const HIGHLIGHT_MS = 2000;
const MAX_GAP_FILL = N;

function useHighlights() {
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());
  const add = useCallback((ks: string[]) => {
    if (!ks.length) return;
    setKeys((prev) => new Set([...prev, ...ks]));
    setTimeout(() => setKeys((prev) => new Set([...prev].filter((k) => !ks.includes(k)))), HIGHLIGHT_MS);
  }, []);
  return [keys, add] as const;
}

export function LatestTables({
  initialBlocks,
  initialTxs,
  initialError,
}: {
  initialBlocks: BlockRow[];
  initialTxs: TxRow[];
  initialError?: string;
}) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [txs, setTxs] = useState(initialTxs);
  const [liveError, setLiveError] = useState<string | null>(initialError ?? null);
  const [newBlockKeys, flashBlocks] = useHighlights();
  const [newTxKeys, flashTxs] = useHighlights();
  const topRef = useRef(initialBlocks[0]?.height ?? 0);
  const busy = useRef(false);
  const target = useRef(0);

  // Pull every block between our current top and the announced tip (WS can skip, e.g. after a reconnect).
  const catchUp = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      while (target.current > topRef.current) {
        const from = Math.max(topRef.current + 1, target.current - MAX_GAP_FILL + 1);
        const fetched = [];
        for (let h = from; h <= target.current; h++) fetched.push(await blockbook.getBlock(h));
        fetched.sort((a, b) => b.height - a.height);
        const rows = fetched.map(toBlockRow);
        const txRows = fetched.flatMap((b) => b.txs.map((t) => toTxRow(t)));
        topRef.current = fetched[0]!.height;

        setBlocks((prev) => [...rows, ...prev.filter((p) => !rows.some((r) => r.height === p.height))].slice(0, N));
        setTxs((prev) => {
          const ids = new Set(txRows.map((t) => t.txid));
          return [...txRows, ...prev.filter((p) => !ids.has(p.txid))].slice(0, N);
        });
        flashBlocks(rows.map((r) => r.hash));
        flashTxs(txRows.slice(0, N).map((t) => t.txid));
      }
      setLiveError(null);
    } catch (e) {
      setLiveError(`Couldn't load the newest block: ${describeError(e)} Retrying on the next block.`);
    } finally {
      busy.current = false;
    }
  }, [flashBlocks, flashTxs]);

  const onNewBlock = useCallback(
    ({ height }: { height: number }) => {
      target.current = Math.max(target.current, height);
      void catchUp();
    },
    [catchUp],
  );

  const onNewTransaction = useCallback(
    (tx: TxLight) => {
      const row = toTxRow(tx);
      setTxs((prev) => [row, ...prev.filter((p) => p.txid !== row.txid)].slice(0, N));
      flashTxs([row.txid]);
    },
    [flashTxs],
  );

  const live = useBlockbookSocket({ onNewBlock, onNewTransaction });

  // If the socket already knows a newer tip than the server render (e.g. cached page), catch up once.
  useEffect(() => {
    if (live.lastBlock && live.lastBlock.height > topRef.current && topRef.current > 0) onNewBlock(live.lastBlock);
  }, [live.lastBlock, onNewBlock]);

  const tone = live.source === "websocket" ? "live" : live.source === "polling" ? "polling" : "offline";
  const badge = <LiveBadge tone={tone}>{live.source === "websocket" ? "Live" : live.source === "polling" ? "Polling" : "Connecting"}</LiveBadge>;
  const notice = liveError ? <div className="border-b border-line bg-warn/5 px-4 py-1.5 text-xs text-warn">{liveError}</div> : null;

  const txNote =
    live.newTxSupported === false
      ? "Shows transactions from the latest blocks. Mempool streaming is disabled on this node (Blockbook -enablesubnewtx)."
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <BlocksTable
        compact
        title="Latest Blocks"
        actions={badge}
        rows={blocks}
        highlight={newBlockKeys}
        notice={notice}
        footer={
          <Link href="/blocks" className="block px-4 py-2 text-center text-xs text-accent hover:bg-surface-2">
            View all blocks →
          </Link>
        }
      />
      <TxTable
        variant="latest"
        title="Latest Transactions"
        actions={badge}
        rows={txs}
        highlight={newTxKeys}
        emptyTitle="No recent transactions"
        footer={txNote ? <p className="px-4 py-2 text-[11px] text-faint">{txNote}</p> : undefined}
      />
    </div>
  );
}
