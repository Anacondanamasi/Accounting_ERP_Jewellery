import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Inbox } from "lucide-react";
import { SkeletonTable } from "./SkeletonTable";
import { EmptyState } from "./EmptyState";

interface DataTableProps<TData> {
  columns: Array<ColumnDef<TData, any>>;
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
}

export const DataTable = <TData,>({ columns, data, loading = false, onRowClick }: DataTableProps<TData>) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (loading) {
    return <SkeletonTable />;
  }

  return (
    <div className="rounded-card border border-border bg-card shadow-card">
      <div className="border-b border-border p-3">
        <input
          className="w-full rounded border border-border bg-white px-3 py-2 text-sm"
          onChange={(event) => setGlobalFilter(event.target.value)}
          placeholder="Search table..."
          value={globalFilter}
        />
      </div>
      {table.getRowModel().rows.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Inbox}
            title="No records found"
            description="Try changing your filters or create a new record."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gold-tint text-charcoal">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer border-b border-border px-3 py-2 text-left font-semibold"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/60 transition-colors ${onRowClick ? "cursor-pointer hover:bg-gold-tint/20 group" : "hover:bg-slate-50"}`}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted">
        <div>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
        </div>
        <div className="flex gap-2">
          <button
            className="rounded border border-border px-3 py-1 disabled:opacity-50"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded border border-border px-3 py-1 disabled:opacity-50"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};
