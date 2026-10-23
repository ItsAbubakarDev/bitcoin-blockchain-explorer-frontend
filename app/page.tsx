import { Suspense } from "react";
import { BlockStrip, BlockStripSkeleton } from "@/components/BlockStrip";
import { DashboardStats, DashboardStatsSkeleton, type StatusSummary } from "@/components/DashboardStats";
import { LatestTables } from "@/components/LatestTables";
import { LiveBlocksProvider } from "@/components/LiveBlocksProvider";
import { SearchBar } from "@/components/SearchBar";
import { TableSkeleton } from "@/components/Skeleton";
import { ErrorState } from "@/components/States";
import { describeError, type Status } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { COIN_NAME, COIN_SYMBOL, PAGE_SIZE } from "@/lib/config";
import { toBlockRow, toTxRow } from "@/lib/summaries";

export const dynamic = "force-dynamic";

function summarize(s: Status): StatusSummary {
  return {
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
}

function SummaryHeading() {
  return (
    <div className="mb-3 mt-8">
      <h2 className="text-lg font-semibold text-fg">Network Summary</h2>
      <p className="text-xs text-muted">Live statistics for the {COIN_NAME} blockchain.</p>
    </div>
  );
}

/** One status + 10 block fetches feed the hero strip, stats and both tables. */
async function LiveData() {
  const status = await attempt(bb.getStatus());
  if (!status.ok) {
    return (
      <>
        <div className="pt-4" />
        <SummaryHeading />
        <ErrorState title="Couldn't load chain data" message={describeError(status.error)} />
      </>
    );
  }

  const best = status.data.blockbook.bestHeight;
  const heights = Array.from({ length: Math.min(PAGE_SIZE.dashboard, best + 1) }, (_, i) => best - i);
  const results = await Promise.all(heights.map((h) => attempt(bb.getBlock(h))));
  const blocks = results.flatMap((r) => (r.ok ? [r.data] : []));
  const failed = results.find((r) => !r.ok);
  const txs = blocks.flatMap((b) => b.txs.map((t) => toTxRow(t))).slice(0, PAGE_SIZE.dashboard);

  return (
    <LiveBlocksProvider
      initialBlocks={blocks.map(toBlockRow)}
      initialTxs={txs}
      initialError={failed && !failed.ok ? `Some blocks couldn't be loaded: ${describeError(failed.error)}` : undefined}
    >
      <BlockStrip />
      <SummaryHeading />
      <div className="space-y-4">
        <DashboardStats initial={summarize(status.data)} />
        <LatestTables />
      </div>
    </LiveBlocksProvider>
  );
}

export default function DashboardPage() {
  return (
    <div className="relative">
      {/* Full-bleed hero backdrop behind the title, search and block strip. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-1rem] -z-10 h-[34rem] w-screen -translate-x-1/2 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1a2e] via-[#0d1626] to-bg" />
        <div className="absolute left-1/2 top-[-12rem] h-[32rem] w-[60rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-[4rem] h-[22rem] w-[28rem] rounded-full bg-[#818cf8]/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at 50% 30%, black 20%, transparent 70%)",
          }}
        />
      </div>

      <section className="pb-4 pt-10 text-center sm:pt-16">
        <h1 className="text-3xl font-bold tracking-tight text-fg sm:text-5xl">
          Explore the{" "}
          <span className="bg-gradient-to-r from-[#818cf8] via-accent to-accent-strong bg-clip-text text-transparent">
            {COIN_SYMBOL} Blockchain
          </span>
        </h1>
        <p className="mt-3 text-sm text-muted">Blocks, transactions and addresses on {COIN_NAME}, updated live.</p>
        <div className="mx-auto mt-8 max-w-2xl text-left">
          <SearchBar variant="hero" />
        </div>
      </section>

      <Suspense
        fallback={
          <>
            <BlockStripSkeleton />
            <SummaryHeading />
            <div className="space-y-4">
              <DashboardStatsSkeleton />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <TableSkeleton title="Latest Blocks" cols={4} />
                <TableSkeleton title="Latest Transactions" cols={4} />
              </div>
            </div>
          </>
        }
      >
        <LiveData />
      </Suspense>
    </div>
  );
}
