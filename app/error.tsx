"use client";
import { ErrorState } from "@/components/States";

/** Last-resort boundary; pages render their own inline error states for API failures. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <ErrorState title="Something went wrong" message={error.digest ? `Error ${error.digest}` : "Unexpected error rendering this page."} onRetry={reset} />
    </div>
  );
}
