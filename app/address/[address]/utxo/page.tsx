import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/Amount";
import { PageTitle } from "@/components/DetailList";
import { Hash } from "@/components/Hash";
import { Pagination } from "@/components/Pagination";
import { EmptyState, ErrorState } from "@/components/States";
import { UtxoTable } from "@/components/UtxoTable";
import { describeError } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { formatInt } from "@/lib/format";

export const dynamic = "force-dynamic";

type Props = { params: { address: string }; searchParams: { page?: string } };

/** Blockbook's /utxo is unpaginated; above this many txs the response can be many MB. */
const MAX_TXS_FOR_UTXO_LIST = 20_000;
const PER_PAGE = 50;

export function generateMetadata({ params }: Props): Metadata {
  return { title: `UTXOs ${decodeURIComponent(params.address).slice(0, 10)}…` };
}

export default async function UtxoPage({ params, searchParams }: Props) {
  const address = decodeURIComponent(params.address).trim();
  if (!/^[A-Za-z0-9]{14,100}$/.test(address)) notFound();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const title = (
    <PageTitle
      kicker="Unspent outputs"
      right={
        <Link href={`/address/${address}`} className="text-xs text-accent hover:underline">
          ← Back to address
        </Link>
      }
    >
      <Hash value={address} kind="address" full />
    </PageTitle>
  );

  const info = await attempt(bb.getAddress(address, { details: "basic" }));
  if (!info.ok) {
    if (info.error.kind === "not_found") notFound();
    return (
      <>
        {title}
        <ErrorState title="Couldn't load UTXOs" message={describeError(info.error)} />
      </>
    );
  }
  if (info.data.txs > MAX_TXS_FOR_UTXO_LIST) {
    return (
      <>
        {title}
        <section className="card">
          <EmptyState title="UTXO list too large to display">
            This address has {formatInt(info.data.txs)} transactions. Its unspent-output set is too large to load in the
            browser; query <span className="font-mono">/api/v2/utxo/{"{address}"}</span> on the Blockbook backend directly.
            Current balance: <Amount sats={info.data.balance} />
          </EmptyState>
        </section>
      </>
    );
  }

  const res = await attempt(bb.getUtxos(address));
  if (!res.ok) {
    if (res.error.kind === "not_found") notFound();
    return (
      <>
        {title}
        <ErrorState title="Couldn't load UTXOs" message={describeError(res.error)} />
      </>
    );
  }

  const utxos = [...res.data].sort((x, y) => (y.height ?? Infinity) - (x.height ?? Infinity));
  const total = utxos.reduce((s, u) => s + BigInt(u.value), BigInt(0)).toString();
  const totalPages = Math.max(1, Math.ceil(utxos.length / PER_PAGE));

  return (
    <div className="space-y-4">
      {title}
      <UtxoTable
        title={`${formatInt(utxos.length)} UTXO${utxos.length === 1 ? "" : "s"}`}
        rows={utxos.slice((page - 1) * PER_PAGE, page * PER_PAGE)}
      />
      <Pagination page={page} totalPages={totalPages} basePath={`/address/${address}/utxo`} />
      {utxos.length > 0 && (
        <p className="text-right text-xs text-muted">
          Total: <Amount sats={total} className="text-fg" />
        </p>
      )}
    </div>
  );
}
