"use client";
/**
 * Shared live state for the dashboard: latest blocks + latest txs, kept current via
 * useBlockbookSocket. The hero block strip and the Latest tables both read from here,
 * so each new block is fetched once.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { blockbook, describeError, type TxLight } from "@/lib/blockbook";
import { useBlockbookSocket, type LiveState } from "@/lib/blockbookSocket";
import { PAGE_SIZE } from "@/lib/config";
import { toBlockRow, toTxRow, type BlockRow, type TxRow } from "@/lib/summaries";

const N = PAGE_SIZE.dashboard;
const HIGHLIGHT_MS = 2000;
const MAX_GAP_FILL = N;

interface LiveBlocksValue {
  blocks: BlockRow[];
  txs: TxRow[];
  newBlockKeys: ReadonlySet<string>;
  newTxKeys: ReadonlySet<string>;
  liveError: string | null;
  live: LiveState;
}

const Ctx = createContext<LiveBlocksValue | null>(null);

export function useLiveBlocks(): LiveBlocksValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLiveBlocks must be used inside <LiveBlocksProvider>");
  return v;
}

function useHighlights() {
  const [keys, setKeys] = useState<ReadonlySet<string>>(new Set());
  const add = useCallback((ks: string[]) => {
    if (!ks.length) return;
    setKeys((prev) => new Set([...prev, ...ks]));
    setTimeout(() => setKeys((prev) => new Set([...prev].filter((k) => !ks.includes(k)))), HIGHLIGHT_MS);
  }, []);
  return [keys, add] as const;
}

export function LiveBlocksProvider({
  initialBlocks,
  initialTxs,
  initialError,
  children,
}: {
  initialBlocks: BlockRow[];
  initialTxs: TxRow[];
  initialError?: string;
  children: ReactNode;
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

  // If the socket already knows a newer tip than the server render, catch up once.
  useEffect(() => {
    if (live.lastBlock && live.lastBlock.height > topRef.current && topRef.current > 0) onNewBlock(live.lastBlock);
  }, [live.lastBlock, onNewBlock]);

  return <Ctx.Provider value={{ blocks, txs, newBlockKeys, newTxKeys, liveError, live }}>{children}</Ctx.Provider>;
}
