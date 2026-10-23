"use client";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

export function RawHex({ hex }: { hex?: string }) {
  const [open, setOpen] = useState(false);
  if (!hex) return null;
  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="flex items-center justify-between gap-2 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-sm font-semibold text-fg hover:text-accent"
        >
          {open ? "▾" : "▸"} Raw transaction hex <span className="font-mono text-xs font-normal text-muted">({(hex.length / 2).toLocaleString("en-US")} bytes)</span>
        </button>
        {open && <CopyButton value={hex} label="Copy hex" />}
      </header>
      {open && (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all border-t border-line bg-bg/60 px-4 py-3 font-mono text-[11px] leading-relaxed text-muted">
          {hex}
        </pre>
      )}
    </section>
  );
}
