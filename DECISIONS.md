# Decisions

One line per judgment call made while building autonomously. Backend facts were verified live against
`https://18.135.58.84:9140` on 2026-10-23; raw evidence is in `reference/api-samples/`.

## Backend findings that shaped the design

- **Rate limit (HTTP 429, ~20-request burst then ~0.5–1 req/s per IP).** Browsers never call Blockbook directly. Everything goes through a server proxy (`/api/bb/*`) that has one shared token bucket, de-duplicates identical in-flight requests, keeps a TTL cache, and retries 429s with backoff.
- **No CORS headers + self-signed cert.** The same proxy fixes both. The relaxed TLS agent is scoped to the Blockbook host and only turns on with `BLOCKBOOK_ALLOW_SELF_SIGNED=true`.
- **`subscribeNewTransaction` is disabled on the node** (`"use -enablesubnewtx flag to enable"`). "Latest Transactions" is built from the txs of the latest blocks, which are already fetched for "Latest Blocks", so it costs no extra requests. If the flag is turned on later, mempool txs stream in automatically. The UI notes this when the ack says it's unsupported.
- **`/block` ignores `pageSize`** (always 1000 txs per page). The block page shows 50 txs per page and maps each display page to the right Blockbook page plus an offset.
- **Not-found is HTTP 400 + `{"error"}`, not 404.** These are classified by message and rendered as a real 404 page. A `/block-index` miss is HTTP 200 with `blockHash: ""`, also treated as not found.
- **Address tx array is `transactions` (absent when empty); `txs` is the count.** This differs from some docs. The schema defaults it to `[]`.
- **No "list blocks" endpoint in v0.6.0.** `/blocks` makes one `/block` call per row. Page size is 20 (fits in the burst), and deep blocks are cached for 6h.
- **`/utxo` is unpaginated.** The UTXO page refuses addresses with more than 20,000 txs (the miner address has ~880k) and paginates the display at 50 per page.

## Design

- **Accent: cyan `#22d3ee`.** Options considered: cyan `#22d3ee`, violet `#a78bfa`, emerald `#34d399`. Cyan reads as "data/live", has strong contrast on `#0b0e14`, and doesn't clash with green (success/synced) or amber (warning/polling). Emerald was rejected because it collides with the "synced"/"unspent" green.
- Palette: bg `#0b0e14`, surface `#131722`, zebra/hover `#181d2a`/`#1f2535`, border `#242b3b`, text `#e6e9ef`, muted `#8b93a7`.
- Fonts: Inter (UI) and JetBrains Mono (hashes, amounts, heights), via `next/font/google` with CSS variables.
- Amounts are shown as whole coins with trailing zeros trimmed, formatted with BigInt (the miner balance is 8.7e15 sats, close to 2^53). The symbol is dimmed so digits stay aligned.
- All absolute times are shown in UTC to avoid server/client hydration mismatches. Relative "Xs ago" text ticks every second from one shared timer.
- Hash truncation is first 8 + last 8, with a CSS tooltip (not `title`) for the full value so it shows instantly. Copy uses the Clipboard API with a textarea fallback.
- Row click uses `router.push`. Clicks on inner links/buttons are left alone, Cmd/Ctrl-click opens a new tab, and Enter works for keyboard users.
- Below `md`, tables render as stacked `<dl>` cards using the same column definitions.
- "Reward to" (the coinbase's first output address) is shown on block rows/pages. It costs nothing because the coinbase is in the block response, and it's useful on a single-miner fork chain.

## Data and live updates

- Page sizes: blocks 20, block txs 50, address txs 25, dashboard 10.
- Cache TTLs: status 4s; block/tx with ≥6 confirmations 6h/10min, otherwise 10s; address/utxo 15s; block-index 10min; not-found 10s.
- Confirmations on cached pages are recomputed as `bestHeight − height + 1` (whichever is larger) so they don't look stale.
- The "Latest Block" stat uses `status.lastBlockTime` (when Blockbook indexed it), and WS arrival time after that. This avoids an extra block fetch per new block.
- Websocket fallback: if the socket isn't open within 8s, or drops, the nav badge and dashboard poll `/api/bb/` status every 15s and emit synthetic new-block events. Badge colour shows which source is active (cyan = WS, amber = polling).
- WS reconnect uses exponential backoff with jitter (1s → 30s cap). There's a ping every 25s, and a reconnect is forced if nothing is received for 70s. It also reconnects immediately on `online` or when the tab becomes visible.
- Blockbook keeps one address set per connection, so the client merges all `subscribeAddresses` callers and re-sends the union whenever it changes.
- On an address WS push, the address page calls `POST /api/invalidate` (address-scoped) and then `router.refresh()`.
- If WS skips heights (e.g. after a reconnect), the dashboard fills the gap by fetching every missing block, up to 10.
- Search: a 64-hex term is resolved on the server (`/api/search`), trying block first and then tx. That's at most 2 upstream calls, both cached.

## Tooling

- Node: the machine only had Windows `npm` via WSL interop, so Node 20.18.1 LTS was installed user-locally at `~/.local/node` (no sudo). Add `export PATH=$HOME/.local/node/bin:$PATH` to `~/.bashrc`.
- Types: `quicktype` generated reference interfaces from the samples (`reference/generated/*.ts`). The runtime zod schemas in `lib/blockbook-types.ts` mirror them, and `npm run check:samples` validates every sample against them.
- Next.js 14.2.35 (latest 14.2.x patch, with the 2025 security fixes).
