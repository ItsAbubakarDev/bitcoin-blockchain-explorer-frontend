import type { Metadata } from "next";
import { BlocksTable } from "@/components/BlocksTable";
import { PageTitle } from "@/components/DetailList";
import { Pagination } from "@/components/Pagination";
import { ErrorState } from "@/components/States";
import { describeError } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { PAGE_SIZE } from "@/lib/config";
import { formatInt } from "@/lib/format";
import { toBlockRow } from "@/lib/summaries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Blocks" };

type Props = { searchParams: { page?: string } };

/**
 * Blockbook v0.6.0 has no "list blocks" endpoint, so a page = one /block call per row.
 * The server-side cache makes older pages (immutable blocks) cheap after first view.
 */
export default async function BlocksPage({ searchParams }: Props) {
  const status = await attempt(bb.getStatus());
  if (!status.ok) {
    return (
      <>
        <PageTitle kicker="Chain">Blocks</PageTitle>
        <ErrorState title="Couldn't load chain status" message={describeError(status.error)} />
      </>
    );
  }

  const best = status.data.blockbook.bestHeight;
  const per = PAGE_SIZE.blocks;
  const totalPages = Math.ceil((best + 1) / per);
  const page = Math.min(totalPages, Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1));
  const top = best - (page - 1) * per;
  const heights = Array.from({ length: Math.min(per, top + 1) }, (_, i) => top - i);

  const results = await Promise.all(heights.map((h) => attempt(bb.getBlock(h))));
  const rows = results.flatMap((r) => (r.ok ? [toBlockRow(r.data)] : []));
  const failures = results.filter((r) => !r.ok).length;
  const firstErr = results.find((r) => !r.ok);

  return (
    <div className="space-y-4">
      <PageTitle kicker="Chain">
        Blocks <span className="text-sm font-normal text-muted">#{formatInt(top)} – #{formatInt(heights.at(-1) ?? top)}</span>
      </PageTitle>
      {!rows.length && firstErr && !firstErr.ok ? (
        <ErrorState title="Couldn't load blocks" message={describeError(firstErr.error)} />
      ) : (
        <BlocksTable
          title={`${formatInt(best + 1)} blocks`}
          rows={rows}
          notice={
            failures > 0 && firstErr && !firstErr.ok ? (
              <div className="border-b border-line bg-warn/5 px-4 py-1.5 text-xs text-warn">
                {failures} block{failures > 1 ? "s" : ""} on this page couldn&apos;t be loaded ({describeError(firstErr.error)}). Refresh to retry.
              </div>
            ) : undefined
          }
          footer={<Pagination page={page} totalPages={totalPages} basePath="/blocks" />}
        />
      )}
    </div>
  );
}
