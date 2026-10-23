"use client";
import Link from "next/link";
import { formatBytes, formatInt } from "@/lib/format";
import type { BlockRow } from "@/lib/summaries";
import type { ReactNode } from "react";
import { DataTable, type Column } from "./DataTable";
import { Hash } from "./Hash";
import { TimeAgo } from "./TimeAgo";

const columns = (compact: boolean): Column<BlockRow>[] => [
  {
    key: "height",
    header: "Height",
    mono: true,
    cell: (b) => (
      <Link href={`/block/${b.height}`} className="text-accent hover:underline">
        {formatInt(b.height)}
      </Link>
    ),
  },
  { key: "hash", header: "Hash", cell: (b) => <Hash value={b.hash} kind="block" /> },
  { key: "age", header: "Age", cell: (b) => <TimeAgo unix={b.time} className="text-muted" /> },
  ...(compact
    ? []
    : [
        {
          key: "minedTo",
          header: "Reward to",
          className: "hidden lg:table-cell",
          cell: (b: BlockRow) => (b.minedTo ? <Hash value={b.minedTo} kind="address" head={6} tail={6} /> : <span className="text-faint">—</span>),
        },
      ]),
  { key: "txs", header: "Txs", align: "right", mono: true, cell: (b) => formatInt(b.txCount) },
  {
    key: "size",
    header: "Size",
    align: "right",
    mono: true,
    className: compact ? "hidden xl:table-cell" : "",
    cell: (b) => <span className="text-muted">{formatBytes(b.size)}</span>,
  },
];

export function BlocksTable({
  rows,
  highlight,
  title,
  actions,
  footer,
  notice,
  compact = false,
}: {
  rows: BlockRow[];
  highlight?: ReadonlySet<string>;
  title?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  notice?: ReactNode;
  compact?: boolean;
}) {
  return (
    <DataTable
      title={title}
      actions={actions}
      footer={footer}
      notice={notice}
      columns={columns(compact)}
      rows={rows}
      rowKey={(b) => b.hash}
      rowHref={(b) => `/block/${b.height}`}
      highlight={highlight}
      emptyTitle="No blocks"
    />
  );
}
