import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, } from "@tanstack/react-table";
import { useState } from "react";
import { Inbox } from "lucide-react";
import { SkeletonTable } from "./SkeletonTable";
import { EmptyState } from "./EmptyState";
export const DataTable = ({ columns, data, loading = false, onRowClick }) => {
    const [sorting, setSorting] = useState([]);
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
        return _jsx(SkeletonTable, {});
    }
    return (_jsxs("div", { className: "rounded-card border border-border bg-card shadow-card", children: [_jsx("div", { className: "border-b border-border p-3", children: _jsx("input", { className: "w-full rounded border border-border bg-white px-3 py-2 text-sm", onChange: (event) => setGlobalFilter(event.target.value), placeholder: "Search table...", value: globalFilter }) }), table.getRowModel().rows.length === 0 ? (_jsx("div", { className: "p-4", children: _jsx(EmptyState, { icon: Inbox, title: "No records found", description: "Try changing your filters or create a new record." }) })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "sticky top-0 bg-gold-tint text-charcoal", children: table.getHeaderGroups().map((headerGroup) => (_jsx("tr", { children: headerGroup.headers.map((header) => (_jsx("th", { className: "cursor-pointer border-b border-border px-3 py-2 text-left font-semibold", onClick: header.column.getToggleSortingHandler(), children: flexRender(header.column.columnDef.header, header.getContext()) }, header.id))) }, headerGroup.id))) }), _jsx("tbody", { children: table.getRowModel().rows.map((row) => (_jsx("tr", { className: "border-b border-border/60 hover:bg-slate-50", onClick: () => onRowClick?.(row.original), children: row.getVisibleCells().map((cell) => (_jsx("td", { className: "px-3 py-2", children: flexRender(cell.column.columnDef.cell, cell.getContext()) }, cell.id))) }, row.id))) })] }) })), _jsxs("div", { className: "flex items-center justify-between border-t border-border p-3 text-xs text-muted", children: [_jsxs("div", { children: ["Page ", table.getState().pagination.pageIndex + 1, " of ", table.getPageCount() || 1] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded border border-border px-3 py-1 disabled:opacity-50", disabled: !table.getCanPreviousPage(), onClick: () => table.previousPage(), type: "button", children: "Previous" }), _jsx("button", { className: "rounded border border-border px-3 py-1 disabled:opacity-50", disabled: !table.getCanNextPage(), onClick: () => table.nextPage(), type: "button", children: "Next" })] })] })] }));
};
