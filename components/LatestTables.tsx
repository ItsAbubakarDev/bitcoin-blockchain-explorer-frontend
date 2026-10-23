"use client";
import Link from "next/link";
import { BlocksTable } from "./BlocksTable";
import { LiveBadge } from "./LiveBadge";
import { useLiveBlocks } from "./LiveBlocksProvider";
import { TxTable } from "./TxTable";

export function LatestTables() {
  const { blocks, txs, newBlockKeys, newTxKeys, liveError, live } = useLiveBlocks();

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
