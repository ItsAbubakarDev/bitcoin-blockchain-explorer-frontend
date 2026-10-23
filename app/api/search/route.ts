/**
 * Resolves a 64-hex search term: block hash first, then txid.
 * Returns {path} for the client to navigate to, or 404.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isHash64, isNotFound } from "@/lib/blockbook";
import { bb } from "@/lib/blockbook.server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  if (!isHash64(q)) return NextResponse.json({ error: "Expected a 64-character hex hash" }, { status: 400 });

  try {
    await bb.getBlock(q);
    return NextResponse.json({ path: `/block/${q}` });
  } catch (e) {
    if (!isNotFound(e)) return NextResponse.json({ error: "Search is temporarily unavailable" }, { status: 503 });
  }
  try {
    await bb.getTx(q);
    return NextResponse.json({ path: `/tx/${q}` });
  } catch (e) {
    if (!isNotFound(e)) return NextResponse.json({ error: "Search is temporarily unavailable" }, { status: 503 });
  }
  return NextResponse.json({ error: "No block or transaction with that hash" }, { status: 404 });
}
