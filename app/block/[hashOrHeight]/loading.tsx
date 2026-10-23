import { DetailSkeleton, TableSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-40" />
      <DetailSkeleton rows={10} />
      <TableSkeleton rows={3} cols={4} title="Transactions" />
    </div>
  );
}
