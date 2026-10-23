import { Suspense } from "react";
import { DashboardStats, DashboardStatsSkeleton, type StatusSummary } from "@/components/DashboardStats";
import { LatestTables } from "@/components/LatestTables";
import { TableSkeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/States";
import { describeError } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { PAGE_SIZE } from "@/lib/config";
import { toBlockRow, toTxRow } from "@/lib/summaries";

export const dynamic = "force-dynamic";

async function Stats() {
  const r = await attempt(bb.getStatus());
  if (!r.ok) return <ErrorState title="Couldn't load chain status" message={describeError(r.error)} />;
  const s = r.data;
  const summary: StatusSummary = {
    bestHeight: s.blockbook.bestHeight,
    bestHash: s.backend.bestBlockHash,
    lastBlockTime: Math.floor(Date.parse(s.blockbook.lastBlockTime) / 1000),
    inSync: s.blockbook.inSync,
    inSyncMempool: s.blockbook.inSyncMempool,
    mempoolSize: s.blockbook.mempoolSize,
    backendBlocks: s.backend.blocks,
    backendHeaders: s.backend.headers,
    version: s.blockbook.version,
  };
  return <DashboardStats initial={summary} />;
}

async function Latest() {
  const status = await attempt(bb.getStatus());
  if (!status.ok) return <ErrorState title="Couldn't load latest blocks" message={describeError(status.error)} />;

  const best = status.data.blockbook.bestHeight;
  const heights = Array.from({ length: Math.min(PAGE_SIZE.dashboard, best + 1) }, (_, i) => best - i);
  const results = await Promise.all(heights.map((h) => attempt(bb.getBlock(h))));
  const blocks = results.flatMap((r) => (r.ok ? [r.data] : []));
  const failed = results.find((r) => !r.ok);

  if (!blocks.length && failed && !failed.ok) {
    return <ErrorState title="Couldn't load latest blocks" message={describeError(failed.error)} />;
  }

  const txs = blocks.flatMap((b) => b.txs.map((t) => toTxRow(t))).slice(0, PAGE_SIZE.dashboard);
  return (
    <LatestTables
      initialBlocks={blocks.map(toBlockRow)}
      initialTxs={txs}
      initialError={failed && !failed.ok ? `Some blocks couldn't be loaded: ${describeError(failed.error)}` : undefined}
    />
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<DashboardStatsSkeleton />}>
        <Stats />
      </Suspense>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TableSkeleton title="Latest Blocks" cols={4} />
            <TableSkeleton title="Latest Transactions" cols={4} />
          </div>
        }
      >
        <Latest />
      </Suspense>
    </div>
  );
}
