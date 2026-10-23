import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddressLive } from "@/components/AddressLive";
import { Amount } from "@/components/Amount";
import { CopyButton } from "@/components/CopyButton";
import { PageTitle } from "@/components/DetailList";
import { Hash } from "@/components/Hash";
import { Pagination } from "@/components/Pagination";
import { StatCard } from "@/components/StatCard";
import { ErrorState } from "@/components/States";
import { TxTable } from "@/components/TxTable";
import { describeError } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { COIN_NAME, PAGE_SIZE } from "@/lib/config";
import { formatInt, formatSats } from "@/lib/format";
import { toTxRow } from "@/lib/summaries";

export const dynamic = "force-dynamic";

type Props = { params: { address: string }; searchParams: { page?: string } };

export function generateMetadata({ params }: Props): Metadata {
  const a = decodeURIComponent(params.address);
  return { title: `Address ${a.slice(0, 10)}…` };
}

export default async function AddressPage({ params, searchParams }: Props) {
  const address = decodeURIComponent(params.address).trim();
  if (!/^[A-Za-z0-9]{14,100}$/.test(address)) notFound();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const res = await attempt(bb.getAddress(address, { page, pageSize: PAGE_SIZE.addressTxs, details: "txs" }));
  if (!res.ok) {
    if (res.error.kind === "not_found") notFound();
    return (
      <>
        <PageTitle kicker="Address">
          <Hash value={address} full copy />
        </PageTitle>
        <ErrorState title="Couldn't load this address" message={describeError(res.error)} />
      </>
    );
  }

  const a = res.data;
  const totalPages = a.totalPages ?? Math.max(1, Math.ceil(a.txs / PAGE_SIZE.addressTxs));
  const rows = a.transactions.map((t) => toTxRow(t, a.address));
  const unconfirmed = a.unconfirmedBalance && a.unconfirmedBalance !== "0" ? a.unconfirmedBalance : undefined;

  return (
    <div className="space-y-4">
      <PageTitle
        kicker="Address"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <AddressLive address={a.address} />
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface py-0.5 pl-2.5 pr-1 text-xs text-muted">
              Copy address <CopyButton value={a.address} label="Copy address" />
            </span>
            <Link
              href={`/address/${a.address}/utxo`}
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-accent hover:border-accent/50"
            >
              View UTXOs →
            </Link>
          </div>
        }
      >
        <span className="break-all font-mono text-base sm:text-lg">{a.address}</span>
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Balance" value={formatSats(a.balance, { symbol: false })} sub={unconfirmed ? `${formatSats(unconfirmed)} unconfirmed` : undefined} />
        <StatCard label="Total received" value={formatSats(a.totalReceived, { symbol: false })} />
        <StatCard label="Total sent" value={formatSats(a.totalSent, { symbol: false })} />
        <StatCard
          label="Transactions"
          value={formatInt(a.txs)}
          sub={a.unconfirmedTxs ? `${formatInt(a.unconfirmedTxs)} unconfirmed` : undefined}
        />
      </div>

      <TxTable
        variant="address"
        title={
          <span>
            Transaction history <span className="font-normal text-muted">({formatInt(a.txs)})</span>
          </span>
        }
        rows={rows}
        emptyTitle={a.txs === 0 ? "No transactions" : "No transactions on this page"}
        emptyText={
          a.txs === 0 ? (
            <>This address has never been used on {COIN_NAME}. Balance: <Amount sats="0" /></>
          ) : (
            "Try an earlier page."
          )
        }
        footer={totalPages > 1 ? <Pagination page={page} totalPages={totalPages} basePath={`/address/${a.address}`} /> : undefined}
      />
    </div>
  );
}
