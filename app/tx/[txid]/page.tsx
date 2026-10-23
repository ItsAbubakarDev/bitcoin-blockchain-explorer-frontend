import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/Amount";
import { DetailList, PageTitle } from "@/components/DetailList";
import { Hash } from "@/components/Hash";
import { RawHex } from "@/components/RawHex";
import { ErrorState } from "@/components/States";
import { TimeAgo } from "@/components/TimeAgo";
import { TxFlow } from "@/components/TxFlow";
import { describeError, isHash64 } from "@/lib/blockbook";
import { attempt, bb } from "@/lib/blockbook.server";
import { formatInt, formatUtc, liveConfirmations } from "@/lib/format";
import { isCoinbaseTx } from "@/lib/summaries";

export const dynamic = "force-dynamic";

type Props = { params: { txid: string } };

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Tx ${params.txid.slice(0, 12)}…` };
}

export default async function TxPage({ params }: Props) {
  const txid = params.txid.toLowerCase();
  if (!isHash64(txid)) notFound();

  const [res, status] = await Promise.all([attempt(bb.getTx(txid)), attempt(bb.getStatus())]);
  if (!res.ok) {
    if (res.error.kind === "not_found") notFound();
    return (
      <>
        <PageTitle kicker="Transaction">
          <Hash value={txid} copy={false} />
        </PageTitle>
        <ErrorState title="Couldn't load this transaction" message={describeError(res.error)} />
      </>
    );
  }

  const tx = res.data;
  const best = status.ok ? status.data.blockbook.bestHeight : undefined;
  const confirmed = tx.blockHeight > 0 && tx.confirmations > 0;
  const confs = confirmed ? liveConfirmations(tx.confirmations, tx.blockHeight, best) : 0;
  const coinbase = isCoinbaseTx(tx);
  const feeRate =
    !coinbase && tx.vsize ? (Number(tx.fees) / tx.vsize).toLocaleString("en-US", { maximumFractionDigits: 2 }) : undefined;

  return (
    <div className="space-y-4">
      <PageTitle
        kicker={coinbase ? "Coinbase transaction" : "Transaction"}
        right={
          confirmed ? (
            <span className="rounded-full border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs text-ok">
              {formatInt(confs)} confirmation{confs === 1 ? "" : "s"}
            </span>
          ) : (
            <span className="rounded-full border border-warn/30 bg-warn/10 px-2.5 py-1 text-xs text-warn">Unconfirmed</span>
          )
        }
      >
        <Hash value={tx.txid} full className="text-base sm:text-lg" />
      </PageTitle>

      <DetailList
        title="Overview"
        rows={[
          {
            label: "Status",
            value: confirmed ? (
              <span className="text-ok">Confirmed · {formatInt(confs)} confirmations</span>
            ) : (
              <span className="text-warn">Unconfirmed (in mempool)</span>
            ),
          },
          confirmed && {
            label: "Block",
            value: (
              <span className="inline-flex flex-wrap items-center gap-2">
                <Link href={`/block/${tx.blockHeight}`} className="font-mono text-accent hover:underline">
                  #{formatInt(tx.blockHeight)}
                </Link>
                {tx.blockHash && <Hash value={tx.blockHash} kind="block" />}
              </span>
            ),
          },
          tx.blockTime > 0 && {
            label: "Time",
            value: (
              <span>
                <span className="font-mono">{formatUtc(tx.blockTime)}</span>{" "}
                <span className="text-muted">
                  (<TimeAgo unix={tx.blockTime} />)
                </span>
              </span>
            ),
          },
          { label: "Total output", value: <Amount sats={tx.value} /> },
          !coinbase && { label: "Total input", value: <Amount sats={tx.valueIn} /> },
          { label: "Fee", value: coinbase ? <span className="text-muted">— (coinbase)</span> : <Amount sats={tx.fees} /> },
          feeRate && { label: "Fee rate", value: `${feeRate} sat/vB`, mono: true },
          {
            label: "Size",
            value:
              tx.size !== undefined
                ? `${formatInt(tx.size)} bytes${tx.vsize !== undefined ? ` · ${formatInt(tx.vsize)} vbytes` : ""}`
                : undefined,
            mono: true,
          },
          { label: "Version", value: String(tx.version), mono: true },
          tx.lockTime !== undefined && { label: "Lock time", value: formatInt(tx.lockTime), mono: true },
        ]}
      />

      <TxFlow vin={tx.vin} vout={tx.vout} valueIn={coinbase ? undefined : tx.valueIn} value={tx.value} />

      <RawHex hex={tx.hex} />
    </div>
  );
}
