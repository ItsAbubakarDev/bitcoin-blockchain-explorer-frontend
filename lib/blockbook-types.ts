/**
 * Runtime schemas + TypeScript types for the BTC1 Blockbook v0.6.0 REST API.
 *
 * Derived from the live samples in reference/api-samples/*.json (machine-generated
 * interfaces for comparison live in reference/generated/*.ts, produced by quicktype).
 * `npm run check:samples` validates every sample against these schemas.
 *
 * Rules applied:
 * - A field is required only if it is present in every sample of that shape.
 * - Satoshi amounts are decimal strings (they can exceed 2^53), never numbers.
 * - Unknown extra fields are stripped, so a newer Blockbook adding fields won't break parsing.
 */
import { z } from "zod";

const sats = z.string().regex(/^-?\d+$/, "expected integer satoshi string");

/* ---------------------------------------------------------------- status (GET /) */

export const StatusSchema = z.object({
  blockbook: z.object({
    coin: z.string(),
    network: z.string().optional(),
    host: z.string().optional(),
    version: z.string(),
    gitCommit: z.string().optional(),
    buildTime: z.string().optional(),
    syncMode: z.boolean().optional(),
    initialSync: z.boolean().optional(),
    inSync: z.boolean(),
    bestHeight: z.number().int().nonnegative(),
    lastBlockTime: z.string(),
    inSyncMempool: z.boolean().optional(),
    lastMempoolTime: z.string().optional(),
    mempoolSize: z.number().int().nonnegative().optional(),
    decimals: z.number().int().optional(),
    dbSize: z.number().optional(),
    about: z.string().optional(),
  }),
  backend: z.object({
    chain: z.string().optional(),
    blocks: z.number().int().nonnegative(),
    headers: z.number().int().nonnegative().optional(),
    bestBlockHash: z.string(),
    difficulty: z.string().optional(),
    sizeOnDisk: z.number().optional(),
    version: z.string().optional(),
    subversion: z.string().optional(),
    protocolVersion: z.string().optional(),
  }),
});
export type Status = z.infer<typeof StatusSchema>;

/* ------------------------------------------------------------------ tx parts */

/**
 * Input. Coinbase inputs (tx-coinbase.json) have no txid/addresses/value and carry `coinbase`.
 * Block-embedded coinbase inputs (block-*.json) are trimmed to {n, isAddress, value: "0"}.
 */
export const VinSchema = z.object({
  n: z.number().int(),
  txid: z.string().optional(),
  vout: z.number().int().optional(),
  sequence: z.number().optional(),
  addresses: z.array(z.string()).optional(),
  isAddress: z.boolean(),
  isOwn: z.boolean().optional(),
  value: sats.optional(),
  hex: z.string().optional(),
  coinbase: z.string().optional(),
});
export type Vin = z.infer<typeof VinSchema>;

/** Output. OP_RETURN outputs have isAddress:false and addresses: ["OP_RETURN <hex>"]. */
export const VoutSchema = z.object({
  n: z.number().int(),
  value: sats,
  addresses: z.array(z.string()).optional(),
  isAddress: z.boolean(),
  isOwn: z.boolean().optional(),
  spent: z.boolean().optional(),
  hex: z.string().optional(),
});
export type Vout = z.infer<typeof VoutSchema>;

/**
 * Transaction as embedded in /block and /address responses (the "light" shape).
 * /block omits hex/size/vsize/version; /address includes them.
 */
export const TxLightSchema = z.object({
  txid: z.string(),
  vin: z.array(VinSchema),
  vout: z.array(VoutSchema),
  blockHash: z.string().optional(), // absent for mempool txs
  blockHeight: z.number().int(), // -1 / 0 for mempool txs in Blockbook
  confirmations: z.number().int(),
  blockTime: z.number().int(),
  value: sats,
  valueIn: sats,
  fees: sats,
  version: z.number().optional(),
  lockTime: z.number().optional(),
  size: z.number().optional(),
  vsize: z.number().optional(),
  hex: z.string().optional(),
});
export type TxLight = z.infer<typeof TxLightSchema>;

/** Full transaction (GET /tx/{txid}). */
export const TxSchema = TxLightSchema.extend({
  version: z.number(),
  size: z.number().optional(),
  vsize: z.number().optional(),
  hex: z.string().optional(),
});
export type Tx = z.infer<typeof TxSchema>;

/* ---------------------------------------------------------------- block */

export const BlockSchema = z.object({
  page: z.number().int(),
  totalPages: z.number().int(),
  itemsOnPage: z.number().int(),
  hash: z.string(),
  previousBlockHash: z.string().optional(), // absent on genesis
  nextBlockHash: z.string().optional(), // absent on tip
  height: z.number().int().nonnegative(),
  confirmations: z.number().int(),
  size: z.number().optional(),
  time: z.number().int(),
  version: z.number().optional(),
  merkleRoot: z.string().optional(),
  nonce: z.string().optional(),
  bits: z.string().optional(),
  difficulty: z.string().optional(),
  txCount: z.number().int().nonnegative(),
  txs: z.array(TxLightSchema).optional().default([]),
});
export type Block = z.infer<typeof BlockSchema>;

export const BlockIndexSchema = z.object({ blockHash: z.string() });
export type BlockIndex = z.infer<typeof BlockIndexSchema>;

/* ---------------------------------------------------------------- address */

/** Note: `txs` is the tx COUNT; the array is `transactions`, and is absent (not []) when empty. */
export const AddressSchema = z.object({
  page: z.number().int().optional(),
  totalPages: z.number().int().optional(),
  itemsOnPage: z.number().int().optional(),
  address: z.string(),
  balance: sats,
  totalReceived: sats,
  totalSent: sats,
  unconfirmedBalance: sats.optional(),
  unconfirmedTxs: z.number().int().optional(),
  txs: z.number().int().nonnegative(),
  transactions: z.array(TxLightSchema).optional().default([]),
});
export type Address = z.infer<typeof AddressSchema>;

/* ---------------------------------------------------------------- utxo */

export const UtxoSchema = z.object({
  txid: z.string(),
  vout: z.number().int(),
  value: sats,
  height: z.number().int().optional(), // absent for unconfirmed utxos
  confirmations: z.number().int(),
  coinbase: z.boolean().optional(),
  lockTime: z.number().optional(),
});
export const UtxoListSchema = z.array(UtxoSchema);
export type Utxo = z.infer<typeof UtxoSchema>;

/* ---------------------------------------------------------------- websocket */

/** reference/api-samples/ws-messages.json → newBlock_push.data */
export const WsNewBlockSchema = z.object({
  height: z.number().int(),
  hash: z.string(),
});
export type WsNewBlock = z.infer<typeof WsNewBlockSchema>;

/** subscribeAddresses push: { address, tx } (Blockbook protocol; not observed live yet). */
export const WsAddressTxSchema = z.object({
  address: z.string(),
  tx: TxLightSchema,
});
export type WsAddressTx = z.infer<typeof WsAddressTxSchema>;

export const WsSubscribeAckSchema = z.object({
  subscribed: z.boolean(),
  message: z.string().optional(),
});
