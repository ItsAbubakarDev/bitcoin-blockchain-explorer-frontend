import { TableSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-full max-w-xl" />
      <TableSkeleton rows={6} cols={4} title="UTXOs" />
    </div>
  );
}
