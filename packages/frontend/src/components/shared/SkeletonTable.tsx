interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export const SkeletonTable = ({ rows = 8, columns = 6 }: SkeletonTableProps) => (
  <div className="overflow-hidden rounded-card border border-border bg-card">
    <div className="animate-pulse space-y-2 p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div key={`cell-${rowIndex}-${columnIndex}`} className="h-6 rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
