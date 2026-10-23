/**
 * Typed Blockbook REST client — one function per endpoint.
 *
 * The client is transport-agnostic: `createBlockbookClient(fetcher)` is used
 *  - in the browser via `blockbook` below, which goes through the same-origin proxy
 *    at /api/bb/* (Blockbook sends no CORS headers, uses a self-signed cert, and
 *    rate-limits per IP, so browsers never talk to it directly), and
 *  - on the server via `lib/blockbook.server.ts`, which adds TLS handling, caching
 *    and rate limiting.
 */
import { z } from "zod";
import {
  AddressSchema,
  BlockIndexSchema,
  BlockSchema,
  StatusSchema,
  TxSchema,
  UtxoListSchema,
  type Address,
  type Block,
  type Status,
  type Tx,
  type Utxo,
} from "./blockbook-types";

export * from "./blockbook-types";

export type BlockbookErrorKind =
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "network"
  | "malformed"
  | "busy"
  | "upstream";

export class BlockbookError extends Error {
  constructor(
    public readonly kind: BlockbookErrorKind,
    message: string,
    public readonly status = 0,
  ) {
    super(message);
    this.name = "BlockbookError";
  }
}

/**
 * Blockbook v0.6.0 returns HTTP 400 (not 404) with {"error": "..."} for missing
 * blocks/txs and invalid addresses — see reference/api-samples/errors.json.
 */
export function classifyHttpError(status: number, message: string): BlockbookError {
  if (status === 429) return new BlockbookError("rate_limited", message || "Rate limited", status);
  if (status === 404) return new BlockbookError("not_found", message || "Not found", status);
  if (status === 400 && /not found|invalid address|checksum|must be of length|invalid/i.test(message)) {
    return new BlockbookError("not_found", message, status);
  }
  if (status === 503) return new BlockbookError("busy", message || "Backend busy", status);
  if (status === 504) return new BlockbookError("timeout", message || "Backend timed out", status);
  return new BlockbookError("upstream", message || `HTTP ${status}`, status);
}

export function isNotFound(e: unknown): boolean {
  return e instanceof BlockbookError && e.kind === "not_found";
}

/** Human-readable message for inline error states. */
export function describeError(e: unknown): string {
  if (!(e instanceof BlockbookError)) return "Something went wrong loading this data.";
  switch (e.kind) {
    case "not_found":
      return e.message;
    case "rate_limited":
    case "busy":
      return "The BTC1 node is busy right now (rate limited). Try again in a few seconds.";
    case "timeout":
      return "The BTC1 node took too long to respond.";
    case "network":
      return "Couldn't reach the BTC1 node. Check your connection and try again.";
    case "malformed":
      return "The node returned data in an unexpected format.";
    default:
      return `The node returned an error: ${e.message}`;
  }
}

export type Query = Record<string, string | number | undefined>;
/** Fetches `path` (relative to the API base, "" = status) and resolves to parsed JSON. */
export type Fetcher = (path: string, query?: Query) => Promise<unknown>;

function parse<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, data: unknown, what: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    const where = issue ? `${issue.path.join(".") || "(root)"}: ${issue.message}` : "unknown";
    throw new BlockbookError("malformed", `Malformed ${what} response (${where})`);
  }
  return r.data;
}

export const isHeight = (s: string) => /^\d{1,10}$/.test(s);
export const isHash64 = (s: string) => /^[0-9a-fA-F]{64}$/.test(s);

export function createBlockbookClient(fetchJson: Fetcher) {
  return {
    /** GET / — sync state and chain info. */
    async getStatus(): Promise<Status> {
      return parse(StatusSchema, await fetchJson(""), "status");
    },

    /**
     * GET /block/{hashOrHeight}?page= — header + txs.
     * `page` is Blockbook's page (fixed 1000 txs/page in v0.6.0; pageSize is ignored).
     */
    async getBlock(hashOrHeight: string | number, opts: { page?: number } = {}): Promise<Block> {
      return parse(BlockSchema, await fetchJson(`block/${hashOrHeight}`, { page: opts.page }), "block");
    },

    /** GET /block-index/{height} — height → hash. A miss is HTTP 200 with blockHash: "". */
    async getBlockIndex(height: number): Promise<string> {
      const { blockHash } = parse(BlockIndexSchema, await fetchJson(`block-index/${height}`), "block-index");
      if (!blockHash) throw new BlockbookError("not_found", `Block ${height} not found`, 200);
      return blockHash;
    },

    /** GET /tx/{txid} */
    async getTx(txid: string): Promise<Tx> {
      return parse(TxSchema, await fetchJson(`tx/${txid}`), "transaction");
    },

    /** GET /address/{address}?page=&pageSize=&details= */
    async getAddress(
      address: string,
      opts: { page?: number; pageSize?: number; details?: "basic" | "txids" | "txs" } = {},
    ): Promise<Address> {
      const data = await fetchJson(`address/${address}`, {
        page: opts.page,
        pageSize: opts.pageSize,
        details: opts.details ?? "txs",
      });
      return parse(AddressSchema, data, "address");
    },

    /** GET /utxo/{address} */
    async getUtxos(address: string): Promise<Utxo[]> {
      return parse(UtxoListSchema, await fetchJson(`utxo/${address}`), "utxo");
    },
  };
}

export type BlockbookClient = ReturnType<typeof createBlockbookClient>;

export function buildQuery(query?: Query): string {
  if (!query) return "";
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const BROWSER_TIMEOUT_MS = 30_000; // the server proxy may queue behind the rate limiter

/** Browser transport: same-origin proxy at /api/bb/*. */
export const browserFetcher: Fetcher = async (path, query) => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BROWSER_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`/api/bb/${path}${buildQuery(query)}`, { signal: ctrl.signal, cache: "no-store" });
  } catch (e) {
    throw ctrl.signal.aborted
      ? new BlockbookError("timeout", "Request timed out")
      : new BlockbookError("network", e instanceof Error ? e.message : "Network error");
  } finally {
    clearTimeout(timer);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw res.ok
      ? new BlockbookError("malformed", "Response was not valid JSON", res.status)
      : classifyHttpError(res.status, res.statusText);
  }
  if (!res.ok) {
    const msg = (body as { error?: unknown })?.error;
    throw classifyHttpError(res.status, typeof msg === "string" ? msg : res.statusText);
  }
  return body;
};

/** Client-side API (use from "use client" components). */
export const blockbook = createBlockbookClient(browserFetcher);
