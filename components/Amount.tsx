import { COIN_SYMBOL } from "@/lib/config";
import { formatSats } from "@/lib/format";

/** Monospace coin amount; dims the symbol so digits line up in right-aligned columns. */
export function Amount({ sats, className = "", symbol = true }: { sats: string | undefined; className?: string; symbol?: boolean }) {
  return (
    <span className={`whitespace-nowrap font-mono tabular-nums ${className}`}>
      {formatSats(sats, { symbol: false })}
      {symbol && <span className="ml-1 text-faint">{COIN_SYMBOL}</span>}
    </span>
  );
}
