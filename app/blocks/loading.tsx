import { TableSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-48" />
      <TableSkeleton rows={20} cols={5} title="Blocks" />
    </div>
  );
}
