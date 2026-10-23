import type { Block, TxLight } from "./blockbook-types";

/** Compact row shapes passed from Server to Client Components. */
export interface BlockRow {
  height: number;
  hash: string;
  time: number;
  txCount: number;
  size?: number;
  /** First output address of the coinbase tx, when the block's first page includes it. */
  minedTo?: string;
}

export interface TxRow {
  txid: string;
  blockHeight: number;
  blockTime: number;
  confirmations: number;
  value: string;
  fees: string;
  vinCount: number;
  voutCount: number;
  coinbase: boolean;
  /** First input / output address, for compact "from → to" display. */
  from?: string;
  to?: string;
  /** Net effect on the address being viewed (address pages only). */
  delta?: string;
}

/** Coinbase inputs carry no prev txid (block-embedded: {n, isAddress:false, value:"0"}). */
export const isCoinbaseTx = (tx: Pick<TxLight, "vin">) => tx.vin.length === 1 && !tx.vin[0]!.txid;

const firstAddress = (items: Array<{ addresses?: string[]; isAddress: boolean }>) =>
  items.find((i) => i.isAddress && i.addresses?.length)?.addresses?.[0];

export function toBlockRow(b: Block): BlockRow {
  const cb = b.txs[0] && isCoinbaseTx(b.txs[0]) ? b.txs[0] : undefined;
  return {
    height: b.height,
    hash: b.hash,
    time: b.time,
    txCount: b.txCount,
    size: b.size,
    minedTo: cb ? firstAddress(cb.vout) : undefined,
  };
}

export function toTxRow(tx: TxLight, forAddress?: string): TxRow {
  const row: TxRow = {
    txid: tx.txid,
    blockHeight: tx.blockHeight,
    blockTime: tx.blockTime,
    confirmations: tx.confirmations,
    value: tx.value,
    fees: tx.fees,
    vinCount: tx.vin.length,
    voutCount: tx.vout.length,
    coinbase: isCoinbaseTx(tx),
    from: firstAddress(tx.vin),
    to: firstAddress(tx.vout),
  };
  if (forAddress) {
    let d = BigInt(0);
    for (const o of tx.vout) if (o.addresses?.includes(forAddress)) d += BigInt(o.value);
    for (const i of tx.vin) if (i.addresses?.includes(forAddress) && i.value) d -= BigInt(i.value);
    row.delta = d.toString();
  }
  return row;
}
