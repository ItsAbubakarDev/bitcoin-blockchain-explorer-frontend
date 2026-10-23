export type SearchTarget =
  | { kind: "height"; value: string }
  | { kind: "hash64"; value: string }
  | { kind: "address"; value: string }
  | { kind: "empty" };

/**
 * all digits → block height; 64 hex → block hash or txid (resolved server-side via
 * /api/search, block first); anything else → address.
 */
export function classifySearch(raw: string): SearchTarget {
  const q = raw.trim();
  if (!q) return { kind: "empty" };
  if (/^\d+$/.test(q)) return { kind: "height", value: String(Number(q)) };
  if (/^[0-9a-fA-F]{64}$/.test(q)) return { kind: "hash64", value: q.toLowerCase() };
  return { kind: "address", value: q };
}
