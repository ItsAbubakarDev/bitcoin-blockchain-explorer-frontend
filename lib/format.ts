import { COIN_DECIMALS, COIN_SYMBOL } from "./config";

/** Satoshi string → decimal coin string, using BigInt (balances here exceed 2^53 sats). */
export function formatSats(sats: string | undefined, opts: { symbol?: boolean; minDecimals?: number } = {}): string {
  if (sats === undefined || !/^-?\d+$/.test(sats)) return "—";
  const neg = sats.startsWith("-");
  const v = BigInt(neg ? sats.slice(1) : sats);
  const unit = BigInt(10) ** BigInt(COIN_DECIMALS);
  const whole = (v / unit).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let frac = (v % unit).toString().padStart(COIN_DECIMALS, "0").replace(/0+$/, "");
  const min = opts.minDecimals ?? 0;
  if (frac.length < min) frac = frac.padEnd(min, "0");
  const num = `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
  return opts.symbol === false ? num : `${num} ${COIN_SYMBOL}`;
}

export function formatInt(n: number | undefined): string {
  return n === undefined || !Number.isFinite(n) ? "—" : n.toLocaleString("en-US");
}

export function formatBytes(n: number | undefined): string {
  if (n === undefined) return "—";
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(2)} kB`;
  return `${(n / 1_000_000).toFixed(2)} MB`;
}

/** Always UTC, so server and client render identically (no hydration mismatch). */
export function formatUtc(unixSeconds: number | undefined): string {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export function timeAgo(unixSeconds: number, nowMs: number): string {
  const s = Math.max(0, Math.floor(nowMs / 1000 - unixSeconds));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m ago`;
  const d = Math.floor(h / 24);
  if (d < 365) return `${d}d ago`;
  return `${(d / 365).toFixed(1)}y ago`;
}

export function truncateMiddle(s: string, head = 8, tail = 8): string {
  return s.length <= head + tail + 1 ? s : `${s.slice(0, head)}…${s.slice(-tail)}`;
}

/** Sum of output values that are not OP_RETURN (Blockbook's `value` already is this). */
export function isOpReturn(addr: string | undefined): boolean {
  return !!addr && addr.startsWith("OP_RETURN");
}

/** Live confirmations: cached responses carry stale counts, so prefer best height when known. */
export function liveConfirmations(raw: number, height: number | undefined, bestHeight: number | undefined): number {
  if (!height || height <= 0 || !bestHeight) return raw;
  return Math.max(raw, bestHeight - height + 1);
}
