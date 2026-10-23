"use client";
/**
 * Blockbook WebSocket client + React hook.
 *
 * Protocol (verified live, reference/api-samples/ws-messages.json):
 *   → {id, method, params}
 *   ← {id, data}              (responses and subscription pushes both reuse the request id)
 *
 * Backend capabilities on the BTC1 instance (2026-10-23):
 *   subscribeNewBlock      ✓  push data: {height, hash}
 *   subscribeAddresses     ✓
 *   subscribeNewTransaction ✗  "not enabled, use -enablesubnewtx flag" — handled gracefully;
 *                              `newTxSupported` reports the ack so the UI can say so.
 *
 * One socket per tab, shared by every component. If the socket can't connect (e.g. the
 * self-signed cert hasn't been accepted in this browser), a status poll through the
 * /api/bb proxy keeps the "last block" badge and live tables moving.
 */
import { useEffect, useRef, useSyncExternalStore } from "react";
import { BLOCKBOOK_WS_URL } from "./config";
import {
  WsAddressTxSchema,
  WsNewBlockSchema,
  WsSubscribeAckSchema,
  StatusSchema,
  TxLightSchema,
  type TxLight,
  type WsAddressTx,
  type WsNewBlock,
} from "./blockbook-types";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";
export type LiveSource = "websocket" | "polling" | "none";

export interface LastBlock {
  height: number;
  hash: string;
  /** Unix seconds when the block was observed/processed (status.lastBlockTime or WS arrival). */
  seenAt: number;
}

export interface LiveState {
  connection: ConnectionState;
  source: LiveSource;
  lastBlock: LastBlock | null;
  /** null = not yet known; false = backend refused subscribeNewTransaction. */
  newTxSupported: boolean | null;
  reconnectAttempt: number;
}

type Handler<T> = (data: T) => void;
type Pending = { resolve: (d: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

const PING_INTERVAL_MS = 25_000;
const STALE_AFTER_MS = 70_000;
const REQUEST_TIMEOUT_MS = 15_000;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const POLL_INTERVAL_MS = 15_000;
const POLL_START_DELAY_MS = 8_000;

class BlockbookSocket {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<string, Pending>();
  private attempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private pollStartTimer: ReturnType<typeof setTimeout> | null = null;
  private lastMessageAt = 0;
  private started = false;

  // Local subscribers; server subscriptions are (re)created from these on every connect.
  private blockHandlers = new Set<Handler<WsNewBlock>>();
  private txHandlers = new Set<Handler<TxLight>>();
  private addrHandlers = new Map<Handler<WsAddressTx>, Set<string>>();
  // Server-side subscription ids for the current connection.
  private subIds: { block?: string; tx?: string; addr?: string } = {};

  private state: LiveState = {
    connection: "idle",
    source: "none",
    lastBlock: null,
    newTxSupported: null,
    reconnectAttempt: 0,
  };
  private listeners = new Set<() => void>();

  constructor(private readonly url: string) {}

  /* ------------------------------------------------------------ store */

  getState = () => this.state;
  subscribeState = (fn: () => void) => {
    this.listeners.add(fn);
    this.start();
    return () => this.listeners.delete(fn);
  };
  private setState(patch: Partial<LiveState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /* ------------------------------------------------------------ lifecycle */

  start() {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    void this.seedFromStatus();
    this.connect();
    window.addEventListener("online", this.reconnectNow);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.pollStartTimer = setTimeout(() => this.ensurePolling(), POLL_START_DELAY_MS);
  }

  private onVisibility = () => {
    if (document.visibilityState === "visible" && this.state.connection !== "open") this.reconnectNow();
  };

  private reconnectNow = () => {
    if (this.state.connection === "open" || this.state.connection === "connecting") return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.attempt = 0;
    this.connect();
  };

  private connect() {
    if (!this.url) {
      this.setState({ connection: "closed" });
      this.ensurePolling();
      return;
    }
    this.setState({ connection: "connecting", reconnectAttempt: this.attempt });
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.attempt = 0;
      this.lastMessageAt = Date.now();
      this.subIds = {};
      this.setState({ connection: "open", source: "websocket", reconnectAttempt: 0 });
      this.stopPolling();
      this.startPing();
      void this.syncSubscriptions();
    };
    ws.onmessage = (ev) => {
      this.lastMessageAt = Date.now();
      this.handleMessage(ev.data);
    };
    ws.onerror = () => {
      // onclose follows; reconnect is handled there.
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.stopPing();
      this.subIds = {};
      for (const [, p] of this.pending) {
        clearTimeout(p.timer);
        p.reject(new Error("socket closed"));
      }
      this.pending.clear();
      this.setState({ connection: "closed", source: this.pollTimer ? "polling" : "none" });
      this.ensurePolling();
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** this.attempt);
    const delay = exp / 2 + Math.random() * (exp / 2); // jitter
    this.attempt++;
    this.setState({ reconnectAttempt: this.attempt });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (Date.now() - this.lastMessageAt > STALE_AFTER_MS) {
        this.ws?.close(); // half-open connection: force reconnect
        return;
      }
      this.request("ping", {}).catch(() => {});
    }, PING_INTERVAL_MS);
  }
  private stopPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = null;
  }

  /* ------------------------------------------------------------ polling fallback */

  private ensurePolling() {
    if (this.state.connection === "open" || this.pollTimer) return;
    this.pollTimer = setInterval(() => void this.seedFromStatus(), POLL_INTERVAL_MS);
    this.setState({ source: "polling" });
  }
  private stopPolling() {
    if (this.pollStartTimer) clearTimeout(this.pollStartTimer);
    this.pollStartTimer = null;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  /** Reads /api/bb status; emits a synthetic newBlock when the tip moved. */
  private async seedFromStatus() {
    try {
      const res = await fetch("/api/bb", { cache: "no-store" });
      if (!res.ok) return;
      const parsed = StatusSchema.safeParse(await res.json());
      if (!parsed.success) return;
      const s = parsed.data;
      const seenAt = Math.floor(Date.parse(s.blockbook.lastBlockTime) / 1000) || Math.floor(Date.now() / 1000);
      const prev = this.state.lastBlock;
      const next: LastBlock = { height: s.blockbook.bestHeight, hash: s.backend.bestBlockHash, seenAt };
      if (!prev || next.height > prev.height) {
        this.setState({ lastBlock: next });
        if (prev) this.blockHandlers.forEach((h) => h({ height: next.height, hash: next.hash }));
      }
    } catch {
      // transient; next tick retries
    }
  }

  /* ------------------------------------------------------------ protocol */

  private request(method: string, params: unknown): Promise<unknown> {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error("socket not open"));
    const id = String(this.nextId++);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  /** Like request() but returns the id synchronously so pushes can be routed to it. */
  private subscribe(method: string, params: unknown): { id: string; ack: Promise<unknown> } | null {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) return null;
    const id = String(this.nextId++);
    const ack = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} timed out`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
    });
    ws.send(JSON.stringify({ id, method, params }));
    return { id, ack };
  }

  private handleMessage(raw: unknown) {
    let msg: { id?: unknown; data?: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    const id = typeof msg.id === "string" ? msg.id : undefined;
    if (!id) return;

    const p = this.pending.get(id);
    if (p) {
      clearTimeout(p.timer);
      this.pending.delete(id);
      p.resolve(msg.data);
      return;
    }

    if (id === this.subIds.block) {
      const b = WsNewBlockSchema.safeParse(msg.data);
      if (!b.success) return;
      const prev = this.state.lastBlock;
      if (!prev || b.data.height >= prev.height) {
        this.setState({ lastBlock: { ...b.data, seenAt: Math.floor(Date.now() / 1000) } });
      }
      this.blockHandlers.forEach((h) => h(b.data));
    } else if (id === this.subIds.tx) {
      const t = TxLightSchema.safeParse(msg.data);
      if (t.success) this.txHandlers.forEach((h) => h(t.data));
    } else if (id === this.subIds.addr) {
      const a = WsAddressTxSchema.safeParse(msg.data);
      if (!a.success) return;
      for (const [h, addrs] of this.addrHandlers) if (addrs.has(a.data.address)) h(a.data);
    }
  }

  /** Bring server-side subscriptions in line with local subscribers. */
  private async syncSubscriptions() {
    if (this.state.connection !== "open") return;

    if (this.blockHandlers.size && !this.subIds.block) {
      const s = this.subscribe("subscribeNewBlock", {});
      if (s) {
        this.subIds.block = s.id;
        s.ack.catch(() => {});
      }
    } else if (!this.blockHandlers.size && this.subIds.block) {
      this.subIds.block = undefined;
      this.request("unsubscribeNewBlock", {}).catch(() => {});
    }

    if (this.txHandlers.size && !this.subIds.tx && this.state.newTxSupported !== false) {
      const s = this.subscribe("subscribeNewTransaction", {});
      if (s) {
        this.subIds.tx = s.id;
        s.ack
          .then((d) => {
            const ack = WsSubscribeAckSchema.safeParse(d);
            const ok = ack.success && ack.data.subscribed;
            if (!ok) this.subIds.tx = undefined;
            this.setState({ newTxSupported: ok });
          })
          .catch(() => {});
      }
    } else if (!this.txHandlers.size && this.subIds.tx) {
      this.subIds.tx = undefined;
      this.request("unsubscribeNewTransaction", {}).catch(() => {});
    }

    // Blockbook keeps ONE address set per connection; each call replaces it.
    const all = new Set<string>();
    this.addrHandlers.forEach((s) => s.forEach((a) => all.add(a)));
    if (all.size) {
      const s = this.subscribe("subscribeAddresses", { addresses: [...all] });
      if (s) {
        this.subIds.addr = s.id;
        s.ack.catch(() => {});
      }
    } else if (this.subIds.addr) {
      this.subIds.addr = undefined;
      this.request("unsubscribeAddresses", {}).catch(() => {});
    }
  }

  /* ------------------------------------------------------------ public subscribe API */

  subscribeNewBlock(h: Handler<WsNewBlock>): () => void {
    this.start();
    this.blockHandlers.add(h);
    void this.syncSubscriptions();
    return () => {
      this.blockHandlers.delete(h);
      void this.syncSubscriptions();
    };
  }

  subscribeNewTransaction(h: Handler<TxLight>): () => void {
    this.start();
    this.txHandlers.add(h);
    void this.syncSubscriptions();
    return () => {
      this.txHandlers.delete(h);
      void this.syncSubscriptions();
    };
  }

  subscribeAddresses(addresses: string[], h: Handler<WsAddressTx>): () => void {
    this.start();
    this.addrHandlers.set(h, new Set(addresses));
    void this.syncSubscriptions();
    return () => {
      this.addrHandlers.delete(h);
      void this.syncSubscriptions();
    };
  }
}

let singleton: BlockbookSocket | null = null;
export function getBlockbookSocket(): BlockbookSocket {
  return (singleton ??= new BlockbookSocket(BLOCKBOOK_WS_URL));
}

const SERVER_STATE: LiveState = {
  connection: "idle",
  source: "none",
  lastBlock: null,
  newTxSupported: null,
  reconnectAttempt: 0,
};

export interface UseBlockbookSocketOptions {
  onNewBlock?: Handler<WsNewBlock>;
  onNewTransaction?: Handler<TxLight>;
  addresses?: string[];
  onAddressTx?: Handler<WsAddressTx>;
}

/**
 * Live block/tx state for components. Handlers can change between renders without
 * re-subscribing (they're held in refs).
 */
export function useBlockbookSocket(opts: UseBlockbookSocketOptions = {}): LiveState {
  const sock = typeof window === "undefined" ? null : getBlockbookSocket();
  const state = useSyncExternalStore(
    sock ? sock.subscribeState : () => () => {},
    sock ? sock.getState : () => SERVER_STATE,
    () => SERVER_STATE,
  );

  const refs = useRef(opts);
  refs.current = opts;

  const wantBlocks = !!opts.onNewBlock;
  const wantTxs = !!opts.onNewTransaction;
  const addrKey = opts.onAddressTx && opts.addresses?.length ? opts.addresses.join(",") : "";

  useEffect(() => {
    if (!wantBlocks) return;
    return getBlockbookSocket().subscribeNewBlock((b) => refs.current.onNewBlock?.(b));
  }, [wantBlocks]);

  useEffect(() => {
    if (!wantTxs) return;
    return getBlockbookSocket().subscribeNewTransaction((t) => refs.current.onNewTransaction?.(t));
  }, [wantTxs]);

  useEffect(() => {
    if (!addrKey) return;
    return getBlockbookSocket().subscribeAddresses(addrKey.split(","), (a) => refs.current.onAddressTx?.(a));
  }, [addrKey]);

  return state;
}
