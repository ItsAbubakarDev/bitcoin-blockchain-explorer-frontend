/**
 * Drops cached address/utxo data after a websocket address notification so the
 * next server render shows the new activity. Scoped to address-shaped keys only.
 */
import { NextResponse, type NextRequest } from "next/server";
import { invalidateCache } from "@/lib/blockbook.server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address") ?? "";
  if (!/^[A-Za-z0-9]{14,100}$/.test(address)) return NextResponse.json({ error: "Bad address" }, { status: 400 });
  invalidateCache(`address/${address}`);
  invalidateCache(`utxo/${address}`);
  return NextResponse.json({ ok: true });
}
