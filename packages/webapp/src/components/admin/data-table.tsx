"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/common/input";
import { Button } from "@/components/common/button";

export interface TableColumn<T extends object> {
  key: Extract<keyof T, string>;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface DataTableProps<T extends object> {
  rows: T[];
  columns: TableColumn<T>[];
  searchKeys: Extract<keyof T, string>[];
}

const PAGE_SIZE = 10;

export function DataTable<T extends object>({
  rows,
  columns,
  searchKeys
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!query.trim()) {
      return rows;
    }
    const lowered = query.toLowerCase();
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(lowered))
    );
  }, [query, rows, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visibleRows = filtered.slice(start, start + PAGE_SIZE);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <Input
          placeholder="Search..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              {columns.map((column) => (
                <th key={String(column.key)} className="px-2 py-2 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={index} className="border-b border-slate-100">
                {columns.map((column) => {
                  const rawValue = row[column.key];
                  const cell = column.render ? column.render(rawValue, row) : String(rawValue ?? "-");
                  return (
                    <td key={String(column.key)} className="px-2 py-3 text-slate-700">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing {visibleRows.length} of {filtered.length} rows
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Prev
          </Button>
          <span className="text-sm text-slate-600">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
