"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { classifySearch } from "@/lib/search";
import { SearchIcon } from "./Icons";

export function SearchBar({ variant = "nav" }: { variant?: "nav" | "hero" }) {
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

  const hero = variant === "hero";
  const inputId = hero ? "hero-search" : "global-search";

  return (
    <form onSubmit={submit} role="search" className="relative">
      <label htmlFor={inputId} className="sr-only">
        Search by block height, block hash, txid or address
      </label>
      <div
        className={
          hero
            ? "rounded-2xl bg-gradient-to-r from-accent/80 via-[#818cf8]/70 to-[#c084fc]/70 p-px shadow-[0_0_40px_-10px_rgba(34,211,238,0.5)]"
            : ""
        }
      >
        <div className={hero ? "relative rounded-2xl bg-bg/95 p-2" : "relative"}>
          {!hero && <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />}
          <input
            id={inputId}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setError(null);
            }}
            placeholder="Search block height / hash, txid or address"
            autoComplete="off"
            spellCheck={false}
            className={
              hero
                ? "h-12 w-full rounded-xl bg-surface pl-4 pr-14 font-mono text-[15px] text-fg placeholder:font-sans placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent/50"
                : "h-9 w-full rounded-md border border-line bg-surface pl-9 pr-16 font-mono text-[13px] text-fg placeholder:font-sans placeholder:text-faint focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40"
            }
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Search"
            className={
              hero
                ? "absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-[#818cf8] text-bg hover:brightness-110 disabled:opacity-50"
                : "absolute right-1 top-1/2 h-7 -translate-y-1/2 rounded bg-accent/15 px-2.5 text-xs font-medium text-accent hover:bg-accent/25 disabled:opacity-50"
            }
          >
            {hero ? busy ? "…" : <SearchIcon className="h-5 w-5" /> : busy ? "…" : "Go"}
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border border-bad/40 bg-surface-3 px-3 py-1.5 text-xs text-bad shadow-xl">
          {error}
        </div>
      )}
    </form>
  );
}
