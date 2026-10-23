# BTC1 Explorer

A custom block explorer frontend for **BTC1 (Bitcoin Genesis 1)**. It's built with Next.js 14 (App Router), TypeScript and Tailwind, and uses a Trezor **Blockbook v0.6.0** instance purely as a backend (REST + WebSocket). Blockbook's own UI isn't used.

## Quick start

```bash
# Node 20+ is required. On this WSL box it lives at ~/.local/node (see DECISIONS.md → Tooling).
export PATH=$HOME/.local/node/bin:$PATH

npm install
npm run dev              # http://localhost:3000
npm run build && npm start
npm run check:samples    # validate reference/api-samples/*.json against the runtime schemas
```

Configuration is in `.env.local` (template: `.env.example`):

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_BLOCKBOOK_API_URL` | server (+ inlined) | REST base, e.g. `https://18.135.58.84:9140/api/v2` |
| `NEXT_PUBLIC_BLOCKBOOK_WS_URL` | browser | WebSocket, e.g. `wss://18.135.58.84:9140/websocket` |
| `NEXT_PUBLIC_COIN_NAME` / `_COIN_SYMBOL` / `_EXPLORER_TITLE` | both | Branding |
| `BLOCKBOOK_ALLOW_SELF_SIGNED` | server only | `true` = accept the self-signed cert **on the Blockbook host only**. Must be unset in production. |
| `BLOCKBOOK_RATE_PER_SEC`, `BLOCKBOOK_BURST` | server only | Outbound request budget toward Blockbook (default 0.8/s, burst 12) |

## ⚠️ TLS: dev workaround and production requirement

The Blockbook server currently uses a **self-signed certificate**.

- **Server-side (REST):** all REST calls run on the Next.js server through a dedicated `https.Agent({ rejectUnauthorized: false })`. It applies only to requests to the configured Blockbook host and only when `BLOCKBOOK_ALLOW_SELF_SIGNED=true`. It is never set globally (no `NODE_TLS_REJECT_UNAUTHORIZED`) and never reaches the client bundle (`lib/blockbook.server.ts` imports `server-only`).
- **Browser (WebSocket):** browsers reject `wss://` to a self-signed host. For local dev, open `https://18.135.58.84:9140/` once in the same browser and accept the certificate warning. Until you do, the explorer still works: the live badge turns **amber** and the app falls back to polling chain status every 15s through the server proxy.
- **Before going live:** put Blockbook behind a reverse proxy (e.g. Nginx) with a real certificate, point the env vars at that domain, and remove `BLOCKBOOK_ALLOW_SELF_SIGNED`.

## Architecture

```
Browser ──► Next.js server ───────────────────────► Blockbook REST (rate-limited, self-signed)
   │         ├─ Server Components (SSR pages)       ▲
   │         ├─ /api/bb/*  whitelisted proxy ───────┤  one token bucket + TTL cache +
   │         ├─ /api/search (hash → block|tx)       │  in-flight de-dup + 429 retry
   │         └─ /api/invalidate (address cache) ────┘
   └──────────────────────────────────────────────► Blockbook WebSocket (direct)
```

Why a proxy: Blockbook sends **no CORS headers**, uses a **self-signed cert**, and **rate-limits per IP** (about 20 requests burst, then ~0.5–1/s; returns HTTP 429). Sending every visitor's requests through one cached, rate-limited server client fixes all three.

### Files

| Path | What |
|---|---|
| `lib/blockbook-types.ts` | zod schemas + TS types derived from the live samples |
| `lib/blockbook.ts` | Typed client, one function per endpoint: `getStatus`, `getBlock`, `getBlockIndex`, `getTx`, `getAddress`, `getUtxos`. Error classification. Browser transport. |
| `lib/blockbook.server.ts` | Server transport: scoped TLS agent, rate limiter, cache, retries; `bb` client + `attempt()` result wrapper |
| `lib/blockbookSocket.ts` | WebSocket client (`subscribeNewBlock`, `subscribeNewTransaction`, `subscribeAddresses`), backoff reconnect, keepalive, polling fallback, and the `useBlockbookSocket()` hook |
| `components/` | `Hash`, `StatCard`, `DataTable`, `LiveBadge`, `Pagination` + page-specific pieces |
| `app/` | `/`, `/blocks`, `/block/[hashOrHeight]`, `/tx/[txid]`, `/address/[address]`, `/address/[address]/utxo` |
| `reference/api-samples/` | Live responses (source of truth), incl. `errors.json` and `ws-messages.json` |
| `reference/generated/` | quicktype-generated interfaces from the samples (for comparison) |

### Pages

1. **`/`**: stats strip (Block Height, Latest Block, Mempool, Sync Status) and live "Latest Blocks" / "Latest Transactions" tables. New rows slide in with a highlight.
2. **`/blocks`**: full paginated block list (20 per page).
3. **`/block/[hashOrHeight]`**: header fields, prev/next navigation, paginated txs (50 per page).
4. **`/tx/[txid]`**: status/confirmations, fee and fee rate, block link, inputs → outputs flow (coinbase and OP_RETURN aware, spent/unspent), raw hex toggle.
5. **`/address/[address]`**: balance, received/sent, tx count, paginated history with per-tx net amount, copy address, link to UTXOs, live updates via `subscribeAddresses`.
6. **Search** (nav bar): digits → block height; 64 hex → block hash, then txid; anything else → address.

## Choosing an accent colour

| Option | Hex | Notes |
|---|---|---|
| **Cyan (chosen)** | `#22d3ee` | High contrast on navy, reads as "live data", distinct from success green and warning amber |
| Violet | `#a78bfa` | Distinctive brand feel; slightly lower contrast for small link text |
| Emerald | `#34d399` | Clashes with the green used for "synced"/"unspent" states |

To switch, change `accent` in `tailwind.config.ts` and the rgba values in the `row-in` keyframe.

## Open TODOs / backend follow-ups

- [ ] **Enable mempool streaming:** start Blockbook with `-enablesubnewtx` to turn on live unconfirmed txs on the dashboard. The frontend already handles it.
- [ ] **Rate limit:** whitelist the frontend server's IP in whatever enforces the 429 limit (Nginx/Blockbook patch). Then raise `BLOCKBOOK_RATE_PER_SEC`/`BLOCKBOOK_BURST`. Cold `/blocks` pages take a few seconds with the current budget.
- [ ] **Real TLS certificate + reverse proxy** before going public (see above). With Nginx in front, `/api/` CORS isn't needed because the browser only talks to this Next.js app.
- [ ] `/block` pagination beyond 1000 txs (Blockbook page 2+) is implemented but untested: no block on this chain has more than 1000 txs.
- [ ] `subscribeAddresses` push payload (`{address, tx}`) follows the Blockbook protocol but wasn't observed live (no activity on watched addresses during testing). The client re-fetches on any push, so a shape difference only skips the push.
- [ ] The cache is per server process and in memory. If you run multiple instances, use a shared cache (Redis) or sticky routing.
- [ ] `/api/invalidate` is unauthenticated. It can only drop address-scoped cache entries (forcing a refetch that's still rate-limited), but consider rate-limiting it per client.
- [ ] Optional: balance-history chart (`/balancehistory`; note this build rejects ranges spanning >100k txs), fiat rates, xpub support.
- [ ] Reminder from the backend handover: BTC1 addresses are byte-identical in format to Bitcoin's (`1…`, `3…`, `bc1…`). The 404 page warns users, but consider a visible "BTC1 network" banner on address pages.
