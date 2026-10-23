/**
 * Server-side Blockbook transport. Never imported by client components (`server-only`).
 *
 * Why this exists (all verified against the live backend, see reference/api-samples):
 * - Self-signed TLS: a dedicated https.Agent with rejectUnauthorized:false is used ONLY
 *   for requests to the configured Blockbook host, and only when
 *   BLOCKBOOK_ALLOW_SELF_SIGNED=true. It is never installed globally.
 * - Rate limiting: the backend allows a burst of ~20 requests then ~0.5–1 req/s per IP
 *   and answers HTTP 429 beyond that. All traffic is funnelled through one token bucket,
 *   identical in-flight requests are de-duplicated, responses are cached, and 429s
 *   are retried with backoff.
 * - Single fork-chain node: timeouts and connection resets are routine and retried.
 */
import "server-only";
import http from "node:http";
import https from "node:https";
import {
  BlockbookError,
  buildQuery,
  classifyHttpError,
  createBlockbookClient,
  type Fetcher,
  type Query,
} from "./blockbook";

const API_URL = process.env.BLOCKBOOK_API_URL || process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL || "";
const ALLOW_SELF_SIGNED = process.env.BLOCKBOOK_ALLOW_SELF_SIGNED === "true";
const RATE_PER_SEC = Number(process.env.BLOCKBOOK_RATE_PER_SEC || 0.8);
const BURST = Number(process.env.BLOCKBOOK_BURST || 12);
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_QUEUE_WAIT_MS = 20_000;
const MAX_ATTEMPTS = 3;

const base = API_URL ? new URL(API_URL.replace(/\/+$/, "") + "/") : null;

/** Scoped to the Blockbook host only. */
const blockbookAgent =
  base?.protocol === "https:"
    ? new https.Agent({ keepAlive: true, maxSockets: 6, rejectUnauthorized: !ALLOW_SELF_SIGNED })
    : new http.Agent({ keepAlive: true, maxSockets: 6 });

/* ------------------------------------------------------------ shared state (survives dev HMR) */

type CacheEntry = { expires: number; value: unknown };
type State = {
  cache: Map<string, CacheEntry>;
  inflight: Map<string, Promise<unknown>>;
  tokens: number;
  lastRefill: number;
  queue: Array<() => void>;
  drainTimer: NodeJS.Timeout | null;
  backoffUntil: number;
};
const g = globalThis as unknown as { __bbState?: State };
const state: State = (g.__bbState ??= {
  cache: new Map(),
  inflight: new Map(),
  tokens: BURST,
  lastRefill: Date.now(),
  queue: [],
  drainTimer: null,
  backoffUntil: 0,
});

const CACHE_MAX = 3000;

function cacheGet(key: string): unknown | undefined {
  const e = state.cache.get(key);
  if (!e) return undefined;
  if (e.expires < Date.now()) {
    state.cache.delete(key);
    return undefined;
  }
  // LRU bump
  state.cache.delete(key);
  state.cache.set(key, e);
  return e.value;
}

function cacheSet(key: string, value: unknown, ttlMs: number) {
  if (ttlMs <= 0) return;
  state.cache.set(key, { value, expires: Date.now() + ttlMs });
  while (state.cache.size > CACHE_MAX) {
    const oldest = state.cache.keys().next().value;
    if (oldest === undefined) break;
    state.cache.delete(oldest);
  }
}

/** Drop cached entries whose key starts with `prefix` (e.g. "address/bc1q…"). */
export function invalidateCache(prefix: string) {
  for (const key of state.cache.keys()) if (key.startsWith(prefix)) state.cache.delete(key);
}

/** Confirmed-deep data is immutable barring a reorg; recent data changes every block. */
const DEEP = 6;
function ttlFor(path: string, data: unknown): number {
  const conf = (data as { confirmations?: unknown })?.confirmations;
  const deep = typeof conf === "number" && conf >= DEEP;
  if (path === "") return 4_000;
  if (path.startsWith("block-index/")) return 10 * 60_000;
  if (path.startsWith("block/")) return deep ? 6 * 3600_000 : 10_000;
  if (path.startsWith("tx/")) return deep ? 10 * 60_000 : 10_000;
  if (path.startsWith("address/") || path.startsWith("utxo/")) return 15_000;
  return 5_000;
}

/* ------------------------------------------------------------ token bucket */

function refill() {
  const now = Date.now();
  state.tokens = Math.min(BURST, state.tokens + ((now - state.lastRefill) / 1000) * RATE_PER_SEC);
  state.lastRefill = now;
}

function drain() {
  state.drainTimer = null;
  refill();
  const now = Date.now();
  while (state.queue.length && state.tokens >= 1 && now >= state.backoffUntil) {
    state.tokens -= 1;
    state.queue.shift()!();
  }
  if (state.queue.length) {
    const waitTokens = Math.max(0, ((1 - state.tokens) / RATE_PER_SEC) * 1000);
    const wait = Math.max(waitTokens, state.backoffUntil - now, 25);
    state.drainTimer = setTimeout(drain, wait);
  }
}

function acquireSlot(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const i = state.queue.indexOf(go);
      if (i >= 0) state.queue.splice(i, 1);
      reject(new BlockbookError("busy", "Explorer is rate limited by the node; try again shortly", 503));
    }, MAX_QUEUE_WAIT_MS);
    const go = () => {
      clearTimeout(timer);
      resolve();
    };
    state.queue.push(go);
    if (!state.drainTimer) drain();
  });
}

/* ------------------------------------------------------------ raw request */

function requestOnce(url: URL): Promise<{ status: number; body: string }> {
  const mod = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = mod.request(
      url,
      {
        method: "GET",
        agent: url.host === base?.host ? blockbookAgent : undefined,
        headers: { Accept: "application/json", "User-Agent": "btc1-explorer" },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new BlockbookError("timeout", "Blockbook request timed out", 504)));
    req.on("error", reject);
    req.end();
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchUpstream(path: string, query: string): Promise<unknown> {
  if (!base) throw new BlockbookError("upstream", "NEXT_PUBLIC_BLOCKBOOK_API_URL is not configured", 500);
  const url = new URL(path + query, base);
  let lastErr: BlockbookError = new BlockbookError("upstream", "Unknown error");

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await acquireSlot();
    let res: { status: number; body: string };
    try {
      res = await requestOnce(url);
    } catch (e) {
      lastErr =
        e instanceof BlockbookError
          ? e
          : new BlockbookError("network", `Cannot reach Blockbook: ${(e as Error)?.message ?? e}`, 502);
      if (attempt < MAX_ATTEMPTS) await sleep(400 * 2 ** attempt);
      continue;
    }

    let json: unknown;
    try {
      json = JSON.parse(res.body);
    } catch {
      lastErr = new BlockbookError("malformed", `Non-JSON response (HTTP ${res.status})`, 502);
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(400 * 2 ** attempt);
        continue;
      }
      throw lastErr;
    }

    if (res.status === 200) return json;

    const msg = (json as { error?: unknown })?.error;
    lastErr = classifyHttpError(res.status, typeof msg === "string" ? msg : `HTTP ${res.status}`);
    if (res.status === 429) {
      // Pause the whole bucket so other queued requests don't also burn into 429s.
      state.tokens = 0;
      state.backoffUntil = Date.now() + 1500 * attempt;
      continue;
    }
    if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
      await sleep(400 * 2 ** attempt);
      continue;
    }
    throw lastErr; // 4xx other than 429 is definitive
  }
  throw lastErr;
}

/* ------------------------------------------------------------ public */

/** Cached, de-duplicated, rate-limited GET returning raw JSON. Used by the /api/bb proxy. */
export async function blockbookGetRaw(path: string, query?: Query): Promise<unknown> {
  const qs = buildQuery(query);
  const key = path + qs;
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;

  const pending = state.inflight.get(key);
  if (pending) return pending;

  const p = fetchUpstream(path, qs)
    .then((value) => {
      cacheSet(key, value, ttlFor(path, value));
      return value;
    })
    .catch((e: unknown) => {
      // Briefly cache definitive not-founds so repeated lookups don't hit the node.
      if (e instanceof BlockbookError && e.kind === "not_found") cacheSet(key, NOT_FOUND(e), 10_000);
      throw e;
    })
    .finally(() => state.inflight.delete(key));
  state.inflight.set(key, p);
  return p;
}

const NOT_FOUND_TAG = Symbol("notFound");
const NOT_FOUND = (e: BlockbookError) => ({ [NOT_FOUND_TAG]: e });

const serverFetcher: Fetcher = async (path, query) => {
  const v = await blockbookGetRaw(path, query);
  if (v && typeof v === "object" && NOT_FOUND_TAG in v) throw (v as Record<symbol, BlockbookError>)[NOT_FOUND_TAG];
  return v;
};

/** Server-side API (use from Server Components and Route Handlers). */
export const bb = createBlockbookClient(serverFetcher);

/** Proxy-friendly variant that rethrows cached not-founds too. */
export const blockbookGet = serverFetcher;

export type Result<T> = { ok: true; data: T } | { ok: false; error: BlockbookError };

/** Wrap a call so pages can render inline error states instead of crashing. */
export async function attempt<T>(p: Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await p };
  } catch (e) {
    const error =
      e instanceof BlockbookError ? e : new BlockbookError("upstream", e instanceof Error ? e.message : String(e));
    if (error.kind !== "not_found") console.error(`[blockbook] ${error.kind}: ${error.message}`);
    return { ok: false, error };
  }
}
