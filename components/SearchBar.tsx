"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { classifySearch } from "@/lib/search";
import { SearchIcon } from "./Icons";

export function SearchBar() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const t = classifySearch(q);
    if (t.kind === "empty") return;
    if (t.kind === "height") return go(`/block/${t.value}`);
    if (t.kind === "address") return go(`/address/${encodeURIComponent(t.value)}`);

    // 64 hex: block hash first, then txid (resolved server-side).
    setBusy(true);
    try {
      const res = await fetch(`/api/search?q=${t.value}`, { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as { path?: string; error?: string };
      if (res.ok && body.path) go(body.path);
      else setError(body.error ?? "Search failed");
    } catch {
      setError("Search failed: network error");
    } finally {
      setBusy(false);
    }
  }

  function go(path: string) {
    setQ("");
    router.push(path);
  }

  return (
    <form onSubmit={submit} role="search" className="relative">
      <label htmlFor="global-search" className="sr-only">
        Search by block height, block hash, txid or address
      </label>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      <input
        id="global-search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setError(null);
        }}
        placeholder="Block height, hash, txid or address"
        autoComplete="off"
        spellCheck={false}
        className="h-9 w-full rounded-md border border-line bg-surface pl-9 pr-16 font-mono text-[13px] text-fg placeholder:font-sans placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
      <button
        type="submit"
        disabled={busy}
        className="absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded bg-accent/15 px-2.5 text-xs font-medium text-accent hover:bg-accent/25 disabled:opacity-50"
      >
        {busy ? "…" : "Go"}
      </button>
      {error && (
        <div role="alert" className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-bad/40 bg-surface-3 px-3 py-1.5 text-xs text-bad shadow-xl">
          {error}
        </div>
      )}
    </form>
  );
}
