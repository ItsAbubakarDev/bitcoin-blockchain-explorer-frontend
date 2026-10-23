"use client";
import type { Utxo } from "@/lib/blockbook";
import { formatInt } from "@/lib/format";
import Link from "next/link";
import { Amount } from "./Amount";
import { DataTable, type Column } from "./DataTable";
import { Hash } from "./Hash";

const columns: Column<Utxo>[] = [
  {
    key: "outpoint",
    header: "Output",
    cell: (u) => (
      <span className="inline-flex items-center">
        <Hash value={u.txid} kind="tx" href={`/tx/${u.txid}#out-${u.vout}`} />
        <span className="font-mono text-muted">:{u.vout}</span>
      </span>
    ),
  },
  {
    key: "height",
    header: "Block",
    mono: true,
    cell: (u) =>
      u.height ? (
        <Link href={`/block/${u.height}`} className="text-accent hover:underline">
          {formatInt(u.height)}
        </Link>
      ) : (
        <span className="text-warn">mempool</span>
      ),
  },
  { key: "conf", header: "Confirmations", align: "right", mono: true, cell: (u) => formatInt(u.confirmations) },
  { key: "value", header: "Value", align: "right", cell: (u) => <Amount sats={u.value} /> },
];

export function UtxoTable({ rows, title }: { rows: Utxo[]; title: string }) {
  return (
    <DataTable
      title={title}
      columns={columns}
      rows={rows}
      rowKey={(u) => `${u.txid}:${u.vout}`}
      rowHref={(u) => `/tx/${u.txid}#out-${u.vout}`}
      emptyTitle="No unspent outputs"
      emptyText="This address currently holds no spendable coins."
    />
  );
}
