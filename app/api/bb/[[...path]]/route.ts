/**
 * Same-origin, whitelisted proxy to Blockbook for client components.
 * Shares the server's rate limiter + cache, so N browsers ≈ 1 upstream client.
 */
import { NextResponse, type NextRequest } from "next/server";
import { BlockbookError } from "@/lib/blockbook";
import { blockbookGet } from "@/lib/blockbook.server";

export const dynamic = "force-dynamic";

const ROUTES: Array<{ re: RegExp; query: string[] }> = [
  { re: /^$/, query: [] },
  { re: /^block\/(\d{1,10}|[0-9a-fA-F]{64})$/, query: ["page"] },
  { re: /^block-index\/\d{1,10}$/, query: [] },
  { re: /^tx\/[0-9a-fA-F]{64}$/, query: [] },
  { re: /^address\/[A-Za-z0-9]{14,100}$/, query: ["page", "pageSize", "details"] },
  { re: /^utxo\/[A-Za-z0-9]{14,100}$/, query: [] },
];

const DETAILS = new Set(["basic", "txids", "txs"]);

export async function GET(req: NextRequest, { params }: { params: { path?: string[] } }) {
  const path = (params.path ?? []).join("/");
  const route = ROUTES.find((r) => r.re.test(path));
  if (!route) return NextResponse.json({ error: "Unsupported endpoint" }, { status: 404 });

  const query: Record<string, string> = {};
  for (const key of route.query) {
    const v = req.nextUrl.searchParams.get(key);
    if (v === null) continue;
    if (key === "details") {
      if (DETAILS.has(v)) query[key] = v;
    } else if (/^\d{1,7}$/.test(v)) {
      query[key] = key === "pageSize" ? String(Math.min(Number(v), 100)) : v;
    }
  }

  try {
    const data = await blockbookGet(path, query);
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const err = e instanceof BlockbookError ? e : new BlockbookError("upstream", String(e), 502);
    const status = err.status >= 400 ? err.status : err.kind === "timeout" ? 504 : 502;
    return NextResponse.json({ error: err.message, kind: err.kind }, { status });
  }
}
