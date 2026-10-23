/**
 * Validates every reference/api-samples/*.json against the zod schemas in lib/blockbook-types.ts.
 * Run: npm run check:samples
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ZodTypeAny } from "zod";
import {
  AddressSchema,
  BlockIndexSchema,
  BlockSchema,
  StatusSchema,
  TxSchema,
  UtxoListSchema,
  WsNewBlockSchema,
  WsSubscribeAckSchema,
} from "../lib/blockbook-types";

const dir = join(__dirname, "..", "reference", "api-samples");
const load = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

const cases: Array<[string, ZodTypeAny, unknown]> = [
  ["status.json", StatusSchema, load("status.json")],
  ["block-early.json", BlockSchema, load("block-early.json")],
  ["block-recent.json", BlockSchema, load("block-recent.json")],
  ["block-with-spend.json", BlockSchema, load("block-with-spend.json")],
  ["block-index.json", BlockIndexSchema, load("block-index.json")],
  ["tx.json", TxSchema, load("tx.json")],
  ["tx-coinbase.json", TxSchema, load("tx-coinbase.json")],
  ["address.json", AddressSchema, load("address.json")],
  ["address-multi.json", AddressSchema, load("address-multi.json")],
  ["address-empty.json", AddressSchema, load("address-empty.json")],
  ["utxo.json", UtxoListSchema, load("utxo.json")],
  ["ws-messages.json#newBlock_push", WsNewBlockSchema, load("ws-messages.json").newBlock_push.data],
  ["ws-messages.json#subscribeNewTransaction_ack", WsSubscribeAckSchema, load("ws-messages.json").subscribeNewTransaction_ack.data],
];

let failed = 0;
for (const [name, schema, data] of cases) {
  const r = schema.safeParse(data);
  if (r.success) console.log(`ok    ${name}`);
  else {
    failed++;
    console.log(`FAIL  ${name}`);
    for (const i of r.error.issues.slice(0, 5)) console.log(`        ${i.path.join(".")}: ${i.message}`);
  }
}
process.exit(failed ? 1 : 0);
