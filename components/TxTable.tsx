"use client";
import Link from "next/link";
import { formatInt } from "@/lib/format";
import type { TxRow } from "@/lib/summaries";
import type { ReactNode } from "react";
import { Amount } from "./Amount";
import { DataTable, type Column } from "./DataTable";
import { Hash } from "./Hash";
import { TimeAgo } from "./TimeAgo";

export type TxTableVariant = "latest" | "block" | "address";

function columns(variant: TxTableVariant): Column<TxRow>[] {
  const txid: Column<TxRow> = {
    key: "txid",
    header: "Txid",
    cell: (t) => (
      <span className="inline-flex items-center gap-1.5">
        <Hash value={t.txid} kind="tx" />
        {t.coinbase && <span className="rounded bg-accent/10 px-1 py-px text-[10px] font-medium uppercase text-accent">coinbase</span>}
      </span>
    ),
  };
  const block: Column<TxRow> = {
    key: "block",
    header: "Block",
    mono: true,
    cell: (t) =>
      t.blockHeight > 0 ? (
        <Link href={`/block/${t.blockHeight}`} className="text-accent hover:underline">
          {formatInt(t.blockHeight)}
        </Link>
      ) : (
        <span className="text-warn">mempool</span>
      ),
  };
  const age: Column<TxRow> = {
    key: "age",
    header: "Age",
    cell: (t) => (t.blockTime ? <TimeAgo unix={t.blockTime} className="text-muted" /> : <span className="text-faint">—</span>),
  };
  const io: Column<TxRow> = {
    key: "io",
    header: "In / Out",
    align: "right",
    mono: true,
    className: "hidden lg:table-cell",
    cell: (t) => (
      <span className="text-muted">
        {t.vinCount} / {t.voutCount}
      </span>
    ),
  };
  const to: Column<TxRow> = {
    key: "to",
    header: "To",
    className: "hidden xl:table-cell",
    cell: (t) => (t.to ? <Hash value={t.to} kind="address" head={6} tail={6} /> : <span className="text-faint">—</span>),
  };
  const value: Column<TxRow> = { key: "value", header: "Value", align: "right", cell: (t) => <Amount sats={t.value} /> };
  const fee: Column<TxRow> = {
    key: "fee",
    header: "Fee",
    align: "right",
    className: "hidden lg:table-cell",
    cell: (t) => (t.coinbase ? <span className="text-faint">—</span> : <Amount sats={t.fees} className="text-muted" symbol={false} />),
  };
  const delta: Column<TxRow> = {
    key: "delta",
    header: "Amount",
    align: "right",
    cell: (t) => {
      const neg = t.delta?.startsWith("-");
      return (
        <span className={neg ? "text-bad" : "text-ok"}>
          {!neg && "+"}
          <Amount sats={t.delta} />
        </span>
      );
    },
  };

  if (variant === "latest") return [txid, block, age, to, value];
  if (variant === "block") return [txid, to, io, fee, value];
  return [txid, block, age, io, delta];
}

export function TxTable({
  rows,
  variant,
  highlight,
  title,
  actions,
  footer,
  notice,
  emptyTitle = "No transactions",
  emptyText,
}: {
  rows: TxRow[];
  variant: TxTableVariant;
  highlight?: ReadonlySet<string>;
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  emptyTitle?: string;
  emptyText?: ReactNode;
}) {
  return (
    <DataTable
      title={title}
      actions={actions}
      footer={footer}
      notice={notice}
      columns={columns(variant)}
      rows={rows}
      rowKey={(t) => t.txid}
      rowHref={(t) => `/tx/${t.txid}`}
      highlight={highlight}
      emptyTitle={emptyTitle}
      emptyText={emptyText}
    />
  );
}
