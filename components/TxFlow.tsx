import type { Vin, Vout } from "@/lib/blockbook";
import { isOpReturn } from "@/lib/format";
import { Amount } from "./Amount";
import { Hash } from "./Hash";
import { ArrowRightIcon } from "./Icons";

function InputRow({ vin }: { vin: Vin }) {
  const addr = vin.addresses?.[0];
  return (
    <li className="flex items-start justify-between gap-3 px-3 py-2 even:bg-surface-2/50">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-faint">#{vin.n}</span>
          {vin.coinbase !== undefined || (!vin.txid && !addr) ? (
            <span className="text-[13px] text-accent">Coinbase · newly generated coins</span>
          ) : addr && vin.isAddress ? (
            <Hash value={addr} kind="address" className="text-[13px]" />
          ) : (
            <span className="font-mono text-[13px] text-muted">{addr ?? "Non-standard input"}</span>
          )}
        </div>
        {vin.txid && (
          <div className="text-[11px] text-faint">
            from <Hash value={vin.txid} kind="tx" head={6} tail={6} copy={false} href={`/tx/${vin.txid}`} />
            {vin.vout !== undefined && <span className="font-mono">:{vin.vout}</span>}
          </div>
        )}
      </div>
      <Amount sats={vin.value} className="shrink-0 text-[13px]" />
    </li>
  );
}

function OutputRow({ vout }: { vout: Vout }) {
  const addr = vout.addresses?.[0];
  const opReturn = isOpReturn(addr);
  return (
    <li id={`out-${vout.n}`} className="flex items-start justify-between gap-3 px-3 py-2 target:bg-accent/10 even:bg-surface-2/50">
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-faint">#{vout.n}</span>
          {opReturn ? (
            <span className="rounded bg-surface-3 px-1.5 py-px text-[11px] font-medium text-muted">OP_RETURN</span>
          ) : addr && vout.isAddress ? (
            <Hash value={addr} kind="address" className="text-[13px]" />
          ) : (
            <span className="font-mono text-[13px] text-muted">{addr ?? "Non-standard output"}</span>
          )}
        </div>
        {opReturn && addr && <div className="break-all font-mono text-[11px] text-faint">{addr.replace(/^OP_RETURN\s*/, "")}</div>}
        {vout.spent !== undefined && !opReturn && (
          <div className={`text-[11px] ${vout.spent ? "text-faint" : "text-ok"}`}>{vout.spent ? "spent" : "unspent"}</div>
        )}
      </div>
      <Amount sats={vout.value} className="shrink-0 text-[13px]" />
    </li>
  );
}

/** Inputs → outputs, side by side on desktop, stacked on mobile. */
export function TxFlow({ vin, vout, valueIn, value }: { vin: Vin[]; vout: Vout[]; valueIn?: string; value: string }) {
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr]">
        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
            <span>
              Inputs <span className="font-mono">({vin.length})</span>
            </span>
            {valueIn !== undefined && valueIn !== "0" && <Amount sats={valueIn} className="text-fg" />}
          </header>
          <ul>
            {vin.map((v) => (
              <InputRow key={v.n} vin={v} />
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-center border-y border-line py-2 text-accent md:border-x md:border-y-0 md:px-3 md:py-0">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
            <ArrowRightIcon className="h-4 w-4 rotate-90 md:rotate-0" />
          </span>
        </div>
        <div className="min-w-0">
          <header className="flex items-center justify-between border-b border-line px-3 py-2 text-xs text-muted">
            <span>
              Outputs <span className="font-mono">({vout.length})</span>
            </span>
            <Amount sats={value} className="text-fg" />
          </header>
          <ul>
            {vout.map((v) => (
              <OutputRow key={v.n} vout={v} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
