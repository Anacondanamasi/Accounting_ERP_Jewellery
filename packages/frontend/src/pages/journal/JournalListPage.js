import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createColumnHelper } from "@tanstack/react-table";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { journalService } from "@/services/journalService";
import { useState } from "react";
const col = createColumnHelper();
const money = (value) => Number(value ?? 0).toFixed(2);
const totalDebit = (row) => row.debit ?? row.lines?.reduce((sum, line) => sum + Number(line.debit ?? 0), 0) ?? 0;
const totalCredit = (row) => row.credit ?? row.lines?.reduce((sum, line) => sum + Number(line.credit ?? 0), 0) ?? 0;
export const JournalListPage = () => {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({});
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["journal-list", filters],
        queryFn: () => journalService.list(filters),
    });
    const postMutation = useMutation({
        mutationFn: (id) => journalService.post(id),
        onSuccess: () => {
            toast.success("Journal posted");
            void refetch();
        },
    });
    const reverseMutation = useMutation({
        mutationFn: (id) => journalService.reverse(id),
        onSuccess: () => {
            toast.success("Journal reversed");
            void refetch();
        },
    });
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PageHeader, { title: "Journal Entries", subtitle: "Create, edit, post and reverse accounting entries", actions: _jsx("button", { className: "h-10 rounded-btn bg-gold px-4 text-sm text-white", onClick: () => navigate("/journal/new"), type: "button", children: "+ New Journal" }) }), _jsx(FilterBar, { filters: [
                    { key: "search", type: "search", label: "Search" },
                    { key: "from", type: "date", label: "From" },
                    { key: "to", type: "date", label: "To" },
                    {
                        key: "status",
                        type: "select",
                        label: "Status",
                        options: [
                            { label: "Draft", value: "DRAFT" },
                            { label: "Posted", value: "POSTED" },
                            { label: "Reversed", value: "REVERSED" },
                        ],
                    },
                ], onChange: (key, value) => setFilters((prev) => ({ ...prev, [key]: value })), onReset: () => setFilters({}), values: filters }), _jsx(DataTable, { columns: [
                    col.accessor("date", { header: "Date" }),
                    col.accessor("entryNo", { header: "Entry No" }),
                    col.accessor("narration", { header: "Narration" }),
                    col.accessor((row) => totalDebit(row), {
                        id: "debit",
                        header: "Debit",
                        cell: (info) => _jsx("span", { className: "font-mono", children: money(info.getValue()) }),
                    }),
                    col.accessor((row) => totalCredit(row), {
                        id: "credit",
                        header: "Credit",
                        cell: (info) => _jsx("span", { className: "font-mono", children: money(info.getValue()) }),
                    }),
                    col.accessor("status", { header: "Status", cell: (info) => _jsx(StatusBadge, { status: info.getValue() }) }),
                    col.display({
                        id: "actions",
                        header: "Actions",
                        cell: ({ row }) => (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => navigate(`/journal/${row.original.id}/edit`), type: "button", children: "Edit" }), _jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => postMutation.mutate(row.original.id), type: "button", children: "Post" }), _jsx("button", { className: "rounded border border-border px-2 py-1 text-xs", onClick: () => reverseMutation.mutate(row.original.id), type: "button", children: "Reverse" })] })),
                    }),
                ], data: data ?? [], loading: isLoading })] }));
};
