"use client";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

export function ErrorState({ title = "Couldn't load data", message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const retry = onRetry ?? (() => start(() => router.refresh()));
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-bad/30 bg-bad/5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium text-bad">{title}</div>
        <div className="text-muted">{message}</div>
      </div>
      <button
        type="button"
        onClick={retry}
        disabled={pending}
        className="shrink-0 rounded-md border border-line bg-surface px-3 py-1.5 text-xs text-fg hover:border-accent/50 disabled:opacity-50"
      >
        {pending ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <div className="text-sm font-medium text-fg">{title}</div>
      {children && <div className="max-w-md text-xs text-muted">{children}</div>}
    </div>
  );
}
