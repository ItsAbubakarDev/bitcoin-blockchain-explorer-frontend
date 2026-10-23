import Link from "next/link";
import { COIN_NAME } from "@/lib/config";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="font-mono text-5xl font-semibold text-accent">404</div>
      <h1 className="mt-3 text-lg font-semibold">Not found on {COIN_NAME}</h1>
      <p className="mt-2 text-sm text-muted">
        No block, transaction or address matches that. Check the value — BTC1 addresses look like Bitcoin addresses but
        live on a separate chain.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-md border border-line bg-surface px-4 py-2 text-sm text-accent hover:border-accent/50">
        Back to dashboard
      </Link>
    </div>
  );
}
