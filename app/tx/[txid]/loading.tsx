import { DetailSkeleton, TableSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-full max-w-2xl" />
      <DetailSkeleton rows={8} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TableSkeleton rows={3} cols={2} />
        <TableSkeleton rows={3} cols={2} />
      </div>
    </div>
  );
}
