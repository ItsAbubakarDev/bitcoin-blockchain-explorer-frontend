import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailList, PageTitle } from "@/components/DetailList";
import { Hash } from "@/components/Hash";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/Icons";
import { Pagination } from "@/components/Pagination";
import { ErrorState } from "@/components/States";
import { TimeAgo } from "@/components/TimeAgo";
import { TxTable } from "@/components/TxTable";
import { describeError, isHash64, isHeight } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { BLOCKBOOK_BLOCK_PAGE_SIZE, PAGE_SIZE } from "@/lib/config";
import { formatBytes, formatInt, formatUtc, liveConfirmations } from "@/lib/format";
import { toBlockRow, toTxRow } from "@/lib/summaries";

export const dynamic = "force-dynamic";

type Props = { params: { hashOrHeight: string }; searchParams: { page?: string } };

export function generateMetadata({ params }: Props): Metadata {
  const id = params.hashOrHeight;
  return { title: isHeight(id) ? `Block #${Number(id).toLocaleString("en-US")}` : `Block ${id.slice(0, 12)}…` };
}

const navBtn =
  "inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-muted hover:border-accent/50 hover:text-fg";

export default async function BlockPage({ params, searchParams }: Props) {
  const id = params.hashOrHeight;
  if (!isHeight(id) && !isHash64(id)) notFound();

  // Display pages are 50 txs; Blockbook pages block txs 1000 at a time (pageSize is ignored).
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);
  const per = PAGE_SIZE.blockTxs;
  const serverPage = Math.floor(((page - 1) * per) / BLOCKBOOK_BLOCK_PAGE_SIZE) + 1;
  const offset = ((page - 1) * per) % BLOCKBOOK_BLOCK_PAGE_SIZE;

  const [res, status] = await Promise.all([
    attempt(bb.getBlock(isHeight(id) ? Number(id) : id.toLowerCase(), { page: serverPage })),
    attempt(bb.getStatus()),
  ]);
  if (!res.ok) {
    if (res.error.kind === "not_found") notFound();
    return (
      <>
        <PageTitle kicker="Block">{isHeight(id) ? `#${formatInt(Number(id))}` : <Hash value={id} copy={false} />}</PageTitle>
        <ErrorState title="Couldn't load this block" message={describeError(res.error)} />
      </>
    );
  }

  const b = res.data;
  const best = status.ok ? status.data.blockbook.bestHeight : undefined;
  const totalPages = Math.max(1, Math.ceil(b.txCount / per));
  const txs = b.txs.slice(offset, offset + per).map((t) => toTxRow(t));
  const minedTo = toBlockRow(b).minedTo;

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Block"
        right={
          <div className="flex gap-2">
            {b.height > 0 ? (
              <Link href={`/block/${b.height - 1}`} className={navBtn} aria-label="Previous block">
                <ChevronLeftIcon className="h-3.5 w-3.5" /> #{formatInt(b.height - 1)}
              </Link>
            ) : null}
            {b.nextBlockHash ? (
              <Link href={`/block/${b.height + 1}`} className={navBtn} aria-label="Next block">
                #{formatInt(b.height + 1)} <ChevronRightIcon className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className={`${navBtn} pointer-events-none opacity-50`}>Chain tip</span>
            )}
          </div>
        }
      >
        <span className="font-mono">#{formatInt(b.height)}</span>
      </PageTitle>

      <DetailList
        title="Overview"
        rows={[
          { label: "Height", value: formatInt(b.height), mono: true },
          { label: "Hash", value: <Hash value={b.hash} full copy /> },
          {
            label: "Timestamp",
            value: (
              <span>
                <span className="font-mono">{formatUtc(b.time)}</span> <span className="text-muted">(<TimeAgo unix={b.time} />)</span>
              </span>
            ),
          },
          { label: "Confirmations", value: formatInt(liveConfirmations(b.confirmations, b.height, best)), mono: true },
          { label: "Transactions", value: formatInt(b.txCount), mono: true },
          { label: "Size", value: b.size !== undefined ? `${formatBytes(b.size)} (${formatInt(b.size)} bytes)` : undefined, mono: true },
          minedTo && { label: "Reward to", value: <Hash value={minedTo} kind="address" full /> },
          b.previousBlockHash && { label: "Previous block", value: <Hash value={b.previousBlockHash} kind="block" full /> },
          b.nextBlockHash && { label: "Next block", value: <Hash value={b.nextBlockHash} kind="block" full /> },
          b.merkleRoot && { label: "Merkle root", value: <Hash value={b.merkleRoot} full /> },
          { label: "Difficulty", value: b.difficulty, mono: true },
          { label: "Bits", value: b.bits, mono: true },
          { label: "Nonce", value: b.nonce, mono: true },
          { label: "Version", value: b.version !== undefined ? `0x${b.version.toString(16)}` : undefined, mono: true },
        ]}
      />

      <TxTable
        variant="block"
        title={`Transactions (${formatInt(b.txCount)})`}
        rows={txs}
        emptyTitle={page > totalPages ? "No transactions on this page" : "No transactions in this block"}
        footer={totalPages > 1 ? <Pagination page={page} totalPages={totalPages} basePath={`/block/${id}`} /> : undefined}
      />
    </div>
  );
}
