import { StatCard } from "@/components/StatCard";
import { TableSkeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-full max-w-xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Balance", "Total received", "Total sent", "Transactions"].map((l) => (
          <StatCard key={l} label={l} value="" loading />
        ))}
      </div>
      <TableSkeleton rows={10} cols={5} title="Transaction history" />
    </div>
  );
}
